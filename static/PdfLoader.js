class PdfLoader extends ContainerScrollBarControl {
    constructor(containerId, pdfCanvasId, spinnerId) {
        super(containerId);
        this.pdfCanvasId = pdfCanvasId;
        this.pdfCanvas = document.getElementById(this.pdfCanvasId);
        this.spinner = document.getElementById(spinnerId);
        this.currentLoadingTask = null;
        this.pdfDocument = null;
        this.pageCanvases = [];
        this.pageHeights = [];
        this.pageYOffset = [];
        this.renderedPages = new Set();
        this.renderingStatus = {};
        this.scrollTimeout = null;
        this.scrollDelay = BasicInitializer.PDF_PAGE_RENDERING_DEBOUNCE_DELAY;
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
        this.stopLoadPdf();
        this.startSpinner();

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
                this.currentLoadingTask = loadingTask;

                this.pdfDocument = await loadingTask.promise;
                this.renderVisiblePages(); // Start with rendering the visible pages
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

    getViewportForDevice(page) {
        const isMobile = window.innerWidth < 768;
        const scale = isMobile ? (window.innerWidth / page.getViewport({ scale: 1 }).width) : 1;
        return page.getViewport({ scale });
    }

    async renderPage(pageNum) {
        if (this.renderedPages.has(pageNum) || this.renderingStatus[pageNum]) return;

        console.log("NC - Rendering page: ", pageNum);
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

            // Adjust main canvas size if not set for mobile
            if (!this.pdfCanvas.width || !this.pdfCanvas.height) {
                this.pdfCanvas.width = viewport.width;
                this.pdfCanvas.height = viewport.height * this.pdfDocument.numPages;
            }

            // Draw only the visible part on the main canvas
            const context = this.pdfCanvas.getContext('2d');
            context.drawImage(offScreenCanvas, 0, this.pageYOffset[pageNum - 1]);

            this.renderedPages.add(pageNum);

        } catch (err) {
            errorManager.showError(1023, pageNum, err);
        } finally {
            this.renderingStatus[pageNum] = false;
        }

        console.log("NC - Completed rendering page: ", pageNum);
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

    debounceScroll() {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => this.renderVisiblePages(), this.scrollDelay);
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
        this.renderingStatus = {};
    }
}
