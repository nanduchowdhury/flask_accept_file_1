
class CameraSupport {
    constructor(_previewAreaControl) {
        
        this.previewAreaControl = _previewAreaControl;

        this.videoStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];

        document.getElementById('stopRecording').addEventListener('click', this.onStopRecording);
        document.getElementById('startRecording').addEventListener('click', this.onStartRecording);
        document.getElementById('closePopup').addEventListener('click', this.onCloseCamera);
        document.getElementById('captureButton').addEventListener('click', this.onCaptureButton);
        document.getElementById('takePicture').addEventListener('click', this.onTakePicture);
    }

    onTakePicture = async () => {
        console.trace(`KPMNDK - trace : `);

        const popup = document.getElementById('cameraPopup');
        popup.style.display = 'block';

        const video = document.getElementById('cameraFeed');
        const canvas = document.getElementById('cameraCanvas');

        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = this.videoStream;
            video.onloadedmetadata = () => {
                video.play();
            };
        } catch (err) {
            console.error('Error accessing camera:', err);
        }
    }

    onCaptureButton = () => {
        console.trace(`KPMNDK - trace : `);

        const video = document.getElementById('cameraFeed');

        const pdfCanvas = document.getElementById('pdfCanvas');
        const ctx = pdfCanvas.getContext('2d');
        pdfCanvas.width = video.videoWidth;
        pdfCanvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, pdfCanvas.width, pdfCanvas.height);
        const dataURL = pdfCanvas.toDataURL('image/png');
        
        this.previewAreaControl.hideVideoShowCanvas();

        console.log("KUPAMANDUK-1002 captured-image datURL is shown below : ");
        console.log('%c ', `font-size:300px; background:url(${dataURL}) no-repeat;`);

        DataSource = 'Picture';

        // Stop the camera feed and close popup
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }
        document.getElementById('cameraPopup').style.display = 'none';
    }

    onCloseCamera = () => {
        console.trace(`KPMNDK - trace : `);

        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }
        document.getElementById('cameraPopup').style.display = 'none';
    }

    onStartRecording = () => {
        console.trace(`KPMNDK - trace : `);

        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(this.videoStream, { mimeType: 'video/webm' });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.start();
    }

    onStopRecording = () => {
        console.trace(`KPMNDK - trace : `);
        this.mediaRecorder.stop();

        this.mediaRecorder.onstop = () => {
            videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(videoBlob);

            DataSource = 'video';

            this.previewAreaControl.showVideoInCanvas(videoUrl);
            // showVideoElement(videoUrl);
        };
    }

    showVideoUrlSomewhere(ElementId, videoUrl) {
        const element = document.getElementById(ElementId);
        if ( element ) {
            const downloadLink = document.createElement('a');
            downloadLink.href = videoUrl;
            downloadLink.download = 'captured_video.webm';
            downloadLink.textContent = 'Download Video';
            element.appendChild(downloadLink);
        }
    }

}



