import logging
import time

import yfinance as yf


class YahooDownloader:

    def __init__(self):

        self.retry_count = 3

    def get_company_info(self, ticker):

        delay = 1

        for attempt in range(self.retry_count):

            try:

                t = yf.Ticker(ticker)

                info = t.info

                if not info:
                    raise Exception("Empty info")

                company = {

                    "ticker": ticker,

                    "company_name":
                        info.get("longName"),

                    "short_name":
                        info.get("shortName"),

                    "sector":
                        info.get("sector"),

                    "industry":
                        info.get("industry"),

                    "website":
                        info.get("website"),

                    "country":
                        info.get("country"),

                    "city":
                        info.get("city"),

                    "state":
                        info.get("state"),

                    "employees":
                        info.get("fullTimeEmployees"),

                    "currency":
                        info.get("currency"),

                    "exchange":
                        info.get("exchange"),

                    "market_cap":
                        info.get("marketCap"),

                    "enterprise_value":
                        info.get("enterpriseValue"),

                    "shares_outstanding":
                        info.get("sharesOutstanding"),

                    "summary":
                        info.get("longBusinessSummary")

                }

                return company

            except Exception as ex:

                logging.warning(
                    "%s attempt %d failed : %s",
                    ticker,
                    attempt + 1,
                    str(ex)
                )

                time.sleep(delay)

                delay *= 2

        return {}
        