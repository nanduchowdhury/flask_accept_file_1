import os

USE_REDIS = 'USE_REDIS'
USE_FSYSTEM = 'USE_FSYSTEM'
server_database = USE_FSYSTEM
ROOT_FOLDER = os.getenv('ROOT_FOLDER', './dummy_root_folder/')