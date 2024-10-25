"use strict";

class CameraSupport {
    constructor(_previewAreaControl) {
        this.previewAreaControl = _previewAreaControl;

        this.videoStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];

        // Binding event handlers to the class instance and adding error handling
        document.getElementById('stopRecording').addEventListener('click', this.handleErrors(this.onStopRecording));
        document.getElementById('startRecording').addEventListener('click', this.handleErrors(this.onStartRecording));
        document.getElementById('closePopup').addEventListener('click', this.handleErrors(this.onCloseCamera));
        document.getElementById('captureButton').addEventListener('click', this.handleErrors(this.onCaptureButton));
        document.getElementById('fullscreenToggle').addEventListener('click', this.handleErrors(this.onToggle));
        document.getElementById('takePicture').addEventListener('click', this.handleErrors(this.onTakePicture));
        
    }

    // Utility to handle errors and wrap methods
    handleErrors(fn) {
        return (...args) => {
            try {
                return fn.apply(this, args);
            } catch (err) {
                errorManager.showError(1031, fn.name, err);
            }
        };
    }

    // Utility function to detect if the device is mobile
    isMobileDevice() {
        return /Mobi|Android/i.test(navigator.userAgent);
    }

    onToggle = async () => {
        try {
            const cameraPopup = document.getElementById("cameraPopup");
            if (!document.fullscreenElement) {
                cameraPopup.requestFullscreen().catch(err => {
                    errorManager.showError(1056, err.message);
                });
            } else {
                document.exitFullscreen();
            }
        } catch (err) {
            errorManager.showError(1057, err); // Error code 1011 for failed video stream
        }
    };

    // Taking a picture and opening the camera popup with error handling
    onTakePicture = async () => {
        const popup = document.getElementById('cameraPopup');
        popup.style.display = 'block';

        const video = document.getElementById('cameraFeed');
        const canvas = document.getElementById('cameraCanvas');

        try {
            let facingMode = 'user'; // Default to front-camera for desktops

            // Use back camera (environment) if it's a mobile device
            if (this.isMobileDevice()) {
                facingMode = { exact: 'environment' };
            }
    
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode }
            });

            video.srcObject = this.videoStream;
            video.onloadedmetadata = () => video.play();
        } catch (err) {
            errorManager.showError(1032, err); // Error code 1011 for failed video stream
        }
    };

    // Capture image from video and handle any errors
    onCaptureButton = () => {
        try {

            basicInitializer.clearBeforeStartNewExplanation();

            const video = document.getElementById('cameraFeed');
            const pdfCanvas = document.getElementById('pdfCanvas');
            const ctx = pdfCanvas.getContext('2d');
            pdfCanvas.width = video.videoWidth;
            pdfCanvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, pdfCanvas.width, pdfCanvas.height);
            const dataURL = pdfCanvas.toDataURL('image/png');

            this.previewAreaControl.hideVideoShowCanvas();

            SharedData.DataSource = 'Picture';

            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
            }
            document.getElementById('cameraPopup').style.display = 'none';
        } catch (err) {
            errorManager.showError(1033, err); // Error code 1012 for image capture failure
        }
    };

    // Close camera popup and handle any errors
    onCloseCamera = () => {
        try {
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
            }
            document.getElementById('cameraPopup').style.display = 'none';
        } catch (err) {
            errorManager.showError(1034, err); // Error code 1013 for closing camera issues
        }
    };

    // Start recording video with error handling
    onStartRecording = () => {
        try {

            basicInitializer.clearBeforeStartNewExplanation();

            this.recordedChunks = [];
            if (!this.videoStream) {
                throw new Error('Video stream is not available');
            }
            this.mediaRecorder = new MediaRecorder(this.videoStream, { mimeType: 'video/webm' });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            document.getElementById('startRecording').style.display = 'none';
            document.getElementById('stopRecording').style.display = 'block';
        } catch (err) {
            errorManager.showError(1035, err); // Error code 1014 for recording issues
        }
    };

    // Stop recording and handle video generation errors
    onStopRecording = () => {
        try {
            this.mediaRecorder.stop();

            this.mediaRecorder.onstop = () => {
                SharedData.videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(SharedData.videoBlob);

                SharedData.DataSource = 'video';
                this.previewAreaControl.showVideoInCanvas(videoUrl);
            };

            document.getElementById('stopRecording').style.display = 'none';
            document.getElementById('startRecording').style.display = 'block';

            document.getElementById('cameraPopup').style.display = 'none';

        } catch (err) {
            errorManager.showError(1036, err); // Error code 1015 for stopping recording
        }
    };

    // Helper method to display video URL and handle errors
    showVideoUrlSomewhere(ElementId, videoUrl) {
        try {
            const element = document.getElementById(ElementId);
            if (element) {
                const downloadLink = document.createElement('a');
                downloadLink.href = videoUrl;
                downloadLink.download = 'captured_video.webm';
                downloadLink.textContent = 'Download Video';
                element.appendChild(downloadLink);
            }
        } catch (err) {
            errorManager.showError(1037, err); // Error code 1016 for displaying video URL
        }
    }
}



