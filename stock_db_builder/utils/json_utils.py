import json
import os


def save_json(filename, data):

    os.makedirs(
        os.path.dirname(filename),
        exist_ok=True
    )

    with open(
        filename,
        "w",
        encoding="utf-8"
    ) as fp:

        json.dump(
            data,
            fp,
            indent=4,
            ensure_ascii=False,
            sort_keys=True
        )


def load_json(filename):

    if not os.path.exists(filename):
        return {}

    with open(
        filename,
        "r",
        encoding="utf-8"
    ) as fp:

        return json.load(fp)
        