import json
import threading
import uuid
from flask import session, jsonify, current_app, request
from google.cloud import storage

from gcs_manager import GCSManager

import os
import fcntl
import constants
import time

class BaseClientManager:
    def __init__(self, eManager, client_folder):

        self.eManager = eManager
        self.client_folder = client_folder

        # key -> uuid       data -> json
        self.data = {}

        self.gcs_manager = GCSManager("kupmanduk-bucket", constants.GCS_ROOT_FOLDER)

    def _read_gcs_file(self, file_path):
        blob = self.gcs_bucket.blob(file_path)
        if blob.exists():
            content = blob.download_as_text()
            return json.loads(content)
        return {}

    def _write_gcs_file(self, file_path, data):
        blob = self.gcs_bucket.blob(file_path)
        blob.upload_from_string(json.dumps(data, indent=4))

    def _delete_gcs_file(self, file_path):
        blob = self.gcs_bucket.blob(file_path)
        if blob.exists():
            blob.delete()

    def dump_session(self, uuid):
        print(json.dumps(self.data[uuid], indent=4))

    def force_read_session(self, cuuid, is_merge=False):
        json_file = self.get_client_json_file(cuuid)

        try:
            if is_merge:
                data_1 = self.gcs_manager.read_json(json_file)
                self.data[cuuid] = self.merge_json(data_1, self.data[cuuid])
            else:
                self.data[cuuid] = self.gcs_manager.read_json(json_file)

        except Exception as e:
            raise ValueError(self.eManager.show_message(2039, json_file, str(e)))

    def force_save_session(self, cuuid, is_merge=False):
        json_file = self.get_client_json_file(cuuid)

        try:
            if is_merge:
                data_1 = self.gcs_manager.read_json(json_file)
                self.data[cuuid] = self.merge_json(data_1, self.data[cuuid])

            self.gcs_manager.write_json(json_file, self.data[cuuid])

        except Exception as e:
            raise ValueError(self.eManager.show_message(2040, json_file, str(e)))

    def get_client_json_file(self, cuuid):
        return f"{self.client_folder}/{cuuid}.json"

    def _set_uuid(self, cuuid):

        if cuuid not in self.data:
            self.data[cuuid] = {}

    def _clear_uuid(self, uuid):
        
        if uuid in self.data:
            del self.data[uuid]

    def set_client_uuid(self, cuuid=None):

        if cuuid is None:
            cuuid = str(uuid.uuid4())  # Generate a new UUID if none is provided

        self._set_uuid(cuuid)
        return cuuid

    def _clear_key(self, uuid, key):
        if uuid in self.data:
            if key in self.data[uuid]:
                # Remove the 'key' and all its data
                del self.data[uuid][key]

    def _set_key(self, cuuid, key, value):
        if cuuid not in self.data:
            self.data[cuuid] = {}

        keys = key.split('.')
        current_data = self.data[cuuid]
        for k in keys[:-1]:
            current_data = current_data.setdefault(k, {})  # Traverse or create nested dicts
        current_data[keys[-1]] = value

    def _get_key(self, cuuid, key):
        if cuuid not in self.data:
            raise ValueError(f"UUID '{cuuid}' not found.")

        keys = key.split('.')
        current_data = self.data[cuuid]

        try:
            for k in keys:
                current_data = current_data[k]
            return current_data
        except Exception as e:
            raise ValueError(f"UUID '{cuuid}' key {key} not found.")

    def clear_client_data(self, cuuid, key):
        
        self._clear_key(cuuid, key)

    def save_client_data(self, cuuid, key, value):
        
        if cuuid not in self.data:
            self.data[cuuid] = {}

        self._set_key(cuuid, key, value)

    def check_and_get_client_data(self, cuuid, key):
        if (self.is_client_data_present(cuuid, key)):
            return self.get_client_data(cuuid, key)

        return None

    def get_client_data(self, cuuid, key):
        try:
            value = self._get_key(cuuid, key)
            return value  # Return value if found after session read
        except KeyError:
            raise ValueError(f"Key '{key}' not found in the session data.") 

    def is_client_data_present(self, cuuid, key):
        try:
            self._get_key(cuuid, key)
            return True
        except Exception as e:
            return False

    def merge_json(self, data_1, data_2):
        if isinstance(data_1, dict) and isinstance(data_2, dict):
            merged = {**data_1}
            for key, value in data_2.items():
                if key in merged:
                    merged[key] = self.merge_json(merged[key], value)
                else:
                    merged[key] = value
            return merged
        elif isinstance(data_1, list) and isinstance(data_2, list):
            # Merge lists intelligently
            merged_list = []
            for item in data_1:
                if item not in merged_list:
                    merged_list.append(item)
            for item in data_2:
                if item not in merged_list:
                    merged_list.append(item)
            return merged_list
        else:
            return data_2  # Overwrite scalar values



