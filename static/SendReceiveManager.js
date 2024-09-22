class SendReceiveManager {
    constructor(fileInputId, sendButtonId, resultDivId1, resultDivId2, spinnerId, previewAreaId, pdfCanvasId) {
        this.fileInput = document.getElementById(fileInputId);
        this.sendButton = document.getElementById(sendButtonId);
        this.resultDiv1 = document.getElementById(resultDivId1);
        this.resultDiv2 = document.getElementById(resultDivId2);
        this.spinner = new Spinner(spinnerId);
        this.previewArea = document.getElementById(previewAreaId);
        this.pdfCanvas = document.getElementById(pdfCanvasId);

        this.cTracker = new ConceptTracker();

        this.addEventListeners();
    }

    addEventListeners() {
        this.sendButton.addEventListener('click', this.handleSendButtonClick.bind(this));
    }

    handleSendButtonClick() {
        try {

            if ( this.cTracker.isInitLevel() ) {
                if ( SharedData.DataSource == 'File' ) {
                    this.sendFile();
                } else if ( SharedData.DataSource == 'Picture' ) {
                    this.sendImage();
                } else if ( SharedData.DataSource == 'video' ) {
                    this.sendVideo();
                }
            } else {
                const data = {
                    clientId: basicInitializer.getClientId(),
                    additionalData: {
                        // Add any additional data you want to include in the JSON object
                        someKey: "someValue"
                    }
                };
                this.sendDataToServer(data);
            }
        } catch (error) {
            errorManager.showError(1015, error);
        } finally {
            // this.spinner.hide();
        }
    }

    sendFile() {

        if (this.fileInput.files.length === 0) {
            alert('Choose a PDF, JPG, PNG - or take a picture using the camera');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onloadend = () => {
            const base64File = reader.result.split(',')[1];

            const data = {
                clientId: basicInitializer.getClientId(),
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
                    clientId: basicInitializer.getClientId(),
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
            clientId: basicInitializer.getClientId(),
            image: dataUrl,
            additionalData: {
                someKey: "someValue"
            }
        };
        this.sendDataToServer(data);
    }

    sendDataToServer(data) {

        this.spinner.show();

        data.additionalData.learnLevel = this.cTracker.getCurrentLevel();

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
        })
        .catch(error => {
            errorManager.showError(1018, error.message);
            this.spinner.hide();
        });
    }

    handleServerResponse(data) {
        
        if (data.error) {
            this.resultDiv.textContent = data.error;
        } else {

            if ( this.cTracker.isInitLevel() ) {

                errorManager.log(1019, data);

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

                errorManager.log(1020, data);

                this.resultDiv1.append(this.cTracker.getCurrentLevelTitle());
                this.resultDiv1.append('\n');
                const myPostIt = new PostItNote(data.result1, data.result2);
                myPostIt.setTabTitle(1, 'eng');
                myPostIt.setTabTitle(2, 'hindi');
                
            }
            this.cTracker.setNextLevel();
        }
    }
}
