from flask import request

import os
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

    def get_message_for_code_and_args(self, code, *args):
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

        return message

    def show_message(self, code, *args):

        message = self.get_message_for_code_and_args(code, args)

        current_time = datetime.now().strftime('%Y_%m_%d-%H_%M_%S')
        pid = os.getpid()

        # Complete message with error code
        full_msg = f"MSG-{code}: ({current_time}) IP ({self.client_ip}) UUID ({self.client_uuid}) PID ({pid}) - {message}"

        # Print the message to the console
        print(full_msg)

        self.gcs_manager.append_to_text_file(self.gcs_log_file_path, full_msg)

        return message

    def show_page_invoke_message(self, page_name):

        current_time = datetime.now().strftime('%Y_%m_%d-%H_%M_%S')
        pid = os.getpid()

        # Complete message with error code
        full_msg = f"MSG: ({current_time}) PID ({pid}) - Invoked page : {page_name}"

        # Print the message to the console
        print(full_msg)

        self.print_request_info()

        self.gcs_manager.append_to_text_file(self.gcs_log_file_path, full_msg)


    def print_request_info(self):

        print(f"\t request.headers:")
        for key, value in request.headers.items():
            print(f"\t\t{key}: {value}")

        client_ip = request.remote_addr
        print(f"\tClient IP: {client_ip}")

        print(f"\tAccepted Content Types: {request.accept_mimetypes}")

        print(f"\tPreferred Language: {request.accept_languages}")

        print(f"\tConnection Type: {request.headers.get('Connection')}")

        print(f"\tRequest Method: {request.method}")

        user_agent = request.user_agent
        print(f"\tUser-Agent: {user_agent}")
        print(f"\tBrowser: {user_agent.browser}, Version: {user_agent.version}, Platform: {user_agent.platform}")
