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
        this.searchMatches = new Map();
        this.renderingStatus = {}; // Track rendering status for each page
        this.scrollTimeout = null; // Debounce timer
        this.scrollDelay = BasicInitializer.PDF_PAGE_RENDERING_DEBOUNCE_DELAY; // Adjust delay as needed
        this.numPagesAtATime = numPagesAtATime; // Number of pages to render at a time
        this.currentPageRange = [1, numPagesAtATime]; // Initialize with pages 1 to numPagesAtATime

        this.initControlTag();
    }

    initControlTag() {
        this.controlTag = document.createElement('div');
        this.controlTag.style.position = 'absolute';
        // this.controlTag.style.top = '10px';
        // this.controlTag.style.right = '10px';
        this.controlTag.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.controlTag.style.color = 'white';
        this.controlTag.style.padding = '5px 10px';
        this.controlTag.style.borderRadius = '5px';
        this.container.appendChild(this.controlTag);
      
        // Top section with page label and navigation
        const topSection = document.createElement('div');
        topSection.style.display = 'flex'; // Arrange elements horizontally
        this.controlTag.appendChild(topSection);
      
        this.pageLabel = document.createElement('span');
        this.pageLabel.style.marginRight = '5px';
        topSection.appendChild(this.pageLabel);
      
        const upButton = document.createElement('button');
        upButton.style.marginRight = '5px';
        upButton.style.padding = '5px 10px';
        upButton.textContent = '↑↑';
        upButton.onclick = () => this.goToFirstPage();
        topSection.appendChild(upButton);
      
        const downButton = document.createElement('button');
        downButton.style.marginRight = '5px';
        downButton.style.padding = '5px 10px';
        downButton.textContent = '↓↓';
        downButton.onclick = () => this.goToLastPage();
        topSection.appendChild(downButton);
      
        // Bottom section with search box and button
        const bottomSection = document.createElement('div');
        bottomSection.style.display = 'flex'; // Arrange elements horizontally
        this.controlTag.appendChild(bottomSection);
      
        this.searchBox = document.createElement('input');
        this.searchBox.style.marginRight = '5px';
        this.searchBox.type = 'text';
        this.searchBox.placeholder = 'Search text...';
        this.searchBox.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            this.searchText(this.searchBox.value);
          }
        });
        bottomSection.appendChild(this.searchBox);
      
        const searchButton = document.createElement('button');
        searchButton.textContent = '🔍';
        searchButton.onclick = () => this.searchText(this.searchBox.value);
        bottomSection.appendChild(searchButton);
      
        this.controlTag.style.display = 'none'; // Hide initially
      }

    async searchText(text) {
        try {

            // Clear all pages where last matches were found.
            for (const [key, value] of this.searchMatches) {
                if ( this.pageImageCache.has(key) ) {
                    this.pageImageCache.delete(key);
                }
            }

            // Loop through each page to find text
            let matchFound = false;
            for (let pageNum = 1; pageNum <= this.pdfDocument.numPages; pageNum++) {
                const page = await this.pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();

                // Check for occurrences of the text on this page
                const matches = this.findTextOnPage(textContent, text);

                if (matches.length > 0) {
                    this.searchMatches.set(pageNum, matches);

                    // Clear page where this match is found.
                    if ( this.pageImageCache.has(pageNum) ) {
                        this.pageImageCache.delete(pageNum);
                    }
                    matchFound = true;
                } else {
                    this.searchMatches.delete(pageNum);
                }
            }
            if ( !matchFound ) {
                errorManager.showError(2036, text);
            } else {
                this.renderPagesInRange();
            }
        } catch (error) {
            errorManager.showError(2037, error.message); // Use your error manager to display the error
        }
    }

    findTextOnPage(textContent, searchText) {
        const matches = [];
        searchText = searchText.toLowerCase();

        textContent.items.forEach((item) => {
            const itemText = item.str.toLowerCase();
            if (itemText.includes(searchText)) {
                matches.push({
                    transform: item.transform,
                    width: item.width,
                    height: item.height,
                    text: item.str,
                });
            }
        });
        return matches;
    }

    highlightMatchesOnCanvas(pageNum, canvas, viewport) {

        if ( !this.searchMatches.has(pageNum) ) {
            return canvas;
        }

        let context = canvas.getContext('2d')
        const matches = this.searchMatches.get(pageNum);

        matches.forEach((match) => {
            const [x, y, , scaleX, scaleY] = match.transform;
            const canvasX = x * scaleX;
            const canvasY = viewport.height - y * scaleY; // Flip y-axis for canvas

            context.fillStyle = 'rgba(255, 255, 0, 0.3)'; // Semi-transparent yellow
            context.fillRect(canvasX, canvasY - match.height, match.width, match.height);
        });

        return canvas;
    }

    goToFirstPage() {
        this.goToPageNumber(1);
    }

    goToLastPage() {
        this.goToPageNumber(this.pdfDocument.numPages);
    }

    async goToPageNumber(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.pdfDocument.numPages) {
            errorManager.showError(2038, pageNumber);
            return;
        }
        this.currentPageRange = [pageNumber, pageNumber + this.numPagesAtATime - 1];
        await this.renderPagesInRange();
        this.showControlTag(pageNumber, this.pdfDocument.numPages);
    }

    updateControlTagPosition() {
        const {top, left} = basicInitializer.getTopLeftCoordsOfContainer(this.container);
        this.controlTag.style.top = `${top}px`;
        this.controlTag.style.left = `${left}px`;
    }

    showControlTag(currentPage, numPages) {
        // Update and show the scroll tag
        this.pageLabel.textContent = `${currentPage} / ${numPages}`;
        this.updateControlTagPosition();
        this.controlTag.style.display = 'block';

        // Hide the tag after a delay if scrolling stops
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            this.controlTag.style.display = 'none';
        }, 15000); // Adjust delay as needed
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

            let offScreenCanvas = document.createElement('canvas');
            offScreenCanvas.width = viewport.width;
            offScreenCanvas.height = viewport.height;

            const context = offScreenCanvas.getContext('2d');

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;



            // offScreenCanvas = this.highlightMatchesOnCanvas(pageNum, offScreenCanvas, viewport);
            if ( this.searchMatches.has(pageNum) ) {
                const matches = this.searchMatches.get(pageNum);

                matches.forEach((match) => {
                    // const [x, y, , scaleX, scaleY] = match.transform;
                    // const canvasX = x * scaleX;
                    // const canvasY = viewport.height - y * scaleY; // Flip y-axis for canvas

                    const [x, skewX, skewY, y, translateX, translateY] = match.transform;

                    context.fillStyle = 'rgba(255, 255, 0, 0.3)'; // Semi-transparent yellow
                    // context.fillRect(canvasX, canvasY - match.height, match.width, match.height);
                    context.fillRect(translateX, viewport.height - (translateY + y), match.width, match.height);
                });
            }



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
        
        this.showControlTag(midPage + this.currentPageRange[0] - 1, numPages);

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
