import re
import os

import json
import constants

import time
from PIL import Image

class BaseModelAccess():
    def __init__(self, sess, eManager):

        self.sess = sess
        self.eManager = eManager

        self.base_prompt = BasePrompt()

    def contains_any_substring(self, main_string, substrings):
                main_string_lower = main_string.lower()  # Convert the main string to lowercase
                return any(substring.lower() in main_string_lower for substring in substrings)  # Convert substrings to lowercase

    def is_academic_text_header_present(self, uuid):
        
        substr_in_result = ["no"]

        is_academic_content = True
        is_text_content = True
        is_header_content = True
        
        prompt = self.base_prompt.get_prompt_to_check_academic_text_header_in_content()
        response = self.query_google_file(uuid, prompt)

        lines = response.splitlines()

        if len(lines) == 3:
            if self.contains_any_substring(lines[0], substr_in_result):
                is_academic_content = False
            if self.contains_any_substring(lines[1], substr_in_result):
                is_text_content = False
            if self.contains_any_substring(lines[2], substr_in_result):
                is_header_content = False

        return is_academic_content, is_text_content, is_header_content

    def get_all_headers_of_picture(self, uuid):
        
        prompt = self.base_prompt.get_prompt_get_all_headers_of_picture()
        response = self.query_google_file(uuid, prompt)

        return response

    def get_header_summary(self, uuid, point):

        prompt = self.base_prompt.get_prompt_header_summary(point)
        response = self.query_google_file(uuid, prompt)

        return response

    def is_there_headers_in_content(self, uuid):
        substr_in_result = ["no"]
        
        prompt = self.base_prompt.get_prompt_is_there_header_in_content()
        response = self.query_google_file(uuid, prompt)
        
        if ( self.contains_any_substring(response, substr_in_result) ):
            return False
        
        return True

    def get_all_headers_of_text(self, uuid, is_header_in_content):

        prompt = ''
        if ( is_header_in_content ):
            prompt = self.base_prompt.get_prompt_get_all_headers_of_text()
        else:
            prompt = self.base_prompt.get_prompt_get_all_headers_of_text(False)
        
        response = self.query_google_file(uuid, prompt)

        return response

    def convert_to_hindi(self, text):
        
        prompt = self.base_prompt.get_prompt_convert_to_hindi(text)
        response = self.query_only_prompt(prompt)

        return response

    def generate_base_response(self, uuid):

        google_file = self.get_google_genai_file(uuid)

        prompt = self.base_prompt.get_prompt_detail_response()
        response = self.query_google_file(uuid, prompt)

        return response

    def generate_MCQ(self, uuid):

        base_response = self.sess.get_client_data(uuid, 'upload_file.base_response_text')
        prompt = self.base_prompt.get_prompt_generate_MCQ_wrt_content(base_response)

        # print(f"MCQ prompt : {prompt}")

        response = self.query_google_file(uuid, prompt)

        # Remove some unwanted chars at the begining - so that json
        # format is preserved.
        response = constants.remove_all_chars_upto_char_from_begin(response, '{')
        response = constants.remove_all_chars_upto_char_from_end(response, '}')

        # print(f"MCQ response : {response}")

        return response

    def explain_region(self, uuid, explain_region_file):

        base_response = self.sess.get_client_data(uuid, 'upload_file.base_response_text')

        image = Image.open(explain_region_file)
        prompt = self.base_prompt.get_prompt_explain_image_wrt_content(base_response)
        response = self.query_image(prompt, image)

        return response


class BasePrompt():
    def __init__(self):

        # Constants
        self.example_bullet_points = "for example: 1. point-1   2. point-2"

        self.example_MCQ_xml = {
            "What is the capital of France?": {
                "choices": { "a": "Berlin", "b": "Paris", "c": "Rome" },
                "answer": "b"
            },
            "What is 2 + 2?": {
                "choices": { "a": "3", "b": "4", "c": "5" },
                "answer": "b"
            }
        }

    def get_prompt_to_check_academic_text_header_in_content(self):
        prompt = "Please answer following questions yes or no: \
                    1. is the content related to academics which is taught in school or college? \
                    2. is there text in content? \
                    3. are there headers or sections marked in bold in content?"
        return prompt

    def get_prompt_get_all_headers_of_picture(self):
        prompt = "generate summary of the picture \
                    as following example : " + self.example_bullet_points
        return prompt

    def get_prompt_header_summary(self, header_point):
        prompt = "Create summary points about following header in the content in context to the uploaded file. \
                           Also answer if any question present. Also help if there is any activity to be done. \
                           Write the point-title in bold. Give new-line after each point : \"" + header_point + "\""

        return prompt

    def get_prompt_is_there_header_in_content(self):
        prompt = "are there headers or sections marked in bold in content? please answer only yes or no."
        return prompt

    def get_prompt_get_all_headers_of_text(self, is_headers_present=True):
        if ( is_headers_present ):
            prompt = f"Process the entire content as follows: \
                        1. Search for headers or sections marked in bold or larger-font. \
                        2. Also search for headers or sections such as 1.1 header1   1.2 header2   1.2.1 sub-header. \
                        3. List the headers or sections as ${self.example_bullet_points} \
                        4. While listing the points, also mention the page-number where the header is found. \
                        "
        else:
            prompt = "list summary points of entire content as following example : " + self.example_bullet_points

        return prompt

    def get_prompt_convert_to_hindi(self, text):
        prompt = "convert following text in such a way that most of the content is in hindi and all hard words are in english : \n\n" + text
        return prompt

    def get_prompt_detail_response(self):
        prompt = "Generate detail explanation of the uploaded file."
        return prompt

    def get_prompt_generate_MCQ_wrt_content(self, content):
        prompt = "Generate fresh set of MCQ in context of the uploaded file."
        prompt = prompt + " Make sure the MCQ is of the following JSON format without \
                            any leading or trailing characters: " + json.dumps(self.example_MCQ_xml)
        return prompt

    def get_prompt_explain_image_wrt_content(self, content):
        prompt = "explain the image specified in context to the detailed \
                            explanation of the document as follows : " + content + "."
        prompt = prompt + " also answer if any question present. also help if there is any activity to be done."
        return prompt

        




