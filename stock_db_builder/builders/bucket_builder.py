import json
import yfinance as yf
import pandas as pd
import numpy as np


class BucketBuilder:

    def __init__(self):

        self.periods = [
            "1W",
            "2W",
            "3W",
            "1M",
            "2M",
            "3M",
            "6M",
            "1Y"
        ]

        self.top_n = 50

    # ---------------------------------------------------------
    # Utility
    # ---------------------------------------------------------

    def _get_series(self, df, column):

        """
        Handles yfinance's different column structures.

        Depending on yfinance version/settings, df[column]
        can sometimes return a Series and sometimes a
        one-column DataFrame.
        """

        try:

            result = df[column]

            if isinstance(result, pd.DataFrame):

                if result.shape[1] == 0:
                    return None

                result = result.iloc[:, 0]

            return result

        except Exception:

            return None

    # ---------------------------------------------------------
    # Return
    # ---------------------------------------------------------

    def _calculate_return(self, close, days):

        try:

            if len(close) <= days:
                return None

            current = float(close.iloc[-1])
            previous = float(close.iloc[-(days + 1)])

            if previous == 0:
                return None

            return round(
                ((current - previous) / previous) * 100,
                2
            )

        except Exception:

            return None

    # ---------------------------------------------------------
    # Consecutive days
    # ---------------------------------------------------------

    def _consecutive_gainers(self, close):

        count = 0

        try:

            for i in range(len(close) - 1, 0, -1):

                if close.iloc[i] > close.iloc[i - 1]:
                    count += 1
                else:
                    break

        except Exception:
            pass

        return count

    def _consecutive_losers(self, close):

        count = 0

        try:

            for i in range(len(close) - 1, 0, -1):

                if close.iloc[i] < close.iloc[i - 1]:
                    count += 1
                else:
                    break

        except Exception:
            pass

        return count

    # ---------------------------------------------------------
    # RSI
    # ---------------------------------------------------------

    def _calculate_rsi(self, close, period=14):

        try:

            delta = close.diff()

            gain = delta.clip(lower=0)
            loss = -delta.clip(upper=0)

            avg_gain = gain.rolling(period).mean()
            avg_loss = loss.rolling(period).mean()

            rs = avg_gain / avg_loss

            rsi = 100 - (100 / (1 + rs))

            value = rsi.iloc[-1]

            if pd.isna(value):
                return None

            return round(float(value), 2)

        except Exception:

            return None

    # ---------------------------------------------------------
    # Analyse one stock
    # ---------------------------------------------------------

    def _analyse_stock(self, ticker):

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

            close = self._get_series(df, "Close")
            volume = self._get_series(df, "Volume")

            if close is None or volume is None:
                return None

            close = pd.to_numeric(
                close,
                errors="coerce"
            ).dropna()

            volume = pd.to_numeric(
                volume,
                errors="coerce"
            ).dropna()

            if len(close) < 252:
                return None

            current_price = float(close.iloc[-1])

            # -------------------------------------------------
            # Returns
            # -------------------------------------------------

            returns = {}

            day_map = {
                "1W": 5,
                "2W": 10,
                "3W": 15,
                "1M": 21,
                "2M": 42,
                "3M": 63,
                "6M": 126,
                "1Y": 252
            }

            for period, days in day_map.items():

                returns[period] = self._calculate_return(
                    close,
                    days
                )

            # -------------------------------------------------
            # Moving averages
            # -------------------------------------------------

            dma20 = close.rolling(20).mean().iloc[-1]
            dma50 = close.rolling(50).mean().iloc[-1]
            dma200 = close.rolling(200).mean().iloc[-1]

            dma20 = float(dma20)
            dma50 = float(dma50)
            dma200 = float(dma200)

            # -------------------------------------------------
            # 20D / 50D / 52W highs and lows
            # -------------------------------------------------

            high_20 = float(close.tail(20).max())
            high_50 = float(close.tail(50).max())

            high_52w = float(close.tail(252).max())
            low_52w = float(close.tail(252).min())

            distance_from_52w_high = round(
                ((current_price - high_52w) / high_52w) * 100,
                2
            )

            recovery_from_52w_low = round(
                ((current_price - low_52w) / low_52w) * 100,
                2
            )

            # -------------------------------------------------
            # Volume / RVOL
            # -------------------------------------------------

            current_volume = float(volume.iloc[-1])

            avg_volume_20 = float(
                volume.tail(20).mean()
            )

            avg_volume_50 = float(
                volume.tail(50).mean()
            )

            if avg_volume_20 > 0:

                rvol = round(
                    current_volume / avg_volume_20,
                    2
                )

            else:

                rvol = None

            # -------------------------------------------------
            # Volume trend
            # -------------------------------------------------

            volume_5 = float(
                volume.tail(5).mean()
            )

            volume_20 = float(
                volume.tail(20).mean()
            )

            volume_50 = float(
                volume.tail(50).mean()
            )

            volume_trend_5_vs_20 = None
            volume_trend_20_vs_50 = None

            if volume_20 > 0:

                volume_trend_5_vs_20 = round(
                    ((volume_5 - volume_20) / volume_20) * 100,
                    2
                )

            if volume_50 > 0:

                volume_trend_20_vs_50 = round(
                    ((volume_20 - volume_50) / volume_50) * 100,
                    2
                )

            # -------------------------------------------------
            # Consecutive days
            # -------------------------------------------------

            consecutive_gainers = self._consecutive_gainers(
                close
            )

            consecutive_losers = self._consecutive_losers(
                close
            )

            # -------------------------------------------------
            # RSI
            # -------------------------------------------------

            rsi = self._calculate_rsi(close)

            # -------------------------------------------------
            # Breakout
            # -------------------------------------------------

            previous_20_high = float(
                close.iloc[-21:-1].max()
            )

            previous_50_high = float(
                close.iloc[-51:-1].max()
            )

            breakout_20d = current_price > previous_20_high
            breakout_50d = current_price > previous_50_high

            # -------------------------------------------------
            # Trend
            # -------------------------------------------------

            above_20dma = current_price > dma20
            above_50dma = current_price > dma50
            above_200dma = current_price > dma200

            # -------------------------------------------------
            # Momentum score
            # -------------------------------------------------

            momentum_score = 0

            if returns["1W"] is not None and returns["1W"] > 0:
                momentum_score += 1

            if returns["1M"] is not None and returns["1M"] > 0:
                momentum_score += 2

            if returns["3M"] is not None and returns["3M"] > 0:
                momentum_score += 2

            if above_20dma:
                momentum_score += 1

            if above_50dma:
                momentum_score += 1

            if above_200dma:
                momentum_score += 1

            # -------------------------------------------------
            # Short-term score
            # -------------------------------------------------

            short_term_score = 0

            if returns["1W"] is not None and returns["1W"] > 0:
                short_term_score += 2

            if returns["2W"] is not None and returns["2W"] > 0:
                short_term_score += 2

            if returns["1M"] is not None and returns["1M"] > 0:
                short_term_score += 2

            if above_20dma:
                short_term_score += 1

            if rvol is not None and rvol >= 1.5:
                short_term_score += 2

            # -------------------------------------------------
            # Accumulation score
            # -------------------------------------------------

            accumulation_score = 0

            if returns["1M"] is not None and returns["1M"] > 0:
                accumulation_score += 1

            if returns["3M"] is not None and returns["3M"] > 0:
                accumulation_score += 1

            if volume_trend_5_vs_20 is not None:

                if volume_trend_5_vs_20 > 10:
                    accumulation_score += 2

            if volume_trend_20_vs_50 is not None:

                if volume_trend_20_vs_50 > 5:
                    accumulation_score += 1

            if above_50dma:
                accumulation_score += 1

            if rvol is not None and rvol >= 1.2:
                accumulation_score += 2

            # -------------------------------------------------
            # Recovery score
            # -------------------------------------------------

            recovery_score = 0

            if recovery_from_52w_low >= 20:
                recovery_score += 1

            if recovery_from_52w_low >= 30:
                recovery_score += 1

            if recovery_from_52w_low >= 50:
                recovery_score += 1

            if returns["1M"] is not None and returns["1M"] > 0:
                recovery_score += 1

            if returns["3M"] is not None and returns["3M"] > 0:
                recovery_score += 1

            if above_20dma:
                recovery_score += 1

            if above_50dma:
                recovery_score += 1

            # -------------------------------------------------
            # Return everything
            # -------------------------------------------------

            return {

                "ticker": ticker,

                "price": round(current_price, 2),

                "returns": returns,

                "moving_average": {
                    "dma20": round(dma20, 2),
                    "dma50": round(dma50, 2),
                    "dma200": round(dma200, 2),
                    "above_20dma": above_20dma,
                    "above_50dma": above_50dma,
                    "above_200dma": above_200dma
                },

                "high_low": {
                    "high_20d": round(high_20, 2),
                    "high_50d": round(high_50, 2),
                    "high_52w": round(high_52w, 2),
                    "low_52w": round(low_52w, 2),
                    "distance_from_52w_high": distance_from_52w_high,
                    "recovery_from_52w_low": recovery_from_52w_low
                },

                "volume": {
                    "rvol": rvol,
                    "avg_volume_20": round(avg_volume_20, 0),
                    "avg_volume_50": round(avg_volume_50, 0),
                    "volume_trend_5_vs_20": volume_trend_5_vs_20,
                    "volume_trend_20_vs_50": volume_trend_20_vs_50
                },

                "price_action": {
                    "breakout_20d": breakout_20d,
                    "breakout_50d": breakout_50d,
                    "consecutive_gainers": consecutive_gainers,
                    "consecutive_losers": consecutive_losers
                },

                "indicators": {
                    "rsi": rsi
                },

                "scores": {
                    "momentum": momentum_score,
                    "short_term": short_term_score,
                    "accumulation": accumulation_score,
                    "recovery": recovery_score
                }
            }

        except Exception as e:

            print(f"Error analysing {ticker}: {e}")

            return None

    # ---------------------------------------------------------
    # Ranking helper
    # ---------------------------------------------------------

    def _top_items(self, data, key, n=None):

        if n is None:
            n = self.top_n

        data = [
            item
            for item in data
            if item.get(key) is not None
        ]

        return sorted(
            data,
            key=lambda x: x[key],
            reverse=True
        )[:n]

    # ---------------------------------------------------------
    # Build database
    # ---------------------------------------------------------

    def build(self, master_json_path, output_path):

        with open(
            master_json_path,
            "r",
            encoding="utf-8"
        ) as f:

            master_db = json.load(f)

        analysed = []

        total = len(master_db)

        for count, ticker in enumerate(
            master_db.keys(),
            start=1
        ):

            print(
                f"[{count}/{total}] {ticker}"
            )

            result = self._analyse_stock(ticker)

            if result is not None:
                analysed.append(result)

        print(
            f"Successfully analysed "
            f"{len(analysed)} / {total} stocks"
        )

        # =====================================================
        # RETURN BUCKETS
        # =====================================================

        return_buckets = {}

        for period in self.periods:

            data = []

            for stock in analysed:

                value = stock["returns"].get(period)

                if value is None:
                    continue

                data.append({
                    "ticker": stock["ticker"],
                    "return": value
                })

            data = sorted(
                data,
                key=lambda x: x["return"],
                reverse=True
            )

            return_buckets[period] = {

                "top50": data[:50],

                "bottom50": list(
                    reversed(data[-50:])
                )
            }

        # =====================================================
        # TOP MOMENTUM STOCKS
        # =====================================================

        momentum_data = []

        for stock in analysed:

            momentum_data.append({
                "ticker": stock["ticker"],
                "score": stock["scores"]["momentum"],
                "return_1w": stock["returns"]["1W"],
                "return_1m": stock["returns"]["1M"],
                "return_3m": stock["returns"]["3M"],
                "above_20dma": stock["moving_average"]["above_20dma"],
                "above_50dma": stock["moving_average"]["above_50dma"],
                "above_200dma": stock["moving_average"]["above_200dma"]
            })

        momentum_data = sorted(
            momentum_data,
            key=lambda x: (
                x["score"],
                x["return_1m"] or -999,
                x["return_3m"] or -999
            ),
            reverse=True
        )

        # =====================================================
        # BEST SHORT TERM STOCKS
        # =====================================================

        short_term_data = []

        for stock in analysed:

            short_term_data.append({
                "ticker": stock["ticker"],
                "score": stock["scores"]["short_term"],
                "return_1w": stock["returns"]["1W"],
                "return_2w": stock["returns"]["2W"],
                "return_1m": stock["returns"]["1M"],
                "rvol": stock["volume"]["rvol"],
                "above_20dma": stock["moving_average"]["above_20dma"]
            })

        short_term_data = sorted(
            short_term_data,
            key=lambda x: (
                x["score"],
                x["return_1w"] or -999,
                x["return_1m"] or -999
            ),
            reverse=True
        )

        # =====================================================
        # ACCUMULATION
        # =====================================================

        accumulation_data = []

        for stock in analysed:

            accumulation_data.append({
                "ticker": stock["ticker"],
                "score": stock["scores"]["accumulation"],
                "return_1m": stock["returns"]["1M"],
                "return_3m": stock["returns"]["3M"],
                "rvol": stock["volume"]["rvol"],
                "volume_trend_5_vs_20":
                    stock["volume"]["volume_trend_5_vs_20"],
                "volume_trend_20_vs_50":
                    stock["volume"]["volume_trend_20_vs_50"]
            })

        accumulation_data = sorted(
            accumulation_data,
            key=lambda x: (
                x["score"],
                x["rvol"] or -999,
                x["return_1m"] or -999
            ),
            reverse=True
        )

        # =====================================================
        # BREAKOUTS
        # =====================================================

        breakout_data = []

        for stock in analysed:

            breakout_score = 0

            if stock["price_action"]["breakout_20d"]:
                breakout_score += 2

            if stock["price_action"]["breakout_50d"]:
                breakout_score += 3

            rvol = stock["volume"]["rvol"]

            if rvol is not None and rvol >= 1.5:
                breakout_score += 2

            if stock["moving_average"]["above_50dma"]:
                breakout_score += 1

            breakout_data.append({
                "ticker": stock["ticker"],
                "score": breakout_score,
                "breakout_20d":
                    stock["price_action"]["breakout_20d"],
                "breakout_50d":
                    stock["price_action"]["breakout_50d"],
                "rvol": rvol,
                "return_1m": stock["returns"]["1M"]
            })

        breakout_data = sorted(
            breakout_data,
            key=lambda x: (
                x["score"],
                x["rvol"] or -999,
                x["return_1m"] or -999
            ),
            reverse=True
        )

        # =====================================================
        # RECOVERING FROM LOWS
        # =====================================================

        recovery_data = []

        for stock in analysed:

            recovery_data.append({
                "ticker": stock["ticker"],
                "score": stock["scores"]["recovery"],
                "recovery_from_52w_low":
                    stock["high_low"]["recovery_from_52w_low"],
                "return_1m":
                    stock["returns"]["1M"],
                "return_3m":
                    stock["returns"]["3M"],
                "above_20dma":
                    stock["moving_average"]["above_20dma"],
                "above_50dma":
                    stock["moving_average"]["above_50dma"]
            })

        recovery_data = sorted(
            recovery_data,
            key=lambda x: (
                x["score"],
                x["recovery_from_52w_low"] or -999,
                x["return_3m"] or -999
            ),
            reverse=True
        )

        # =====================================================
        # HIGH RVOL
        # =====================================================

        high_rvol = []

        for stock in analysed:

            rvol = stock["volume"]["rvol"]

            if rvol is None:
                continue

            high_rvol.append({
                "ticker": stock["ticker"],
                "rvol": rvol,
                "return_1d":
                    stock["returns"]["1W"],
                "return_1m":
                    stock["returns"]["1M"]
            })

        high_rvol = sorted(
            high_rvol,
            key=lambda x: x["rvol"],
            reverse=True
        )

        # =====================================================
        # STRONG TREND
        # =====================================================

        strong_trend = []

        for stock in analysed:

            score = 0

            if stock["moving_average"]["above_20dma"]:
                score += 1

            if stock["moving_average"]["above_50dma"]:
                score += 1

            if stock["moving_average"]["above_200dma"]:
                score += 1

            strong_trend.append({
                "ticker": stock["ticker"],
                "score": score,
                "above_20dma":
                    stock["moving_average"]["above_20dma"],
                "above_50dma":
                    stock["moving_average"]["above_50dma"],
                "above_200dma":
                    stock["moving_average"]["above_200dma"],
                "return_3m":
                    stock["returns"]["3M"]
            })

        strong_trend = sorted(
            strong_trend,
            key=lambda x: (
                x["score"],
                x["return_3m"] or -999
            ),
            reverse=True
        )

        # =====================================================
        # CONSECUTIVE GAINERS
        # =====================================================

        consecutive_gainers = []

        for stock in analysed:

            count = stock["price_action"][
                "consecutive_gainers"
            ]

            if count > 0:

                consecutive_gainers.append({
                    "ticker": stock["ticker"],
                    "consecutive_gainers": count,
                    "return_1w":
                        stock["returns"]["1W"]
                })

        consecutive_gainers = sorted(
            consecutive_gainers,
            key=lambda x: (
                x["consecutive_gainers"],
                x["return_1w"] or -999
            ),
            reverse=True
        )

        # =====================================================
        # CONSECUTIVE LOSERS
        # =====================================================

        consecutive_losers = []

        for stock in analysed:

            count = stock["price_action"][
                "consecutive_losers"
            ]

            if count > 0:

                consecutive_losers.append({
                    "ticker": stock["ticker"],
                    "consecutive_losers": count,
                    "return_1w":
                        stock["returns"]["1W"]
                })

        consecutive_losers = sorted(
            consecutive_losers,
            key=lambda x: (
                x["consecutive_losers"],
                -(x["return_1w"] or 0)
            ),
            reverse=True
        )

        # =====================================================
        # FINAL DATABASE
        # =====================================================

        bucket_db = {

            "return": return_buckets,

            "momentum": {
                "top50": momentum_data[:50]
            },

            "short_term": {
                "top50": short_term_data[:50]
            },

            "accumulation": {
                "top50": accumulation_data[:50]
            },

            "breakout": {
                "top50": breakout_data[:50]
            },

            "recovery": {
                "top50": recovery_data[:50]
            },

            "volume": {
                "high_rvol": high_rvol[:50]
            },

            "technical": {
                "strong_trend": strong_trend[:50],
                "consecutive_gainers":
                    consecutive_gainers[:50],
                "consecutive_losers":
                    consecutive_losers[:50]
            }
        }

        with open(
            output_path,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                bucket_db,
                f,
                indent=4
            )

        print(
            f"Saved bucket database: {output_path}"
        )
        