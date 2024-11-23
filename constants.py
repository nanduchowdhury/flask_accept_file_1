import os
import time

USE_REDIS = 'USE_REDIS'
USE_FSYSTEM = 'USE_FSYSTEM'
USE_GCS = 'USE_GCS'
server_database = USE_GCS
GCS_ROOT_FOLDER = "scholar_km"
MAX_THREADS_TO_USE = 4
MAX_TIME_CONDITION_WAIT = 15

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



