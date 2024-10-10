import re
import os

import time
from PIL import Image

class BaseModelAccess():
    def __init__(self, sess, eManager):

        self.sess = sess
        self.error_manager = eManager

        self.base_prompt = BasePrompt()

    def contains_any_substring(self, main_string, substrings):
                main_string_lower = main_string.lower()  # Convert the main string to lowercase
                return any(substring.lower() in main_string_lower for substring in substrings)  # Convert substrings to lowercase

class BasePrompt():
    def __init__(self):

        # Constants
        self.example_bullet_points = "for example: 1. point-1   2. point-2"

    def get_prompt_to_check_academics(self):
        prompt = "is the content related to academics which is taught in school or college? please answer yes or no."
        return prompt

    def get_prompt_to_check_text_content(self):
        prompt = "is there text in content? please answer yes or no."
        return prompt

    def get_prompt_get_all_headers_of_picture(self):
        prompt = "generate summary of the picture \
                    as following example : " + self.example_bullet_points
        return prompt

    def get_prompt_header_summary(self, header_point):
        prompt = "summarize about following header in the content : \"" + header_point + "\""
        return prompt

    def get_prompt_is_there_header_in_content(self):
        prompt = "are there headers or sections marked in bold in content? please answer only yes or no."
        return prompt

    def get_prompt_get_all_headers_of_text(self, is_headers_present=True):
        if ( is_headers_present ):
            prompt = "identify all headers or sections in the entire content marked in bold or larger-font - for example 1.1 header1   1.2 header2   1.2.1 sub-header  etc. List them as following example : " + self.example_bullet_points
        else:
            prompt = "list summary points of entire content as following example : " + self.example_bullet_points

        return prompt

    def get_prompt_convert_to_hindi(self, text):
        prompt = "convert following text in such a way that most of the content is in hindi and all hard words are in english : \n\n" + text
        return prompt

    def get_prompt_detail_response(self):
        prompt = "generate detail explanation"
        return prompt


    def get_prompt_explain_image_wrt_content(self, content):
        prompt = "explain the image specified in context to the detailed \
                            explanation of the document as follows : " + content + "."
        prompt = prompt + " also answer if any question present. also help if there is any activity to be done."
        return prompt

        




