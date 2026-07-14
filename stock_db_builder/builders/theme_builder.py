import json
import os


class ThemeBuilder:

    def __init__(self, knowledge_dir):

        filename = os.path.join(
            knowledge_dir,
            "themes.json"
        )

        with open(filename, encoding="utf-8") as fp:

            self.themes = json.load(fp)

    def build(self, companies):

        for ticker, company in companies.items():

            text = " ".join([

                company.get("company_name") or "",

                company.get("sector") or "",

                company.get("industry") or "",

                company.get("summary") or ""

            ]).lower()

            matched = []

            for theme, data in self.themes.items():

                keywords = data.get("keywords", [])

                for keyword in keywords:

                    if keyword.lower() in text:

                        matched.append(theme)

                        break

            company["themes"] = sorted(matched)

        return companies
        