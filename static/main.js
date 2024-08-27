
"use strict";


let videoBlob;
let DataSource;








const previewAreaControl = new PreviewAreaControl();
const cameraSupport = new CameraSupport(previewAreaControl);




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

const sendRecvManager = new SendReceiveManager(
    'fileInput',
    'sendButton',
    'result1',
    'result2',
    'loadingSpinner',
    'previewArea',
    'pdfCanvas'
);
