from datetime import datetime, timedelta
import json
import io
import csv
import pandas as pd
import requests
import yfinance as yf
from gcs_manager import GCSManager
import constants

import feedparser
from dateutil.relativedelta import relativedelta
from urllib.parse import quote


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
    
    # Class-level cache for downloaded stock data
    stock_data_cache = {}

    # Create ctor
    def __init__(self):
        
        self.stock_db = self.load_json("stock_db_builder/output/stocks_master.json")
        self.buildPeerDatabase()

    def _format_number(self, num):
        """
        Formats large numbers into K, L, Cr units and rounds floats to 2 decimal places.
        """
        if not isinstance(num, (int, float)) or pd.isna(num):
            return num

        abs_num = abs(num)
        if abs_num >= 10_000_000:  # 1 Crore (10 Million)
            return f"{num / 10_000_000:.2f} Cr"
        elif abs_num >= 100_000:   # 1 Lakh (100 Thousand)
            return f"{num / 100_000:.2f} L"
        elif abs_num >= 1_000:     # 1 Thousand
            return f"{num / 1_000:.2f} K"

        if isinstance(num, float):
            return round(num, 2)

        return num

    def clean_nan(self, obj, format_numbers=False):
        """
        Recursively replaces NaN values with None in dictionaries and lists.
        If format_numbers is True, it also applies _format_number to numeric values.
        """
        if isinstance(obj, dict):
            return {k: self.clean_nan(v, format_numbers) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [self.clean_nan(x, format_numbers) for x in obj]
        elif pd.isna(obj):
            return None
        
        if format_numbers:
            return self._format_number(obj)
        return obj


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
        Searches for a ticker. First checks the local master database for an exact 
        match on name or symbol. If not found, falls back to Yahoo Finance search.
        """
        search_query = name.strip().lower()
        if " - " in name:
            search_query = name.split(" - ")[-1].strip().lower()

        # Check local database first
        db_tickers = []
        for ticker, company in self.stock_db.items():
            # Check key (ticker)
            if ticker.lower() == search_query:
                db_tickers.append(ticker)
                continue
            
            # Check company names
            if (company.get("company_name") or "").strip().lower() == search_query:
                db_tickers.append(ticker)
            elif (company.get("short_name") or "").strip().lower() == search_query:
                db_tickers.append(ticker)

        if db_tickers:
            return list(set(db_tickers))

        # Fallback to Yahoo Finance
        return self._getTickerYf(name)

    def _getTickerYf(self, name):
        """
        Searches for Indian stock ticker symbols based on the provided name using Yahoo Finance.
        Filters results to include only National Stock Exchange (.NS) 
        and Bombay Stock Exchange (.BO) tickers.
        """
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
            # Check first if data already in cache
            cache_key = f"{ticker}_{months}"
            if cache_key in self.stock_data_cache:
                return self.stock_data_cache[cache_key]

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

            # Ensure unique columns before to_json(orient='records')
            # Selection might result in duplicate 'Close' or 'Volume' columns if MultiIndex was flattened.
            df = df.loc[:, ~df.columns.duplicated()]

            df = df[['Close', 'Volume']].reset_index()
            df['Date'] = df['Date'].dt.strftime('%d%b%y')

            # Final safety check: Ensure unique columns before to_json
            df = df.loc[:, ~df.columns.duplicated()]

            # Once data is downloaded and processed, put it in cache
            data_list = df.to_dict(orient='records')
            cleaned_data = self.clean_nan(data_list)
            result = json.dumps(cleaned_data)
            self.stock_data_cache[cache_key] = result
            return result

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

    def getGoogleNews(self, company_name, months=12, max_results=100):

        cutoff = datetime.now() - relativedelta(months=months)

        # Adding financial context keywords to narrow down search results
        query = quote(f'"{company_name}" (stock OR business OR finance OR earnings)')

        url = (
            f"https://news.google.com/rss/search?"
            f"q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        )

        feed = feedparser.parse(url)

        news = []

        for entry in feed.entries:

            try:
                published = datetime(*entry.published_parsed[:6])
            except:
                published = None

            if published and published < cutoff:
                continue

            news.append({
                "title": entry.title,
                "publisher": entry.source.title if hasattr(entry, "source") else "",
                "published": published.strftime("%Y-%m-%d %H:%M:%S")
                            if published else "",
                "link": entry.link,
                "summary": entry.summary if "summary" in entry else ""
            })

            if len(news) >= max_results:
                break

        return news


    def getEvents(self, ticker, company_name, months="12"):

        try:

            months = int(months)

            ####################################
            # Google News
            ####################################

            google_news = self.getGoogleNews(company_name, months)

            logging.info(f"Google news : {google_news}")

            ####################################
            # Yahoo Actions
            ####################################

            t = yf.Ticker(ticker)

            cutoff = datetime.now() - relativedelta(months=months)

            actions = []

            if not t.actions.empty:

                df = t.actions[
                    t.actions.index.tz_localize(None) >= cutoff
                ]

                df = df.reset_index()

                df["Date"] = df["Date"].dt.strftime("%Y-%m-%d")

                actions = df.to_dict("records")

            return self.clean_nan({
                "news": google_news,
                "actions": actions
            })

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

    def getSummaryStats(self, ticker):
        """
        Returns key fundamental statistics and company profile information using yfinance info.
        """
        try:
            t = yf.Ticker(ticker)
            info = t.info
            return self.clean_nan({
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "website": info.get("website"),
                "business_summary": info.get("longBusinessSummary"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "forward_pe": info.get("forwardPE"),
                "dividend_yield": info.get("dividendYield"),
                "trailing_eps": info.get("trailingEps"),
                "52_week_high": info.get("fiftyTwoWeekHigh"),
                "52_week_low": info.get("fiftyTwoWeekLow")
            }, format_numbers=True)
        except Exception:
            logging.exception("getSummaryStats()")
            return {"error": "Failed to retrieve summary stats"}

    def getFinancials(self, ticker, get_details=False):
        """
        Returns annual income statement, balance sheet, and cash flow data.
        """
        try:
            t = yf.Ticker(ticker)
            def df_to_dict(df, filter_keys=None):
                if df is None or df.empty: return {}

                if filter_keys:
                    available_keys = [k for k in filter_keys if k in df.index]
                    if not available_keys:
                        return {}
                    df = df.loc[available_keys]

                # Convert Timestamps to strings for JSON serialization
                df.columns = [str(c.date()) if hasattr(c, 'date') else str(c) for c in df.columns]
                return df.to_dict()

            income_stmt_keys = None
            if not get_details:
                income_stmt_keys = ['Basic EPS', 'Diluted EPS', 'EBIT', 'EBITDA', 'Gross Profit', 'Net Income']

            res = {
                "income_statement": df_to_dict(t.income_stmt, filter_keys=income_stmt_keys),
                "balance_sheet": df_to_dict(t.balance_sheet) if get_details else {},
                "cash_flow": df_to_dict(t.cashflow) if get_details else {}
            }

            info = t.info
            res.update({
                "market_cap": info.get("marketCap"),
                "volume": info.get("volume"),
                "dividend_rate": info.get("dividendRate"),
                "dividend_yield": info.get("dividendYield"),
                "payout_ratio": info.get("payoutRatio")
            })

            return self.clean_nan(res, format_numbers=True)
        except Exception:
            logging.exception("getFinancials()")
            return {"error": "Failed to retrieve financials"}
