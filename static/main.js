
"use strict";

let videoStream;
let videoBlob;
let DataSource;
let selectionBox;
let regionStartX=0, regionStartY=0, regionEndX=0, regionEndY=0;
let selectionRegionRect = {left : 0, top : 0, width : 0, height : 0};
let mediaRecorder;
let recordedChunks = [];

function showVideoInCanvas(videoUrl) {
    console.trace(`KPMNDK - trace : `);

    const videoElement = document.getElementById('videoOverlay');
    const pdfCanvas = document.getElementById('pdfCanvas');

    const ctx = pdfCanvas.getContext('2d');
    ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

    pdfCanvas.style.display = 'none';

    videoElement.src = videoUrl;
    videoElement.style.display = 'block';

    previewArea.removeEventListener('mousedown', onMouseDown);
}

function hideVideoShowCanvas() {
    console.trace(`KPMNDK - trace : `);

    const videoElement = document.getElementById('videoOverlay');
    const pdfCanvas = document.getElementById('pdfCanvas');

    videoElement.pause();
    videoElement.style.display = 'none';

    pdfCanvas.style.display = 'block';

    previewArea.addEventListener('mousedown', onMouseDown);
}


class Spinner {
    constructor(elementId) {
        this.spinnerElement = document.getElementById(elementId);
    }

    show() {
        if (this.spinnerElement) {
            this.spinnerElement.style.display = 'block';
        }
    }

    hide() {
        if (this.spinnerElement) {
            this.spinnerElement.style.display = 'none';
        }
    }

    // The destructor will automatically hide the spinner
    destroy() {
        this.hide();
    }
}

function onMouseDown(event) {
    console.trace(`KPMNDK - trace : `);

    regionStartX = event.pageX;
    regionStartY = event.pageY;

    if ( selectionBox ) selectionBox.remove();

    const preview_rect = previewArea.getBoundingClientRect();

    // selectionRegionRect.left = Math.round(regionStartX + preview_rect.left);
    // selectionRegionRect.top = Math.round(regionStartY + preview_rect.top);
    selectionRegionRect.left = Math.round(regionStartX);
    selectionRegionRect.top = Math.round(regionStartY);
    
    selectionRegionRect.width = 1;
    selectionRegionRect.height = 1;

    selectionBox = document.createElement('div');
    selectionBox.className = 'selectionBox';
    selectionBox.style.left = `${selectionRegionRect.left}px`;
    selectionBox.style.top = `${selectionRegionRect.top}px`;
    selectionBox.style.width = `1px`;
    selectionBox.style.height = `1px`;
    
    // hideVideoShowCanvas();
    // unShowVideoElement();
    previewArea.appendChild(selectionBox);
    // appendPreviewAreaChild(selectionBox);

    previewArea.addEventListener('mousemove', onMouseMove);
    previewArea.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event) {
    regionEndX = event.pageX;
    regionEndY = event.pageY;

    const preview_rect = previewArea.getBoundingClientRect();

    if ( regionEndX < regionStartX ) {
        // selectionRegionRect.left = Math.round(regionEndX + preview_rect.left);
        selectionRegionRect.left = Math.round(regionEndX);
    }
    if ( regionEndY < regionStartY ) {
        // selectionRegionRect.top = Math.round(regionEndY + preview_rect.top);
        selectionRegionRect.top = Math.round(regionEndY);
    }
    selectionRegionRect.width = Math.abs(Math.round(regionEndX - regionStartX));
    selectionRegionRect.height = Math.abs(Math.round(regionEndY - regionStartY));

    selectionBox.style.width = `${selectionRegionRect.width}px`;
    selectionBox.style.height = `${selectionRegionRect.height}px`;
    selectionBox.style.left = `${selectionRegionRect.left}px`;
    selectionBox.style.top = `${selectionRegionRect.top}px`;
}

function onMouseUp() {
    console.trace(`KPMNDK - trace : `);

    previewArea.removeEventListener('mousemove', onMouseMove);
    previewArea.removeEventListener('mouseup', onMouseUp);

    console.log('onMouseUp : ', selectionRegionRect);
}

document.getElementById('regionButton').addEventListener('click', function() {
    console.trace(`KPMNDK - trace : `);

    const selectionImage = document.getElementById('selectionImage');
    const selectionCanvas = document.getElementById('selectionCanvas');
    // const selectionImage = document.getElementById('selectionImage');

    const pdfCanvas = document.getElementById('pdfCanvas');
    const context = pdfCanvas.getContext('2d');
    
    const pdfCanvasRect = pdfCanvas.getBoundingClientRect();

    // Calculate the coordinates relative to the pdfCanvas
    const x = selectionRegionRect.left - pdfCanvasRect.left + pdfCanvas.scrollLeft;
    const y = selectionRegionRect.top - pdfCanvasRect.top + pdfCanvas.scrollTop;

    // Make sure the coordinates are within the canvas boundaries
    // const relativeX = Math.max(0, Math.min(x, pdfCanvas.width));
    // const relativeY = Math.max(0, Math.min(y, pdfCanvas.height));
    
    const left = Math.round(x);
    const top = Math.round(y);
    const width = selectionRegionRect.width;
    const height = selectionRegionRect.height;

    console.log('region cut is : ', left, top, width, height);

    // Extract the image data for the specified rectangle
    const imageData = context.getImageData(left, top, width, height);
    
    console.log(imageData);

    // Create a new canvas to hold the cropped image
    const rectCanvas = document.createElement('canvas');
    rectCanvas.width = selectionRegionRect.width;
    rectCanvas.height = selectionRegionRect.height;
    const rectContext = rectCanvas.getContext('2d');
    
    // Put the image data onto the new canvas
    rectContext.putImageData(imageData, 0, 0);
    
    console.log('region rect canvas : ', rectCanvas);

    // Convert the canvas to an image (Data URL)
    const dataURL = rectCanvas.toDataURL('image/png');


    // previewArea.innerHTML = `<img src="${dataURL}" alt="Picture Preview" style="max-width: 100%; height: auto;">`;

    console.log("KUPAMANDUK-1009 selected-image datURL is shown below : ");
    console.log('%c ', `font-size:300px; background:url(${dataURL}) no-repeat;`);
    
});

function onFileInput(event) {
    console.trace(`KPMNDK - trace : `);

    const file = event.target.files[0];
    const previewArea = document.getElementById('previewArea');

    DataSource = 'File';

    if (file) {
        if (file.type === 'application/pdf') {
            // Display PDF using PDF.js
            const reader = new FileReader();
            reader.onload = function(e) {
                const loadingTask = pdfjsLib.getDocument({data: e.target.result});
                loadingTask.promise.then(function(pdf) {
                    // Fetch the first page
                    pdf.getPage(1).then(function(page) {
                        const scale = 1.5;
                        const viewport = page.getViewport({scale});
                        const pdfCanvas = document.getElementById('pdfCanvas');

                        const context = pdfCanvas.getContext('2d');
                        pdfCanvas.height = viewport.height;
                        pdfCanvas.width = viewport.width;
                        pdfCanvas.style.display = 'block';
                        // previewArea.innerHTML = ''; // Clear previous content
                        
                        hideVideoShowCanvas();
                        // unShowVideoElement();
                        // previewArea.appendChild(pdfCanvas);
                        // appendPreviewAreaChild(pdfCanvas);

                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        page.render(renderContext);
                    });
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                // previewArea.innerHTML = '';

                const pdfCanvas = document.getElementById('pdfCanvas');
                const ctx = pdfCanvas.getContext('2d');

                const img = new Image();
                img.onload = function() {

                    pdfCanvas.width = img.width;
                    pdfCanvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    hideVideoShowCanvas();
                    // unShowVideoElement();
                    // previewArea.appendChild(pdfCanvas);
                    // appendPreviewAreaChild(pdfCanvas);
                };

                // Set the source of the image element to the FileReader result
                img.src = e.target.result;
            };

            // Read the file as a data URL
            reader.readAsDataURL(file);
        }
    }
}

// Open camera in popup
async function onTakePicture() {
    console.trace(`KPMNDK - trace : `);

    const popup = document.getElementById('cameraPopup');
    popup.style.display = 'block';

    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('cameraCanvas');
    const context = canvas.getContext('2d');

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = videoStream;
        video.onloadedmetadata = () => {
            video.play();
        };
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
}

function onCaptureButton() {
    console.trace(`KPMNDK - trace : `);

    const video = document.getElementById('cameraFeed');

    const pdfCanvas = document.getElementById('pdfCanvas');
    const ctx = pdfCanvas.getContext('2d');
    pdfCanvas.width = video.videoWidth;
    pdfCanvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, pdfCanvas.width, pdfCanvas.height);
    const dataURL = pdfCanvas.toDataURL('image/png');
    
    hideVideoShowCanvas();
    // unShowVideoElement();
    // previewArea.appendChild(pdfCanvas);
    // appendPreviewAreaChild(pdfCanvas);

    console.log("KUPAMANDUK-1002 captured-image datURL is shown below : ");
    console.log('%c ', `font-size:300px; background:url(${dataURL}) no-repeat;`);

    DataSource = 'Picture';

    // Stop the camera feed and close popup
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('cameraPopup').style.display = 'none';
}

function onCloseCamera() {
    console.trace(`KPMNDK - trace : `);

    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('cameraPopup').style.display = 'none';
}

function onStartRecording() {
    console.trace(`KPMNDK - trace : `);

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.start();
}

function onStopRecording() {
    console.trace(`KPMNDK - trace : `);
    mediaRecorder.stop();

    mediaRecorder.onstop = function() {
        videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);

        DataSource = 'video';

        showVideoInCanvas(videoUrl);
        // showVideoElement(videoUrl);

        const downloadLink = document.createElement('a');
        downloadLink.href = videoUrl;
        downloadLink.download = 'captured_video.webm';
        downloadLink.textContent = 'Download Video';
        document.body.appendChild(downloadLink);
    };
}

class ConceptualizeTracker {

    ALL_TITLES_LEVEL = -1;
    FIRST_TITLE_LEVEL = 0;

    constructor() {
        this.currentLevel = this.ALL_TITLES_LEVEL;
        console.log(this.currentLevel);
        this.maxLevel = this.ALL_TITLES_LEVEL;
        this.levelTitles = new Map();
    }
    setMaxLevel(max) {
        if ( max >= this.FIRST_TITLE_LEVEL ) {
            this.maxLevel = max;
            for (let i = this.FIRST_TITLE_LEVEL; i < max; i++) {
                this.levelTitles.set(i, '');
              }
        }
    }
    getMaxLevel() {
        return this.maxLevel;
    }
    isInitLevel() {
        if ( this.currentLevel == this.ALL_TITLES_LEVEL ) {
            return true;
        }
        return false;
    }
    setNextLevel() {
        this.currentLevel++;
        if ( this.currentLevel >= this.maxLevel ) {
            this.currentLevel = this.maxLevel;
        }
    }
    setCurrentLevel(level) {
        if ( level < this.maxLevel && level >= this.FIRST_TITLE_LEVEL ) {
            this.currentLevel = level;
        }
    }
    getCurrentLevel() {
        return this.currentLevel;
    }
    setLevelTitle(level, title) {
        if ( level < this.maxLevel && level >= this.FIRST_TITLE_LEVEL ) {
            this.levelTitles.set(level, title);
        }
    }
    getLevelTitle(level) {
        let title = 'undefined topic';
        if ( level < this.maxLevel && level >= this.FIRST_TITLE_LEVEL ) {
            title = this.levelTitles.get(level);
        }
        return title;
    }
    getCurrentLevelTitle() {
        return this.getLevelTitle(this.getCurrentLevel());
    }
}

class SendServerRequest {
    constructor(fileInputId, sendButtonId, resultDivId1, resultDivId2, spinnerId, previewAreaId, pdfCanvasId) {
        this.fileInput = document.getElementById(fileInputId);
        this.sendButton = document.getElementById(sendButtonId);
        this.resultDiv1 = document.getElementById(resultDivId1);
        this.resultDiv2 = document.getElementById(resultDivId2);
        this.spinner = new Spinner(spinnerId);
        this.previewArea = document.getElementById(previewAreaId);
        this.pdfCanvas = document.getElementById(pdfCanvasId);

        this.cTracker = new ConceptualizeTracker();

        this.addEventListeners();
    }

    addEventListeners() {
        this.sendButton.addEventListener('click', this.handleSendButtonClick.bind(this));
    }

    handleSendButtonClick() {
        try {
            if ( DataSource == 'File' ) {
                this.sendFile();
            } else if ( DataSource == 'Picture' ) {
                this.sendImage();
            } else if ( DataSource == 'video' ) {
                this.sendVideo();
            } 
        } catch (error) {
            console.error('Error:', error);
        } finally {
            // this.spinner.hide();
        }
    }

    sendFile() {
        console.trace(`KPMNDK - trace : `);

        if (this.fileInput.files.length === 0) {
            alert('Choose a PDF, JPG, PNG - or take a picture using the camera');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onloadend = () => {
            const base64File = reader.result.split(',')[1];

            const data = {
                fileName: file.name,
                fileType: file.type,
                fileContent: base64File,
                additionalData: {
                    // Add any additional data you want to include in the JSON object
                    someKey: "someValue"
                }
            };
            this.sendDataToServer(data);
        };
        reader.readAsDataURL(file);
    }

    sendVideo() {
        console.trace(`KPMNDK - trace : `);
        if ( videoBlob ) {

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Video = reader.result.split(',')[1]; // Get the base64 data without the prefix

                const data = {
                    video: base64Video,
                    additionalData: {
                        someKey: "someValue"
                    }
                };
                this.sendDataToServer(data);
            };
            reader.readAsDataURL(videoBlob);
        }
    }

    sendImage() {
        console.trace(`KPMNDK - trace : `);

        const dataUrl = this.pdfCanvas.toDataURL('image/png');
        console.log("KUPAMANDUK-1004 sent-image dataURL shown below :");
        console.log('%c ', `font-size:300px; background:url(${dataUrl}) no-repeat;`);

        const data = {
            image: dataUrl,
            additionalData: {
                someKey: "someValue"
            }
        };
        this.sendDataToServer(data);
    }

    sendDataToServer(data) {
        console.trace(`KPMNDK - trace : `);

        this.spinner.show();

        data.additionalData.learnLevel = this.cTracker.getCurrentLevel();

        console.log('sending data to server : ', data);

        fetch('/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            this.handleServerResponse(data)
            this.spinner.hide();
        })
        .catch(error => {
            console.error('Error:', error);
            this.spinner.hide();
        });
    }

    handleServerResponse(data) {
        console.trace(`KPMNDK - trace : `);
        
        if (data.error) {
            this.resultDiv.textContent = 'Error: ' + data.error;
        } else {

            if ( this.cTracker.isInitLevel() ) {

                console.log('recvd server data for init level : ', data);

                if ( data.numPoints ) {
                    this.cTracker.setMaxLevel(data.numPoints);
                }
                if ( data.firstResponse ) {
                    for (let i = 0; i < this.cTracker.getMaxLevel(); i++) {
                        this.cTracker.setLevelTitle(i, data.firstResponse[i]);
                        this.resultDiv2.append(data.firstResponse[i]);
                        this.resultDiv2.append('\n');
                    }
                }
            } else {

                console.log('recvd server data for non-init level : ', data);

                this.resultDiv1.append(this.cTracker.getCurrentLevelTitle());
                this.resultDiv1.append('\n');
                const myPostIt = new PostItNote(data.result1, data.result2);
                myPostIt.setTabTitle(1, 'main-lang');
                myPostIt.setTabTitle(2, 'alt-lang');
                
            }
            this.cTracker.setNextLevel();
        }
    }
}

document.getElementById('stopRecording').addEventListener('click', onStopRecording);
document.getElementById('startRecording').addEventListener('click', onStartRecording);
document.getElementById('closePopup').addEventListener('click', onCloseCamera);
document.getElementById('captureButton').addEventListener('click', onCaptureButton);
document.getElementById('takePicture').addEventListener('click', onTakePicture);
document.getElementById('fileInput').addEventListener('change', onFileInput);

const sendServerRequest = new SendServerRequest(
    'fileInput',
    'sendButton',
    'result1',
    'result2',
    'loadingSpinner',
    'previewArea',
    'pdfCanvas'
);
