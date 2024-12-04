import os
import time

from datetime import datetime

GCS_ROOT_FOLDER = "scholar_km"
MAX_THREADS_TO_USE = 4
MAX_TIME_CONDITION_WAIT = 15

# Expiry in 5hrs
GCS_SIGNED_URL_EXPIRATION_TIME = 3600 * 5

GCS_UPLOAD_MAIN_CONTENT_FILE_NAME = "gcs_main_content_file"

def check_condition(condition_func, max_seconds=MAX_TIME_CONDITION_WAIT):
    start_time = time.time()
    while True:
        if condition_func():
            return True
        time.sleep(2)
        elapsed_time = time.time() - start_time
        if elapsed_time >= max_seconds:
            return False
    return False

from datetime import datetime

def getTimeStamp():
    """
    Get the current date-time stamp in ISO 8601 format.
    """
    return datetime.now().isoformat()

def compareTime(time_1, time_2):
    """
    Compare two date-time strings in ISO 8601 format.
    Return True if time_1 is older than time_2.
    
    :param time_1: The first time string (ISO 8601 format)
    :param time_2: The second time string (ISO 8601 format)
    :return: True if time_1 < time_2, otherwise False
    """
    dt1 = datetime.fromisoformat(time_1)
    dt2 = datetime.fromisoformat(time_2)
    return dt1 <= dt2


def remove_empty_lines(lines):
    non_empty_lines = [line for line in lines if line.strip() != ""]
    
    return non_empty_lines


#########################################################
# 
# This class will remove the local-file when out-of-scope.
#
##########################################################
class LocalFileManager:
    def __init__(self, local_file_name):
        self._local_file_name = local_file_name

    def __del__(self):
        try:
            if os.path.exists(self._local_file_name):
                os.remove(self._local_file_name)
        except Exception as e:
            raise ValueError(f"Error deleting local file : {e}")

    def get_file_name(self):
        return self._local_file_name



