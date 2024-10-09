
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

def initialize_chrome_driver():

    # logging.basicConfig(level=logging.DEBUG)

    chromedriver_path = '/home/nandu_chowdhury/.local/chromedriver-linux64/chromedriver'
    
    # Create a Service object with the path to chromedriver
    service = Service(chromedriver_path)
    
    # Set Chrome options
    options = Options()
    options.add_argument("--headless")  # Headless mode
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.binary_location = "/usr/bin/google-chrome"  # Adjust this path if needed
    
    # Initialize the Chrome driver
    driver = webdriver.Chrome(service=service, options=options)
    
    driver.get("http://127.0.0.1:5000")
    print(f'Chrome driver title is : ' + driver.title)

    return driver, service, options

# Function to read the golden file
def read_golden_file(file_path):
    with open(file_path, 'r') as file:
        return file.read()

# Function to write the current output to a file (optional, for debugging or updates)
def write_current_output(output, file_path):
    with open(file_path, 'w') as file:
        file.write(output)

# Function to show the differences between current output and golden file
def show_diff(current_output, golden_file_content):
    diff = difflib.unified_diff(
        golden_file_content.splitlines(),  # Golden file content as list of lines
        current_output.splitlines(),       # Current output as list of lines
        fromfile='Golden File',            # Label for golden file
        tofile='Current Output',           # Label for current output
        lineterm=''                        # No line termination to avoid extra newlines
    )
    return '\n'.join(diff)

def check_and_ok_message_box(driver):
    
    try:
        time.sleep(2)
        message_box_ok_button = driver.find_element(By.ID, "messageBoxOkButton")
        message_box_ok_button.click()
        time.sleep(2)  # Wait for the modal to close
    except:
        print("No message-box found.")


def show_final_decision_wrt_diff(captured_output, golden_file):

    current_output = captured_output.getvalue()

    # Read the golden file content
    golden_file_content = read_golden_file(golden_file)

    # Compare the captured output with the golden file content
    if current_output == golden_file_content:
        print("PASS: The test output matches the golden file.")
    else:
        print("FAIL: The test output does not match the golden file.")
        write_current_output(current_output, 'current_output.txt')
        
        diff_output = show_diff(current_output, golden_file_content)
        print("Difference between current output and golden file:")
        print(diff_output)

def show_final_decision_wrt_num_lines(output, num_lines):

    lines = output.splitlines()

    n = len(lines)
    if n > num_lines:
        print(f"PASS: The test output has atleast {num_lines} lines.")
    else:
        print(f"FAIL: The test output does NOT have {num_lines} lines : {n}")
        print(output)

