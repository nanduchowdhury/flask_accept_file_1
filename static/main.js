
"use strict";

let videoStream;
let videoBlob;
let DataSource;
let selectionBox;
let regionStartX=0, regionStartY=0, regionEndX=0, regionEndY=0;
let regionImageStartX=0, regionImageStartY=0, regionImageEndX=0, regionImageEndY=0;
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

function onMouseDown(event) {
    console.trace(`KPMNDK - trace : `);

    regionStartX = event.pageX;
    regionStartY = event.pageY;

    regionImageStartX = event.offsetX;
    regionImageStartY = event.offsetY;

    if ( selectionBox ) selectionBox.remove();

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

    previewArea.appendChild(selectionBox);

    previewArea.addEventListener('mousemove', onMouseMove);
    previewArea.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(event) {
    regionEndX = event.pageX;
    regionEndY = event.pageY;

    regionImageEndX = event.offsetX;
    regionImageEndY = event.offsetY;

    if ( regionEndX < regionStartX ) {
        selectionRegionRect.left = Math.round(regionEndX);
    }
    if ( regionEndY < regionStartY ) {
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
}

document.getElementById('regionButton').addEventListener('click', function() {
    console.trace(`KPMNDK - trace : `);

    const pdfCanvas = document.getElementById('pdfCanvas');
    const context = pdfCanvas.getContext('2d');

    const x = (regionImageStartX < regionImageEndX) ? regionImageStartX : regionImageEndX;
    const y = (regionImageStartY < regionImageEndY) ? regionImageStartY : regionImageEndY;
    
    const left = Math.round(x);
    const top = Math.round(y);

    const width = Math.abs(regionImageEndX - regionImageStartX);
    const height = Math.abs(regionImageEndY - regionImageStartY);

    console.log('region cut is : ', left, top, width, height);

    const imageData = context.getImageData(left, top, width, height);

    // Create a new canvas to hold the cropped image
    const rectCanvas = document.createElement('canvas');
    rectCanvas.width = selectionRegionRect.width;
    rectCanvas.height = selectionRegionRect.height;
    const rectContext = rectCanvas.getContext('2d');
    
    rectContext.putImageData(imageData, 0, 0);

    const dataURL = rectCanvas.toDataURL('image/png');

    const imageElement = new Image();
    imageElement.src = dataURL;
    imageElement.alt = 'Extracted Image';
    // Set display to block to ensure new line placement
    imageElement.style.display = 'block';

    const roughArea = document.getElementById('roughArea');
    roughArea.appendChild(imageElement);

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
                        const scale = 1.0;
                        const viewport = page.getViewport({scale});
                        const pdfCanvas = document.getElementById('pdfCanvas');

                        const context = pdfCanvas.getContext('2d');
                        pdfCanvas.height = viewport.height;
                        pdfCanvas.width = viewport.width;
                        pdfCanvas.style.display = 'block';
                        
                        hideVideoShowCanvas();

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

                const pdfCanvas = document.getElementById('pdfCanvas');
                const ctx = pdfCanvas.getContext('2d');

                const img = new Image();
                img.onload = function() {

                    pdfCanvas.width = img.naturalWidth;
                    pdfCanvas.height = img.naturalHeight;
                    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

                    hideVideoShowCanvas();
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

/******************************************************************
* There is an issue that on some browsers (especially chrome) the 
* available voices do not load at the very first time.
* Load them here to init all voices.
********************************************************************/
function initializeVoices() {
    let voices = window.speechSynthesis.getVoices();

    if (voices.length === 0) {
        // If the voices are not yet loaded, set up the event listener
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            // Now you can use the voices array
            console.log(voices);
        };
    } else {
        // If voices are already loaded, use them immediately
        console.log(voices);
    }
}
// Call the function to initialize voices
initializeVoices();

document.getElementById('stopRecording').addEventListener('click', onStopRecording);
document.getElementById('startRecording').addEventListener('click', onStartRecording);
document.getElementById('closePopup').addEventListener('click', onCloseCamera);
document.getElementById('captureButton').addEventListener('click', onCaptureButton);
document.getElementById('takePicture').addEventListener('click', onTakePicture);
document.getElementById('fileInput').addEventListener('change', onFileInput);

const sendRecvManager = new SendReceiveManager(
    'fileInput',
    'sendButton',
    'result1',
    'result2',
    'loadingSpinner',
    'previewArea',
    'pdfCanvas'
);
