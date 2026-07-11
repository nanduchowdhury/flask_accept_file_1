import logging
import os
import time

import config

from download.nse import NSEDownloader
from download.yahoo import YahooDownloader

from utils.json_utils import load_json
from utils.json_utils import save_json


logging.basicConfig(

    level=logging.INFO,

    format="%(levelname)s : %(message)s"

)


def create_directories():

    os.makedirs(config.CACHE_DIR, exist_ok=True)

    os.makedirs(config.OUTPUT_DIR, exist_ok=True)

    os.makedirs(config.LOG_DIR, exist_ok=True)


def main():

    create_directories()

    nse = NSEDownloader()

    yahoo = YahooDownloader()

    companies = nse.download_equity_list()

    master = load_json(config.MASTER_JSON)

    downloaded = len(master)

    print()

    print("Already downloaded:", downloaded)

    print()

    count = downloaded

    total = len(companies)

    for i, ticker in enumerate(companies.keys(), start=1):

        if ticker in master:

            continue

        print(f"[{i}/{total}] {ticker}")

        company = companies[ticker]

        info = yahoo.get_company_info(ticker)

        if info:

            company.update(info)

            master[ticker] = company

            count += 1

        #
        # Save every 25 companies.
        #
        if count % 25 == 0:

            print("Saving JSON...")

            save_json(

                config.MASTER_JSON,

                master

            )

        #
        # Be polite to Yahoo.
        #
        time.sleep(0.4)

    save_json(

        config.MASTER_JSON,

        master

    )

    print()

    print("Completed")

    print(count)

    print("companies")


if __name__ == "__main__":

    main()


