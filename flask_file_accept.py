
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
import google.generativeai as genai

import time

import base64
from io import BytesIO
import io
from PIL import Image

app = Flask(__name__)

UPLOAD_FOLDER = '/home/nandu_chowdhury/kupamanduk/scholar/uploads/'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

LOG_FOLDER = '/home/nandu_chowdhury/kupamanduk/scholar/client_logs/'
if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)

def extract_text_from_pdf(pdf_path):
    text = ""
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            text += page.extract_text()
    return text

def get_upload_file_path(file):
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    return file_path

def extract_file(data):
    file_name = data['fileName']
    file_name = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    file_content = base64.b64decode(data['fileContent'])

    with open(file_name, 'wb') as f:
        f.write(file_content)
    return file_name

def extract_image(data):
    image_data_url = data['image']
    header, base64_image = image_data_url.split(',', 1)
    file_content = base64.b64decode(base64_image)
    image = Image.open(io.BytesIO(file_content))
    filename = os.path.join(UPLOAD_FOLDER, 'captured_image.png')
    image.save(filename)
    return filename

def extract_video(data):
    video_data = data['video']
    video_binary = base64.b64decode(video_data)
    video_path = os.path.join(UPLOAD_FOLDER, 'uploaded_video.webm')
    with open(video_path, 'wb') as video_file:
        video_file.write(video_binary)
    return video_path

@app.route('/')
def index():
    return render_template('index.html')

numPoints = 0
firstResponse = []

@app.route('/upload', methods=['POST'])
def upload_file():
    
    client_ip = request.remote_addr  # Get the client's IP address

    file_path = ''

    data = request.json

    if 'fileContent' in data:
        print("KUPAMANDUK-1001 Receiving file")
        file_path = extract_file(data)

    elif 'image' in data:
        print("KUPAMANDUK-1002 Receiving image data")
        file_path = extract_image(data)
    elif 'video' in data:
        print("KUPAMANDUK-1003 Receiving video data")
        file_path = extract_video(data)
    else:
        return jsonify({'error': 'Invalid data format'}), 400


    GOOGLE_API_KEY=os.getenv('GOOGLE_API_KEY')
    genai.configure(api_key=GOOGLE_API_KEY)

    print("KUPAMANDUK-1002 Saved file or image/video data as " + file_path)
    
    print("KUPAMANDUK-1003 Uploading file to gemini...")
    genai_upload_file = genai.upload_file(path=file_path)

    while genai_upload_file.state.name == "PROCESSING":
        print('KUPAMANDUK-1004 Waiting for file to be uploaded to gemini...')
        time.sleep(10)
        genai_upload_file = genai.get_file(genai_upload_file.name)

    if genai_upload_file.state.name == "FAILED":
        raise ValueError(genai_upload_file.state.name)
    print(f'KUPAMANDUK-1005 File upload to gemini complete : ' + genai_upload_file.uri)

    # model = genai.GenerativeModel("gemini-pro")
    model = genai.GenerativeModel(model_name="models/gemini-1.5-flash")

    learnLevel = data['additionalData']
    learnLevel = learnLevel['learnLevel']
    print(learnLevel)

    global numPoints
    global firstResponse

    FIRST_TITLE_LEVEL = 0
    ALL_TITLES_LEVEL = -1

    if learnLevel == ALL_TITLES_LEVEL:
        english_prompt = "summarize the content in points separated by newlines"
        english_response = model.generate_content([english_prompt, genai_upload_file],
                                  request_options={"timeout": 600})
        numPoints = len(english_response.text.splitlines())
        print(f'learnLevel : ' + str(learnLevel))
        print(f'numPoints : ' + str(numPoints))
        # print(f'response : ' + english_response.text)
        firstResponse = english_response.text.splitlines()
        print(firstResponse[1])
        hindi_prompt = "convert following text in such a way that most of the content is in hindi and all hard words are in english : \n\n" + english_response.text
        hindi_response = model.generate_content(hindi_prompt,
                                  request_options={"timeout": 600})
        return jsonify({'numPoints': numPoints,
                        'firstResponse' : firstResponse,
                        'result1': english_response.text, 
                        'result2': hindi_response.text})
    else:
        english_prompt = "summarize about following point : \"" + firstResponse[learnLevel] + "\""
        print(f'english_promp : ' + english_prompt)
        english_response = model.generate_content([english_prompt, genai_upload_file],
                                  request_options={"timeout": 600})
        print(f'learnLevel : ' + str(learnLevel))
        print(f'response : ' + english_response.text)
        hindi_prompt = "convert following text in such a way that most of the content is in hindi and all hard words are in english : \n\n" + english_response.text
        hindi_response = model.generate_content(hindi_prompt,
                                  request_options={"timeout": 600})
        return jsonify({'result1': english_response.text, 
                        'result2': hindi_response.text})        

    # genai.delete_file(genai_upload_file.name)

    # return jsonify({'result1': english_response.text, 'result2': hindi_response.text})


# Function to get the log file path for a client (using IP as the identifier)
def get_log_file_path(client_ip, client_id):
    return os.path.join(LOG_FOLDER, f'{client_ip}_{client_id}.txt')

@app.route('/save_logs', methods=['POST'])
def save_logs():
    try:
        data = request.get_json()
        logs = data.get('logs', [])
        client_id = data.get('clientId', 'unknown')

        if not logs:
            return jsonify({"status": "no logs to save"}), 200

        # Get the client's IP address
        client_ip = request.remote_addr
        log_file_path = get_log_file_path(client_ip, client_id)

        # Append the logs to the client's log file
        with open(log_file_path, 'a') as log_file:
            for log in logs:
                log_file.write(f"{log}\n")

        return jsonify({"status": "logs saved"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
