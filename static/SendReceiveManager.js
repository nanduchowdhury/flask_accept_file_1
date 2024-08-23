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
