import re
import os

import time
from PIL import Image

import google.generativeai as genai

from base_model_access import BaseModelAccess

class GeminiAccess(BaseModelAccess):
    def __init__(self, sess, eManager):
        super().__init__(sess, eManager)

    def initialize(self):

        GOOGLE_API_KEY=os.getenv('GOOGLE_API_KEY')
        genai.configure(api_key=GOOGLE_API_KEY)

        # model = genai.GenerativeModel("gemini-pro")
        self.model = genai.GenerativeModel(model_name="models/gemini-1.5-flash")

    def clear(self, uuid):
        google_file = self.get_google_genai_file(uuid)
        genai.delete_file(google_file.name)

    def upload_file(self, uuid, file_path):

        self.error_manager.show_message(2005, file_path)
        google_file = genai.upload_file(path=file_path)

        while google_file.state.name == "PROCESSING":
            self.error_manager.show_message(2006)
            time.sleep(10)
            google_file = genai.get_file(google_file.name)

        if google_file.state.name == "FAILED":
            raise ValueError(self.error_manager.show_message(2007, google_file.state.name))

        self.sess.save_client_data(uuid, 'upload_file.genai_upload_file_name', google_file.name)

        self.generate_base_response(uuid)            
        self.error_manager.show_message(2008, google_file.uri)

    def get_google_genai_file(self, uuid):
        genai_upload_file_name = self.sess.get_client_data(uuid, 'upload_file.genai_upload_file_name')
        google_file = genai.get_file(genai_upload_file_name)

        return google_file

    def query_google_file(self, uuid, prompt):

        google_file = self.get_google_genai_file(uuid)
        response = self.model.generate_content([prompt, google_file],
                                    request_options={"timeout": 600})
        return response.text

    def query_only_prompt(self, prompt):
        response = self.model.generate_content(prompt,
                        request_options={"timeout": 600})
        return response.text

    def query_image(self, prompt, image):
        response = self.model.generate_content([prompt, image])
        return response.text

    def check_content_student_related(self, uuid):

        substr_in_result = ["no"]

        prompt = self.base_prompt.get_prompt_to_check_academics();
        response = self.query_google_file(uuid, prompt)

        if ( self.contains_any_substring(response, substr_in_result) ):
            raise ValueError(self.error_manager.show_message(2011))

    def is_there_text_in_content(self, uuid):
        substr_in_result = ["no"]

        prompt = self.base_prompt.get_prompt_to_check_text_content();
        response = self.query_google_file(uuid, prompt)

        if ( self.contains_any_substring(response, substr_in_result) ):
            return False
        
        return True

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

    def get_all_headers_of_text(self, uuid):

        prompt = ''
        if ( self.is_there_headers_in_content(uuid) ):
            self.error_manager.show_message(2014, "YES")
            prompt = self.base_prompt.get_prompt_get_all_headers_of_text()
        else:
            self.error_manager.show_message(2014, "NO")
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

        self.sess.save_client_data(uuid, 'upload_file.base_response_text', response)

    def explain_region(self, uuid, explain_region_file):

        base_response = self.sess.get_client_data(uuid, 'upload_file.base_response_text')

        image = Image.open(explain_region_file)
        prompt = self.base_prompt.get_prompt_explain_image_wrt_content(base_response)
        response = self.query_image(prompt, image)

        return response


