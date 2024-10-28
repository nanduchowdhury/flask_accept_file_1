import zipfile
import os

import zipfile
import os

class FileCompressor:
    def __init__(self):
        pass

    def uncompress(self, file_path):
        # If the file is not a zip file, return the original file name
        if not zipfile.is_zipfile(file_path):
            return file_path

        # Determine the extraction directory
        extract_dir = os.path.dirname(file_path)

        try:
            # Uncompress the zip file and get the first file name extracted
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
                extracted_files = zip_ref.namelist()  # List of extracted file names
                if extracted_files:
                    return os.path.join(extract_dir, extracted_files[0])
                else:
                    return file_path  # If no files are extracted, return original file path

        except zipfile.BadZipFile:
            return file_path  # If the file can't be uncompressed, return original file path


