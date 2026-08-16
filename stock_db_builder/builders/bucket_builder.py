import json
import yfinance as yf
import pandas as pd


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

    # =========================================================
    # Utility
    # =========================================================

    def _get_series(self, df, column):

        try:

            result = df[column]

            if isinstance(result, pd.DataFrame):

                if result.shape[1] == 0:
                    return None

                result = result.iloc[:, 0]

            return result

        except Exception:

            return None

    # =========================================================
    # Return
    # =========================================================

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

    # =========================================================
    # Consecutive days
    # =========================================================

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

    # =========================================================
    # RSI
    # =========================================================

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

    # =========================================================
    # Analyse stock
    # =========================================================

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

            # =================================================
            # RETURNS
            # =================================================

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

            returns = {}

            for period, days in day_map.items():

                returns[period] = self._calculate_return(
                    close,
                    days
                )

            # =================================================
            # MOVING AVERAGES
            # =================================================

            dma20 = float(
                close.rolling(20).mean().iloc[-1]
            )

            dma50 = float(
                close.rolling(50).mean().iloc[-1]
            )

            dma200 = float(
                close.rolling(200).mean().iloc[-1]
            )

            above_20dma = current_price > dma20
            above_50dma = current_price > dma50
            above_200dma = current_price > dma200

            # =================================================
            # HIGH / LOW
            # =================================================

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

            # =================================================
            # VOLUME
            # =================================================

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

            # =================================================
            # CONSECUTIVE MOVES
            # =================================================

            consecutive_gainers = (
                self._consecutive_gainers(close)
            )

            consecutive_losers = (
                self._consecutive_losers(close)
            )

            # =================================================
            # RSI
            # =================================================

            rsi = self._calculate_rsi(close)

            # =================================================
            # BREAKOUT
            # =================================================

            previous_20_high = float(
                close.iloc[-21:-1].max()
            )

            previous_50_high = float(
                close.iloc[-51:-1].max()
            )

            breakout_20d = (
                current_price > previous_20_high
            )

            breakout_50d = (
                current_price > previous_50_high
            )

            # =================================================
            # MOMENTUM SCORE
            # =================================================

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

            # =================================================
            # SHORT TERM SCORE
            # =================================================

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

            # =================================================
            # ACCUMULATION SCORE
            # =================================================

            accumulation_score = 0

            if returns["1M"] is not None and returns["1M"] > 0:
                accumulation_score += 1

            if returns["3M"] is not None and returns["3M"] > 0:
                accumulation_score += 1

            if (
                volume_trend_5_vs_20 is not None
                and volume_trend_5_vs_20 > 10
            ):
                accumulation_score += 2

            if (
                volume_trend_20_vs_50 is not None
                and volume_trend_20_vs_50 > 5
            ):
                accumulation_score += 1

            if above_50dma:
                accumulation_score += 1

            if rvol is not None and rvol >= 1.2:
                accumulation_score += 2

            # =================================================
            # RECOVERY SCORE
            # =================================================

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

            # =================================================
            # RESULT
            # =================================================

            return {

                "ticker": ticker,

                "price": round(
                    current_price,
                    2
                ),

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
                    "distance_from_52w_high":
                        distance_from_52w_high,
                    "recovery_from_52w_low":
                        recovery_from_52w_low
                },

                "volume": {
                    "rvol": rvol,
                    "avg_volume_20":
                        round(avg_volume_20, 0),
                    "avg_volume_50":
                        round(avg_volume_50, 0),
                    "volume_trend_5_vs_20":
                        volume_trend_5_vs_20,
                    "volume_trend_20_vs_50":
                        volume_trend_20_vs_50
                },

                "price_action": {
                    "breakout_20d": breakout_20d,
                    "breakout_50d": breakout_50d,
                    "consecutive_gainers":
                        consecutive_gainers,
                    "consecutive_losers":
                        consecutive_losers
                },

                "indicators": {
                    "rsi": rsi
                },

                "scores": {
                    "momentum":
                        momentum_score,
                    "short_term":
                        short_term_score,
                    "accumulation":
                        accumulation_score,
                    "recovery":
                        recovery_score
                }
            }

        except Exception as e:

            print(
                f"Error analysing {ticker}: {e}"
            )

            return None

    # =========================================================
    # REASON HELPERS
    # =========================================================

    def _return_reason(self, period, value):

        if value is None:
            return None

        if value > 0:

            return (
                f"{period} return is "
                f"+{value:.2f}%"
            )

        return (
            f"{period} return is "
            f"{value:.2f}%"
        )

    def _add_return_reason(
        self,
        reasons,
        period,
        value,
        positive_only=False
    ):

        if value is None:
            return

        if positive_only and value <= 0:
            return

        reason = self._return_reason(
            period,
            value
        )

        if reason:
            reasons.append(reason)

    # =========================================================
    # MOMENTUM REASONS
    # =========================================================

    def _momentum_reasons(self, stock):

        reasons = []

        returns = stock["returns"]
        ma = stock["moving_average"]

        if returns["1W"] is not None and returns["1W"] > 0:

            reasons.append(
                f"1W return is +{returns['1W']:.2f}%"
            )

        if returns["1M"] is not None and returns["1M"] > 0:

            reasons.append(
                f"1M return is +{returns['1M']:.2f}%"
            )

        if returns["3M"] is not None and returns["3M"] > 0:

            reasons.append(
                f"3M return is +{returns['3M']:.2f}%"
            )

        if ma["above_20dma"]:

            reasons.append(
                "Price is above 20 DMA"
            )

        if ma["above_50dma"]:

            reasons.append(
                "Price is above 50 DMA"
            )

        if ma["above_200dma"]:

            reasons.append(
                "Price is above 200 DMA"
            )

        return reasons

    # =========================================================
    # SHORT TERM REASONS
    # =========================================================

    def _short_term_reasons(self, stock):

        reasons = []

        returns = stock["returns"]
        ma = stock["moving_average"]
        volume = stock["volume"]

        if returns["1W"] is not None and returns["1W"] > 0:

            reasons.append(
                f"1W return is +{returns['1W']:.2f}%"
            )

        if returns["2W"] is not None and returns["2W"] > 0:

            reasons.append(
                f"2W return is +{returns['2W']:.2f}%"
            )

        if returns["1M"] is not None and returns["1M"] > 0:

            reasons.append(
                f"1M return is +{returns['1M']:.2f}%"
            )

        if ma["above_20dma"]:

            reasons.append(
                "Price is above 20 DMA"
            )

        if (
            volume["rvol"] is not None
            and volume["rvol"] >= 1.5
        ):

            reasons.append(
                f"RVOL is {volume['rvol']:.2f}x"
            )

        return reasons

    # =========================================================
    # ACCUMULATION REASONS
    # =========================================================

    def _accumulation_reasons(self, stock):

        reasons = []

        returns = stock["returns"]
        ma = stock["moving_average"]
        volume = stock["volume"]

        if returns["1M"] is not None and returns["1M"] > 0:

            reasons.append(
                f"1M return is +{returns['1M']:.2f}%"
            )

        if returns["3M"] is not None and returns["3M"] > 0:

            reasons.append(
                f"3M return is +{returns['3M']:.2f}%"
            )

        if (
            volume["volume_trend_5_vs_20"]
            is not None
            and volume["volume_trend_5_vs_20"] > 10
        ):

            reasons.append(
                "5-day average volume is "
                f"{volume['volume_trend_5_vs_20']:.1f}% "
                "above 20-day average"
            )

        if (
            volume["volume_trend_20_vs_50"]
            is not None
            and volume["volume_trend_20_vs_50"] > 5
        ):

            reasons.append(
                "20-day average volume is "
                f"{volume['volume_trend_20_vs_50']:.1f}% "
                "above 50-day average"
            )

        if ma["above_50dma"]:

            reasons.append(
                "Price is above 50 DMA"
            )

        if (
            volume["rvol"] is not None
            and volume["rvol"] >= 1.2
        ):

            reasons.append(
                f"RVOL is {volume['rvol']:.2f}x"
            )

        return reasons

    # =========================================================
    # BREAKOUT REASONS
    # =========================================================

    def _breakout_reasons(self, stock):

        reasons = []

        price_action = stock["price_action"]
        volume = stock["volume"]
        ma = stock["moving_average"]
        returns = stock["returns"]

        if price_action["breakout_20d"]:

            reasons.append(
                "Price has broken above the "
                "previous 20-day high"
            )

        if price_action["breakout_50d"]:

            reasons.append(
                "Price has broken above the "
                "previous 50-day high"
            )

        if (
            volume["rvol"] is not None
            and volume["rvol"] >= 1.5
        ):

            reasons.append(
                f"Breakout is accompanied by "
                f"RVOL of {volume['rvol']:.2f}x"
            )

        if ma["above_50dma"]:

            reasons.append(
                "Price is above 50 DMA"
            )

        if (
            returns["1M"] is not None
            and returns["1M"] > 0
        ):

            reasons.append(
                f"1M return is +{returns['1M']:.2f}%"
            )

        return reasons

    # =========================================================
    # RECOVERY REASONS
    # =========================================================

    def _recovery_reasons(self, stock):

        reasons = []

        high_low = stock["high_low"]
        returns = stock["returns"]
        ma = stock["moving_average"]

        recovery = high_low[
            "recovery_from_52w_low"
        ]

        if recovery >= 20:

            reasons.append(
                f"Price is {recovery:.2f}% "
                "above its 52-week low"
            )

        if recovery >= 30:

            reasons.append(
                "Price has recovered more than "
                "30% from its 52-week low"
            )

        if recovery >= 50:

            reasons.append(
                "Price has recovered more than "
                "50% from its 52-week low"
            )

        if (
            returns["1M"] is not None
            and returns["1M"] > 0
        ):

            reasons.append(
                f"1M return is +{returns['1M']:.2f}%"
            )

        if (
            returns["3M"] is not None
            and returns["3M"] > 0
        ):

            reasons.append(
                f"3M return is +{returns['3M']:.2f}%"
            )

        if ma["above_20dma"]:

            reasons.append(
                "Price is above 20 DMA"
            )

        if ma["above_50dma"]:

            reasons.append(
                "Price is above 50 DMA"
            )

        return reasons

    # =========================================================
    # RETURN BUCKET REASONS
    # =========================================================

    def _return_bucket_entry(
        self,
        item,
        rank,
        period
    ):

        value = item["return"]

        reason = self._return_reason(
            period,
            value
        )

        return {
            "rank": rank,
            "ticker": item["ticker"],
            "return": value,
            "reason": reason
        }

    # =========================================================
    # BUILD
    # =========================================================

    def build(
        self,
        master_json_path,
        output_path
    ):

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

            result = self._analyse_stock(
                ticker
            )

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

                value = stock["returns"].get(
                    period
                )

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

            top50 = []

            for rank, item in enumerate(
                data[:self.top_n],
                start=1
            ):

                top50.append(
                    self._return_bucket_entry(
                        item,
                        rank,
                        period
                    )
                )

            bottom_data = list(
                reversed(data[-self.top_n:])
            )

            bottom50 = []

            for rank, item in enumerate(
                bottom_data,
                start=1
            ):

                bottom50.append({
                    "rank": rank,
                    "ticker": item["ticker"],
                    "return": item["return"],
                    "reason": self._return_reason(
                        period,
                        item["return"]
                    )
                })

            return_buckets[period] = {
                "top50": top50,
                "bottom50": bottom50
            }

        # =====================================================
        # MOMENTUM
        # =====================================================

        momentum_data = []

        for stock in analysed:

            momentum_data.append({
                "ticker": stock["ticker"],
                "score": stock["scores"]["momentum"],
                "return_1w": stock["returns"]["1W"],
                "return_1m": stock["returns"]["1M"],
                "return_3m": stock["returns"]["3M"],
                "above_20dma":
                    stock["moving_average"]["above_20dma"],
                "above_50dma":
                    stock["moving_average"]["above_50dma"],
                "above_200dma":
                    stock["moving_average"]["above_200dma"],
                "reasons":
                    self._momentum_reasons(stock)
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

        momentum_top50 = []

        for rank, item in enumerate(
            momentum_data[:self.top_n],
            start=1
        ):

            item["rank"] = rank
            momentum_top50.append(item)

        # =====================================================
        # SHORT TERM
        # =====================================================

        short_term_data = []

        for stock in analysed:

            short_term_data.append({
                "ticker": stock["ticker"],
                "score":
                    stock["scores"]["short_term"],
                "return_1w":
                    stock["returns"]["1W"],
                "return_2w":
                    stock["returns"]["2W"],
                "return_1m":
                    stock["returns"]["1M"],
                "rvol":
                    stock["volume"]["rvol"],
                "above_20dma":
                    stock["moving_average"]["above_20dma"],
                "reasons":
                    self._short_term_reasons(stock)
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

        short_term_top50 = []

        for rank, item in enumerate(
            short_term_data[:self.top_n],
            start=1
        ):

            item["rank"] = rank
            short_term_top50.append(item)

        # =====================================================
        # ACCUMULATION
        # =====================================================

        accumulation_data = []

        for stock in analysed:

            accumulation_data.append({
                "ticker": stock["ticker"],
                "score":
                    stock["scores"]["accumulation"],
                "return_1m":
                    stock["returns"]["1M"],
                "return_3m":
                    stock["returns"]["3M"],
                "rvol":
                    stock["volume"]["rvol"],
                "volume_trend_5_vs_20":
                    stock["volume"][
                        "volume_trend_5_vs_20"
                    ],
                "volume_trend_20_vs_50":
                    stock["volume"][
                        "volume_trend_20_vs_50"
                    ],
                "reasons":
                    self._accumulation_reasons(stock)
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

        accumulation_top50 = []

        for rank, item in enumerate(
            accumulation_data[:self.top_n],
            start=1
        ):

            item["rank"] = rank
            accumulation_top50.append(item)

        # =====================================================
        # BREAKOUT
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
                "return_1m":
                    stock["returns"]["1M"],
                "reasons":
                    self._breakout_reasons(stock)
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

        breakout_top50 = []

        for rank, item in enumerate(
            breakout_data[:self.top_n],
            start=1
        ):

            item["rank"] = rank
            breakout_top50.append(item)

        # =====================================================
        # RECOVERY
        # =====================================================

        recovery_data = []

        for stock in analysed:

            recovery_data.append({
                "ticker": stock["ticker"],
                "score":
                    stock["scores"]["recovery"],
                "recovery_from_52w_low":
                    stock["high_low"][
                        "recovery_from_52w_low"
                    ],
                "return_1m":
                    stock["returns"]["1M"],
                "return_3m":
                    stock["returns"]["3M"],
                "above_20dma":
                    stock["moving_average"]["above_20dma"],
                "above_50dma":
                    stock["moving_average"]["above_50dma"],
                "reasons":
                    self._recovery_reasons(stock)
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

        recovery_top50 = []

        for rank, item in enumerate(
            recovery_data[:self.top_n],
            start=1
        ):

            item["rank"] = rank
            recovery_top50.append(item)

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
                "return_1w":
                    stock["returns"]["1W"],
                "return_1m":
                    stock["returns"]["1M"],
                "reasons": [
                    f"RVOL is {rvol:.2f}x"
                ]
            })

        high_rvol = sorted(
            high_rvol,
            key=lambda x: x["rvol"],
            reverse=True
        )

        high_rvol_top50 = []

        for rank, item in enumerate(
            high_rvol[:self.top_n],
            start=1
        ):

            item["rank"] = rank

            if (
                item["return_1w"] is not None
                and item["return_1w"] > 0
            ):

                item["reasons"].append(
                    f"1W return is "
                    f"+{item['return_1w']:.2f}%"
                )

            high_rvol_top50.append(item)

        # =====================================================
        # STRONG TREND
        # =====================================================

        strong_trend = []

        for stock in analysed:

            score = 0
            reasons = []

            ma = stock["moving_average"]

            if ma["above_20dma"]:

                score += 1

                reasons.append(
                    "Price is above 20 DMA"
                )

            if ma["above_50dma"]:

                score += 1

                reasons.append(
                    "Price is above 50 DMA"
                )

            if ma["above_200dma"]:

                score += 1

                reasons.append(
                    "Price is above 200 DMA"
                )

            strong_trend.append({
                "ticker": stock["ticker"],
                "score": score,
                "above_20dma":
                    ma["above_20dma"],
                "above_50dma":
                    ma["above_50dma"],
                "above_200dma":
                    ma["above_200dma"],
                "return_3m":
                    stock["returns"]["3M"],
                "reasons": reasons
            })

        strong_trend = sorted(
            strong_trend,
            key=lambda x: (
                x["score"],
                x["return_3m"] or -999
            ),
            reverse=True
        )

        strong_trend_top50 = []

        for rank, item in enumerate(
            strong_trend[:self.top_n],
            start=1
        ):

            item["rank"] = rank
            strong_trend_top50.append(item)

        # =====================================================
        # CONSECUTIVE GAINERS
        # =====================================================

        consecutive_gainers = []

        for stock in analysed:

            count = stock["price_action"][
                "consecutive_gainers"
            ]

            if count > 0:

                reasons = [
                    f"{count} consecutive "
                    "gaining sessions"
                ]

                return_1w = stock["returns"]["1W"]

                if (
                    return_1w is not None
                    and return_1w > 0
                ):

                    reasons.append(
                        f"1W return is "
                        f"+{return_1w:.2f}%"
                    )

                consecutive_gainers.append({
                    "ticker": stock["ticker"],
                    "consecutive_gainers": count,
                    "return_1w": return_1w,
                    "reasons": reasons
                })

        consecutive_gainers = sorted(
            consecutive_gainers,
            key=lambda x: (
                x["consecutive_gainers"],
                x["return_1w"] or -999
            ),
            reverse=True
        )

        consecutive_gainers_top50 = []

        for rank, item in enumerate(
            consecutive_gainers[:self.top_n],
            start=1
        ):

            item["rank"] = rank
            consecutive_gainers_top50.append(item)

        # =====================================================
        # CONSECUTIVE LOSERS
        # =====================================================

        consecutive_losers = []

        for stock in analysed:

            count = stock["price_action"][
                "consecutive_losers"
            ]

            if count > 0:

                reasons = [
                    f"{count} consecutive "
                    "losing sessions"
                ]

                return_1w = stock["returns"]["1W"]

                if (
                    return_1w is not None
                    and return_1w < 0
                ):

                    reasons.append(
                        f"1W return is "
                        f"{return_1w:.2f}%"
                    )

                consecutive_losers.append({
                    "ticker": stock["ticker"],
                    "consecutive_losers": count,
                    "return_1w": return_1w,
                    "reasons": reasons
                })

        consecutive_losers = sorted(
            consecutive_losers,
            key=lambda x: (
                x["consecutive_losers"],
                -(x["return_1w"] or 0)
            ),
            reverse=True
        )

        consecutive_losers_top50 = []

        for rank, item in enumerate(
            consecutive_losers[:self.top_n],
            start=1
        ):

            item["rank"] = rank
            consecutive_losers_top50.append(item)

        # =====================================================
        # FINAL DATABASE
        # =====================================================

        bucket_db = {

            "return": return_buckets,

            "momentum": {
                "top50": momentum_top50
            },

            "short_term": {
                "top50": short_term_top50
            },

            "accumulation": {
                "top50": accumulation_top50
            },

            "breakout": {
                "top50": breakout_top50
            },

            "recovery": {
                "top50": recovery_top50
            },

            "volume": {
                "high_rvol": high_rvol_top50
            },

            "technical": {
                "strong_trend":
                    strong_trend_top50,

                "consecutive_gainers":
                    consecutive_gainers_top50,

                "consecutive_losers":
                    consecutive_losers_top50
            }
        }

        # =====================================================
        # SAVE
        # =====================================================

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
            f"Saved bucket database: "
            f"{output_path}"
        )

