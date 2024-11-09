class PdfLoader {
    constructor(pdfCanvasId, spinnerId) {
        this.pdfCanvasId = pdfCanvasId;
        this.pdfCanvas = document.getElementById(this.pdfCanvasId);
        this.spinner = document.getElementById(spinnerId);
        this.currentLoadingTask = null; // Holds the current loading task for cancellation
        this.canvases = []; // Store the rendered canvases of each page
    }

    // Start the spinner
    startSpinner() {
        if (this.spinner) {
            this.spinner.style.display = 'block';
        }
    }

    // Stop the spinner
    stopSpinner() {
        if (this.spinner) {
            this.spinner.style.display = 'none';
        }
    }

    // Load PDF asynchronously
    async loadPdf(file) {
        this.stopLoadPdf(); // Stop any ongoing loading process
        this.startSpinner();

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                this.currentLoadingTask = loadingTask;

                const pdf = await loadingTask.promise;
                await this.renderPDFtoCanvas(pdf); // Each page will be rendered and displayed as it is read

            } catch (err) {
                errorManager.showError(1024, err); // Error while loading PDF
            } finally {
                this.stopSpinner();
                this.clearCanvases(); // Clear memory after loading is complete
            }
        };

        reader.onerror = (err) => {
            errorManager.showError(1025, err); // FileReader error
            this.stopSpinner();
            this.clearCanvases(); // Ensure cleanup even in case of error
        };

        reader.readAsArrayBuffer(file);
    }

    // Stop any ongoing PDF loading task
    stopLoadPdf() {
        if (this.currentLoadingTask) {
            this.currentLoadingTask.destroy();
            this.currentLoadingTask = null;
            this.clearPdfResources(); // Clear any ongoing resources when stopping the task
        }
    }

    // Render PDF to canvas
    async renderPDFtoCanvas(pdf, scale = 1) {
        const context = this.pdfCanvas.getContext('2d');
        let totalHeight = 0;   // Track the current total height of the canvas
        let maxWidth = 0;      // Track the maximum width across all pages

        const renderPage = async (pageNumber) => {
            try {
                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale });

                const offScreenCanvas = document.createElement('canvas');
                offScreenCanvas.width = viewport.width;
                offScreenCanvas.height = viewport.height;
                const offScreenContext = offScreenCanvas.getContext('2d');

                // Render the page to the off-screen canvas
                await page.render({
                    canvasContext: offScreenContext,
                    viewport: viewport
                }).promise;

                // Store the off-screen canvas in the list
                this.canvases.push(offScreenCanvas);

                // Update the max width and total height
                maxWidth = Math.max(maxWidth, viewport.width);
                totalHeight += viewport.height;

            } catch (err) {
                errorManager.showError(1042, err);
                this.stopSpinner();
                this.clearCanvases();
            }
        };

        const redrawAllPages = () => {
            // Set the final size of the pdfCanvas based on all pages' dimensions
            this.pdfCanvas.width = maxWidth;
            this.pdfCanvas.height = totalHeight;

            let currentHeight = 0;

            // Redraw all the stored canvases (pages) on the pdfCanvas
            this.canvases.forEach((canvas) => {
                context.drawImage(canvas, 0, currentHeight);
                currentHeight += canvas.height;  // Move down for the next page
            });
        };

        const renderAllPages = async () => {
            try {
                const numPages = pdf.numPages;
                // Render each page and redraw all previous pages after each render
                for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
                    await renderPage(pageNumber);
                }
                redrawAllPages();
            } catch (err) {
                errorManager.showError(1022, err);
                this.stopSpinner();
                this.clearCanvases();
            }
        };

        try {
            await renderAllPages();
            this.pdfCanvas.style.display = 'block';
            previewAreaControl.hideVideoShowCanvas();
        } catch (err) {
            errorManager.showError(1023, err);
            this.stopSpinner();
            this.clearCanvases();
        }
    }

    // Method to clear any canvases or other memory-intensive objects
    clearPdfResources() {
        // Clear canvas resources
        if (this.pdfCanvas) {
            const context = this.pdfCanvas.getContext('2d');
            context.clearRect(0, 0, this.pdfCanvas.width, this.pdfCanvas.height);
            this.pdfCanvas.width = 0;
            this.pdfCanvas.height = 0;
            this.pdfCanvas = null; // Nullify the canvas to ensure it's eligible for garbage collection
            this.pdfCanvas = document.getElementById(this.pdfCanvasId);
        }
    }

    clearCanvases() {
        // Clear the canvases array
        this.canvases.forEach((canvas) => {
            canvas.width = 0;
            canvas.height = 0;
        });
        this.canvases = []; // Reset the canvases array
    }
}
