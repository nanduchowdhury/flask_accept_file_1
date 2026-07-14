import io
import logging

import pandas as pd
import requests


class NSEIndexDownloader:

    BASE_URL = (
        "https://nsearchives.nseindia.com/content/indices/"
    )

    INDEX_FILES = {

        "Nifty50":
            "ind_nifty50list.csv",

        "Nifty100":
            "ind_nifty100list.csv",

        "Nifty200":
            "ind_nifty200list.csv",

        "Nifty500":
            "ind_nifty500list.csv",

        "Nifty Midcap 150":
            "ind_niftymidcap150list.csv",

        "Nifty Smallcap 250":
            "ind_niftysmallcap250list.csv",

        "Nifty Auto":
            "ind_niftyautolist.csv",

        "Nifty Bank":
            "ind_niftybanklist.csv",

        "Nifty Energy":
            "ind_niftyenergylist.csv",

        "Nifty FMCG":
            "ind_niftyfmcglist.csv",

        "Nifty IT":
            "ind_niftyitlist.csv",

        "Nifty Metal":
            "ind_niftymetallist.csv",

        "Nifty Pharma":
            "ind_niftypharmalist.csv",

        "Nifty PSU Bank":
            "ind_niftypsubanklist.csv",

        "Nifty Realty":
            "ind_niftyrealtylist.csv"
    }

    def __init__(self):

        self.session = requests.Session()

        self.session.headers.update({

            "User-Agent":
                "Mozilla/5.0",

            "Referer":
                "https://www.nseindia.com"
        })

    def download(self):

        result = {}

        for index_name, filename in self.INDEX_FILES.items():

            url = self.BASE_URL + filename

            logging.info(
                "Downloading %s",
                index_name
            )

            try:

                response = self.session.get(
                    url,
                    timeout=30
                )

                response.raise_for_status()

                df = pd.read_csv(
                    io.StringIO(response.text)
                )

                symbols = []

                for symbol in df["Symbol"]:

                    symbols.append(
                        symbol.strip() + ".NS"
                    )

                result[index_name] = symbols

            except Exception as ex:

                logging.warning(
                    "%s : %s",
                    index_name,
                    ex
                )

                result[index_name] = []

        return result
        