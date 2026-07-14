import logging

import config

from download.nse_indices import NSEIndexDownloader

from builders.index_builder import IndexBuilder

from utils.json_utils import load_json
from utils.json_utils import save_json


logging.basicConfig(

    level=logging.INFO,

    format="%(levelname)s : %(message)s"
)


def main():

    logging.info(
        "Loading master database..."
    )

    companies = load_json(
        config.MASTER_JSON
    )

    logging.info(
        "%d companies loaded.",
        len(companies)
    )

    downloader = NSEIndexDownloader()

    index_data = downloader.download()

    builder = IndexBuilder(index_data)

    builder.build(companies)

    save_json(
        config.MASTER_JSON,
        companies
    )

    logging.info(
        "Done."
    )


if __name__ == "__main__":

    main()
    