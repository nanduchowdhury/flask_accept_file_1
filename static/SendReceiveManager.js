"use strict";

class SendReceiveManager {
    constructor(fileInputId, sendButtonId, resultDivId1, resultDivId2, spinnerId, previewAreaId, pdfCanvasId) {
        this.fileInput = document.getElementById(fileInputId);
        this.sendButton = document.getElementById(sendButtonId);
        this.resultDiv1 = document.getElementById(resultDivId1);
        this.spinner = new Spinner(spinnerId);
        this.previewArea = document.getElementById(previewAreaId);
        this.pdfCanvas = document.getElementById(pdfCanvasId);
        this.sendButtonInProcess = false;

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

            this.sendButtonInProcess = true;

            if ( cTracker.isInitLevel() ) {
                if ( SharedData.DataSource == 'File' ) {
                    this.sendFile();
                } else if ( SharedData.DataSource == 'Picture' ) {
                    this.sendImage();
                } else if ( SharedData.DataSource == 'video' ) {
                    this.sendVideo();
                } else {
                    errorManager.showError(1050);
                }
            } else if ( !cTracker.isMaxLevelReached() ) {
                const data = {
                    client_uuid: basicInitializer.getClient_UUID(),
                    additionalData: {
                        // Add any additional data you want to include in the JSON object
                        someKey: "someValue"
                    }
                };
                this.sendDataToServer(data);
            } else {
                errorManager.showError(1044);
            }
        } catch (error) {
            errorManager.showError(1015, error);
        } finally {
            // this.spinner.hide();
        }
    }

    sendFile() {

        if ( !previewAreaControl.currentSelectedFile ) {
            errorManager.showError(1050);
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onloadend = () => {
            const base64File = reader.result.split(',')[1];

            const data = {
                client_uuid: basicInitializer.getClient_UUID(),
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
        if ( SharedData.videoBlob ) {

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Video = reader.result.split(',')[1]; // Get the base64 data without the prefix

                const data = {
                    client_uuid: basicInitializer.getClient_UUID(),
                    video: base64Video,
                    additionalData: {
                        someKey: "someValue"
                    }
                };
                this.sendDataToServer(data);
            };
            reader.readAsDataURL(SharedData.videoBlob);
        }
    }

    sendImage() {

        const dataUrl = this.pdfCanvas.toDataURL('image/png');
        errorManager.log(1016);
        // console.log('%c ', `font-size:300px; background:url(${dataUrl}) no-repeat;`);

        const data = {
            client_uuid: basicInitializer.getClient_UUID(),
            image: dataUrl,
            additionalData: {
                someKey: "someValue"
            }
        };
        this.sendDataToServer(data);
    }

    sendDataToServer(data) {

        this.spinner.show();

        data.additionalData.learnLevel = cTracker.getCurrentLevel();

        errorManager.log(1017, data);

        fetch('/upload', {
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
            this.handleServerResponse(data)
            this.spinner.hide();
            this.sendButtonInProcess = false;
        })
        .catch(error => {
            errorManager.showError(1018, error.message);
            this.spinner.hide();
            this.sendButtonInProcess = false;
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

                this.resultDiv1.append(cTracker.getCurrentLevelTitle());
                this.resultDiv1.append('\n');
                const myPostIt = new PostItNote('result1', data.result1, data.result2);
                myPostIt.setTabTitle(1, 'eng');
                myPostIt.setTabTitle(2, 'hindi');
                
            }
            cTracker.setNextLevel();
        }
    }
}
