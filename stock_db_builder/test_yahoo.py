from download.yahoo import YahooDownloader

downloader = YahooDownloader()

info = downloader.get_company_info("RELIANCE.NS")

for k, v in info.items():

    print(f"{k:20} : {v}")
    