import logging
import re
from datetime import datetime
from google.cloud import storage  # Ensure the Google Cloud Storage client library is installed

import constants

from gcs_manager import GCSManager

class ErrorManager:
    def __init__(self, client_ip, client_uuid, file_path, bucket_name, gcs_log_file_path):
        self.error_map = {}
        self.client_ip = client_ip
        self.client_uuid = client_uuid
        self.bucket_name = bucket_name
        self.gcs_log_file_path = gcs_log_file_path
        self.load_errors(file_path)

        self.gcs_manager = GCSManager("kupmanduk-bucket", constants.GCS_ROOT_FOLDER)

    def update_client_ip(self, client_ip):
        self.client_ip = client_ip

    def update_client_uuid(self, client_uuid):
        self.client_uuid = client_uuid

    def load_errors(self, file_path):
        """
        Reads the error file and populates the error_map dictionary.
        """
        with open(file_path, 'r') as file:
            for line in file:
                # Ignore comments and empty lines
                line = line.strip()
                if not line or line.startswith('//'):
                    continue

                # Match error code and message using regular expressions
                match = re.match(r"(\d+)\s*:\s*(.+)", line)
                if match:
                    error_code = int(match.group(1))
                    error_message = match.group(2)
                    self.error_map[error_code] = error_message

    def show_message(self, code, *args):
        """
        Retrieves the error message for the given code, replaces %s placeholders,
        and automatically prints/logs the full message with the error code.
        """
        if code not in self.error_map:
            message = f"Unknown error code: {code}"
        else:
            message = self.error_map[code]
            try:
                # Replace %s in the message with provided arguments
                message = message % args
            except TypeError:
                return f"Error message for code {code} expects different number of arguments."

        # Complete message with error code
        full_msg = f"MSG-{code}: IP {self.client_ip} UUID {self.client_uuid} - {message}"

        # Print the message to the console
        print(full_msg)

        self.gcs_manager.append_to_text_file(self.gcs_log_file_path, full_msg)

        return message
