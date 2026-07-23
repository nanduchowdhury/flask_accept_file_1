from datetime import datetime, timedelta
import json
import io
import csv
import pandas as pd
import requests
import yfinance as yf
from gcs_manager import GCSManager
import constants

import os
import logging

from collections import defaultdict


# Set timezone cache to /tmp to avoid SIGSEGV in read-only environments like Cloud Run
yf.set_tz_cache_location("/tmp")


class StockDataRetriever:

    # Loaded from stocks_master.json
    stock_db = {}

    # Built once at startup
    peer_db = {}

    # Cached list of available tickers
    ticker_list = []

    # Internal indexes
    industry_index = defaultdict(list)
    sector_index = defaultdict(list)
    
    # Create ctor
    def __init__(self):
        
        self.stock_db = self.load_json("stock_db_builder/output/stocks_master.json")
        self.buildPeerDatabase()


    def load_json(self, filename):

        if not os.path.exists(filename):
            return {}

        with open(
            filename,
            "r",
            encoding="utf-8"
        ) as fp:

            return json.load(fp)

    def buildPeerDatabase(self):
        """
        Build peer database once during Flask startup.

        This uses the already loaded stock_db.
        """

        logging.info("Building peer database...")

        self.peer_db.clear()
        self.industry_index.clear()
        self.sector_index.clear()

        #
        # Build indexes
        #
        for ticker, company in self.stock_db.items():

            industry = (company.get("industry") or "").strip().lower()

            sector = (company.get("sector") or "").strip().lower()

            if industry:
                self.industry_index[industry].append(ticker)

            if sector:
                self.sector_index[sector].append(ticker)

        #
        # Build peer list for every company
        #
        for ticker, company in self.stock_db.items():

            industry = (company.get("industry") or "").strip().lower()

            sector = (company.get("sector") or "").strip().lower()

            market_cap = company.get("market_cap") or 0

            #
            # Candidate peers
            #
            candidates = set()

            candidates.update(self.industry_index.get(industry, []))
            candidates.update(self.sector_index.get(sector, []))

            candidates.discard(ticker)

            peers = []

            for peer_ticker in candidates:

                peer = self.stock_db[peer_ticker]

                score = 0
                reasons = []

                #
                # Same Industry
                #
                peer_industry = (peer.get("industry") or "").strip().lower()

                if industry and industry == peer_industry:
                    score += 60
                    reasons.append("Same Industry")

                #
                # Same Sector
                #
                peer_sector = (peer.get("sector") or "").strip().lower()

                if sector and sector == peer_sector:
                    score += 20
                    reasons.append("Same Sector")

                #
                # Similar Market Cap
                #
                peer_cap = peer.get("market_cap") or 0

                if market_cap > 0 and peer_cap > 0:

                    ratio = min(market_cap, peer_cap) / max(market_cap, peer_cap)

                    if ratio >= 0.80:
                        score += 20
                        reasons.append("Very Similar Size")

                    elif ratio >= 0.60:
                        score += 15
                        reasons.append("Similar Size")

                    elif ratio >= 0.40:
                        score += 10

                if score >= 60:

                    peers.append({

                        "ticker": peer_ticker,

                        "company_name": peer.get("company_name"),

                        "score": score,

                        "reason": ", ".join(reasons)

                    })

            peers.sort(
                key=lambda x: (
                    -x["score"],
                    x["company_name"] or ""
                )
            )

            self.peer_db[ticker] = peers

        logging.info(
            "Peer database built for %d companies.",
            len(self.peer_db)
        )


    def getTicker(self, name):
        """
        Searches for Indian stock ticker symbols based on the provided name.
        Filters results to include only National Stock Exchange (.NS) 
        and Bombay Stock Exchange (.BO) tickers.
        """
        # Extract the ticker symbol if the name is provided in "Company - SYMBOL" format
        search_query = name
        if " - " in name:
            search_query = name.split(" - ")[-1].strip()

        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={search_query}"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            search_results = response.json()
            
            # Filter for Indian stocks only
            tickers = [
                quote['symbol'] 
                for quote in search_results.get('quotes', []) 
                if quote.get('symbol', '').endswith(('.NS', '.BO'))
            ]
            return tickers
        except Exception:
            return []

    def getExpandedName(self, ticker):
        """
        Returns the full company name from the local master database.
        """
        company = self.stock_db.get(ticker, {})
        return company.get("company_name") or company.get("short_name") or ticker

    def getData(self, ticker, months="12"):
        try:
            period = f"{months}mo"

            df = yf.download(
                ticker,
                period=period,
                progress=False,
                threads=False,
                auto_adjust=False,
            )

            if df.empty:
                return json.dumps({"error": "No data found"})

            # Flatten MultiIndex columns if present
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            df = df[['Close', 'Volume']].reset_index()
            df['Date'] = df['Date'].dt.strftime('%d%b%y')

            return df.to_json(orient='records')

        except Exception as e:
            return json.dumps({"error": str(e)})

    def getTickerList(self):
        """
        Returns the list of available tickers from the local master database.
        Maintains a cached list to avoid repeated processing.
        """
        if self.ticker_list:
            return self.ticker_list

        # Prepare the list directly from stock_db
        for ticker, company in self.stock_db.items():
            name = company.get("company_name") or company.get("short_name") or ticker
            self.ticker_list.append(f"{name} - {ticker}")

        self.ticker_list.sort()
        return self.ticker_list

    def getEvents(self, ticker, months="12"):
        """
        Retrieves corporate actions (dividends, splits) and raw news events 
        for a given ticker. Processing is offloaded to the client.
        """
        try:
            t = yf.Ticker(ticker)

            # Extract actions and convert to a serializable format
            actions_data = []
            if not t.actions.empty:
                actions_df = t.actions.reset_index()
                actions_df['Date'] = actions_df['Date'].dt.strftime('%Y-%m-%d')
                actions_data = actions_df.to_dict(orient='records')

            return {
                "news": t.news,
                "actions": actions_data
            }
        except Exception as e:
            return {"error": str(e)}

    def getPeers(self, ticker, max_peers=10):
        """
        Returns peer companies from the pre-built peer database.
        """

        try:

            return self.peer_db.get(ticker, [])[:max_peers]

        except Exception:

            logging.exception("getPeers()")

            return []
