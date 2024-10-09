
#########################################################
#
# Following page will show the exact version of chrome and
# chromedriver that needs to be downloaded.
#
#      https://googlechromelabs.github.io/chrome-for-testing/
#
# For example to install chromedriver:
#           wget https://storage.googleapis.com/chrome-for-testing-public/128.0.6613.137/linux64/chromedriver-linux64.zip
#           unzip <.zip-file>
#
# For example to install chrome:
#           wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
#           sudo apt install ./google-chrome-stable_current_amd64.deb
#
# See below the path of chromedriver and google-chrome used.
#
#########################################################

import io
import difflib

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import logging

import time

class CommonBaseClass:
    def __init__(self):
        self.chromedriver_path = '/home/nandu_chowdhury/.local/chromedriver-linux64/chromedriver'
        self.binary_location = "/usr/bin/google-chrome"  # Adjust this path if needed

    def initialize_chrome_driver(self):
        # Create a Service object with the path to chromedriver
        service = Service(self.chromedriver_path)
        
        # Set Chrome options
        options = Options()
        options.add_argument("--headless")  # Headless mode
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-gpu")
        options.binary_location = self.binary_location
        
        # Initialize the Chrome driver
        driver = webdriver.Chrome(service=service, options=options)

        # This is for the case where server is running as - python ...
        # driver.get("http://127.0.0.1:5000")

        # This is for the case where server is running as - gunicorn ...
        driver.get("http://127.0.0.1:8000")


        print(f'Chrome driver title is : ' + driver.title)
        return driver, service, options

    def read_golden_file(self, file_path):
        with open(file_path, 'r') as file:
            return file.read()

    def write_current_output(self, output, file_path):
        with open(file_path, 'w') as file:
            file.write(output)

    def show_diff(self, current_output, golden_file_content):
        diff = difflib.unified_diff(
            golden_file_content.splitlines(),
            current_output.splitlines(),
            fromfile='Golden File',
            tofile='Current Output',
            lineterm=''
        )
        return '\n'.join(diff)

    def check_and_ok_message_box(self, driver):
        try:
            time.sleep(2)
            message_box_ok_button = driver.find_element(By.ID, "messageBoxOkButton")
            message_box_ok_button.click()
            time.sleep(2)  # Wait for the modal to close
        except:
            print("No message-box found.")

    def show_final_decision_wrt_diff(self, captured_output, golden_file):
        current_output = captured_output.getvalue()
        golden_file_content = self.read_golden_file(golden_file)

        if current_output == golden_file_content:
            print("PASS: The test output matches the golden file.")
        else:
            print("FAIL: The test output does not match the golden file.")
            self.write_current_output(current_output, 'current_output.txt')
            diff_output = self.show_diff(current_output, golden_file_content)
            print("Difference between current output and golden file:")
            print(diff_output)

    def show_final_decision_wrt_num_lines(self, output, num_lines):
        lines = output.splitlines()
        n = len(lines)
        if n > num_lines:
            print(f"PASS: The test output has at least {num_lines} lines.")
        else:
            print(f"FAIL: The test output does NOT have {num_lines} lines : {n}")
            print(output)



