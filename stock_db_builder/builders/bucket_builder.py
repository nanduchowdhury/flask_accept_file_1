import json
import yfinance as yf
import pandas as pd


class BucketBuilder:

    def __init__(self):
        pass

    def _safe_return(self, current, previous):

        if previous is None:
            return None

        if previous == 0:
            return None

        return round(((current - previous) / previous) * 100, 2)

    def _get_close_value(self, close, index):

        """
        Safely get a single closing price.

        yfinance may return Close as either:
        - pandas Series
        - pandas DataFrame with one column

        This handles both cases.
        """

        try:

            value = close.iloc[index]

            if isinstance(value, pd.Series):
                value = value.iloc[0]

            return float(value)

        except Exception:

            return None

    def _calculate_returns(self, ticker):

        try:

            df = yf.download(
                ticker,
                period="15mo",
                progress=False,
                auto_adjust=False,
                threads=False
            )

            if df is None or df.empty:
                return None

            close = df["Close"]

            # Need at least 252 trading days for 1Y
            if len(close) < 252:
                return None

            current = self._get_close_value(close, -1)

            if current is None:
                return None

            result = {

                "1W": self._safe_return(
                    current,
                    self._get_close_value(close, -6)
                ),

                "2W": self._safe_return(
                    current,
                    self._get_close_value(close, -11)
                ),

                "3W": self._safe_return(
                    current,
                    self._get_close_value(close, -16)
                ),

                "1M": self._safe_return(
                    current,
                    self._get_close_value(close, -22)
                ),

                "2M": self._safe_return(
                    current,
                    self._get_close_value(close, -44)
                ),

                "3M": self._safe_return(
                    current,
                    self._get_close_value(close, -66)
                ),

                "6M": self._safe_return(
                    current,
                    self._get_close_value(close, -132)
                ),

                "1Y": self._safe_return(
                    current,
                    self._get_close_value(close, -252)
                )
            }

            return result

        except Exception as e:

            print(f"Error {ticker}: {e}")

            return None

    def build(self, master_json_path, output_path):

        with open(master_json_path, "r", encoding="utf-8") as f:
            master_db = json.load(f)

        periods = [
            "1W",
            "2W",
            "3W",
            "1M",
            "2M",
            "3M",
            "6M",
            "1Y"
        ]

        rankings = {}

        for period in periods:
            rankings[period] = []

        total = len(master_db)

        for count, ticker in enumerate(master_db.keys(), start=1):

            print(f"[{count}/{total}] {ticker}")

            returns = self._calculate_returns(ticker)

            if not returns:
                continue

            for period in periods:

                value = returns.get(period)

                if value is None:
                    continue

                rankings[period].append({
                    "ticker": ticker,
                    "return": value
                })

        bucket_db = {
            "return": {}
        }

        for period in periods:

            sorted_data = sorted(
                rankings[period],
                key=lambda x: x["return"],
                reverse=True
            )

            top50 = sorted_data[:50]

            bottom50 = sorted_data[-50:]

            # Reverse bottom50 so the worst performer
            # appears first.
            bottom50 = list(reversed(bottom50))

            bucket_db["return"][period] = {

                "top50": top50,

                "bottom50": bottom50
            }

        with open(output_path, "w", encoding="utf-8") as f:

            json.dump(
                bucket_db,
                f,
                indent=4
            )

        print(f"Saved {output_path}")
        