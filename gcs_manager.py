import json
import base64
import io
from google.cloud import storage
from PIL import Image

import constants

############################################################
# GCS cannot use ErrorManager - because ErrorManager itself 
# using GCS to write error-log in GCS.
#
############################################################
class GCSManager:
    def __init__(self, bucket_name, root_folder_name):

        self.bucket_name = bucket_name
        self.root_folder_name = root_folder_name
        
        self.initialize()

    def initialize(self):
        try:
            self.client = storage.Client()
            self.bucket = self.client.bucket(self.bucket_name)

        except Exception as e:
            raise ValueError(f"GCS exception during initialize : {e}")

    def _get_blob(self, file_path):
        try:
            return self.bucket.blob(f"{self.root_folder_name}/{file_path}")
        except Exception as e:
            raise ValueError(f"GCS exception getting blob for file-path {file_path} : {e}")

    def write_json(self, file_path, data):
        try:
            json_data = json.dumps(data)
            blob = self._get_blob(file_path)
            # blob.upload_from_string(json_data, content_type="application/json")
            blob.upload_from_string(json.dumps(data, indent=4))
        except Exception as e:
            raise ValueError(f"GCS exception write JSON for file-path {file_path} : {e}")

    def read_json(self, file_path):
        try:
            blob = self._get_blob(file_path)
            if not blob.exists():
                raise FileNotFoundError(f"GCS exception read JSON for file-path {file_path} : file not found in bucket.")
            json_data = blob.download_as_text()
            return json.loads(json_data)
        except Exception as e:
            raise ValueError(f"GCS exception read JSON for file-path {file_path} : {e}")

    def get_local_file(self, file_path):
        try:
            blob = self._get_blob(file_path)
            if not blob.exists():
                raise FileNotFoundError(f"GCS exception get local-file for file-path {file_path} : file not found in bucket.")
            local_file = file_path.split("/")[-1]
            blob.download_to_filename(local_file)
            return local_file

        except Exception as e:
            raise ValueError(f"GCS exception get local-file for file-path {file_path} : {e}")

    def get_file_content(self, file_path):
        try:
            blob = self._get_blob(file_path)
            if not blob.exists():
                raise FileNotFoundError(f"GCS exception get file-content for file-path {file_path} : file not found in bucket.")
            file_content = blob.download_as_bytes()
            return file_content
        except Exception as e:
            raise ValueError(f"GCS exception get file-content for file-path {file_path} : {e}")

    def _copy_source_file_to_dest_file(self, file_path, new_base_name):
        
        source_blob = self._get_blob(file_path)

        if not source_blob.exists():
            raise ValueError(f"GCS exception copy src to dest for file-path {file_path} : file does not exist.")

        dir_path = "/".join(file_path.split("/")[:-1])  # Everything except the file name
        new_file_path = f"{dir_path}/{new_base_name}" if dir_path else new_base_name

        # Copy the source blob to the new path
        bucket = source_blob.bucket
        new_blob = bucket.blob(f"{self.root_folder_name}/{new_file_path}")
        # source_blob.rewrite(new_blob)
        new_blob.upload_from_string(source_blob.download_as_string())

        return new_file_path

    def rename_file(self, file_path, new_base_name):
        try:
            new_file_path = self._copy_source_file_to_dest_file(file_path, new_base_name)

            # Delete the old blob
            source_blob = self._get_blob(file_path)
            source_blob.delete()

            return new_file_path
        except Exception as e:
            raise ValueError(f"GCS exception renaming file from {file_path} to {new_base_name}: {e}")

    def copy_file(self, file_path, new_base_name):
        try:
            new_file_path = self._copy_source_file_to_dest_file(file_path, new_base_name)

            return new_file_path
        except Exception as e:
            raise ValueError(f"GCS exception copying file from {file_path} to {new_base_name}: {e}")

    def is_video(self, file_path):
        try:
            blob = self._get_blob(file_path)
            if not blob.exists():
                return False
            return blob.content_type.startswith("video/")
        except Exception as e:
            raise ValueError(f"GCS exception determining file is video {file_path}: {e}")

    def is_image(self, file_path):
        try:
            blob = self._get_blob(file_path)
            if not blob.exists():
                return False
            return blob.content_type.startswith("image/")
        except Exception as e:
            raise ValueError(f"GCS exception determining file is image {file_path}: {e}")

    def is_pdf(self, file_path):
        try:
            blob = self._get_blob(file_path)
            return blob.exists() and blob.content_type == "application/pdf"
        except Exception as e:
            raise ValueError(f"GCS exception determining file is PDF {file_path}: {e}")

    def is_exist(self, file_path):
        try:
            # Get the blob for the given file path
            blob = self._get_blob(file_path)
            
            # Load the blob metadata
            blob.reload()

            # Check if the blob exists and its size is greater than zero
            if blob.exists() and blob.size and blob.size > 0:
                return True
            return False
        except Exception as e:
            raise ValueError(f"GCS exception checking existence of file {file_path}: {e}")

    def delete_file(self, file_path):
        try:
            blob = self._get_blob(file_path)
            if blob.exists():
                blob.delete()
        except Exception as e:
            raise ValueError(f"GCS exception delete blob for file-path {file_path} : {e}")    

    def write_file(self, file_path, base64_content):
        try:
            binary_data = base64.b64decode(base64_content)
            blob = self._get_blob(file_path)
            blob.upload_from_string(binary_data, content_type='application/pdf')
        except Exception as e:
            raise ValueError(f"GCS exception write-file for file-path {file_path} : {e}")

    def write_image(self, file_path, image):
        try:
            buffer = io.BytesIO()
            image.save(buffer, format=image.format)
            buffer.seek(0)
            blob = self._get_blob(file_path)
            blob.upload_from_file(buffer, content_type=f"image/{image.format.lower()}")
        except Exception as e:
            raise ValueError(f"GCS exception write-image for file-path {file_path} : {e}")

    def write_video(self, file_path, video_binary):
        try:
            blob = self._get_blob(file_path)
            blob.upload_from_string(video_binary)
        except Exception as e:
            raise ValueError(f"GCS exception write-video for file-path {file_path} : {e}")

    def get_public_url(self, file_path):
        try:
            blob = self._get_blob(file_path)
            
            # blob.make_public()
            
            # Return the public URL
            return blob.public_url
        except Exception as e:
            raise ValueError(f"GCS exception get public-URL for file-path {file_path} : {e}")

    def append_to_text_file(self, file_path, log_message):
        try:
            blob = self._get_blob(file_path)

            existing_content = ""

            try:
                existing_content = blob.download_as_text()
            except Exception:
                existing_content = ""  # Assume the file does not exist yet

            # Append the new log message
            updated_content = existing_content + log_message + "\n"

            # Write back the updated content
            blob.upload_from_string(updated_content)

        except Exception as e:
            raise ValueError(f"GCS exception append file-path {file_path} for log message {log_message} : {e}")

    def cors_configuration(self):
        try:

            storage_client = storage.Client()
            bucket = storage_client.get_bucket(self.bucket_name)
            bucket.cors = [
                {
                    "origin": ["*"],
                    "responseHeader": [
                        "Content-Type",
                        "x-goog-resumable"],
                    "method": ['PUT', 'POST'],
                    "maxAgeSeconds": 3600
                }
            ]
            bucket.patch()

            # print(f"Set CORS policies for bucket {bucket.name} is {bucket.cors}")

        except Exception as e:
            raise ValueError(f"GCS exception configuring CORS for bucket : {e}")


    def get_signed_url(self, file_path):
        try:
            blob = self._get_blob(file_path)

            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=constants.GCS_SIGNED_URL_EXPIRATION_TIME,
                method="PUT")
            
            return signed_url;

        except Exception as e:
            raise ValueError(f"GCS exception acquiring signed-URL : {e}")
