class PreviewAreaControl {
    constructor() {

        this.selectionRegionRect = {left : 0, top : 0, width : 0, height : 0};
        this.regionImageStartX = 0;
        this.regionImageStartY = 0;
        this.regionImageEndX = 0;
        this.regionImageEndY = 0;
        this.regionStartX = 0;
        this.regionStartY = 0;
        this.regionEndX = 0;
        this.regionEndY = 0;
        this.selectionBox = null;



        document.getElementById('fileInput').addEventListener('change', this.onFileInput);
        document.getElementById('regionButton').addEventListener('click', this.onRegionButton);
    }

    showVideoInCanvas(videoUrl) {
        console.trace(`KPMNDK - trace : `);
    
        const videoElement = document.getElementById('videoOverlay');
        const pdfCanvas = document.getElementById('pdfCanvas');
    
        const ctx = pdfCanvas.getContext('2d');
        ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    
        pdfCanvas.style.display = 'none';
    
        videoElement.src = videoUrl;
        videoElement.style.display = 'block';
    
        previewArea.removeEventListener('mousedown', this.onMouseDown);
    }
    
    hideVideoShowCanvas() {
        console.trace(`KPMNDK - trace : `);
    
        const videoElement = document.getElementById('videoOverlay');
        const pdfCanvas = document.getElementById('pdfCanvas');
    
        videoElement.pause();
        videoElement.style.display = 'none';
    
        pdfCanvas.style.display = 'block';
    
        previewArea.addEventListener('mousedown', this.onMouseDown);
    }
    
    onMouseDown = (event) => {
        console.trace(`KPMNDK - trace : `);
    
        this.regionStartX = event.pageX;
        this.regionStartY = event.pageY;
    
        this.regionImageStartX = event.offsetX;
        this.regionImageStartY = event.offsetY;
    
        if ( this.selectionBox ) this.selectionBox.remove();
    
        this.selectionRegionRect.left = Math.round(this.regionStartX);
        this.selectionRegionRect.top = Math.round(this.regionStartY);
        
        this.selectionRegionRect.width = 1;
        this.selectionRegionRect.height = 1;
    
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selectionBox';
        this.selectionBox.style.left = `${this.selectionRegionRect.left}px`;
        this.selectionBox.style.top = `${this.selectionRegionRect.top}px`;
        this.selectionBox.style.width = `1px`;
        this.selectionBox.style.height = `1px`;
    
        previewArea.appendChild(this.selectionBox);
    
        previewArea.addEventListener('mousemove', this.onMouseMove);
        previewArea.addEventListener('mouseup', this.onMouseUp);
    }
    
    onMouseMove = (event) => {
        this.regionEndX = event.pageX;
        this.regionEndY = event.pageY;
    
        this.regionImageEndX = event.offsetX;
        this.regionImageEndY = event.offsetY;
    
        if ( this.regionEndX < this.regionStartX ) {
            this.selectionRegionRect.left = Math.round(this.regionEndX);
        }
        if ( this.regionEndY < this.regionStartY ) {
            this.selectionRegionRect.top = Math.round(this.regionEndY);
        }
        this.selectionRegionRect.width = Math.abs(Math.round(this.regionEndX - this.regionStartX));
        this.selectionRegionRect.height = Math.abs(Math.round(this.regionEndY - this.regionStartY));
    
        this.selectionBox.style.width = `${this.selectionRegionRect.width}px`;
        this.selectionBox.style.height = `${this.selectionRegionRect.height}px`;
        this.selectionBox.style.left = `${this.selectionRegionRect.left}px`;
        this.selectionBox.style.top = `${this.selectionRegionRect.top}px`;
    }
    
    onMouseUp = () => {
        console.trace(`KPMNDK - trace : `);
    
        previewArea.removeEventListener('mousemove', this.onMouseMove);
        previewArea.removeEventListener('mouseup', this.onMouseUp);
    }
    
    onRegionButton = () => {
        console.trace(`KPMNDK - trace : `);
    
        const pdfCanvas = document.getElementById('pdfCanvas');
        const context = pdfCanvas.getContext('2d');
    
        const x = (this.regionImageStartX < this.regionImageEndX) ? this.regionImageStartX : this.regionImageEndX;
        const y = (this.regionImageStartY < this.regionImageEndY) ? this.regionImageStartY : this.regionImageEndY;
        
        const left = Math.round(x);
        const top = Math.round(y);
    
        const width = Math.abs(this.regionImageEndX - this.regionImageStartX);
        const height = Math.abs(this.regionImageEndY - this.regionImageStartY);
    
        console.log('region cut is : ', left, top, width, height);
    
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
    
        const roughArea = document.getElementById('roughArea');
        roughArea.appendChild(imageElement);
    
        console.log("KUPAMANDUK-1009 selected-image datURL is shown below : ");
        console.log('%c ', `font-size:300px; background:url(${dataURL}) no-repeat;`);
        
    }
    
    onFileInput = (event) => {
        console.trace(`KPMNDK - trace : `);
    
        const file = event.target.files[0];
        const previewArea = document.getElementById('previewArea');
    
        DataSource = 'File';
    
        if (file) {
            if (file.type === 'application/pdf') {
                // Display PDF using PDF.js
                const reader = new FileReader();
                reader.onload = function(e) {
                    const loadingTask = pdfjsLib.getDocument({data: e.target.result});
                    loadingTask.promise.then(function(pdf) {
                        // Fetch the first page
                        pdf.getPage(1).then(function(page) {
                            const scale = 1.0;
                            const viewport = page.getViewport({scale});
                            const pdfCanvas = document.getElementById('pdfCanvas');
    
                            const context = pdfCanvas.getContext('2d');
                            pdfCanvas.height = viewport.height;
                            pdfCanvas.width = viewport.width;
                            pdfCanvas.style.display = 'block';
                            
                            previewAreaControl.hideVideoShowCanvas();
    
                            const renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            };
                            page.render(renderContext);
                        });
                    });
                };
                reader.readAsArrayBuffer(file);
            } else {
                const reader = new FileReader();
                reader.onload = function(e) {
    
                    const pdfCanvas = document.getElementById('pdfCanvas');
                    const ctx = pdfCanvas.getContext('2d');
    
                    const img = new Image();
                    img.onload = function() {
    
                        pdfCanvas.width = img.naturalWidth;
                        pdfCanvas.height = img.naturalHeight;
                        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
    
                        previewAreaControl.hideVideoShowCanvas();
                    };
    
                    // Set the source of the image element to the FileReader result
                    img.src = e.target.result;
                };
    
                // Read the file as a data URL
                reader.readAsDataURL(file);
            }
        }
    }
    

}
