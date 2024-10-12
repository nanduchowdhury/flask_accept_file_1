import sys
import os

import concurrent.futures

sys.path.append(os.path.abspath("../common/"))
from common import *

sys.path.append(os.path.abspath("../test_start_explanation/"))
from test_start_explanation import *

class TestConcurrentStartExplanation(CommonBaseClass):

    def run_concurrent_tests(self, num_workers=4):
        test_instances = []

        # Step 1: Initialize test instances for all workers
        for _ in range(num_workers):
            test_instance = TestStartExplanation()
            test_instance.init_driver()
            test_instances.append(test_instance)

        # Step 2: Iterate through the workers
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
            for idx, test_instance in enumerate(test_instances):
                # Submit f1() and f2() tasks for the current worker
                print(f"Running f1() and f2() for worker {idx + 1}")
                f1_future = executor.submit(test_instance.load_file("../common/input_files/methane-structure.png"))
                f2_future = executor.submit(test_instance.click_send_button)

                # Wait for f1 and f2 to complete
                concurrent.futures.wait([f1_future, f2_future])

                # Wait for 20 seconds before moving to the next worker
                if idx < len(test_instances) - 1:  # No need to wait after the last worker
                    print(f"Waiting 20 seconds before proceeding to worker {idx + 2}")
                    time.sleep(10)

            # Collect results
            for idx, test_instance in enumerate(test_instances):
                print(f"Worker {idx + 1} completed")


if __name__ == '__main__':
    test = TestConcurrentStartExplanation()
    test.run_concurrent_tests(20)
