class PdfLoader extends ContainerScrollBarControl {
    constructor(containerId, pdfCanvasId, spinnerId, pdfCache = false) {
        super(containerId);
        this.pdfCanvasId = pdfCanvasId;
        this.pdfCanvas = document.getElementById(this.pdfCanvasId);
        this.spinner = document.getElementById(spinnerId);
        this.currentLoadingTask = null;
        this.pageCanvases = [];
        this.pdfDocument = null;
        this.pageHeights = [];
        this.pageYOffset = [];
        this.renderedPages = new Set();
        this.renderingStatus = {}; // Track rendering status for each page
        this.scrollTimeout = null; // Debounce timer
        this.scrollDelay = BasicInitializer.PDF_PAGE_RENDERING_DEBOUNCE_DELAY; // Adjust delay as needed
        this.pdfCache = pdfCache; // Optional PDF caching
    }

    startSpinner() {
        if (this.spinner) {
            this.spinner.style.display = 'block';
        }
    }

    stopSpinner() {
        if (this.spinner) {
            this.spinner.style.display = 'none';
        }
    }

    async loadPdf(file) {
        this.stopLoadPdf(); // Stop any ongoing PDF loading/rendering
        this.startSpinner();

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                this.currentLoadingTask = loadingTask;

                this.pdfDocument = await loadingTask.promise;
                await this.calculateDocumentDimensions();
                await this.renderPage(1); // Start by rendering the first page
            } catch (err) {
                errorManager.showError(1024, err);
            } finally {
                this.stopSpinner();
            }
        };

        reader.onerror = (err) => {
            errorManager.showError(1025, err);
            this.stopSpinner();
        };

        reader.readAsArrayBuffer(file);
    }

    async calculateDocumentDimensions() {
        const numPages = this.pdfDocument.numPages;
        let totalHeight = 0;
        let maxWidth = 0;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = this.getViewportForDevice(page);

            if (viewport.width > maxWidth) {
                maxWidth = viewport.width;
            }

            this.pageHeights[pageNum - 1] = viewport.height;
            this.pageYOffset[pageNum - 1] = totalHeight;
            totalHeight += viewport.height;
        }

        this.pdfCanvas.width = maxWidth;
        this.pdfCanvas.height = totalHeight;
        this.pdfCanvas.style.display = 'block';
    }

    getViewportForDevice(page) {
        const isMobile = window.innerWidth < 768;
        const scale = isMobile ? (window.innerWidth / page.getViewport({ scale: 1 }).width) : 1;
        return page.getViewport({ scale });
    }

    async renderPage(pageNum) {
        if (this.renderedPages.has(pageNum) || this.renderingStatus[pageNum]) return;

        console.log("NC - start rendering page : ", pageNum);
        this.renderingStatus[pageNum] = true;

        try {
            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = this.getViewportForDevice(page);

            const offScreenCanvas = document.createElement('canvas');
            offScreenCanvas.width = viewport.width;
            offScreenCanvas.height = viewport.height;

            await page.render({
                canvasContext: offScreenCanvas.getContext('2d'),
                viewport: viewport
            }).promise;

            const context = this.pdfCanvas.getContext('2d');
            context.drawImage(offScreenCanvas, 0, this.pageYOffset[pageNum - 1]);
            this.renderedPages.add(pageNum);

            if (!this.pdfCache) {
                // Free up memory for non-cached mode
                offScreenCanvas.width = 0;
                offScreenCanvas.height = 0;
            }

        } catch (err) {
            errorManager.showError(1023, pageNum, err);
        } finally {
            this.renderingStatus[pageNum] = false;
        }

        console.log("NC - end rendering page : ", pageNum);
    }

    debounceScroll() {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => this.renderVisiblePages(), this.scrollDelay);
    }

    async renderVisiblePages() {
        if (!this.pdfDocument) return;

        const scrollTop = this.container.scrollTop;
        const viewportHeight = this.container.clientHeight;

        for (let pageNum = 1; pageNum <= this.pdfDocument.numPages; pageNum++) {
            const pageTop = this.pageYOffset[pageNum - 1];
            const pageBottom = pageTop + this.pageHeights[pageNum - 1];

            if ((pageTop < scrollTop + viewportHeight) && (pageBottom > scrollTop)) {
                await this.renderPage(pageNum);
            }
        }
    }

    onScroll() {
        this.debounceScroll();
    }

    stopLoadPdf() {
        if (this.currentLoadingTask) {
            this.currentLoadingTask.destroy();
            this.currentLoadingTask = null;
            this.clearResources();
        }
    }

    clearResources() {
        this.pdfCanvas.getContext('2d').clearRect(0, 0, this.pdfCanvas.width, this.pdfCanvas.height);
        this.pdfCanvas.width = 0;
        this.pdfCanvas.height = 0;
        this.pdfDocument = null;
        this.pageCanvases = [];
        this.pageHeights = [];
        this.pageYOffset = [];
        this.renderedPages.clear();
        this.renderingStatus = {}; // Clear rendering status on reload
    }

    clearCanvases() {
        this.pageCanvases.forEach((canvas) => {
            canvas.width = 0;
            canvas.height = 0;
        });
        this.pageCanvases = [];
    }
}
