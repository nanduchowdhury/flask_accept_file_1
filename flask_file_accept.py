
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

from error_message_manager import ErrorManager
from gemini_access import GeminiAccess

class ScholarKM(Flask):
    def __init__(self):
        super().__init__(__name__)

        self.route('/')(self.index)
        self.route('/upload', methods=['POST'])(self.upload_file)
        self.route('/save_logs', methods=['POST'])(self.save_logs)

        self.upload_folder = ''
        self.log_folder = ''

        # Constants
        self.BASE_FOLDER = '/home/nandu_chowdhury/kupamanduk/scholar/'
        
        self.BASE_UPLOAD_FOLDER = 'uploads/'
        self.BASE_LOG_FOLDER = 'client_logs/'
        self.FIRST_TITLE_LEVEL = 0
        self.ALL_TITLES_LEVEL = -1

        self.error_manager = ErrorManager('static/errors.txt', 
            log_dir='/home/nandu_chowdhury/kupamanduk/scholar/server_logs/')

        self.numPoints = 0
        self.firstResponse = []

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

    def establish_folders(self, client_ip, client_id):

        client_folder = os.path.join(self.BASE_FOLDER, f'{client_ip}_{client_id}/')

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

    def receive_and_save_file(self, client_ip, data):
        file_path = ''

        if 'fileContent' in data:
            file_path = self.extract_file(data)

            self.error_manager.show_message(2002, client_ip, file_path)

        elif 'image' in data:
            file_path = self.extract_image(data)
            self.error_manager.show_message(2003, client_ip, file_path)

        elif 'video' in data:
            file_path = self.extract_video(data)
            self.error_manager.show_message(2004, client_ip, file_path)

        else:
            raise ValueError(self.error_manager.show_message(2001, client_ip))

        return file_path

    def upload_file(self):
        
        try:
            data = request.json
            client_ip = request.remote_addr
            client_id = data.get('clientId', 'unknown')

            self.establish_folders(client_ip, client_id);

            learnLevel = data['additionalData']
            learnLevel = learnLevel['learnLevel']

            if learnLevel == self.ALL_TITLES_LEVEL:
            
                file_path = self.receive_and_save_file(client_ip, data)
                self.gemini_access.upload_file(client_ip, file_path)


                english_response = self.gemini_access.get_overall_summary()
                self.numPoints = len(english_response.splitlines())

                self.error_manager.show_message(2009, client_ip, learnLevel, self.numPoints)

                self.firstResponse = english_response.splitlines()

                hindi_response = self.gemini_access.convert_to_hindi(english_response)

                return jsonify({'numPoints': self.numPoints,
                                'firstResponse' : self.firstResponse,
                                'result1': english_response, 
                                'result2': hindi_response})
            else:

                english_response = self.gemini_access.get_summary(self.firstResponse[learnLevel])
                hindi_response = self.gemini_access.convert_to_hindi(english_response)
                self.error_manager.show_message(2010, client_ip, learnLevel)

                return jsonify({'result1': english_response, 
                                'result2': hindi_response})        

        except ValueError as e:
            return jsonify({e}), 500

    # Function to get the log file path for a client (using IP as the identifier)
    def get_log_file_path(self, client_ip, client_id):
        return os.path.join(self.log_folder, f'{client_ip}_{client_id}.txt')


    def save_logs(self):
        try:
            data = request.get_json()
            
            client_id = data.get('clientId', 'unknown')
            client_ip = request.remote_addr
            self.establish_folders(client_ip, client_id)
            
            logs = data.get('logs', [])

            if not logs:
                return jsonify({"status": "no logs to save"}), 200

            # Get the client's IP address
            
            log_file_path = self.get_log_file_path(client_ip, client_id)

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

