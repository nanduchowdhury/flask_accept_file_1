import re
import os

import time
from PIL import Image

import google.generativeai as genai

from base_client_manager import BaseClientManager

class GeminiAccess(BaseClientManager):
    def __init__(self, eManager):

        BaseClientManager.__init__(self)  # Initialize client management base class

        self.error_manager = eManager

        # Constants
        self.example_bullet_points = "for example: 1. point-1   2. point-2"

        self.CDATA_base_response = 'base_response'
        self.CDATA_genai_upload_file = 'genai_upload_file'

    def initialize(self):

        GOOGLE_API_KEY=os.getenv('GOOGLE_API_KEY')
        genai.configure(api_key=GOOGLE_API_KEY)

        # model = genai.GenerativeModel("gemini-pro")
        self.model = genai.GenerativeModel(model_name="models/gemini-1.5-flash")

    def clear(self, uuid):
        genai_upload_file = self.get_client_data(uuid, self.CDATA_genai_upload_file)
        genai.delete_file(genai_upload_file.name)

    def upload_file(self, uuid, file_path):

        self.error_manager.show_message(2005, file_path)
        genai_upload_file = genai.upload_file(path=file_path)

        while genai_upload_file.state.name == "PROCESSING":
            self.error_manager.show_message(2006)
            time.sleep(10)
            genai_upload_file = genai.get_file(genai_upload_file.name)

        if genai_upload_file.state.name == "FAILED":
            raise ValueError(self.error_manager.show_message(2007, genai_upload_file.state.name))

        self.save_client_data(uuid, self.CDATA_genai_upload_file, genai_upload_file)

        self.generate_base_response(uuid)            
        self.error_manager.show_message(2008, genai_upload_file.uri)


    def contains_any_substring(self, main_string, substrings):
        main_string_lower = main_string.lower()  # Convert the main string to lowercase
        return any(substring.lower() in main_string_lower for substring in substrings)  # Convert substrings to lowercase

    def check_content_student_related(self, uuid):

        substr_in_result = ["no"]

        genai_upload_file = self.get_client_data(uuid, self.CDATA_genai_upload_file)

        prompt = "is the content related to academics which is taught in school or college? please answer yes or no."
        response = self.model.generate_content([prompt, genai_upload_file],
                                    request_options={"timeout": 600})

        if ( self.contains_any_substring(response.text, substr_in_result) ):
            raise ValueError(self.error_manager.show_message(2011))

    def is_there_text_in_content(self, uuid):
        substr_in_result = ["no"]
        genai_upload_file = self.get_client_data(uuid, self.CDATA_genai_upload_file)

        prompt = "is there text in content? please answer yes or no."
        response = self.model.generate_content([prompt, genai_upload_file],
                                    request_options={"timeout": 600})

        if ( self.contains_any_substring(response.text, substr_in_result) ):
            return False
        
        return True

    def get_all_headers_of_picture(self, uuid):
        prompt = "generate summary of the picture \
             as following example : " + self.example_bullet_points
                            
        genai_upload_file = self.get_client_data(uuid, self.CDATA_genai_upload_file)

        response = self.model.generate_content([prompt, genai_upload_file],
                                    request_options={"timeout": 600})

        return response.text

    def get_header_summary(self, uuid, point):

        prompt = "summarize about following header in the content : \"" + point + "\""

        genai_upload_file = self.get_client_data(uuid, self.CDATA_genai_upload_file)

        response = self.model.generate_content([prompt, genai_upload_file],
                                 request_options={"timeout": 600})
        return response.text

    def is_there_headers_in_content(self, uuid):
        substr_in_result = ["no"]
        genai_upload_file = self.get_client_data(uuid, self.CDATA_genai_upload_file)

        prompt = "are there headers or sections marked in bold in content? please answer only yes or no."
        response = self.model.generate_content([prompt, genai_upload_file],
                                    request_options={"timeout": 600})

        if ( self.contains_any_substring(response.text, substr_in_result) ):
            return False
        
        return True

    def get_all_headers_of_text(self, uuid):

        prompt = ''
        if ( self.is_there_headers_in_content(uuid) ):
            self.error_manager.show_message(2014, "YES")
            prompt = "identify all headers or sections in the entire content marked in bold or larger-font - for example 1.1 header1   1.2 header2   1.2.1 sub-header  etc. List them as following example : " + self.example_bullet_points
        else:
            self.error_manager.show_message(2014, "NO")
            prompt = "list summary points of entire content as following example : " + self.example_bullet_points
        
        genai_upload_file = self.get_client_data(uuid, self.CDATA_genai_upload_file)

        response = self.model.generate_content([prompt, genai_upload_file],
                                    request_options={"timeout": 600})
        return response.text

    def convert_to_hindi(self, text):
        prompt = "convert following text in such a way that most of the content is in hindi and all hard words are in english : \n\n" + text
        response = self.model.generate_content(prompt,
                        request_options={"timeout": 600})
        return response.text

    def generate_base_response(self, uuid):

        genai_upload_file = self.get_client_data(uuid, self.CDATA_genai_upload_file)

        prompt = "generate detail explanation"
        base_response = self.model.generate_content([prompt, genai_upload_file],
                                    request_options={"timeout": 600})

        self.save_client_data(uuid, self.CDATA_base_response, base_response)

    def explain_region(self, uuid, main_content_file, explain_region_file):

        base_response = self.get_client_data(uuid, self.CDATA_base_response)

        image = Image.open(explain_region_file)
        prompt = "explain the image specified in context to the detailed \
                        explanation of the document as follows : " + base_response.text + "."
        prompt = prompt + " also answer if any question present. also help if there is any activity to be done."
        response = self.model.generate_content([prompt, image])

        return response.text


