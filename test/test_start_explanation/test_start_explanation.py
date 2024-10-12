import sys
import os

sys.path.append(os.path.abspath("../common/"))
from common import *

class TestStartExplanation(CommonBaseClass):

    def init_driver(self):
        self.driver, self.service, self.options = self.initialize_chrome_driver()

    def load_file(self, file_name):
        file_input = self.driver.find_element(By.ID, "fileInput")  # Adjust ID if necessary

        # Step 2: Load the file into the file input element
        relative_file_path = file_name
        file_path = os.path.abspath(relative_file_path)
        file_input.send_keys(file_path)  # Upload the file

        self.check_and_ok_message_box(self.driver)

    def click_send_button(self):
        send_button = self.driver.find_element(By.ID, "sendButton")  # Adjust ID if necessary
        send_button.click()

        # Step 4: Wait for the server response
        time.sleep(50)  # Increase the wait time if needed for server processing

    def grab_result2_output(self):
        result_element = self.driver.find_element(By.ID, "result2")  # Adjust ID if necessary
        return result_element.text

    def run_test(self):
        # Start capturing output
        captured_output = io.StringIO()
        sys.stdout = captured_output  # Redirect prints to the captured output

        GOLDEN_FILE_PATH = 'golden_file.txt'

        try:
            self.init_driver()

            self.load_file("../common/input_files/methane-structure.png")

            self.click_send_button()

            server_output = self.grab_result2_output()

            # Reset stdout to its original value
            sys.stdout = sys.__stdout__
            self.show_final_decision_wrt_num_lines(server_output, 3)

        finally:
            # Close the browser
            self.driver.quit()

# To execute
if __name__ == '__main__':
    test = TestStartExplanation()
    test.run_test()
