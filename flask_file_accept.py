
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

from ContentCreator import ContentCreatorBase, ContentCreatorTask

from JsonSettings import JsonSettings

from gcs_manager import GCSManager

import constants

class ScholarKM(Flask):
    def __init__(self):
        Flask.__init__(self, __name__)

        self.client_ip = 'client_ip'
        self.client_uuid = 'client_uuid'

        self.route('/scholar_km')(self.scholar_km_index)
        
        self.route('/home_km')(self.home_km_index)

        self.route('/home_km/music_km')(self.music_km_index)
        self.route('/home_km/yoga_km')(self.yoga_km_index)
        self.route('/home_km/racing_km')(self.racing_km_index)
        self.route('/home_km/winter_sports_km')(self.winter_sports_km_index)
        self.route('/home_km/general_machines_km')(self.general_machines_km_index)
        self.route('/home_km/industrial_machines_km')(self.industrial_machines_km_index)
        self.route('/home_km/oscar_nominated_movies_km')(self.oscar_nominated_movies_km_index)
        self.route('/home_km/grammy_songs_km')(self.grammy_songs_km_index)
        self.route('/home_km/internal_organ_km')(self.internal_organ_km_index)
        self.route('/home_km/golf_km')(self.golf_km_index)
        self.route('/home_km/nutrition_km')(self.nutrition_km_index)
        self.route('/home_km/astronomy_km')(self.astronomy_km_index)
        self.route('/home_km/stocks_km')(self.stocks_km_index)
        self.route('/home_km/mutual_funds_km')(self.mutual_funds_km_index)
        self.route('/home_km/medical_care_km')(self.medical_care_km_index)
        self.route('/home_km/painting_km')(self.painting_km_index)
        self.route('/home_km/physics_km')(self.physics_km_index)
        self.route('/home_km/chemistry_km')(self.chemistry_km_index)
        self.route('/home_km/biology_km')(self.biology_km_index)
        self.route('/home_km/computer_science_km')(self.computer_science_km_index)
        self.route('/home_km/electronics_km')(self.electronics_km_index)
        self.route('/home_km/geography_km')(self.geography_km_index)
        self.route('/home_km/political_science_km')(self.political_science_km_index)
        self.route('/home_km/authors_km')(self.authors_km_index)
        self.route('/home_km/economics_km')(self.economics_km_index)
        self.route('/home_km/cricket_km')(self.cricket_km_index)
        self.route('/home_km/career_km')(self.career_km_index)
        self.route('/home_km/student_tips_km')(self.student_tips_km_index)
        self.route('/home_km/philosophy_km')(self.philosophy_km_index)
        self.route('/home_km/photography_km')(self.photography_km_index)

        self.route('/content_init', methods=['POST'])(self.content_init)
        self.route('/content_learn_more', methods=['POST'])(self.content_learn_more)
        self.route('/content_triple_dot_action_km', methods=['POST'])(self.content_triple_dot_action_km)

        self.route('/user-exit', methods=['POST'])(self.user_exit)

        self.route('/basic_init', methods=['POST'])(self.basic_init)
        self.route('/ai_model_init', methods=['POST'])(self.ai_model_init)
        self.route('/learn_response', methods=['POST'])(self.learn_response)
        self.route('/save_logs', methods=['POST'])(self.save_logs)
        self.route('/explain_region', methods=['POST'])(self.explain_region)
        self.route('/generate_MCQ', methods=['POST'])(self.generate_MCQ)
        self.route('/report_to_user', methods=['POST'])(self.report_to_user)

        self.serverSettings = JsonSettings("server_settings.json")

        self.FIRST_TITLE_LEVEL = 0
        self.ALL_TITLES_LEVEL = -1

        self.client_folder = f'clients'

        self.start_time_aiModelInit = ''

        self.pool = ThreadPool(constants.MAX_THREADS_TO_USE)

        current_time = datetime.now().strftime('%Y_%m_%d-%H_%M_%S')

        server_log_file = ''
        if os.getenv('RUN_SERVER_IN_LOCAL_MACHINE'):
            server_log_file = f'server_logs/server_non_production.log'
        else:
            server_log_file = f'server_logs/server_production.log'


        self.error_manager = ErrorManager(self.client_ip, self.client_uuid, 'static/errors.txt', 
                    "kupmanduk-bucket", server_log_file)

        self.sess = BaseClientManager(self.error_manager, self.client_folder)
        self.gemini_access = GeminiAccess(self.sess, self.error_manager)
        self.gemini_access.initialize()

        self.email_support = EmailSupport(self.error_manager)

        self.gcs_manager = GCSManager("kupmanduk-bucket", constants.GCS_ROOT_FOLDER)

        self.start_all_content_creator_threads()

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

        report_to_user_folder = f'{self.client_folder}/report_by_user'
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
        file_name = f"{report_to_user_folder}/{file_name}"
        self.gcs_manager.write_file(file_name, data['fileContent'])

        local_file = self.gcs_manager.get_local_file(file_name)
        localFileManager = constants.LocalFileManager(local_file)

        # self.email_support.send_email_with_attachment("subject", "body", local_file)

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

    def scholar_km_index(self):
        return render_template('scholar_km/index.html')

    def home_km_index(self):

        self.error_manager.show_page_invoke_message(f"home-km")

        return render_template('home/index.html')

    def content_creator_index(self, section):
        obj = ContentCreatorBase(section, self.gemini_access, self.error_manager)

        alreadyDoneTopicList = []
        [topic, alreadyDoneTopicList] = obj.get_random_topic(alreadyDoneTopicList)
        youtube_response_list = obj.generate_youtube_response(topic)
        content_response = obj.get_content_for_topic(topic)

        self.error_manager.show_page_invoke_message(f"content-km-{section}")

        json_data = {
            "section": section,
            "topic" : topic,
            "content_response": content_response,
            "youtube_response": youtube_response_list
        }
        return render_template('content/index.html', json_data=json_data)

    def music_km_index(self):
        return self.content_creator_index("hindustani_classical_music")

    def yoga_km_index(self):
        return self.content_creator_index("yoga")

    def medical_care_km_index(self):
        return self.content_creator_index("medical_care")

    def painting_km_index(self):
        return self.content_creator_index("painting")

    def physics_km_index(self):
        return self.content_creator_index("physics")

    def chemistry_km_index(self):
        return self.content_creator_index("chemistry")

    def biology_km_index(self):
        return self.content_creator_index("biology")

    def computer_science_km_index(self):
        return self.content_creator_index("computer_science")

    def electronics_km_index(self):
        return self.content_creator_index("electronics")

    def geography_km_index(self):
        return self.content_creator_index("geography")

    def political_science_km_index(self):
        return self.content_creator_index("political_science")

    def authors_km_index(self):
        return self.content_creator_index("authors")

    def racing_km_index(self):
        return self.content_creator_index("racing")

    def winter_sports_km_index(self):
        return self.content_creator_index("winter_sports")

    def general_machines_km_index(self):
        return self.content_creator_index("general_machines")

    def industrial_machines_km_index(self):
        return self.content_creator_index("industrial_machines")

    def oscar_nominated_movies_km_index(self):
        return self.content_creator_index("oscar_nominated_movies")

    def grammy_songs_km_index(self):
        return self.content_creator_index("grammy_songs")

    def economics_km_index(self):
        return self.content_creator_index("economics")

    def internal_organ_km_index(self):
        return self.content_creator_index("internal_organ")

    def golf_km_index(self):
        return self.content_creator_index("golf")

    def stocks_km_index(self):
        return self.content_creator_index("stocks")

    def mutual_funds_km_index(self):
        return self.content_creator_index("mutual_funds")

    def astronomy_km_index(self):
        return self.content_creator_index("astronomy")

    def medical_care_km_index(self):
        return self.content_creator_index("medical_care")

    def painting_km_index(self):
        return self.content_creator_index("painting")

    def physics_km_index(self):
        return self.content_creator_index("physics")

    def chemistry_km_index(self):
        return self.content_creator_index("chemistry")

    def biology_km_index(self):
        return self.content_creator_index("biology")

    def computer_science_km_index(self):
        return self.content_creator_index("computer_science")

    def electronics_km_index(self):
        return self.content_creator_index("electronics")

    def geography_km_index(self):
        return self.content_creator_index("geography")

    def political_science_km_index(self):
        return self.content_creator_index("political_science")

    def authors_km_index(self):
        return self.content_creator_index("authors")

    def nutrition_km_index(self):
        return self.content_creator_index("nutrition")

    def cricket_km_index(self):
        return self.content_creator_index("cricket")

    def career_km_index(self):
        return self.content_creator_index("career")

    def student_tips_km_index(self):
        return self.content_creator_index("student_tips")

    def philosophy_km_index(self):
        return self.content_creator_index("philosophy")

    def photography_km_index(self):
        return self.content_creator_index("photography")

    def content_triple_dot_action_km(self):
        data = request.json

        action = data['action']
        section = data['section']
        topic = data['topic']
        
        obj = ContentCreatorBase(section, self.gemini_access, self.error_manager)

        content = obj.get_content_for_topic(topic)
        second_lang_response = self.gemini_access.convert_to_second_lang(content, action)
        return jsonify({'content': second_lang_response})


    def is_main_content_changed(self, uuid, main_content_file):
        self.sess.force_read_session(uuid)

        json_start_time = self.sess.check_and_get_client_data(uuid, 'upload_file.start_time')

        if not constants.compareTime(json_start_time, self.start_time_aiModelInit):
            return True

        return False

    def gemini_setup_google_file(self, uuid, main_content_file):
        existing_google_file_name = self.sess.check_and_get_client_data(uuid, 'upload_file.genai_upload_file_name')
        if not existing_google_file_name:
            local_file = self.gcs_manager.get_local_file(main_content_file)
            localFileManager = constants.LocalFileManager(local_file)

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
            first_response = constants.remove_empty_lines(first_response)

            num_learn_points = len(first_response)
            self.sess.save_client_data(uuid, 'upload_file.num_learn_points', num_learn_points)
            self.sess.save_client_data(uuid, 'upload_file.first_response', first_response)

            self.error_manager.show_message(2009, num_learn_points)

    def gemini_setup(self, uuid, main_content_file):

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
        
    def rename_main_content_file(self, data, main_content_file):

        file_name = data['fileName']
        new_file = ''

        if file_name:
            new_file = self.gcs_manager.copy_file(main_content_file, file_name)

        return new_file

    def dump_request_info(self, uuid, request_name):
        print("***********************************************************")
        print(f"\t uuid : {uuid}")
        print(f"\t Request : {request_name}")
        print("\t ++++++++++++++++++++++++++++++++++++++++++")
        print(f"\t Payload size: {len(request.data)} bytes")
        # print("\t Headers:", request.headers)
        print("\t Content-Length:", request.content_length)
        print(f"\t JSON length: {len(request.json)}")
        print("***********************************************************")

    def ai_model_init(self):
        try:

            data = request.json

            uuid = self.get_or_generate_uuid(data)

            self.dump_request_info(uuid, "ai_model_init")

            self.sess.force_read_session(uuid)

            self.request_prelude(uuid)

            second_lang = data['secondLang']

            existing_main_file = self.sess.check_and_get_client_data(uuid, 'upload_file.main_content_file')
            if not self.gcs_manager.is_exist(existing_main_file):
                    raise ValueError(self.error_manager.show_message(2035))

            self.start_time_aiModelInit = constants.getTimeStamp()

            self.sess.save_client_data(uuid, 'upload_file.start_time', self.start_time_aiModelInit)
            self.sess.clear_client_data_selected_preserve(uuid, 'upload_file', ['main_content_file', 'start_time'])

            new_file = self.rename_main_content_file(data, existing_main_file)

            self.sess.save_client_data(uuid, 'upload_file.second_lang', second_lang)

            self.sess.force_save_session(uuid)

            self.gemini_setup(uuid, new_file)

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

                existing_main_file = self.sess.check_and_get_client_data(uuid, 'upload_file.main_content_file')
                if not existing_main_file:
                    raise ValueError(self.error_manager.show_message(2035))

                if (not self.sess.is_client_data_present(uuid, 'upload_file.num_learn_points')) or \
                    (not self.sess.is_client_data_present(uuid, 'upload_file.first_response')):
                    self.gemini_setup(uuid, existing_main_file)

                num_learn_points = self.sess.get_client_data(uuid, 'upload_file.num_learn_points')
                first_response = self.sess.get_client_data(uuid, 'upload_file.first_response')

                if is_threading_on:
                    self.startHeaderResponseThread(uuid, learnLevel + 1)
                
                return jsonify({'numPoints': num_learn_points,
                                'firstResponse' : first_response})
            else:

                english_response, second_lang_response = self.getHeaderResponse(uuid, learnLevel, is_threading_on)
                
                if is_threading_on:
                    self.startHeaderResponseThread(uuid, learnLevel + 1)

                self.error_manager.show_message(2010, learnLevel)

                return jsonify({'result1': english_response, 
                                'result2': second_lang_response})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def isHeaderResponseForceRunReqd(self, headerTask, is_threading_on):

        if not is_threading_on:
            return True

        english_response = ''
        second_lang_response = ''

        force_run = not constants.check_condition(headerTask.is_task_completed)
            
        if not force_run:
            english_response, second_lang_response = headerTask.get_results()
            if not english_response or not second_lang_response:
                force_run = True

        return force_run, english_response, second_lang_response

    def getHeaderResponse(self, uuid, learnLevel, is_threading_on):

        english_response = ''
        second_lang_response = ''

        second_lang = self.sess.get_client_data(uuid, 'upload_file.second_lang')

        headerTask = HeaderResponseTask(uuid, self.sess, self.gemini_access, learnLevel, second_lang)
        force_run, english_response, second_lang_response = self.isHeaderResponseForceRunReqd(headerTask, is_threading_on)

        if force_run:
            english_response, second_lang_response = headerTask.perform_actual_task()
                
        return english_response, second_lang_response

    def startHeaderResponseThread(self, uuid, learnLevel):

        second_lang = self.sess.get_client_data(uuid, 'upload_file.second_lang')

        headerTask = HeaderResponseTask(uuid, self.sess, self.gemini_access, learnLevel, second_lang)
        task_name = f'task_learnLevel_{learnLevel}'
        self.pool.startTask(uuid, task_name, headerTask)

    ##################################################
    #
    # Content creator thread is invoked only when ENV is set.
    # It need not be done in production env - content can
    # be created once locally which will put all contents
    # in GCS-bucket.
    #
    ##################################################
    def start_all_content_creator_threads(self):
        if os.getenv('RUN_SERVER_IN_LOCAL_MACHINE'):
            if constants.is_first_gunicorn_worker():

                self.content_creator_task("geography")
                self.content_creator_task("authors")
                
                self.content_creator_task("hindustani_classical_music")
                self.content_creator_task("yoga")
                self.content_creator_task("internal_organ")
                self.content_creator_task("astronomy")
                self.content_creator_task("golf")
                self.content_creator_task("stocks")
                self.content_creator_task("mutual_funds")
                self.content_creator_task("nutrition")
                self.content_creator_task("economics")
                self.content_creator_task("racing")
                self.content_creator_task("winter_sports")
                self.content_creator_task("general_machines")
                self.content_creator_task("industrial_machines")
                self.content_creator_task("oscar_nominated_movies")
                self.content_creator_task("grammy_songs")

                self.content_creator_task("medical_care")
                self.content_creator_task("painting")
                self.content_creator_task("physics")
                self.content_creator_task("chemistry")
                self.content_creator_task("biology")
                self.content_creator_task("computer_science")
                self.content_creator_task("electronics")
                
                self.content_creator_task("political_science")

                self.content_creator_task("cricket")
                self.content_creator_task("career")
                self.content_creator_task("student_tips")
                self.content_creator_task("philosophy")
                self.content_creator_task("photography")


    def content_creator_task(self, section):
        task_name = section
        task = ContentCreatorTask(task_name, self.gemini_access, self.error_manager)
        uuid = task_name + "_UUID"
        self.pool.startTask(uuid, task_name, task)

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

    def generate_MCQ(self):
        try:
            data = request.get_json()
            uuid = self.get_or_generate_uuid(data)

            self.sess.force_read_session(uuid)

            self.dump_request_info(uuid, "generate_MCQ")

            self.request_prelude(uuid)

            english_response = self.gemini_access.generate_MCQ(uuid)

            return jsonify({'result1': english_response})

        except Exception as e:
            return jsonify({"error": str(e)}), 500


    def explain_region(self):
        try:
            data = request.get_json()
            uuid = self.get_or_generate_uuid(data)

            self.sess.force_read_session(uuid)

            self.dump_request_info(uuid, "explain_region")

            self.request_prelude(uuid)

            gcs_file, file_content = self.extract_image(uuid, data)

            local_file = self.gcs_manager.get_local_file(gcs_file)
            localFileManager = constants.LocalFileManager(local_file)

            english_response = self.gemini_access.explain_region(uuid, local_file)
            self.error_manager.show_message(2013, gcs_file)

            second_lang = self.sess.get_client_data(uuid, 'upload_file.second_lang')

            second_lang_response = self.gemini_access.convert_to_second_lang(english_response, second_lang)

            return jsonify({'result1': english_response, 
                            'result2': second_lang_response})

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

    def user_exit(self):
        client_ip = request.remote_addr
        elapsed_time = request.form.get("elapsed_time", "0")
        user_close_action = request.form.get("close_action_invoked", "unknown")
        
        msg = f"User with IP {client_ip} closed the browser after {int(elapsed_time) / 1000:.2f} seconds - action : {user_close_action}"
        self.error_manager.show_any_message(msg)

        return '', 204  # No content response

    def content_learn_more(self):

        data = request.get_json()

        section = data.get('section', '')
        alreadyDoneTopicList = data.get('alreadyDoneTopicList', '')

        obj = ContentCreatorBase(section, self.gemini_access, self.error_manager)
        [topic, alreadyDoneTopicList] = obj.get_random_topic(alreadyDoneTopicList)

        youtube_response_list = obj.generate_youtube_response(topic)
        content_response = obj.get_content_for_topic(topic)

        msg = f"Invoked Learn-More : {section}"
        self.error_manager.show_any_message(msg)

        json_data = {
            "section": section,
            "topic": topic,
            "alreadyDoneTopicList": alreadyDoneTopicList,
            "content_response": content_response,
            "youtube_response": youtube_response_list
        }
        return jsonify(json_data), 200

    def content_init(self):
        try:
            data = request.get_json()
            client_uuid = self.get_or_generate_uuid(data, True)

            self.sess.save_client_data(client_uuid, 'basic_init.client_uuid', client_uuid)

            client_id = data.get('clientId', 'unknown')
            self.sess.save_client_data(client_uuid, 'basic_init.client_id', client_id)
            client_ip = request.remote_addr
            self.sess.save_client_data(client_uuid, 'basic_init.client_ip', client_ip)

            self.error_manager.update_client_uuid(client_uuid)
            self.error_manager.update_client_ip(client_ip)

            cfolder = f'{self.client_folder}/{client_ip}_{client_uuid}'
            
            log_folder = f'{cfolder}/client_logs'
            self.sess.save_client_data(client_uuid, 'basic_init.log_folder', log_folder)
            
            log_file_path = f'{log_folder}/client_log.txt'
            self.sess.save_client_data(client_uuid, 'basic_init.log_file_path', log_file_path)

            self.error_manager.show_message(2065, client_uuid)

            self.sess.force_save_session(client_uuid)

            return jsonify({"client_uuid": client_uuid}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

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

            upload_folder = self.sess.get_client_data(client_uuid, 'basic_init.upload_folder')
            gcs_main_content_file = f"{upload_folder}/{constants.GCS_UPLOAD_MAIN_CONTENT_FILE_NAME}"
            self.gcs_manager.cors_configuration()
            signed_url = self.gcs_manager.get_signed_url(gcs_main_content_file)

            self.sess.save_client_data(client_uuid, 'upload_file.main_content_file', gcs_main_content_file)

            self.sess.force_save_session(client_uuid)

            return jsonify({"client_uuid": client_uuid,
                            "signed_main_content_url": signed_url}), 200

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

app.config['SESSION_TYPE'] = 'filesystem'
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32 MB

Session(app)

if __name__ == '__main__':
  app.run(debug=True, threaded=True)

