"use strict";

class BasicInitializer {

    static LEFT_MOUSE_BUTTON = 0;
    static ACCEPTABLE_REGION_SIZE = 10;
    static EXPLAIN_REGION_RMB = "Explain Selection";
    static MCQ_RMB = "Multi-Choice Questions (MCQ)"
    static POP_OUT_RMB = "Pop Out/In";
    static TOUCH_PAINT_REGION_START_END_RMB = "Start/End Paint Region";
    static START_LEARN = "Start Learning";
    static LEARN_NEXT = "Learn More";
    static WAIT_TIME_FOR_AI_MODEL_INIT = 90000;
    static PDF_PAGE_RENDERING_DEBOUNCE_DELAY = 200; // 200ms

    constructor() {
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

    getClientId() {    
        return this.clientId;
    }

    setClient_UUID(uuid) {
        this.client_uuid = uuid;
    }

    getClient_UUID() {    
        return this.client_uuid;
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
