class PopoutManager extends ContainerScrollBarControl {
    constructor(containerId) {

        super(containerId);

        this.popout = document.getElementById(containerId);
    }

    showPopout() {
        this.popout.style.display = 'block';

        // Click anywhere outside the popout - to make it disappear
        document.addEventListener('mousedown', (e) => this.onClickOutsideToImplement(e));
    }

    onClickOutsideToImplement(event) {
        if (!this.popout.contains(event.target)) {
            this.closePopout();
        }
    }

    closePopout() {
        this.popout.style.display = 'none';
    }

    // API to append an item (either simple text or a DOM element)
    appendItem(item) {
        let elementToAppend;

        // Check if the item is a string (text) or a DOM element
        if (typeof item === 'string') {
            elementToAppend = document.createTextNode(item); // Handle simple text
        } else {
            elementToAppend = item; // DOM element
        }

        // Append the text node or element to the container
        this.popout.appendChild(elementToAppend);
    }

    clear() {
        this.popout.innerHTML = '';  // Clear the previous content of the popout
    }
}

class PdfPopoutManager extends PopoutManager {
    constructor(containerId) {
        super(containerId); // Call the parent class constructor
        this.originalParent = null; // To store the original parent of pdfCanvas
        this.isSelecting = false;  // Flag to check if region selection is ongoing
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;

        this.pdfCanvas = document.getElementById('pdfCanvas');

        this.selectionBoxMgr = new SelectionBoxManager();
        this.popOutRmb = new PopOutRmb();

        this.pdfCanvas.addEventListener('mousedown', this.onMouseDown);
    }


    onScroll() {
        this.selectionBoxMgr.clear();
    }

    // Store the original parent and move pdfCanvas to the popout
    movePdfCanvasToPopout(pdfCanvas) {
        this.originalParent = pdfCanvas.parentElement; // Store the original parent
        this.appendItem(pdfCanvas); // Move the pdfCanvas to the popout

        // Attach mouse event listeners for region selection
        pdfCanvas.addEventListener('mousedown', this.onMouseDown);
    }

    // Return pdfCanvas back to its original parent
    returnPdfCanvasToOriginalParent() {
        
        if (this.originalParent) {
            this.originalParent.appendChild(this.pdfCanvas); // Append pdfCanvas back to its original parent
        }
    }

    // Mouse down event to start region selection
    onMouseDown = (event) => {

        if (event.button === BasicInitializer.LEFT_MOUSE_BUTTON) {

            if ( event.target === this.pdfCanvas ) {

                this.isSelecting = true;
                this.startX = event.offsetX;
                this.startY = event.offsetY;

                // Create a selection box
                this.selectionBoxMgr.create(`${this.startX}px`,
                                `${this.startY}px`);

                this.popout.appendChild(this.selectionBoxMgr.getSelectionBox());

                this.pdfCanvas.addEventListener('mousemove', this.onMouseMove);
                this.pdfCanvas.addEventListener('mouseup', this.onMouseUp);
            }
        }
    }

    // Mouse move event to adjust the region
    onMouseMove = (event) => {

        if (event.button === BasicInitializer.LEFT_MOUSE_BUTTON) {
            if ( event.target === this.pdfCanvas ) {

                if (!this.isSelecting) return;

                this.currentX = event.offsetX;
                this.currentY = event.offsetY;

                // Calculate width and height
                const width = Math.abs(this.currentX - this.startX);
                const height = Math.abs(this.currentY - this.startY);

                // Set position and size for the selection box
                this.selectionBoxMgr.updateDimension(`${Math.min(this.startY, this.currentY)}px`,
                                        `${Math.min(this.startX, this.currentX)}px`,
                                        `${width}px`,
                                        `${height}px`);
            }
        }
    }

    onMouseUp = (event) => {

        if (event.button === BasicInitializer.LEFT_MOUSE_BUTTON) {
            if ( event.target === this.pdfCanvas ) {

                this.isSelecting = false;

                this.pdfCanvas.removeEventListener('mousemove', this.onMouseMove);
                this.pdfCanvas.removeEventListener('mouseup', this.onMouseUp);

                // Get the selected region dimensions
                const width = Math.abs(this.currentX - this.startX);
                const height = Math.abs(this.currentY - this.startY);

                // Cut out the image from the pdfCanvas based on the selected region
                const selectedImage = this.cutOutImageFromCanvas(this.pdfCanvas, Math.min(this.startX, this.currentX), 
                                                Math.min(this.startY, this.currentY), width, height);

                if ( this.selectionBoxMgr.getOffsetWidth() <= BasicInitializer.ACCEPTABLE_REGION_SIZE ||
                    this.selectionBoxMgr.getOffsetHeight() <= BasicInitializer.ACCEPTABLE_REGION_SIZE ) {
                        this.selectionBoxMgr.clear();
                }

                this.popOutRmb.setSelectedImage(selectedImage);

                // console.log('%c ', `font-size:300px; background:url(${selectedImage.src}) no-repeat;`);
            }
        }
    }

    cutOutImageFromCanvas_1(canvas, x, y, width, height) {

        const context = canvas.getContext('2d');

        const imageData = context.getImageData(x, y, width, height);
    
        // Create a new canvas to hold the cropped image
        const rectCanvas = document.createElement('canvas');
        rectCanvas.width = width;
        rectCanvas.height = height;
        const rectContext = rectCanvas.getContext('2d');
        
        rectContext.putImageData(imageData, 0, 0);
    
        const dataURL = rectCanvas.toDataURL('image/png');
    
        const imageElement = new Image();
        imageElement.src = dataURL;
        imageElement.alt = 'Extracted Image';
        // Set display to block to ensure new line placement
        imageElement.style.display = 'block';

        return imageElement;
    }


    // Method to cut out the selected image from the canvas
    cutOutImageFromCanvas(canvas, x, y, width, height) {
        // Create an off-screen canvas to draw the selected region
        const offScreenCanvas = document.createElement('canvas');
        const offScreenContext = offScreenCanvas.getContext('2d');

        // Set the size of the off-screen canvas to match the selected region
        offScreenCanvas.width = width;
        offScreenCanvas.height = height;

        // Draw the selected region from the original canvas
        offScreenContext.drawImage(canvas, x, y, width, height, 0, 0, width, height);

        // Create an image element to display the selected region
        const img = document.createElement('img');
        img.src = offScreenCanvas.toDataURL();

        return img; // Return the image element
    }

    // Override the onClickOutsideToImplement method to return pdfCanvas when closing the popout
    onClickOutsideToImplement(event) {
        if (!this.popout.contains(event.target)) {
            this.returnPdfCanvasToOriginalParent(); // Return pdfCanvas to its original parent
            this.closePopout();
        }
    }
}


