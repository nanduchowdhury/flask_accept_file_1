"use strict";

class SendReceiveManager {
    constructor(fileInputId, sendButtonId, resultDivId1, resultDivId2, spinnerId, previewAreaId, pdfCanvasId) {
        this.fileInput = document.getElementById(fileInputId);
        this.sendButton = document.getElementById(sendButtonId);
        this.spinner = new Spinner(spinnerId);
        this.previewArea = document.getElementById(previewAreaId);
        this.pdfCanvas = document.getElementById(pdfCanvasId);
        this.sendButtonInProcess = false;

        this.gcsManager = new GCSManager();

        // this.restartButton = document.getElementById('restartButton');

        this.addEventListeners();
    }

    addEventListeners() {
        this.sendButton.addEventListener('click', this.handleSendButtonClick.bind(this));
        // this.restartButton.addEventListener('click', this.handleRestartButtonClick.bind(this));
    }

    restartExplanation() {
        cTracker.reset();
    }

    handleRestartButtonClick() {
        try {
            this.restartExplanation();
        } catch (error) {
            errorManager.showError(1045, error);
        } finally {
            // this.spinner.hide();
        }
    }

    handleSendButtonClick() {
        try {

            if ( this.sendButtonInProcess ) {
                return;
            }

            if ( !SharedData.DataSource ) {
                errorManager.showError(1050);
                return;
            }

            if ( !cTracker.isMaxLevelReached() ) {
                this.recvLearningResponse();
            } else {
                errorManager.showError(1044);
            }
        } catch (error) {
            errorManager.showError(1015, error);
        } finally {
        }
    }

    uploadGcsAndInitAIModel(lamdaOnGcsUploadFinish) {

        let gcsObjectToSend;

        if ( SharedData.DataSource == 'File' ) {
            gcsObjectToSend = previewAreaControl.currentSelectedFile;
        } else if ( SharedData.DataSource == 'Picture' ) {
            const dataUrl = this.pdfCanvas.toDataURL('image/png');
            gcsObjectToSend = this.gcsManager._dataURLToBlob(dataUrl);
        } else if ( SharedData.DataSource == 'video' ) {
            gcsObjectToSend = SharedData.videoBlob;
        }

        const signedUrl = basicInitializer.getMainContentSignedURL();

        this.spinner.show();

        this.gcsManager.uploadFile(signedUrl, gcsObjectToSend)
            .then((response) => {
                // console.log(`Upload successful for file: ${file.name}`, response);
                lamdaOnGcsUploadFinish();
                this.spinner.hide();
                this.performAIModelInit();
            })
            .catch((error) => {
                // console.error(`Upload failed for file: ${file.name}`, error);
                lamdaOnGcsUploadFinish();
                this.spinner.hide();
                throw error;
            });
    }

    performAIModelInit() {
        if ( SharedData.DataSource == 'File' ) {
            this.sendFile();
        } else if ( SharedData.DataSource == 'Picture' ) {
            this.sendImage();
        } else if ( SharedData.DataSource == 'video' ) {
            this.sendVideo();
        } else {
        }
    }

    sendFile() {

        const file = previewAreaControl.currentSelectedFile;
        const reader = new FileReader();

        reader.onloadend = () => {
            const base64File = reader.result.split(',')[1];
            const data = {
                client_uuid: basicInitializer.getClient_UUID(),
                fileName: file.name,
                fileType: file.type,
                // fileContent: base64File,
                additionalData: {
                    // Add any additional data you want to include in the JSON object
                    someKey: "someValue"
                }
            };
            this.sendDataToServer(data);
        };
        reader.readAsDataURL(file);
    }

    sendImage() {

        const dataUrl = this.pdfCanvas.toDataURL('image/png');
        errorManager.log(1016);
        // console.log('%c ', `font-size:300px; background:url(${dataUrl}) no-repeat;`);

        const data = {
            client_uuid: basicInitializer.getClient_UUID(),
            fileName: 'camera_image-' + basicInitializer.getFormattedTimestamp() + '.png',
            // image: dataUrl,
            additionalData: {
                someKey: "someValue"
            }
        };
        this.sendDataToServer(data);
    }

    sendVideo() {
        if ( SharedData.videoBlob ) {

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Video = reader.result.split(',')[1]; // Get the base64 data without the prefix

                const data = {
                    client_uuid: basicInitializer.getClient_UUID(),
                    fileName: 'camera_video-' + basicInitializer.getFormattedTimestamp() + '.webm',
                    // video: base64Video,
                    additionalData: {
                        someKey: "someValue"
                    }
                };
                this.sendDataToServer(data);
            };
            reader.readAsDataURL(SharedData.videoBlob);
        }
    }

    async recvLearningResponse() {
        const data = {
            client_uuid: basicInitializer.getClient_UUID(),
            additionalData: {
                someKey: "someValue",
                learnLevel: cTracker.getCurrentLevel()
            }
        };

        this.sendButtonInProcess = true;
        this.spinner.show();
    
        // Step 1: Check if AI model initialization is done
        if (this.aiModelInitDone) {
            if (this.aiModelInitError) {
                errorManager.showError(1018, this.aiModelInitError);
                this.aiModelInitError = "";
                this.spinner.hide();
                this.sendButtonInProcess = false;
                return;
            }
        } else {
            // Step 2: Wait for aiModelInitDone to become true, up to 20 seconds
            let waitStart = Date.now();
            while (!this.aiModelInitDone && (Date.now() - waitStart < BasicInitializer.WAIT_TIME_FOR_AI_MODEL_INIT)) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
            }

            // Check again after waiting
            if (!this.aiModelInitDone) {
                errorManager.showError(1018, "AI model initialization timed out.");
                this.spinner.hide();
                this.sendButtonInProcess = false;
                return;
            }

            if (this.aiModelInitError) {
                errorManager.showError(1018, this.aiModelInitError);
                this.aiModelInitError = "";
                this.spinner.hide();
                this.sendButtonInProcess = false;
                return;
            }
        }
    
        // Log data and proceed to send the request
        errorManager.log(1017, data);
    
        fetch('/learn_response', {
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
            this.handleServerResponse(data);
            this.spinner.hide();
            this.sendButtonInProcess = false;
        })
        .catch(error => {
            errorManager.showError(1018, error.message);
            this.spinner.hide();
            this.sendButtonInProcess = false;
        });
    }
    
    sendDataToServer(data) {

        this.aiModelInitError = "";
        this.aiModelInitDone = false;

        fetch('/ai_model_init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (!response.ok) {
                    // Handle HTTP errors (like 500)
                    return response.json()
                        .then(data => {
                            this.aiModelInitError = data.error;
                            this.aiModelInitDone = true;
                        })
                        .catch(() => {
                            // Fallback for invalid JSON responses
                            throw new Error(`HTTP error ${response.status}`);
                        });
                }
                return response.json(); // Process successful response
            })
            .then(data => {
                // Handle successful response
                this.aiModelInitDone = true;
                // Add logic to process the successful response if needed
            })
            .catch(error => {
                // Handle both HTTP and network errors
                this.aiModelInitError = error.message || 'An unknown error occurred.';
                this.aiModelInitDone = true;
            });
        
    }

    handleServerResponse(data) {
        
        if (data.error) {
            this.resultDiv.textContent = data.error;
        } else {

            if ( cTracker.isInitLevel() ) {

                errorManager.log(1019, data);

                if ( data.numPoints ) {
                    cTracker.setLevelStrings(data.firstResponse);
                    cTracker.render();
                }
            } else {

                errorManager.log(1020, data);

                cTracker.changeColor(cTracker.getCurrentLevel(), 'green');
                cTracker.enableMouseHover(cTracker.getCurrentLevel());

                detailAreaManager.addHeader(cTracker.getCurrentLevelTitle(), 'green');

                const postIt = new PostItNote(data.result1, data.result2);

                detailAreaManager.addExplanation(cTracker.getCurrentLevelTitle(), postIt);
            }
            cTracker.setNextLevel();
        }
    }
}
