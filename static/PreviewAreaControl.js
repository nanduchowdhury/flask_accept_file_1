class PreviewAreaControl {
    constructor(spinnerId) {

        this.mouseControl = new MouseControl('previewArea');

        this.spinner = new Spinner(spinnerId);

        document.getElementById('fileInput').addEventListener('change', this.onFileInput);
        document.getElementById('explainAgainButton').addEventListener('click', this.explainAgainButton);
    }

    showVideoInCanvas(videoUrl) {
    
        const videoElement = document.getElementById('videoOverlay');
        const pdfCanvas = document.getElementById('pdfCanvas');
    
        const ctx = pdfCanvas.getContext('2d');
        ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    
        pdfCanvas.style.display = 'none';
    
        videoElement.src = videoUrl;
        videoElement.style.display = 'block';
    
        this.mouseControl.deActivateRegionSelection();
    }
    
    hideVideoShowCanvas() {
    
        const videoElement = document.getElementById('videoOverlay');
        const pdfCanvas = document.getElementById('pdfCanvas');
    
        videoElement.pause();
        videoElement.style.display = 'none';
    
        pdfCanvas.style.display = 'block';
    
        this.mouseControl.activateRegionSelection();
    }
    
    onFileInput = (event) => {
    
        const file = event.target.files[0];
        const previewArea = document.getElementById('previewArea');
    
        SharedData.DataSource = 'File';
    
        if (file) {
            if (file.type === 'application/pdf') {
                this.supportPdfReading(file);
            } else {
                this.supportImageFileReading(file);
            }
        }
    }

    supportImageFileReading(file) {
        try {
            // Show spinner before starting the file read
            this.spinner.show();
    
            const reader = new FileReader();
    
            // Use an arrow function to retain 'this' context
            reader.onload = (e) => {
                try {
                    const pdfCanvas = document.getElementById('pdfCanvas');
                    const ctx = pdfCanvas.getContext('2d');
    
                    const img = new Image();
    
                    // Use arrow function for 'onload' to retain 'this' context
                    img.onload = () => {
                        try {
                            pdfCanvas.width = img.naturalWidth;
                            pdfCanvas.height = img.naturalHeight;
    
                            // Draw the image on the canvas
                            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
    
                            // Hide video, show canvas
                            previewAreaControl.hideVideoShowCanvas();
                        } catch (err) {
                            errorManager.showError(1027, err);
                        } finally {
                            // Always hide the spinner, regardless of success or error
                            this.spinner.hide();
                        }
                    };
    
                    // Set the source of the image element to the FileReader result
                    img.src = e.target.result;
                } catch (err) {
                    errorManager.showError(1028, err);
                    this.spinner.hide(); // Ensure spinner is hidden if there's an error
                }
            };
    
            // Handle any errors during file reading
            reader.onerror = (err) => {
                errorManager.showError(1029, file, err);
                this.spinner.hide(); // Hide the spinner if file reading fails
            };
    
            // Read the file as a data URL
            reader.readAsDataURL(file);
        } catch (err) {
            errorManager.showError(1030, file, err);
            this.spinner.hide(); // Ensure spinner is hidden if an error occurs in the main block
        }
    }
    

    async supportPdfReading(file) {
        try {
            const reader = new FileReader();
    
            reader.onload = async (e) => {
                try {
                    const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                    const pdf = await loadingTask.promise;
    
                    const numPages = pdf.numPages;
                    const scale = 1.0;
                    const pdfCanvas = document.getElementById('pdfCanvas');
                    const context = pdfCanvas.getContext('2d');
                    let totalHeight = 0;
                    let maxWidth = 0;
    
                    // Function to render a single page
                    const renderPage = async (pageNumber) => {
                        const page = await pdf.getPage(pageNumber);
                        const viewport = page.getViewport({ scale });
    
                        // Create an off-screen canvas for each page
                        const offScreenCanvas = document.createElement('canvas');
                        offScreenCanvas.width = viewport.width;
                        offScreenCanvas.height = viewport.height;
                        const offScreenContext = offScreenCanvas.getContext('2d');
    
                        const renderContext = {
                            canvasContext: offScreenContext,
                            viewport: viewport,
                        };
    
                        await page.render(renderContext).promise;
    
                        // Update total height and max width
                        totalHeight += viewport.height;
                        maxWidth = Math.max(maxWidth, viewport.width);
    
                        // Return the off-screen canvas
                        return offScreenCanvas;
                    };
    
                    // Function to render all pages
                    const renderAllPages = async () => {
                        const canvases = [];
    
                        try {
                            errorManager.showInfo(1021);

                            // Render all pages asynchronously, collecting all canvas elements
                            for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
                                const offScreenCanvas = await renderPage(pageNumber);
                                canvases.push(offScreenCanvas);
                            }
    
                            // Set final pdfCanvas size
                            pdfCanvas.width = maxWidth;
                            pdfCanvas.height = totalHeight;
    
                            // Composite all off-screen canvases onto the final canvas
                            let currentHeight = 0;
                            canvases.forEach((canvas) => {
                                context.drawImage(canvas, 0, currentHeight);
                                currentHeight += canvas.height;
                            });
    
                            pdfCanvas.style.display = 'block';
                            previewAreaControl.hideVideoShowCanvas();
                        } catch (err) {
                            errorManager.showError(1022, err);
                            throw err;
                        } finally {
                            errorManager.hideMessage();
                        }
                    };
    
                    await renderAllPages();
                } catch (err) {
                    errorManager.showError(1024, err);
                }
            };
    
            reader.onerror = (err) => {
                errorManager.showError(1025, err);
            };
    
            reader.readAsArrayBuffer(file);
        } catch (err) {
            errorManager.showError(1026, err);
        }
    }
        

}
