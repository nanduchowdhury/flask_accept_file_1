import re
import logging
from datetime import datetime

class ErrorManager:
    def __init__(self, client_ip, client_uuid, file_path, log_dir='./logs'):
        self.error_map = {}
        self.client_ip = client_ip
        self.client_uuid = client_uuid
        self.log_dir = log_dir
        self.log_file = self.generate_log_file_name()
        self.setup_logger()
        self.load_errors(file_path)

    def update_client_ip(self, client_ip):
        self.client_ip = client_ip

    def update_client_uuid(self, client_uuid):
        self.client_uuid = client_uuid

    def generate_log_file_name(self):
        """
        Generates a log file name with a timestamp (e.g., server-YYYYMMDD-HHMMSS.log).
        """
        current_time = datetime.now().strftime('%Y%m%d-%H%M%S')
        log_file_name = f"server-{current_time}.log"
        return f"{self.log_dir}/{log_file_name}"

    def setup_logger(self):
        """
        Sets up the logger to log messages to the file with the generated timestamp.
        """
        self.logger = logging.getLogger('ErrorManager')
        self.logger.setLevel(logging.INFO)

        # File handler to write logs to the generated log file
        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(logging.INFO)

        # Log format
        formatter = logging.Formatter('%(asctime)s - %(message)s')
        file_handler.setFormatter(formatter)

        self.logger.addHandler(file_handler)

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
        msg_for_client = f"{message}"

        full_msg = f"MSG-{code}: IP {self.client_ip} UUID {self.client_uuid} - {message}"

        # Print the message to the console
        print(full_msg)

        # Log the message to the server.log file
        self.logger.info(full_msg)

        return msg_for_client
