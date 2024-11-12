/////////////////////////////////////////////////////////////////
//
// Following is how large PDF loaded and shown:
//
//      1.  At any time only 3 pages are shown - pdfCanvas shows image of 3 pages.
//          This is because if we append all pages to pdfCanvas, mobile devices
//              do not show anything but only a smiley.
//      2.  When scroll is triggered, read more 3 pages.
//      3.  'renderedPages' and 'renderingStatus' - are used to 
//              restrict async renderPage() re-entry.
//      4.  'pageImageCache' holds off-screen-canvases of all pages that were rendered.
//           This could be optimized to hold only certain numbe of pages - to
//              save memory-hold.
//      5.  Whenever scroll reaches extreme top or bottom, load/render pages.
//              But also move the scroll-bar - this facilitates smooth viewing
//              as scrolling happens.
//
//          Validation : Desktop PDF : 20MB
//                       Mobile PDF : 16MB
//
/////////////////////////////////////////////////////////////////

class PdfLoader extends ContainerScrollBarControl {
    constructor(containerId, pdfCanvasId, spinnerId, numPagesAtATime = 3) {
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
        this.pageImageCache = new Map();
        this.renderingStatus = {}; // Track rendering status for each page
        this.scrollTimeout = null; // Debounce timer
        this.scrollDelay = BasicInitializer.PDF_PAGE_RENDERING_DEBOUNCE_DELAY; // Adjust delay as needed
        this.numPagesAtATime = numPagesAtATime; // Number of pages to render at a time
        this.currentPageRange = [1, numPagesAtATime]; // Initialize with pages 1 to numPagesAtATime

        // Create and style the scroll tag
        this.scrollTag = document.createElement('div');

        // this.container.style.position = "relative";
        this.scrollTag.style.position = 'absolute';


        // this.scrollTag.style.top = '10px';
        // this.scrollTag.style.right = '10px';
        this.scrollTag.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.scrollTag.style.color = 'white';
        this.scrollTag.style.padding = '5px 10px';
        this.scrollTag.style.borderRadius = '5px';
        this.scrollTag.style.display = 'none'; // Hide by default
        this.container.appendChild(this.scrollTag); // Append to container
    }

    updateScrollTagPosition() {
        const {top, left} = basicInitializer.getTopLeftCoordsOfContainer(this.container);
        this.scrollTag.style.top = `${top}px`;
        this.scrollTag.style.left = `${left}px`;
    }

    showScrollTag(currentPage, numPages) {
        // Update and show the scroll tag
        this.scrollTag.textContent = `Page ${currentPage} of ${numPages}`;
        this.updateScrollTagPosition();
        this.scrollTag.style.display = 'block';

        // Hide the tag after a delay if scrolling stops
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.scrollTag.style.display = 'none';
        }, 1000); // Adjust delay as needed
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
                await this.calculateDocumentDimensions();
                await this.renderPagesInRange(); // Start by rendering the initial range (1 to numPagesAtATime)

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
            const viewport = page.getViewport({ scale: 1 });

            if (viewport.width > maxWidth) {
                maxWidth = viewport.width;
            }

            this.pageHeights[pageNum - 1] = viewport.height;
            this.pageYOffset[pageNum - 1] = totalHeight;
            totalHeight += viewport.height;
        }

        this.pdfCanvas.width = maxWidth;
        this.pdfCanvas.style.display = 'block';
    }

    async renderPagesInRange() {
        const [start, end] = this.currentPageRange;

        this.clearCanvas();

        let totalHeight = 0;
        for (let pageNum = start; pageNum <= end && pageNum <= this.pdfDocument.numPages; pageNum++) {
            totalHeight += this.pageHeights[pageNum - 1];
        }
        this.pdfCanvas.height = totalHeight;

        this.renderedPages.clear();
        this.renderingStatus = {};

        for (let pageNum = start; pageNum <= end && pageNum <= this.pdfDocument.numPages; pageNum++) {
            await this.renderPage(pageNum);
        }
    }

    clearCanvas() {
        const context = this.pdfCanvas.getContext('2d');
        context.clearRect(0, 0, this.pdfCanvas.width, this.pdfCanvas.height);
    }

    async renderPage(pageNum) {
        if (this.renderedPages.has(pageNum) || this.renderingStatus[pageNum]) return;

        // console.log("NC - start rendering page : ", pageNum);

        // If page image is cached, use it directly
        if (this.pageImageCache.has(pageNum)) {
            this.drawCachedPage(pageNum);
            // console.log("NC - cache rendering page : ", pageNum);
            return;
        }

        this.renderingStatus[pageNum] = true;

        try {
            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });

            const offScreenCanvas = document.createElement('canvas');
            offScreenCanvas.width = viewport.width;
            offScreenCanvas.height = viewport.height;

            await page.render({
                canvasContext: offScreenCanvas.getContext('2d'),
                viewport: viewport
            }).promise;

            this.pageImageCache.set(pageNum, offScreenCanvas);

            this.drawCachedPage(pageNum);
            this.renderedPages.add(pageNum);

        } catch (err) {
            errorManager.showError(1023, pageNum, err);
        } finally {
            this.renderingStatus[pageNum] = false;
        }

        // console.log("NC - end rendering page : ", pageNum);
    }

    drawCachedPage(pageNum) {
        const cachedCanvas = this.pageImageCache.get(pageNum);
        const context = this.pdfCanvas.getContext('2d');
        const pageY = this.pageYOffset[pageNum - 1] - this.pageYOffset[this.currentPageRange[0] - 1];
        context.drawImage(cachedCanvas, 0, pageY);
    }

    debounceScroll() {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => this.handleScroll(), this.scrollDelay);
    }

    async handleScroll() {
        if (!this.pdfDocument) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = this.container;
        const scrollMiddle = scrollTop + clientHeight / 2;

        const tolerance = 1;
        const isBottomMost = scrollTop + clientHeight >= scrollHeight - tolerance;
        const isTopMost = scrollTop <= tolerance;

        const numPages = this.pdfDocument.numPages;
        const midPage = Math.min(
            Math.ceil((scrollTop + clientHeight / 2) / (scrollHeight / this.numPagesAtATime)),
            this.numPagesAtATime
        );
        
        this.showScrollTag(midPage + this.currentPageRange[0] - 1, numPages);

        if (isBottomMost && this.currentPageRange[1] < numPages) {
            this.currentPageRange = [
                this.currentPageRange[1],
                this.currentPageRange[1] + this.numPagesAtATime - 1
            ];
            await this.renderPagesInRange();
            // this.container.scrollTop = scrollMiddle;
	        this.container.scrollTop = 100;
        } else if (isTopMost && this.currentPageRange[0] > 1) {
            this.currentPageRange = [
                this.currentPageRange[0] - (this.numPagesAtATime - 1),
                this.currentPageRange[0]
            ];
            await this.renderPagesInRange();
            // this.container.scrollTop = scrollMiddle;
	        this.container.scrollTop = scrollHeight / 2;
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
        this.clearCanvas();
        this.pdfCanvas.width = 0;
        this.pdfCanvas.height = 0;
        this.pdfDocument = null;
        this.pageCanvases = [];
        this.pageHeights = [];
        this.pageYOffset = [];
        this.renderedPages.clear();
        this.renderingStatus = {};
        this.pageImageCache.clear();
    }
}
