"use strict";

class PreviewAreaControl extends ContainerScrollBarControl {
    constructor(spinnerId) {

        super('previewArea');
        
        this.spinner = new Spinner(spinnerId);
        this.currentSelectedFile = '';

        this.pdfCanvas = document.getElementById('pdfCanvas');
        this.fileInputButton = document.getElementById('fileInput');
        this.takePictureButton = document.getElementById('takePicture');
        this.learnButton = document.getElementById('sendButton');

        this.fileInputButton.addEventListener('change', this.onFileInput);
    }

    onScroll() {
        mouseControl.clearSelectionRegion();
    }

    showVideoInCanvas(videoUrl) {
    
        const videoElement = document.getElementById('videoOverlay');
        const pdfCanvas = document.getElementById('pdfCanvas');
    
        const ctx = pdfCanvas.getContext('2d');
        ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    
        pdfCanvas.style.display = 'none';
    
        videoElement.src = videoUrl;
        videoElement.style.display = 'block';
    
        mouseControl.deActivateRegionSelection();
    }
    
    hideVideoShowCanvas() {
    
        const videoElement = document.getElementById('videoOverlay');
        const pdfCanvas = document.getElementById('pdfCanvas');
    
        videoElement.pause();
        videoElement.style.display = 'none';
    
        pdfCanvas.style.display = 'block';
    
        mouseControl.activateRegionSelection();
    }

    onFileInput = (event) => {
        const files = event.target.files;
        
        // Case 1: No file was selected (user clicked cancel)
        if (!files || files.length === 0) {
            return;
        }

        // Case 2: File was selected
        const file = files[0];
        SharedData.DataSource = 'File';
        
        // This is required.
        event.target.value = '';

        basicInitializer.clearBeforeStartNewExplanation();

        this.showInPreviewArea(file);

        this.lamdaEntryBeforeGcsUpload();
        sendRecvManager.uploadGcsAndInitAIModel(this.lamdaOnGcsUploadFinish);
    }

    lamdaEntryBeforeGcsUpload() {
        this.fileInputButton.disabled = true;
        this.takePictureButton.disabled = true;
        this.learnButton.disabled = true;
    }

    lamdaOnGcsUploadFinish = () => {
        this.fileInputButton.disabled = false;
        this.takePictureButton.disabled = false;
        this.learnButton.disabled = false;

    }

    showInPreviewArea(file) {
        if (file) {
            if (file.type === 'application/pdf') {
                this.supportPdfReading(file);
            } else if (file.type.startsWith('image/')) {
                this.supportImageFileReading(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                errorManager.showInfo(1049);
            } else if (file.type.startsWith('video/')) {
                this.supportVideoFileReading(file);
            } else {
                errorManager.showError(1039, file.type);  // Unsupported file type error
            }
            this.currentSelectedFile = file;
        }
    }

    supportVideoFileReading(file) {
        try {

            this.spinner.show();

            const videoURL = URL.createObjectURL(file);
            const videoElement = document.createElement("video");
            videoElement.src = videoURL;
            videoElement.controls = true; // Optional: add controls for video playback
            videoElement.style.width = "100%"; // Set to fit the canvas
            videoElement.style.height = "auto"; // Maintain aspect ratio
        
            // Assuming 'pdfCanvas' is your canvas element
            const pdfCanvas = document.getElementById("pdfCanvas");
            pdfCanvas.innerHTML = ""; // Clear existing content
            pdfCanvas.appendChild(videoElement);
        
            this.showVideoInCanvas(videoURL);

            // Optionally, you can autoplay the video
            // videoElement.play();

        } catch (err) {
            errorManager.showError(1043, file, err);
        } finally {
            // Always hide the spinner, regardless of success or error
            this.spinner.hide();
        }
    }

    supportImageFileReading(file) {
        try {
            // Show spinner before starting the file read
            this.spinner.show();

            const reader = new FileReader();
    
            // Use an arrow function to retain 'this' context
            reader.onload = (e) => {
                try {
                    const pdfCanvas = document.getElementById('pdfCanvas');
                    const ctx = pdfCanvas.getContext('2d');
    
                    const img = new Image();
    
                    // Use arrow function for 'onload' to retain 'this' context
                    img.onload = () => {
                        try {
                            pdfCanvas.width = img.naturalWidth;
                            pdfCanvas.height = img.naturalHeight;
    
                            // Draw the image on the canvas
                            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
    
                            // Hide video, show canvas
                            previewAreaControl.hideVideoShowCanvas();
                        } catch (err) {
                            errorManager.showError(1027, err);
                        } finally {
                            // Always hide the spinner, regardless of success or error
                            this.spinner.hide();
                        }
                    };
    
                    // Set the source of the image element to the FileReader result
                    img.src = e.target.result;
                } catch (err) {
                    errorManager.showError(1028, err);
                    this.spinner.hide(); // Ensure spinner is hidden if there's an error
                }
            };
    
            // Handle any errors during file reading
            reader.onerror = (err) => {
                errorManager.showError(1029, file, err);
                this.spinner.hide(); // Hide the spinner if file reading fails
            };
    
            // Read the file as a data URL
            reader.readAsDataURL(file);
        } catch (err) {
            errorManager.showError(1030, file, err);
            this.spinner.hide(); // Ensure spinner is hidden if an error occurs in the main block
        }
    }

    supportPdfReading(file) {
        try {
            pdfLoader.stopLoadPdf();
            pdfLoader.loadPdf(file);
            
            this.hideVideoShowCanvas();

        } catch (err) {
            errorManager.showError(1026, err); // General error handling
        }
    }
    
}
