import os
import time

from datetime import datetime, timedelta, timezone

GCS_ROOT_FOLDER = "scholar_km"
MAX_THREADS_TO_USE = 4
MAX_TIME_CONDITION_WAIT = 15

# Expiry in 5hrs
GCS_SIGNED_URL_EXPIRATION_TIME = 3600 * 5

GCS_UPLOAD_MAIN_CONTENT_FILE_NAME = "gcs_main_content_file"

import os

def is_first_gunicorn_worker():
    """Returns True if this process is the first Gunicorn worker."""
    try:
        # Get all active Gunicorn process IDs
        all_pids = [int(p) for p in os.popen("pgrep gunicorn").read().split() if p.isdigit()]

        if not all_pids:
            return False  # No Gunicorn process found, likely running in development mode

        current_pid = os.getpid()  # Get current process ID
        first_worker_pid = max(all_pids)  # Select the first worker process (smallest PID)

        return current_pid == first_worker_pid
    except Exception as e:
        raise ValueError(f"Error checking first gunicorn worker : {e}")
        return False

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

def get_current_india_time():

        # Convert to India time-zone.
        ist_offset = timezone(timedelta(hours=5, minutes=30))  # IST is UTC+5:30
        current_time = datetime.now(ist_offset).strftime('%Y_%m_%d-%H_%M_%S')
        return current_time

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

# Removes lines containing nothing
def remove_blank_lines(text):
        return "\n".join(line for line in text.splitlines() if line.strip())

# Removes items from list 'lines' that are empty
def remove_empty_lines(lines):
    non_empty_lines = [line for line in lines if line.strip() != ""]
    
    return non_empty_lines

def remove_all_chars_upto_char_from_begin(string, upto_char):
    """Removes characters from the beginning of a string up to a specific character.

    Args:
        string: The input string.
        char: The character to stop removing at.

    Returns:
        The string without the removed characters.
    """

    index = string.find(upto_char)
    if index != -1:
        return string[index:]
    else:
        return string


def remove_all_chars_upto_char_from_end(string, char):
    """Removes characters from the end of a string up to a specific character, including the character itself.

    Args:
        string: The input string.
        char: The character to stop removing at.

    Returns:
        The string without the removed characters.
    """

    index = string.rfind(char)
    if index != -1:
        return string[:index + 1]
    else:
        return string

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



