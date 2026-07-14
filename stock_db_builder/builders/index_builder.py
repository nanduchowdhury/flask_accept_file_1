class IndexBuilder:

    def __init__(self, index_data):

        self.index_data = index_data

    def build(self, companies):

        #
        # clear previous values
        #
        for company in companies.values():

            company["indices"] = []

        #
        # update memberships
        #
        for index_name, tickers in self.index_data.items():

            for ticker in tickers:

                if ticker in companies:

                    companies[ticker][
                        "indices"
                    ].append(index_name)

        return companies
        