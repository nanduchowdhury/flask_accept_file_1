
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

import json

import base64
from io import BytesIO
import io

from flask import Flask, request, send_file, session, redirect, url_for

from PIL import Image, ImageDraw

# import redis

from io import BytesIO
# import pdfkit  # You'll need to install the `pdfkit` and `wkhtmltopdf

# from redis import Redis
from flask_session import Session

# import tempfile  # For creating temporary files

# from reportlab.pdfgen import canvas
# from reportlab.lib.pagesizes import letter

from datetime import datetime
import time

import google.generativeai as genai

from error_message_manager import ErrorManager
from gemini_access import GeminiAccess
from base_client_manager import BaseClientManager
from emailSupport import EmailSupport

from ThreadPool import ThreadPool, TaskStatus, TaskBase
from headerResponseTask import HeaderResponseTask

from JsonSettings import JsonSettings

from gcs_manager import GCSManager

import constants

class ScholarKM(Flask):
    def __init__(self):
        Flask.__init__(self, __name__)

        self.client_ip = 'client_ip'
        self.client_uuid = 'client_uuid'

        self.main_content_file = ''

        self.route('/')(self.index)
        self.route('/basic_init', methods=['POST'])(self.basic_init)
        self.route('/ai_model_init', methods=['POST'])(self.ai_model_init)
        self.route('/learn_response', methods=['POST'])(self.learn_response)
        self.route('/save_logs', methods=['POST'])(self.save_logs)
        self.route('/explain_region', methods=['POST'])(self.explain_region)
        self.route('/report_to_user', methods=['POST'])(self.report_to_user)

        self.serverSettings = JsonSettings("server_settings.json")

        self.FIRST_TITLE_LEVEL = 0
        self.ALL_TITLES_LEVEL = -1

        self.client_folder = f'clients'

        self.pool = ThreadPool(constants.MAX_THREADS_TO_USE)

        current_time = datetime.now().strftime('%Y_%m_%d-%H_%M_%S')

        self.error_manager = ErrorManager(self.client_ip, self.client_uuid, 'static/errors.txt', 
                    "kupmanduk-bucket", f"server_logs/server_log_{current_time}.txt")

        self.sess = BaseClientManager(self.error_manager, self.client_folder)
        self.gemini_access = GeminiAccess(self.sess, self.error_manager)
        self.gemini_access.initialize()

        self.email_support = EmailSupport(self.error_manager)

        self.gcs_manager = GCSManager("kupmanduk-bucket", constants.GCS_ROOT_FOLDER)

    def extract_text_from_pdf(self, pdf_path):
        text = ""
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text += page.extract_text()
        return text

    def establish_folders(self, uuid):

        client_ip = self.sess.get_client_data(uuid, 'basic_init.client_ip')
        
        cfolder = f'{self.client_folder}/{client_ip}_{uuid}'

        upload_folder = f'{cfolder}/uploads'
        self.sess.save_client_data(uuid, 'basic_init.upload_folder', upload_folder)
        
        log_folder = f'{cfolder}/client_logs'
        self.sess.save_client_data(uuid, 'basic_init.log_folder', log_folder)

        report_to_user_folder = f'{cfolder}/report_by_user'
        self.sess.save_client_data(uuid, 'basic_init.report_to_user_folder', report_to_user_folder)
        
        log_file_path = f'{log_folder}/client_log.txt'
        self.sess.save_client_data(uuid, 'basic_init.log_file_path', log_file_path)

    def extract_file(self, uuid, data):

        file_name = data['fileName']

        upload_folder = self.sess.get_client_data(uuid, 'basic_init.upload_folder')
        file_name = f"{upload_folder}/{file_name}"

        file_content = base64.b64decode(data['fileContent'])

        self.gcs_manager.write_file(file_name, data['fileContent'])

        return file_name, file_content

    def save_report_to_user_file(self, uuid, data):

        file_name = data['fileName']

        file_name = self.append_timestamp_to_filename(file_name)

        report_to_user_folder = self.sess.get_client_data(uuid, 'basic_init.report_to_user_folder')

        file_name = os.path.join(report_to_user_folder, file_name)
        file_content = base64.b64decode(data['fileContent'])

        with open(file_name, 'wb') as f:
            f.write(file_content)

        # self.email_support.send_email_with_attachment("subject", "body", file_name)

        return file_name

    def append_timestamp_to_filename(self, filename):
        current_time = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        base_name, ext = os.path.splitext(filename)
        
        new_filename = f'{base_name}_{current_time}{ext}'
        
        return new_filename

    def extract_image(self, uuid, data):

        file_name = 'captured_image.png'
        file_name = self.append_timestamp_to_filename(file_name)

        upload_folder = self.sess.get_client_data(uuid, 'basic_init.upload_folder')

        file_name = f"{upload_folder}/{file_name}"

        image_data_url = data['image']
        header, base64_image = image_data_url.split(',', 1)
        file_content = base64.b64decode(base64_image)
        image = Image.open(io.BytesIO(file_content))

        self.gcs_manager.write_image(file_name, image)

        return file_name, file_content

    def extract_video(self, uuid, data):

        file_name = 'uploaded_video.webm'
        file_name = self.append_timestamp_to_filename(file_name)

        upload_folder = self.sess.get_client_data(uuid, 'basic_init.upload_folder')

        file_name = f"{upload_folder}/{file_name}"

        video_data = data['video']
        video_binary = base64.b64decode(video_data)
        
        self.gcs_manager.write_video(file_name, video_binary)

        return file_name, video_binary

    def index(self):
        return render_template('index.html')

    def receive_and_save_file(self, uuid, data):
        
        file_name = ''
        file_content = ''

        if 'fileContent' in data:
            file_name, file_content = self.extract_file(uuid, data)

            self.error_manager.show_message(2002, file_name)

        elif 'image' in data:
            file_name, file_content = self.extract_image(uuid, data)
            self.error_manager.show_message(2003, file_name)

        elif 'video' in data:
            file_name, file_content = self.extract_video(uuid, data)
            self.error_manager.show_message(2004, file_name)

        else:
            raise ValueError(self.error_manager.show_message(2001))

        return file_name, file_content

    def is_main_content_changed(self, uuid, main_content_file):
        self.sess.force_read_session(uuid)
        existing_main_file =  self.sess.check_and_get_client_data(uuid, 'upload_file.main_content_file')

        if existing_main_file != main_content_file:
            return True
        return False

    def gemini_setup_google_file(self, uuid, main_content_file):
        existing_google_file_name = self.sess.check_and_get_client_data(uuid, 'upload_file.genai_upload_file_name')
        if not existing_google_file_name:
            local_file = self.gcs_manager.get_local_file(main_content_file)
            google_file_name, google_uri = self.gemini_access.upload_file(uuid, local_file)
            self.error_manager.show_message(2008, google_uri)
            self.sess.save_client_data(uuid, 'upload_file.genai_upload_file_name', google_file_name)

    def gemini_setup_base_response(self, uuid):
        existing_base_response = self.sess.check_and_get_client_data(uuid, 'upload_file.base_response_text')
        if not existing_base_response:
            base_response = self.gemini_access.generate_base_response(uuid)
            self.sess.save_client_data(uuid, 'upload_file.base_response_text', base_response)

    def gemini_setup_content_clarity(self, uuid):
        is_academic_content = self.sess.check_and_get_client_data(uuid, 'upload_file.is_academic_content')
        is_text_in_content = self.sess.check_and_get_client_data(uuid, 'upload_file.is_text_in_content')
        is_header_in_content = self.sess.check_and_get_client_data(uuid, 'upload_file.is_header_in_content')

        if (not is_academic_content) or (not is_text_in_content) or (not is_header_in_content):
            is_academic_content, is_text_in_content, is_header_in_content = self.gemini_access.is_academic_text_header_present(uuid)
            self.sess.save_client_data(uuid, 'upload_file.is_academic_content', is_academic_content)
            self.sess.save_client_data(uuid, 'upload_file.is_text_in_content', is_text_in_content)
            self.sess.save_client_data(uuid, 'upload_file.is_header_in_content', is_header_in_content)

        if not is_academic_content:
            raise ValueError(self.error_manager.show_message(2011))

        return is_academic_content, is_text_in_content, is_header_in_content

    def gemini_setup_learn_contents(self, uuid, is_text_in_content, is_header_in_content):
        existing_num_learn_points = self.sess.check_and_get_client_data(uuid, 'upload_file.num_learn_points')
        if not existing_num_learn_points:

            if is_header_in_content:
                self.error_manager.show_message(2014, "YES")
            else:
                self.error_manager.show_message(2014, "NO")

            if ( is_text_in_content ):
                self.error_manager.show_message(2012, "TEXT")
                english_response = self.gemini_access.get_all_headers_of_text(uuid, is_header_in_content)
            else:
                self.error_manager.show_message(2012, "PICTURE")
                english_response = self.gemini_access.get_all_headers_of_picture(uuid)

            first_response = english_response.splitlines()

            num_learn_points = len(first_response)
            self.sess.save_client_data(uuid, 'upload_file.num_learn_points', num_learn_points)
            self.sess.save_client_data(uuid, 'upload_file.first_response', first_response)

            self.error_manager.show_message(2009, num_learn_points)

    def gemini_setup(self, uuid, main_content_file):

        if self.is_main_content_changed(uuid, main_content_file):
            self.sess.clear_client_data(uuid, 'upload_file')
            self.sess.save_client_data(uuid, 'upload_file.main_content_file', main_content_file)
            self.sess.force_save_session(uuid)

        if self.is_main_content_changed(uuid, main_content_file):
            return

        self.gemini_setup_google_file(uuid, main_content_file)
        self.sess.force_save_session(uuid)

        if self.is_main_content_changed(uuid, main_content_file):
            return

        self.gemini_setup_base_response(uuid)
        self.sess.force_save_session(uuid)

        if self.is_main_content_changed(uuid, main_content_file):
            return

        is_academic_content, is_text_in_content, is_header_in_content = self.gemini_setup_content_clarity(uuid, )
        self.sess.force_save_session(uuid)

        if self.is_main_content_changed(uuid, main_content_file):
            return

        self.gemini_setup_learn_contents(uuid, is_text_in_content, is_header_in_content)
        
    def ai_model_init(self):
        try:
            data = request.json
            uuid = self.get_or_generate_uuid(data)

            self.sess.force_read_session(uuid)

            self.request_prelude(uuid)

            self.main_content_file, file_content = self.receive_and_save_file(uuid, data)

            self.gemini_setup(uuid, self.main_content_file)

            self.sess.force_save_session(uuid)

            return jsonify({'success': 'true'})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def is_ai_model_init_completed(self, uuid):

        self.sess.force_read_session(uuid)

        if self.sess.is_client_data_present(uuid, 'upload_file.first_response'):
            if self.sess.get_client_data(uuid, 'upload_file.first_response'):
                return True
        return False


    def learn_response(self):
        try:
            data = request.json
            uuid = self.get_or_generate_uuid(data)

            self.sess.force_read_session(uuid)

            self.request_prelude(uuid)

            is_threading_on = self.serverSettings.getParam('run.threading')
            # self.sess.dump_session(uuid)

            learnLevel = data['additionalData']
            learnLevel = learnLevel['learnLevel']

            if learnLevel == self.ALL_TITLES_LEVEL:

                constants.check_condition(lambda: self.is_ai_model_init_completed(uuid))

                self.main_content_file = self.sess.check_and_get_client_data(uuid, 'upload_file.main_content_file')
                if not self.main_content_file:
                    raise ValueError(self.error_manager.show_message(2035))

                if (not self.sess.is_client_data_present(uuid, 'upload_file.num_learn_points')) or \
                    (not self.sess.is_client_data_present(uuid, 'upload_file.first_response')):
                    self.gemini_setup(uuid, self.main_content_file)

                num_learn_points = self.sess.get_client_data(uuid, 'upload_file.num_learn_points')
                first_response = self.sess.get_client_data(uuid, 'upload_file.first_response')

                if is_threading_on:
                    self.startHeaderResponseThread(uuid, learnLevel + 1)
                
                return jsonify({'numPoints': num_learn_points,
                                'firstResponse' : first_response})
            else:

                english_response, hindi_response = self.getHeaderResponse(uuid, learnLevel, is_threading_on)
                
                if is_threading_on:
                    self.startHeaderResponseThread(uuid, learnLevel + 1)

                self.error_manager.show_message(2010, learnLevel)

                return jsonify({'result1': english_response, 
                                'result2': hindi_response})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def isHeaderResponseForceRunReqd(self, headerTask, is_threading_on):

        if not is_threading_on:
            return True

        english_response = ''
        hindi_response = ''

        force_run = not constants.check_condition(headerTask.is_task_completed)
            
        if not force_run:
            english_response, hindi_response = headerTask.get_results()
            if not english_response or not hindi_response:
                force_run = True

        return force_run, english_response, hindi_response

    def getHeaderResponse(self, uuid, learnLevel, is_threading_on):

        english_response = ''
        hindi_response = ''

        headerTask = HeaderResponseTask(uuid, self.sess, self.gemini_access, learnLevel)
        force_run, english_response, hindi_response = self.isHeaderResponseForceRunReqd(headerTask, is_threading_on)

        if force_run:
            english_response, hindi_response = headerTask.perform_actual_task()
                
        return english_response, hindi_response

    def startHeaderResponseThread(self, uuid, learnLevel):
        headerTask = HeaderResponseTask(uuid, self.sess, self.gemini_access, learnLevel)
        task_name = f'task_learnLevel_{learnLevel}'
        self.pool.startTask(uuid, task_name, headerTask)

    def report_to_user(self):
        try:
            data = request.get_json()
            uuid = self.get_or_generate_uuid(data)

            self.sess.force_read_session(uuid)

            self.request_prelude(uuid)

            saved_report_by_user = self.save_report_to_user_file(uuid, data)

            self.error_manager.show_message(2018, saved_report_by_user)

            return jsonify({"status": "success"}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def explain_region(self):
        try:
            data = request.get_json()
            uuid = self.get_or_generate_uuid(data)

            self.sess.force_read_session(uuid)

            self.request_prelude(uuid)

            # self.sess.dump_session(uuid)

            explain_region_file = self.extract_image(uuid, data)

            english_response = self.gemini_access.explain_region(uuid, explain_region_file)
            self.error_manager.show_message(2013, explain_region_file)

            hindi_response = self.gemini_access.convert_to_hindi(english_response)

            return jsonify({'result1': english_response, 
                            'result2': hindi_response})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def get_or_generate_uuid(self, data, is_generate=False):
        client_uuid = data.get('client_uuid', '')
        if not client_uuid:
            if is_generate:
                client_uuid = self.sess.set_client_uuid()  # Generate a new client ID
            else:
                raise ValueError(self.error_manager.show_message(2017))
        return client_uuid

    def request_prelude(self, uuid):

        cip = self.sess.get_client_data(uuid, 'basic_init.client_ip')

        self.error_manager.update_client_uuid(uuid)
        self.error_manager.update_client_ip(cip)

    def basic_init(self):
        try:
            data = request.get_json()
            client_uuid = self.get_or_generate_uuid(data, True)

            self.sess.save_client_data(client_uuid, 'basic_init.client_uuid', client_uuid)

            client_id = data.get('clientId', 'unknown')
            self.sess.save_client_data(client_uuid, 'basic_init.client_id', client_id)
            client_ip = request.remote_addr
            self.sess.save_client_data(client_uuid, 'basic_init.client_ip', client_ip)

            self.request_prelude(client_uuid)

            self.establish_folders(client_uuid)

            self.error_manager.show_message(2019, client_uuid)

            self.sess.force_save_session(client_uuid)

            return jsonify({"client_uuid": client_uuid}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def save_logs(self):
        try:
            data = request.get_json()
            client_uuid = self.get_or_generate_uuid(data)

            self.sess.force_read_session(client_uuid)

            self.request_prelude(client_uuid)

            logs = data.get('logs', [])

            if not logs:
                return jsonify({"status": "no logs to save"}), 200
            
            log_file_path = self.sess.get_client_data(client_uuid, 'basic_init.log_file_path')

            for log in logs:
                self.gcs_manager.append_to_text_file(log_file_path, json.dumps(log))

            return jsonify({"status": "logs saved"}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500


app = ScholarKM()

if constants.server_database == constants.USE_REDIS:
    app.config['SESSION_TYPE'] = 'redis'
    app.config['SESSION_PERMANENT'] = False
    app.config['SESSION_USE_SIGNER'] = True  # Prevents tampering of session cookies
    app.config['SESSION_KEY_PREFIX'] = 'kupamanduk-session:'
    app.config['SESSION_REDIS'] = redis.StrictRedis(host='localhost', port=6379)

    # app.config['SECRET_KEY'] = os.urandom(32)
    app.config['SECRET_KEY'] = "kupamanduk-10987"
    # app.secret_key = os.urandom(32)
else:
    app.config['SESSION_TYPE'] = 'filesystem'

Session(app)

if __name__ == '__main__':
  app.run(debug=True, threaded=True)

