"use strict";

class RootInitializer {

    constructor() {

        this.clientId = '';
        this.client_uuid = '';
    }

    getClientId() {    
        return this.clientId;
    }

    setClient_UUID(uuid) {
        this.client_uuid = uuid;
    }

    getClient_UUID() {    
        return this.client_uuid;
    }

    getFormattedTimestamp() {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
    
        const day = String(now.getDate()).padStart(2, '0');
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
    
        return `${day}${month}${year}-${hours}:${minutes}:${seconds}`;
    }

    makeServerRequest(requestRoute, data, lamdaOnServerRequestSuccess, lamdaOnServerRequestFailure) {
        fetch(requestRoute, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error);
                });
            }
            return response.json();
        })
        .then(data => {
            lamdaOnServerRequestSuccess(data);
        })
        .catch(error => {
            let message = error.message;

            if (error.message.includes('<html')) {
                errorManager.showError(2043);
                message = '';
            } else if (error.message.includes('Failed to fetch')) {
                errorManager.showError(2043);
                message = '';
            }
            lamdaOnServerRequestFailure(message);
        });
    }
}

class ContentInitializer extends RootInitializer {

    constructor() {
        super();

        this.clientId = 'client-' + this.getFormattedTimestamp();
        this.client_uuid = '';

        const data = {
            client_uuid: this.getClient_UUID(),
            clientId: this.getClientId(),
            additionalData: {
                someKey: "someValue"
            }
        };
    
        this.makeServerRequest('/content_init', data, 
            this.lamdaOnContentInitRequestSuccess, this.lamdaOnContentInitRequestFailure);
    
    }

    lamdaOnContentInitRequestSuccess = (data) => {
        this.setClient_UUID(data.client_uuid);
        console.log(data.client_uuid);
        if ( !this.getClient_UUID() ) {
            errorManager.showError(2044);
        }
    }

    lamdaOnContentInitRequestFailure = (msg) => {
        if ( msg ) {
            errorManager.showError(1048, msg);
        }
    }
    
}

class BasicInitializer extends RootInitializer{

    static LEFT_MOUSE_BUTTON = 0;
    static ACCEPTABLE_REGION_SIZE = 10;
    static EXPLAIN_REGION_RMB = "Explain Selection";
    static MCQ_RMB = "Multi-Choice Questions (MCQ)"
    static POP_OUT_RMB = "Pop Out/In";
    static PASTE_FROM_CLIPBOARD = "Paste from Clipboard ";
    static TOUCH_PAINT_REGION_START_END_RMB = "Start/End Paint Region";
    static START_LEARN = "Start Learning";
    static LEARN_NEXT = "Learn More";
    static WAIT_TIME_FOR_AI_MODEL_INIT = 90000;
    static PDF_PAGE_RENDERING_DEBOUNCE_DELAY = 200; // 200ms

    static ENGLISH_TEXT_FONT = 'Arial';
    static HINID_BENGALI_TEXT_FONT = 'Courier New';

    constructor() {

        super();

        this.clientId = 'client-' + this.getFormattedTimestamp();
        this.client_uuid = '';

        this.signed_main_content_url = '';

        this.initializeVoices();
        this.sendInitToServer();

        this.onBrowserRefresh = this.onBrowserRefresh.bind(this);
        // Add the event listener for beforeunload
        window.addEventListener('beforeunload', this.onBrowserRefresh);
    }

    onBrowserRefresh(event) {
        const confirmationMessage = 'Are you sure you want to leave this page? Current learning session will be lost.';
        event.returnValue = confirmationMessage; // Standard
        return confirmationMessage; // For older browsers
    }

    /******************************************************************
    * There is an issue that on some browsers (especially chrome) the 
    * available voices do not load at the very first time.
    * Load them here to init all voices.
    ********************************************************************/
    initializeVoices() {
        let voices = window.speechSynthesis.getVoices();

        if (voices.length === 0) {
            // If the voices are not yet loaded, set up the event listener
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                // Now you can use the voices array
                errorManager.log(1012);
            };
        } else {
            // If voices are already loaded, use them immediately
            errorManager.log(1012);
        }
    }

    convertMultiLine(text, maxCharsPerLine) {
        if (typeof text !== 'string') {
            errorManager.showError(2048);
        }
        if (typeof maxCharsPerLine !== 'number') {
            errorManager.showError(2049);
        }
        if (maxCharsPerLine <= 0) {
            errorManager.showError(2050);
        }
    
        // Split the input text into words
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = '';
    
        words.forEach(word => {
            // If adding the word would exceed the maxCharsPerLine, push the current line
            if ((currentLine + word).length > maxCharsPerLine) {
                if (currentLine) {
                    lines.push(currentLine.trim()); // Add the current line to the lines array
                }
                currentLine = word; // Start a new line with the current word
            } else {
                // Otherwise, add the word to the current line
                currentLine += (currentLine ? ' ' : '') + word;
            }
        });
    
        // Add the last line if it has content
        if (currentLine) {
            lines.push(currentLine.trim());
        }
    
        return lines;
    }

    createInMemoryPngFromText(lines, fileName = 'copy_paste_text.png') {
        if (!Array.isArray(lines) || lines.length === 0) {
            errorManager.showError(2051);
        }
    
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
    
        // Canvas settings
        const lineHeight = 30; // Height of each line
        const fontSize = 20; // Font size in pixels
        const font = '20px Arial'; // Font style
        const padding = 20; // Padding around the text
        const textColor = '#000000'; // Text color
        const bgColor = '#ffffff'; // Background color
    
        // Calculate canvas dimensions
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width)) * 2 + 2 * padding;
        const canvasHeight = lines.length * lineHeight + 2 * padding;
    
        // Set canvas size
        canvas.width = Math.ceil(maxWidth);
        canvas.height = Math.ceil(canvasHeight);
    
        // Draw background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        // Draw text
        ctx.fillStyle = textColor;
        ctx.font = font;
        lines.forEach((line, index) => {
            const x = padding;
            const y = padding + (index + 1) * lineHeight - (lineHeight - fontSize) / 2;
            ctx.fillText(line, x, y);
        });
    
        // Convert canvas to PNG File
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Create a File object from the Blob
                        const file = new File([blob], fileName, { type: 'image/png' });
                        resolve(file); // Return the File object
                    } else {
                        errorManager.showError(2052);
                    }
                },
                'image/png', // Output format
                1.0 // Quality (not relevant for PNG, but required by API)
            );
        });
    }

    sendInitToServer() {
        
        const data = {
            client_uuid: this.getClient_UUID(),
            clientId: this.getClientId(),
            additionalData: {
                someKey: "someValue"
            }
        };

        this.makeServerRequest('/basic_init', data, 
            this.lamdaOnBasicInitRequestSuccess, this.lamdaOnBasicInitRequestFailure);
    }

    lamdaOnBasicInitRequestSuccess = (data) => {
        this.setClient_UUID(data.client_uuid);
        this.setMainContentSignedURL(data.signed_main_content_url);
        console.log(data.client_uuid);
        if ( !this.getClient_UUID() ) {
            errorManager.showError(2044);
        }
    }

    lamdaOnBasicInitRequestFailure = (msg) => {
        if ( msg ) {
            errorManager.showError(1048, msg);
        }
    }

    setMainContentSignedURL(signed_main_content_url) {
        this.signed_main_content_url = signed_main_content_url;
    }

    getMainContentSignedURL() {
        return this.signed_main_content_url;
    }

    clearBeforeStartNewExplanation() {

        pdfLoader.stopLoadPdf();
        cTracker.reset();
        document.getElementById('result1').innerHTML = '';
        document.getElementById('roughArea').innerHTML = '';
    }

    isTextEnglish(text) {
        // Check if the text contains English letters (A-Z, a-z)
        if (text.match(/[A-Za-z]/)) {
            return true;
        }
        return false;
    }
    
    isTextHindi(text) {
        if (text.match(/[\u0900-\u097F]/)) { // Hindi
            return true;
        }
        return false;
    }

    isTextBengali(text) {
        if (text.match(/[\u0980-\u09FF]/)) { // Bengali
            return true;
        }
        return false;
    }

    isTextChinese(text) {
        if (text.match(/[\u4E00-\u9FFF]/)) { // Chinese
            return true;
        }
        return false;
    }

    isTextJapanese(text) {
        if (text.match(/[\u3040-\u30FF]/)) { // Japanese
            return true;
        }
        return false;
    }

    isTextTamil(text) {
        if (text.match(/[\u0B80-\u0BFF]/)) { // Tamil
            return true;
        }
        return false;
    }

    //////////////////////////////////////////////////////
    //
    // Based on container 'position', get the top and left.
    // This is particularly useful for containers which can
    // be maximized.
    //
    ///////////////////////////////////////////////////////
    getTopLeftCoordsOfContainer(container) {
        const computedStyle = window.getComputedStyle(container);
        const containerRect = container.getBoundingClientRect();

        const position = computedStyle.position;

        let left = 0;
        let top = 0;

        if ( position == "fixed" ) {
            top = container.scrollTop;
            left = container.scrollLeft;
        } else {
            top = window.scrollY + containerRect.top;
            left = window.scrollX + containerRect.left;
        }

        return {top, left};
    }

    getActualObjectBbox(object) {
        const rect = object.getBoundingClientRect();

        const left = rect.left + window.scrollX;
        const top = rect.top + window.scrollY;
        const right = rect.right + window.scrollX;
        const bottom = rect.bottom + window.scrollY;

        return {left, top, right, bottom};
    }

}
