import os

# ---------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CACHE_DIR = os.path.join(BASE_DIR, "cache")

OUTPUT_DIR = os.path.join(BASE_DIR, "output")

LOG_DIR = os.path.join(BASE_DIR, "logs")

# ---------------------------------------------------------------------
# Output files
# ---------------------------------------------------------------------

NSE_JSON = os.path.join(OUTPUT_DIR, "nse_companies.json")

MASTER_JSON = os.path.join(OUTPUT_DIR, "stocks_master.json")

# ---------------------------------------------------------------------
# Download settings
# ---------------------------------------------------------------------

REQUEST_TIMEOUT = 30

REQUEST_DELAY = 0.3

RETRY_COUNT = 3

USER_AGENT = (
    "Mozilla/5.0 "
    "(Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 "
    "(KHTML, like Gecko) "
    "Chrome/138.0 Safari/537.36"
)

KNOWLEDGE_DIR = os.path.join(
    BASE_DIR,
    "knowledge"
)
