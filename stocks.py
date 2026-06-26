import json
import io
import csv
import requests
import yfinance as yf
from gcs_manager import GCSManager
import constants

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
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={name}"
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

    def getData(self, ticker, months="12"):
        """
        Retrieves stock price history for the specified ticker for the last N months.
        Returns the data as a JSON string containing date and closing prices.
        """
        try:
            stock = yf.Ticker(ticker)
            # Fetch history for the specified period (e.g., "12mo")
            period_str = f"{months}mo"
            df = stock.history(period=period_str)
            
            if df.empty:
                return json.dumps({"error": "No data found for the ticker"})

            # Prepare data for JSON: reset index to get Date, format Date as string
            df = df.reset_index()
            df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
            
            # Convert selected columns to list of dictionaries
            result = df[['Date', 'Close']].to_dict(orient='records')
            return json.dumps(result)
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
