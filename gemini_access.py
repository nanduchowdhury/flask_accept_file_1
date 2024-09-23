import re
import os

import time

import google.generativeai as genai

class GeminiAccess:
    def __init__(self, eManager):
        self.error_manager = eManager

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
        prompt = "summarize about content of the picture. use number-bullets to summarize."
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                    request_options={"timeout": 600})
        return response.text

    def get_header_summary(self, point):

        prompt = "summarize about following header in the content : \"" + point + "\""
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                 request_options={"timeout": 600})
        return response.text

    def get_all_headers_of_text(self):
        prompt = "are there main sections? If so, what are main sections headers?"
        response = self.model.generate_content([prompt, self.genai_upload_file],
                                    request_options={"timeout": 600})
        return response.text

    def convert_to_hindi(self, text):
        prompt = "convert following text in such a way that most of the content is in hindi and all hard words are in english : \n\n" + text
        response = self.model.generate_content(prompt,
                        request_options={"timeout": 600})
        return response.text

    
