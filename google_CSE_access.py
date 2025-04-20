
from googleapiclient.discovery import build

import os
import random

################################################################
#
# Get GOOGLE_CSE_ID from here : https://cse.google.com/all
# 
# Also need to register in "API & Services" under Google-Cloud here for custom-search:
#
#   https://console.cloud.google.com/apis/api/customsearch.googleapis.com/metrics?project=kupamanduk-scholarkm-project
#
################################################################

class GoogleCSEAccess():
    def __init__(self, eManager):
        self.eManager = eManager

    def initialize(self):
        try:
            self.GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
            if not self.GOOGLE_API_KEY:
                raise ValueError("Google API key is not set.")

            self.GOOGLE_CSE_ID = os.getenv('GOOGLE_CSE_ID')
            if not self.GOOGLE_CSE_ID:
                raise ValueError("Google CSE ID is not set.")

            self.service = build("customsearch", "v1", developerKey=self.GOOGLE_API_KEY)

        except Exception as e:
            raise ValueError(self.eManager.show_message(2058, e))

    def perform_retry_search(self, query, retries=3, delay=1, backoff=2):
        """
        Attempts to search for a YouTube link using exponential backoff.

        :param query: The search query string
        :param retries: Number of retry attempts
        :param delay: Initial delay between retries in seconds
        :param backoff: Backoff multiplier (2 = exponential backoff)
        :return: List of YouTube links or None
        """
        attempt = 0
        while attempt < retries:
            try:
                return self.search(query)
            except Exception as e:
                attempt += 1
                print(f"[Retry {attempt}/{retries}] Search failed: {e}")
                print(traceback.format_exc())
                if attempt < retries:
                    sleep_time = delay * (backoff ** (attempt - 1))
                    print(f"Retrying in {sleep_time} seconds...")
                    time.sleep(sleep_time)
                else:
                    print("All retries failed.")
                    raise  # Let the final error propagate


    def search(self, query):
        try:
            res = self.service.cse().list(q=query, cx=self.GOOGLE_CSE_ID, num=10).execute()  # Fetch up to 10 results

            youtube_links = []  # Collect all YouTube links
            if 'items' in res:
                for item in res['items']:
                    if 'link' in item and "youtube.com" in item['link']:
                        youtube_links.append(item['link'])

            if youtube_links:
                return youtube_links

            return None  # No YouTube links found

        except Exception as e:
            raise ValueError(self.eManager.show_message(2059, e))


