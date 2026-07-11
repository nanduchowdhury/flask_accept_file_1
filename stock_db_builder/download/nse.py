import io
import logging

import pandas as pd
import requests

import config


NSE_EQUITY_URL = (
    "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
)


class NSEDownloader:

    def __init__(self):

        self.session = requests.Session()

        self.session.headers.update({

            "User-Agent": config.USER_AGENT,

            "Accept": "text/csv,*/*"

        })

    def download_equity_list(self):

        logging.info("Downloading NSE company list...")

        response = self.session.get(

            NSE_EQUITY_URL,

            timeout=config.REQUEST_TIMEOUT

        )

        response.raise_for_status()

        df = pd.read_csv(

            io.StringIO(response.text)

        )

        companies = {}

        for _, row in df.iterrows():

            symbol = str(row["SYMBOL"]).strip()

            ticker = symbol + ".NS"

            companies[ticker] = {

                "ticker": ticker,

                "symbol": symbol,

                "company_name": str(
                    row["NAME OF COMPANY"]
                ).strip(),

                "series": str(
                    row[" SERIES"]
                ).strip(),

                "isin": str(
                    row[" ISIN NUMBER"]
                ).strip(),

                "exchange": "NSE"

            }

        logging.info(

            "Downloaded %d NSE companies",

            len(companies)

        )

        return companies