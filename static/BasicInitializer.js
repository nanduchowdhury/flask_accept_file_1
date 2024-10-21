"use strict";

class BasicInitializer {

    static LEFT_MOUSE_BUTTON = 0;
    static ACCEPTABLE_REGION_SIZE = 10;
    static EXPLAIN_REGION_RMB = "Explain Selection";
    static POP_OUT_RMB = "Pop Out/In";
    static START_LEARN = "Start Learning";
    static LEARN_NEXT = "Learn Next Topic/Section";

    constructor() {
        this.clientId = 'client-' + this.getFormattedTimestamp();
        this.client_uuid = '';

        this.initializeVoices();
        this.sendInitToServer();
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

    sendInitToServer() {
        
        const data = {
            client_uuid: this.getClient_UUID(),
            clientId: this.getClientId(),
            additionalData: {
                someKey: "someValue"
            }
        };

        fetch('/basic_init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                // Handle HTTP errors (like 500)
                return response.json().then(data => {
                    throw new Error(data.error); // Access the error message
                });
            }
            return response.json(); // Process successful response
        })
        .then(data => {
            this.setClient_UUID(data.client_uuid);
            console.log(data.client_uuid);
            if ( !this.getClient_UUID() ) {
                console.error("No client-UUID recvd from server.");
            }
        })
        .catch(error => {
            errorManager.showError(1048, error.message);
        });
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

    clearPdfCanvasContext() {
        const pdfCanvas = document.getElementById('pdfCanvas');
        const context = pdfCanvas.getContext('2d');

        pdfCanvas.width = 0;
        pdfCanvas.height = 0;
        context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    }

    clearBeforeStartNewExplanation() {

        this.clearPdfCanvasContext();
        cTracker.reset();
        document.getElementById('result1').innerHTML = '';
        document.getElementById('roughArea').innerHTML = '';
    }
}
