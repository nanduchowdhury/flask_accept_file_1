class PreviewAreaControl extends ContainerScrollBarControl {
    constructor(spinnerId) {

        super('previewArea');

        this.mouseControl = new MouseControl('previewArea');

        this.spinner = new Spinner(spinnerId);

        document.getElementById('fileInput').addEventListener('change', this.onFileInput);
    }

    onScroll() {
        this.mouseControl.clearSelectionRegion();
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
        const files = event.target.files;
        
        // Case 1: No file was selected (user clicked cancel)
        if (!files || files.length === 0) {
            return;
        }

        // Case 2: File was selected
        const file = files[0];
        SharedData.DataSource = 'File';
        cTracker.reset();

        if (file) {
            if (file.type === 'application/pdf') {
                this.supportPdfReading(file);
            } else if (file.type.startsWith('image/')) {
                this.supportImageFileReading(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                this.supportPptFileReading(file);
            } else if (file.type.startsWith('video/')) {
                this.supportVideoFileReading(file);
            } else {
                errorManager.showError(1039, file.type);  // Unsupported file type error
            }
        }
    }

    supportVideoFileReading(file) {
        try {

            this.spinner.show();

            const videoURL = URL.createObjectURL(file);
            const videoElement = document.createElement("video");
            videoElement.src = videoURL;
            videoElement.controls = true; // Optional: add controls for video playback
            videoElement.style.width = "100%"; // Set to fit the canvas
            videoElement.style.height = "auto"; // Maintain aspect ratio
        
            // Assuming 'pdfCanvas' is your canvas element
            const pdfCanvas = document.getElementById("pdfCanvas");
            pdfCanvas.innerHTML = ""; // Clear existing content
            pdfCanvas.appendChild(videoElement);
        
            this.showVideoInCanvas(videoURL);

            // Optionally, you can autoplay the video
            // videoElement.play();

        } catch (err) {
            errorManager.showError(1043, file, err);
        } finally {
            // Always hide the spinner, regardless of success or error
            this.spinner.hide();
        }
    }

    supportPptFileReading(file) {
        this.convertPPTtoPDF(file);
    }

    supportImageFileReading(file) {
        try {
            // Show spinner before starting the file read
            this.spinner.show();
    
            this.clearPdfCanvasContext();

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
    
    clearPdfCanvasContext() {
        const pdfCanvas = document.getElementById('pdfCanvas');
        const context = pdfCanvas.getContext('2d');

        pdfCanvas.width = 0;
        pdfCanvas.height = 0;
        context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    }

    async renderPDFtoCanvas(pdf, scale = 1) {
        const pdfCanvas = document.getElementById('pdfCanvas');
        const context = pdfCanvas.getContext('2d');
        let totalHeight = 0;
        let maxWidth = 0;
    
        const renderPage = async (pageNumber) => {
            try {
                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale });
    
                const offScreenCanvas = document.createElement('canvas');
                offScreenCanvas.width = viewport.width;
                offScreenCanvas.height = viewport.height;
                const offScreenContext = offScreenCanvas.getContext('2d');
    
                await page.render({
                    canvasContext: offScreenContext,
                    viewport: viewport
                }).promise;
    
                totalHeight += viewport.height;
                maxWidth = Math.max(maxWidth, viewport.width);
    
                return offScreenCanvas;
            } catch (err) {
                errorManager.showError(1042, err);
            }
        };
    
        const renderAllPages = async () => {
            try {
                const canvases = [];
                const numPages = pdf.numPages;
    
                errorManager.showInfo(1021);
                for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
                    const offScreenCanvas = await renderPage(pageNumber);
                    canvases.push(offScreenCanvas);
                }
    
                pdfCanvas.width = maxWidth;
                pdfCanvas.height = totalHeight;
    
                let currentHeight = 0;
                canvases.forEach((canvas) => {
                    context.drawImage(canvas, 0, currentHeight);
                    currentHeight += canvas.height;
                });
            } catch (err) {
                errorManager.showError(1022, err);
            }
        };
    
        try {
            await renderAllPages();
            pdfCanvas.style.display = 'block';
            previewAreaControl.hideVideoShowCanvas();
        } catch (err) {
            errorManager.showError(1023, err);
        }
    }
    
    async convertPPTtoPDF(pptFileName) {
        const formData = new FormData();
        formData.append('file', pptFileName);
    
        let pdfBlob = null;
    
        try {
            const response = await fetch('/convert_ppt_to_pdf', {
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) {
                errorManager.showError(1040);
            }
    
            pdfBlob = await response.blob();
    
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    
            await this.renderPDFtoCanvas(pdf);
        } catch (error) {
            errorManager.showError(1041, error);
        }
        return pdfBlob;
    }
    
    async supportPdfReading(file) {
        try {
            const reader = new FileReader();
            this.clearPdfCanvasContext();
    
            reader.onload = async (e) => {
                try {
                    const pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
                    await this.renderPDFtoCanvas(pdf);
                } catch (err) {
                    errorManager.showError(1024, err); // Error while loading PDF
                }
            };
    
            reader.onerror = (err) => {
                errorManager.showError(1025, err); // FileReader error
            };
    
            reader.readAsArrayBuffer(file);
        } catch (err) {
            errorManager.showError(1026, err); // General error handling
        }
    }
}
