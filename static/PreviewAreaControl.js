class PreviewAreaControl {
    constructor() {

        this.mouseControl = new MouseControl('previewArea');

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
    
        DataSource = 'File';
    
        if (file) {
            if (file.type === 'application/pdf') {
                // Display PDF using PDF.js
                const reader = new FileReader();
                reader.onload = function(e) {
                    const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                    loadingTask.promise.then(function(pdf) {
                        const numPages = pdf.numPages;  // Get the total number of pages
                        const scale = 1.0;
                        const pdfCanvas = document.getElementById('pdfCanvas');
                        const context = pdfCanvas.getContext('2d');
                        let totalHeight = 0;
                        let maxWidth = 0;
            
                        function renderPage(pageNumber) {
                            return pdf.getPage(pageNumber).then(function(page) {
                                const viewport = page.getViewport({ scale });
                                const pageHeight = viewport.height;
                                const pageWidth = viewport.width;
            
                                // Create an off-screen canvas for each page
                                const offScreenCanvas = document.createElement('canvas');
                                offScreenCanvas.width = pageWidth;
                                offScreenCanvas.height = pageHeight;
                                const offScreenContext = offScreenCanvas.getContext('2d');
            
                                const renderContext = {
                                    canvasContext: offScreenContext,
                                    viewport: viewport
                                };
            
                                return page.render(renderContext).promise.then(() => {
                                    // Update total height and max width
                                    totalHeight += pageHeight;
                                    maxWidth = Math.max(maxWidth, pageWidth);
            
                                    // Return the off-screen canvas
                                    return offScreenCanvas;
                                });
                            });
                        }
            
                        // Render all pages
                        const renderAllPages = async () => {
                            const canvases = [];
            
                            for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
                                const offScreenCanvas = await renderPage(pageNumber);
                                canvases.push(offScreenCanvas);
                            }
            
                            // Set final pdfCanvas size
                            pdfCanvas.width = maxWidth;
                            pdfCanvas.height = totalHeight;
            
                            // Composite all off-screen canvases onto the final canvas
                            let currentHeight = 0;
                            canvases.forEach(canvas => {
                                context.drawImage(canvas, 0, currentHeight);
                                currentHeight += canvas.height;
                            });
            
                            pdfCanvas.style.display = 'block';
                            previewAreaControl.hideVideoShowCanvas();
                        };
            
                        renderAllPages();
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
