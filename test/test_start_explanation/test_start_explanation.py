import sys
import os

sys.path.append(os.path.abspath("../common/"))
from common import *

class TestStartExplanation(CommonBaseClass):
    def run_test(self):
        # Start capturing output
        captured_output = io.StringIO()
        sys.stdout = captured_output  # Redirect prints to the captured output

        GOLDEN_FILE_PATH = 'golden_file.txt'

        try:
            driver, service, options = self.initialize_chrome_driver()

            file_input = driver.find_element(By.ID, "fileInput")  # Adjust ID if necessary

            # Step 2: Load the file into the file input element
            relative_file_path = "../common/input_files/methane-structure.png"
            file_path = os.path.abspath(relative_file_path)
            file_input.send_keys(file_path)  # Upload the file

            self.check_and_ok_message_box(driver)

            # Step 3: Locate the "send" button and click it
            send_button = driver.find_element(By.ID, "sendButton")  # Adjust ID if necessary
            send_button.click()

            # Step 4: Wait for the server response
            time.sleep(50)  # Increase the wait time if needed for server processing

            # Step 5: Grab the server output
            result_element = driver.find_element(By.ID, "result2")  # Adjust ID if necessary
            server_output = result_element.text

            # Reset stdout to its original value
            sys.stdout = sys.__stdout__
            self.show_final_decision_wrt_num_lines(server_output, 3)

        finally:
            # Close the browser
            driver.quit()

# To execute
if __name__ == '__main__':
    test = TestStartExplanation()
    test.run_test()
