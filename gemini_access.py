import re
import os

import time
# from PIL import Image

import google.generativeai as genai

from base_model_access import BaseModelAccess

class GeminiAccess(BaseModelAccess):
    def __init__(self, sess, eManager):
        super().__init__(sess, eManager)

    def initialize(self):
        try:
            GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
            if not GOOGLE_API_KEY:
                raise ValueError("Google API key is not set.")

            genai.configure(api_key=GOOGLE_API_KEY)

            # model = genai.GenerativeModel("gemini-pro")
            self.model = genai.GenerativeModel(model_name="models/gemini-2.5-flash")


        except Exception as e:
            raise ValueError(self.eManager.show_message(2020, e))

    def clear(self, uuid):
        try:
            google_file = self.get_google_genai_file(uuid)
            genai.delete_file(google_file.name)

        except Exception as e:
            raise ValueError(self.eManager.show_message(2021, e))

    def upload_file(self, uuid, file_path):
        try:
            self.eManager.show_message(2005, file_path)
            google_file = genai.upload_file(path=file_path)

            while google_file.state.name == "PROCESSING":
                self.eManager.show_message(2006)
                time.sleep(1)
                google_file = genai.get_file(google_file.name)

            if google_file.state.name == "FAILED":
                raise ValueError(self.eManager.show_message(2007, google_file.state.name))

            return google_file.name, google_file.uri

        except Exception as e:
            raise ValueError(self.eManager.show_message(2022, e))

    def get_google_genai_file(self, uuid):
        try:
            genai_upload_file_name = self.sess.get_client_data(uuid, 'upload_file.genai_upload_file_name')
            google_file = genai.get_file(genai_upload_file_name)

            return google_file

        except Exception as e:
            raise ValueError(self.eManager.show_message(2023, e))

    def query_google_file(self, uuid, prompt):
        try:
            google_file = self.get_google_genai_file(uuid)
            response = self.model.generate_content([prompt, google_file],
                                        request_options={"timeout": 600})
            return response.text

        except Exception as e:
            raise ValueError(self.eManager.show_message(2024, e))

    def query_only_prompt(self, prompt):
        try:
            response = self.model.generate_content(prompt,
                            request_options={"timeout": 600})
            return response.text

        except Exception as e:
            raise ValueError(self.eManager.show_message(2025, e))

    def query_image(self, prompt, image):
        try:
            response = self.model.generate_content([prompt, image])
            return response.text

        except Exception as e:
            raise ValueError(self.eManager.show_message(2026, e))

    
