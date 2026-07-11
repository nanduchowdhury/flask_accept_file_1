from download.nse import NSEDownloader


def main():

    downloader = NSEDownloader()

    companies = downloader.download_equity_list()

    print()

    print("Total NSE Companies:", len(companies))

    print()

    for ticker in list(companies.keys())[:5]:

        print(companies[ticker])

        print()

    print("Example Lookup")

    print("----------------")

    if "RELIANCE.NS" in companies:

        print(companies["RELIANCE.NS"])

    else:

        print("RELIANCE.NS not found")


if __name__ == "__main__":

    main()