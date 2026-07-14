import config

from builders.theme_builder import ThemeBuilder
from utils.json_utils import load_json
from utils.json_utils import save_json


def main():

    print("Loading master database...")

    master = load_json(config.MASTER_JSON)

    print(f"Loaded {len(master)} companies.")

    builder = ThemeBuilder(config.KNOWLEDGE_DIR)

    print("Building themes...")

    builder.build(master)

    print("Saving...")

    save_json(config.MASTER_JSON, master)

    print("Done.")


if __name__ == "__main__":
    main()
    