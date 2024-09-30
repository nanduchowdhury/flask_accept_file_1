import re
import os

import time
from PIL import Image

import google.generativeai as genai

class GeminiAccess:
    def __init__(self, eManager):
        self.error_manager = eManager

        self.base_response = ''

        self.example_bullet_points = "for example: 1. point-1   2. point-2"

    def initialize(self):

        GOOGLE_API_KEY=os.getenv('GOOGLE_API_KEY')
        genai.configure(api_key=GOOGLE_API_KEY)

        # model = genai.GenerativeModel("gemini-pro")
        self.model = genai.GenerativeModel(model_name="models/gemini-1.5-flash")

    def clear(self):
        genai.delete_file(self.genai_upload_file.name)

    def upload_file(self, file_path):

        self.error_manager.show_message(2005, file_path)
        self.genai_upload_file = genai.upload_file(path=file_path)

        while self.genai_upload_file.state.name == "PROCESSING":
            self.error_manager.show_message(2006)
            time.sleep(10)
            self.genai_upload_file = genai.get_file(self.genai_upload_file.name)

        if self.genai_upload_file.state.name == "FAILED":
            raise ValueError(self.error_manager.show_message(2007, self.genai_upload_file.state.name))

        self.generate_base_response()            
        self.error_manager.show_message(2008, self.genai_upload_file.uri)

    def contains_any_substring(self, main_string, substrings):
        main_string_lower = main_string.lower()  # Convert the main string to lowercase
        return any(substring.lower() in main_string_lower for substring in substrings)  # Convert substrings to lowercase

    def check_content_student_related(self):

        substr_in_result = ["no"]

        prompt = "is the content related to academics which is taught in school or college? please answer yes or no."
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                    request_options={"timeout": 600})

        if ( self.contains_any_substring(response.text, substr_in_result) ):
            raise ValueError(self.error_manager.show_message(2011))

    def is_there_text_in_content(self):
        substr_in_result = ["no"]

        prompt = "is there text in content? please answer yes or no."
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                    request_options={"timeout": 600})

        if ( self.contains_any_substring(response.text, substr_in_result) ):
            return False
        
        return True

    def get_all_headers_of_picture(self):
        prompt = "generate summary of the picture \
             as following example : " + self.example_bullet_points
                            
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                    request_options={"timeout": 600})

        return response.text

    def get_header_summary(self, point):

        prompt = "summarize about following header in the content : \"" + point + "\""
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                 request_options={"timeout": 600})
        return response.text

    def is_there_headers_in_content(self):
        substr_in_result = ["no"]

        prompt = "is there headers in content? please answer only yes or no."
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                    request_options={"timeout": 600})

        if ( self.contains_any_substring(response.text, substr_in_result) ):
            return False
        
        return True

    def get_all_headers_of_text(self):

        prompt = ''
        if ( self.is_there_headers_in_content() ):
            self.error_manager.show_message(2014, "YES")
            prompt = "identify all headers or sections in the entire content marked in bold or larger-font - for example 1.1 header1   1.2 header2   1.2.1 sub-header  etc. List them as following example : " + self.example_bullet_points
        else:
            self.error_manager.show_message(2014, "NO")
            prompt = "list summary points of entire content as following example : " + self.example_bullet_points
        
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                    request_options={"timeout": 600})
        return response.text

    def convert_to_hindi(self, text):
        prompt = "convert following text in such a way that most of the content is in hindi and all hard words are in english : \n\n" + text
        response = self.model.generate_content(prompt,
                        request_options={"timeout": 600})
        return response.text

    def generate_base_response(self):

        prompt = "generate detail explanation"
        self.base_response = self.model.generate_content([prompt, self.genai_upload_file],
                                    request_options={"timeout": 600})

    def explain_region(self, main_content_file, explain_region_file):

        image = Image.open(explain_region_file)
        prompt = "explain the image specified in context to the detailed \
                        explanation of the document as follows : " + self.base_response.text + "."
        prompt = prompt + " also answer if any question present. also help if there is any activity to be done."
        response = self.model.generate_content([prompt, image])

        return response.text


