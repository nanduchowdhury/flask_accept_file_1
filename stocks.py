import yfinance as yf
import json
import pandas as pd
import os

class GenerateSectorSummary:
    def __init__(self, gemini_access, error_manager):
        self.gemini_access = gemini_access
        self.error_manager = error_manager

        # Simplified mapping of Indian sectors to representative Yahoo Finance tickers
        # In a real-world scenario, this would be much more comprehensive,
        # possibly using sector-specific ETFs or a broader list of major companies.
        self.indian_sectors = {
            "Financial Services": ["HDFCBANK.NS", "ICICIBANK.NS", "RELIANCE.NS"], # Reliance is diversified, but often impacts financials
            "Information Technology": ["TCS.NS", "INFY.NS", "WIPRO.NS"],
            "Automobile": ["MARUTI.NS", "TATAMOTORS.NS", "M&M.NS"],
            "Pharmaceuticals": ["SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS"],
            "Energy": ["RELIANCE.NS", "ONGC.NS", "IOC.NS"],
            "Consumer Goods": ["HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS"]
        }

    def _fetch_sector_data(self, sector_name, tickers):
        """
        Fetches historical data for given tickers and calculates performance metrics.
        """
        self.error_manager.show_any_message(f"Fetching data for sector: {sector_name} with tickers: {tickers}")
        data = yf.download(tickers, period="1mo", interval="1d")

        if data.empty:
            self.error_manager.show_any_message(f"No data found for tickers in {sector_name}.")
            return None

        sector_performance = {}
        for ticker in tickers:
            if 'Adj Close' in data:
                if isinstance(data['Adj Close'], pd.DataFrame): # Multiple tickers
                    if ticker in data['Adj Close'].columns:
                        close_prices = data['Adj Close'][ticker].dropna()
                    else:
                        self.error_manager.show_any_message(f"Ticker {ticker} not found in Adj Close data for {sector_name}.")
                        continue
                else: # Single ticker
                    close_prices = data['Adj Close'].dropna()
            else:
                self.error_any_message(f"Adj Close not found in data for {ticker}.")
                continue

            if not close_prices.empty:
                initial_price = close_prices.iloc[0]
                final_price = close_prices.iloc[-1]
                if initial_price != 0:
                    percentage_change = ((final_price - initial_price) / initial_price) * 100
                else:
                    percentage_change = 0
                sector_performance[ticker] = {
                    "initial_price": round(initial_price, 2),
                    "final_price": round(final_price, 2),
                    "percentage_change_1mo": round(percentage_change, 2)
                }
            else:
                self.error_manager.show_any_message(f"No valid close prices for {ticker} in {sector_name}.")

        return sector_performance

    def _generate_summary_with_gemini(self, sector_name, sector_data):
        """
        Generates a brief summary for a sector using Gemini LLM.
        """
        if not sector_data:
            return f"No recent data available for {sector_name} sector to generate a summary."

        prompt = f"""
        Based on the following Indian stock market data for the {sector_name} sector over the last month,
        provide a very brief, concise, and insightful summary (2-3 sentences).
        Highlight the overall performance and any notable movements of the key stocks.
        
        Sector: {sector_name}
        Data: {json.dumps(sector_data, indent=2)}
        
        Summary for {sector_name} sector:
        """
        
        self.error_manager.show_any_message(f"Sending prompt to Gemini for {sector_name} summary.")
        try:
            response = self.gemini_access.query_only_prompt(prompt)
            return response.strip()
        except Exception as e:
            self.error_manager.show_any_message(f"Error generating Gemini summary for {sector_name}: {e}")
            return f"Could not generate summary for {sector_name} due to an AI model error."

    def get_indian_stock_market_summary(self):
        """
        Orchestrates fetching data and generating summaries for all defined sectors.
        Returns a JSON object with summaries for each sector.
        """
        all_sector_summaries = {}
        for sector_name, tickers in self.indian_sectors.items():
            sector_data = self._fetch_sector_data(sector_name, tickers)
            summary = self._generate_summary_with_gemini(sector_name, sector_data)
            all_sector_summaries[sector_name] = summary
        
        self.error_manager.show_any_message("Finished generating all sector summaries.")
        return json.dumps(all_sector_summaries, indent=2)


