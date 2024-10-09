import sys
import os

import concurrent.futures

sys.path.append(os.path.abspath("../common/"))
from common import *

sys.path.append(os.path.abspath("../test_start_explanation/"))
from test_start_explanation import *

class TestConcurrentStartExplanation(CommonBaseClass):

    def run_concurrent_tests(self):
        test_instance = TestStartExplanation()

        # Using ThreadPoolExecutor to run 20 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            # Submit 20 tests to run concurrently
            futures = [executor.submit(test_instance.run_test) for i in range(1, 21)]

            # Wait for the futures to complete and print their results
            for future in concurrent.futures.as_completed(futures):
                print(future.result())


# To execute
if __name__ == '__main__':
    test = TestConcurrentStartExplanation()
    test.run_concurrent_tests()
