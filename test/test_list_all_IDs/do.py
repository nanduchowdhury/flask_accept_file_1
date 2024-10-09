import sys
import os

sys.path.append(os.path.abspath("../common/"))
from common import *

# Start capturing output
captured_output = io.StringIO()
sys.stdout = captured_output  # Redirect prints to the captured output

GOLDEN_FILE_PATH = 'golden_file.txt'

try:
    driver, service, options = initialize_chrome_driver()

    # Fetch all elements on the page
    all_elements = driver.find_elements(By.XPATH, "//*")

    # List all IDs
    element_ids = [elem.get_attribute("id") for elem in all_elements if elem.get_attribute("id")]

    # Print the IDs
    print("*****************************")
    for id in element_ids:
        print(f'ID is : ' + id)
    print("*****************************")

    # Reset stdout to its original value
    sys.stdout = sys.__stdout__
    show_final_decision_wrt_diff(captured_output, GOLDEN_FILE_PATH)

finally:
    # Close the browser
    driver.quit()
    