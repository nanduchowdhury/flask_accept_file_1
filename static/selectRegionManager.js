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
        this.sendToServer(imageElement.src);
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

        fetch('/explain_region', {
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
            this.processResultsRecvdFromServer(data);
            this.spinner.hide();
        })
        .catch(error => {
            errorManager.showError(1038, error.message);
            this.spinner.hide();
        });
    }

    processResultsRecvdFromServer(data) {
        const myPostIt = new PostItNote('roughArea', data.result1, data.result2);
        myPostIt.setTabTitle(1, 'eng');
        myPostIt.setTabTitle(2, 'hindi');
    }
}
