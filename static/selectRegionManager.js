"use strict";

class SelectRegionManager {
    constructor() {

        this.spinnerId = 'loadingSpinner';

        this.regionImageStartX = 0;
        this.regionImageStartY = 0;
        this.regionImageEndX = 0;
        this.regionImageEndY = 0;

        this.selectionRegionRect = {left : 0, top : 0, width : 0, height : 0};

        this.selectedImage = null;

        this.roughArea = document.getElementById('roughArea');
        this.spinner = new Spinner(this.spinnerId);
    }

    updateRegionBbox(startX, startY, endX, endY) {
        
        this.regionImageStartX = startX;
        this.regionImageStartY = startY; 
        this.regionImageEndX = endX;
        this.regionImageEndY = endY;
    }

    updateSelectionRegionRect(rect) {
        this.selectionRegionRect = rect;
    }

    setSelectedImage(image) {
        this.selectedImage = image;
    }

    showSelectedImageInRoughAreaAndTalkToServer() {
        if ( this.selectedImage ) {
            this.roughArea.appendChild(this.selectedImage);
            this.sendToServer(this.selectedImage.src);
        }
    }

    grabRegionAndShowInRoughAreaAndTalkToServer(canvasId) {
        const imageElement = this.grabRegionAndShowInScratchArea(canvasId);
        
        // Check if the imageElement exists
        if (!imageElement) {
            console.error('Image element is invalid');
            return;
        }
    
        // Ensure the image has loaded to check its size
        imageElement.onload = () => {
            if (imageElement.naturalWidth === 0 || imageElement.naturalHeight === 0) {
                errorManager.showError(1055);
                return;
            }
    
            // Valid image, proceed to send it to the server
            this.sendToServer(imageElement.src);
        };
    
        // Error handling if the image fails to load
        imageElement.onerror = () => {
            console.error('Failed to load the image');
        };
    }

    grabRegionAndShowInScratchArea(canvasId) {
        const pdfCanvas = document.getElementById(canvasId);
        const context = pdfCanvas.getContext('2d');

        const x = (this.regionImageStartX < this.regionImageEndX) ? this.regionImageStartX : this.regionImageEndX;
        const y = (this.regionImageStartY < this.regionImageEndY) ? this.regionImageStartY : this.regionImageEndY;
        
        const left = Math.round(x);
        const top = Math.round(y);
    
        const width = Math.abs(this.regionImageEndX - this.regionImageStartX);
        const height = Math.abs(this.regionImageEndY - this.regionImageStartY);

        if ( width <= MouseControl.ACCEPTABLE_REGION_SIZE || 
                height <= MouseControl.ACCEPTABLE_REGION_SIZE ) {
            return;
        }
    
        const imageData = context.getImageData(left, top, width, height);
    
        // Create a new canvas to hold the cropped image
        const rectCanvas = document.createElement('canvas');
        rectCanvas.width = this.selectionRegionRect.width;
        rectCanvas.height = this.selectionRegionRect.height;
        const rectContext = rectCanvas.getContext('2d');
        
        rectContext.putImageData(imageData, 0, 0);
    
        const dataURL = rectCanvas.toDataURL('image/png');
    
        const imageElement = new Image();
        imageElement.src = dataURL;
        imageElement.alt = 'Extracted Image';
        // Set display to block to ensure new line placement
        imageElement.style.display = 'block';
    
        this.roughArea.appendChild(imageElement);
    
        errorManager.log(1014);
        // console.log('%c ', `font-size:300px; background:url(${dataURL}) no-repeat;`);
        
        return imageElement;
    }

    sendToServer(dataUrl) {
        
        this.spinner.show();

        const data = {
            client_uuid: basicInitializer.getClient_UUID(),
            image: dataUrl,
            additionalData: {
                someKey: "someValue"
            }
        };

        basicInitializer.makeServerRequest('/explain_region', data, 
            this.lamdaOnSelectRegionRequestSuccess, this.lamdaOnSelectRegionRequestFailure);
    }

    lamdaOnSelectRegionRequestSuccess = (data) => {
        this.processResultsRecvdFromServer(data);
        this.spinner.hide();
    }

    lamdaOnSelectRegionRequestFailure = (msg) => {
        this.spinner.hide();
        if ( msg ) {
            errorManager.showError(1038, error.message);
        }
    }


    processResultsRecvdFromServer(data) {
        const postIt = new PostItNote(data.result1, data.result2);

        const container = document.getElementById('roughArea');
        container.appendChild(postIt.getElement());
    }
}
