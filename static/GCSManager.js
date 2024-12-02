"use strict";

class GCSManager {
  constructor() {
  }

  /**
   * Uploads a file to a signed URL.
   * @param {File} file - The file to upload.
   * @param {string} signedURL - The signed URL for uploading the file.
   * @returns {Promise} - Resolves when the file upload is complete, rejects if there is an error.
   */
  uploadFile(signedURL, file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedURL, true);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          errorManager.showError(2041, xhr.status);
        }
      };

      xhr.onerror = function () {
        errorManager.showError(2042);
      };

      xhr.send(file);
    });
  }

  /**
   * Uploads an image to a signed URL from a data URL.
   * @param {string} signedURL - The signed URL for uploading the image.
   * @param {string} dataUrl - The image data URL (Base64 encoded string).
   * @returns {Promise} - Resolves when the upload is complete, rejects if there is an error.
   */
  uploadImage(signedURL, dataUrl) {
    return new Promise((resolve, reject) => {
      const blob = this._dataURLToBlob(dataUrl);
      this.uploadFile(signedURL, blob)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Uploads a video to a signed URL from a Blob.
   * @param {string} signedURL - The signed URL for uploading the video.
   * @param {Blob} videoBlob - The video Blob.
   * @returns {Promise} - Resolves when the upload is complete, rejects if there is an error.
   */
  uploadVideo(signedURL, videoBlob) {
    return this.uploadFile(signedURL, videoBlob);
  }

  /**
   * Converts a data URL to a Blob.
   * @param {string} dataUrl - The data URL to convert.
   * @returns {Blob} - The resulting Blob.
   * @private
   */
  _dataURLToBlob(dataUrl) {
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }

    return new Blob([uint8Array], { type: mimeType });
  }
}

