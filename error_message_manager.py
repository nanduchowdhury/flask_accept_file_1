from flask import request

import os
import logging
import re

from datetime import datetime, timedelta, timezone

from google.cloud import storage  # Ensure the Google Cloud Storage client library is installed

import constants

from gcs_manager import GCSManager


class ErrorManager:
    def __init__(self, client_ip, client_uuid, file_path):
        self.error_map = {}
        self.client_ip = client_ip
        self.client_uuid = client_uuid
        self.load_errors(file_path)

        logging.basicConfig(level=logging.INFO)
        logging.getLogger('googleapiclient.discovery_cache').setLevel(logging.ERROR)

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

        if code not in self.error_map:
            return f"Unknown error code: {code}"
        
        message = self.error_map[code]

        # If there are no placeholders OR no args are provided, return message as-is
        if "%s" not in message or not args:
            return message

        try:
            # Replace %s placeholders with provided arguments
            return message % args
        except TypeError:
            return f"Error message for code {code} expects a different number of arguments."


    def show_message(self, code, *args):

        message = self.get_message_for_code_and_args(code, args)

        current_time = constants.get_current_india_time()
        pid = os.getpid()

        # Complete message with error code
        full_msg = f"MSG-{code}: ({current_time}) IP ({self.client_ip}) UUID ({self.client_uuid}) PID ({pid}) - {message}"

        logging.info(full_msg)

        return message

    def show_page_invoke_message(self, page_name):

        current_time = constants.get_current_india_time()
        pid = os.getpid()

        # Complete message with error code
        full_msg = f"MSG: ({current_time}) PID ({pid}) - Invoked page : {page_name}"

        logging.info(full_msg)

        # request_info = self.get_request_info()
        # print(request_info)


    def show_any_message(self, message):
        logging.info(message)

    def get_request_info(self):
        return "\n".join([
            "\trequest.headers:",
            *[f"\t\t{key}: {value}" for key, value in request.headers.items()],
            f"\tClient IP: {request.remote_addr}",
            f"\tAccepted Content Types: {request.accept_mimetypes}",
            f"\tPreferred Language: {request.accept_languages}",
            f"\tConnection Type: {request.headers.get('Connection')}",
            f"\tRequest Method: {request.method}",
            f"\tUser-Agent: {request.user_agent}",
            f"\tBrowser: {request.user_agent.browser}, Version: {request.user_agent.version}, Platform: {request.user_agent.platform}"
        ])