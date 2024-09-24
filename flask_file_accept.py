
#########################
#
# Install packages in google-shell as follows:
#   /usr/bin/pip3.10 install PyPDF2
#########################

from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os

import PyPDF2

import pathlib
import textwrap

import base64
from io import BytesIO
import io
from PIL import Image

import google.generativeai as genai

from error_message_manager import ErrorManager
from gemini_access import GeminiAccess

class ScholarKM(Flask):
    def __init__(self):
        super().__init__(__name__)

        self.client_ip = 'client_ip'
        self.client_id = 'client_id'

        self.route('/')(self.index)
        self.route('/upload', methods=['POST'])(self.upload_file)
        self.route('/save_logs', methods=['POST'])(self.save_logs)
        self.route('/explain_region', methods=['POST'])(self.explain_region)

        self.upload_folder = ''
        self.log_folder = ''

        # Constants
        self.BASE_FOLDER = '/home/nandu_chowdhury/kupamanduk/scholar/'
        
        self.SERVER_LOGS_FOLDER = '/home/nandu_chowdhury/kupamanduk/scholar/server_logs/'
        self.BASE_UPLOAD_FOLDER = 'uploads/'
        self.BASE_LOG_FOLDER = 'client_logs/'
        self.FIRST_TITLE_LEVEL = 0
        self.ALL_TITLES_LEVEL = -1

        self.numPoints = 0
        self.firstResponse = []

        self.error_manager = ErrorManager(self.client_ip, 'static/errors.txt', 
                    log_dir=self.SERVER_LOGS_FOLDER)

        self.gemini_access = GeminiAccess(self.error_manager)
        self.gemini_access.initialize()

    def extract_text_from_pdf(self, pdf_path):
        text = ""
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text += page.extract_text()
        return text

    def establish_folders(self):

        client_folder = os.path.join(self.BASE_FOLDER, f'{self.client_ip}_{self.client_id}/')

        if not os.path.exists(client_folder):
            os.makedirs(client_folder, exist_ok=True)

        self.upload_folder = os.path.join(client_folder, self.BASE_UPLOAD_FOLDER)

        if not os.path.exists(self.upload_folder):
            os.makedirs(self.upload_folder, exist_ok=True)

        self.log_folder = os.path.join(client_folder, self.BASE_LOG_FOLDER)

        if not os.path.exists(self.log_folder):
            os.makedirs(self.log_folder, exist_ok=True)

    def extract_file(self, data):

        file_name = data['fileName']

        file_name = os.path.join(self.upload_folder, file_name)
        file_content = base64.b64decode(data['fileContent'])

        with open(file_name, 'wb') as f:
            f.write(file_content)
        return file_name

    def extract_image(self, data):
        image_data_url = data['image']
        header, base64_image = image_data_url.split(',', 1)
        file_content = base64.b64decode(base64_image)
        image = Image.open(io.BytesIO(file_content))
        filename = os.path.join(self.upload_folder, 'captured_image.png')
        image.save(filename)
        return filename

    def extract_video(self, data):
        video_data = data['video']
        video_binary = base64.b64decode(video_data)
        video_path = os.path.join(self.upload_folder, 'uploaded_video.webm')
        with open(video_path, 'wb') as video_file:
            video_file.write(video_binary)
        return video_path

    def index(self):
        return render_template('index.html')

    def receive_and_save_file(self, data):
        file_path = ''

        if 'fileContent' in data:
            file_path = self.extract_file(data)

            self.error_manager.show_message(2002, file_path)

        elif 'image' in data:
            file_path = self.extract_image(data)
            self.error_manager.show_message(2003, file_path)

        elif 'video' in data:
            file_path = self.extract_video(data)
            self.error_manager.show_message(2004, file_path)

        else:
            raise ValueError(self.error_manager.show_message(2001))

        return file_path

    def upload_file(self):
        
        try:
            data = request.json
            self.client_ip = request.remote_addr
            self.client_id = data.get('clientId', 'unknown')

            self.error_manager.update_client_ip(self.client_ip)

            self.establish_folders();

            learnLevel = data['additionalData']
            learnLevel = learnLevel['learnLevel']

            if learnLevel == self.ALL_TITLES_LEVEL:
            
                self.main_content_file = self.receive_and_save_file(data)
                self.gemini_access.upload_file(self.main_content_file)

                self.gemini_access.check_content_student_related()

                if ( self.gemini_access.is_there_text_in_content() ):
                    self.error_manager.show_message(2012, "TEXT")
                    english_response = self.gemini_access.get_all_headers_of_text()
                else:
                    self.error_manager.show_message(2012, "PICTURE")
                    english_response = self.gemini_access.get_all_headers_of_picture()

                self.numPoints = len(english_response.splitlines())

                self.error_manager.show_message(2009, learnLevel, self.numPoints)

                self.firstResponse = english_response.splitlines()

                hindi_response = self.gemini_access.convert_to_hindi(english_response)

                return jsonify({'numPoints': self.numPoints,
                                'firstResponse' : self.firstResponse,
                                'result1': english_response, 
                                'result2': hindi_response})
            else:

                english_response = self.gemini_access.get_header_summary(self.firstResponse[learnLevel])
                hindi_response = self.gemini_access.convert_to_hindi(english_response)
                self.error_manager.show_message(2010, learnLevel)

                return jsonify({'result1': english_response, 
                                'result2': hindi_response})

        except ValueError as e:
            return jsonify({"error": str(e)}), 500

    # Function to get the log file path for a client (using IP as the identifier)
    def get_log_file_path(self):
        return os.path.join(self.log_folder, f'{self.client_ip}_{self.client_id}.txt')


    def explain_region(self):
        try:
            data = request.get_json()
            
            self.client_id = data.get('clientId', 'unknown')
            self.client_ip = request.remote_addr

            self.explain_region_file = self.extract_image(data)

            english_response = self.gemini_access.explain_region(self.main_content_file, self.explain_region_file)
            self.error_manager.show_message(2013)

            hindi_response = self.gemini_access.convert_to_hindi(english_response)

            return jsonify({'result1': english_response, 
                            'result2': hindi_response})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def save_logs(self):
        try:
            data = request.get_json()
            
            self.client_id = data.get('clientId', 'unknown')
            self.client_ip = request.remote_addr
            self.establish_folders(self.client_ip, self.client_id)
            
            logs = data.get('logs', [])

            if not logs:
                return jsonify({"status": "no logs to save"}), 200
            
            log_file_path = self.get_log_file_path()

            # Append the logs to the client's log file
            with open(log_file_path, 'a') as log_file:
                for log in logs:
                    log_file.write(f"{log}\n")

            return jsonify({"status": "logs saved"}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
  app = ScholarKM()
  app.run(debug=True)

