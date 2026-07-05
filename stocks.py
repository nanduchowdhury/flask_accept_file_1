from datetime import datetime, timedelta
import json
import io
import csv
import pandas as pd
import requests
import yfinance as yf
from gcs_manager import GCSManager
import constants
import logging

# Set timezone cache to /tmp to avoid SIGSEGV in read-only environments like Cloud Run
yf.set_tz_cache_location("/tmp")

class GenerateSectorSummary:
    def __init__(self):
        # The GCSManager is initialized with the base GCS_ROOT_FOLDER.
        # The specific subfolder 'stocks_analysis' will be part of the file_path.
        self.gcs_manager = GCSManager("kupmanduk-bucket", constants.GCS_ROOT_FOLDER) 

    def get_sector_info(self, sector):
        # Construct filename for the JSON file within the 'stocks_analysis' subfolder
        file_path = f"stocks_analysis/stocks_{sector}_info.json"
        try:
            # Read the JSON content from GCS and convert it to a string
            content_json = self.gcs_manager.read_json(file_path)
            return json.dumps(content_json) if content_json else ""
        except Exception as e:
            return f"Error reading sector info: {str(e)}"

class StockDataRetriever:
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
        Fetches the full company name for a given ticker symbol using yfinance.
        """
        try:
            return yf.Ticker(ticker).info.get('longName', ticker)
        except Exception:
            return ticker

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

            df = df[['Close']].reset_index()
            df['Date'] = df['Date'].dt.strftime('%d%b%y')

            return df.to_json(orient='records')

        except Exception as e:
            return json.dumps({"error": str(e)})

    def getTickerList(self):
        """
        Fetches the Nifty 500 ticker list dynamically from the official NSE source.
        While yfinance itself doesn't provide index components directly, this 
        ensures the symbols are current and formatted for yfinance (.NS) usage.
        """
        url = "https://archives.nseindia.com/content/indices/ind_nifty500list.csv"
        headers = {'User-Agent': 'Mozilla/5.0'}
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            csv_reader = csv.DictReader(io.StringIO(response.text))
            tickers = [f"{row['Company Name']} - {row['Symbol']}.NS" for row in csv_reader if 'Symbol' in row and 'Company Name' in row]
            if tickers:
                return tickers
        except Exception:
            # Fallback to curated list if remote fetch fails
            pass

        return []

    def getEvents(self, ticker, months="12"):
        """
        Retrieves corporate actions (dividends, splits) and news events 
        for a given ticker within the specified number of months.
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=int(months) * 30)
            
            t = yf.Ticker(ticker)
            events = []

            # 1. Get Actions (Dividends/Splits)
            actions = t.actions
            if not actions.empty:
                for date, row in actions.iterrows():
                    if date.timestamp() < cutoff_date.timestamp():
                        continue
                        
                    div = row.get('Dividends', 0)
                    splits = row.get('Stock Splits', 0)
                    if div > 0:
                        events.append({"date": date, "event": f"Dividend: {div}"})
                    if splits > 0:
                        events.append({"date": date, "event": f"Stock Split: {splits}"})

            # 2. Get News
            news = t.news
            for item in news:
                publish_time = item.get('providerPublishTime')
                title = item.get('title')
                if publish_time is not None and title:
                    dt_object = datetime.fromtimestamp(publish_time)
                    if dt_object < cutoff_date:
                        continue
                        
                    events.append({"date": dt_object, "event": title})

            # Sort by date descending using the datetime objects
            events.sort(key=lambda x: x['date'].timestamp(), reverse=True)

            # Format the date strings to match getData format (%d%b%y) for frontend alignment
            # e.g., 03Jul26
            for e in events:
                e['date'] = e['date'].strftime('%d%b%y')

            return events
        except Exception as e:
            return {"error": str(e)}
