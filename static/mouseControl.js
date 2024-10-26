"use strict";

class MouseControl {

    constructor(containerId) {
        this.container = document.getElementById(containerId);

        this.pdfCanvas = document.getElementById('pdfCanvas');
        this.ctx = this.pdfCanvas.getContext('2d');

        this.touchPaintMode = false;

        this.previewAreaRmb = new PreviewAreaRmb();
        this.mainTopicsAreaRmb = new MainTopicsAreaRmb();
        this.detailExplanationAreaRmb = new DetailExplanationAreaRmb();
        this.roughAreaRmb = new RoughAreaRmb();

        this.selectionRegionRect = {left : 0, top : 0, width : 0, height : 0};
        this.regionImageStartX = 0;
        this.regionImageStartY = 0;
        this.regionImageEndX = 0;
        this.regionImageEndY = 0;
        this.regionStartX = 0;
        this.regionStartY = 0;
        this.regionEndX = 0;
        this.regionEndY = 0;

        this.selectionBoxMgr = new SelectionBoxManager();

        this.touchPaintDraw = new TouchPaintDraw(this.container);
    }

    clearSelectionRegion() {
        this.selectionBoxMgr.clear();
    }

    deActivateRegionSelection() {
        this.container.removeEventListener('mousedown', (event) => {
            if (event.button === BasicInitializer.LEFT_MOUSE_BUTTON) {
                this.onMouseDown(event);
            }
        });
        this.container.addEventListener('touchstart', this.onMouseDown);
    }

    activateRegionSelection() {
        this.container.addEventListener('mousedown', (event) => {
            if (event.button === BasicInitializer.LEFT_MOUSE_BUTTON) {
                this.onMouseDown(event);
            }
        });
        this.container.removeEventListener('touchstart', this.onMouseDown);
    }

    computeXYAdjustmentAsPerScrollBars() {
        let xAdj = 0;
        let yAdj = 0;
        if ( containerMaximizeManager.isAnyContainerMaximized() ) {
            yAdj = this.container.scrollTop;
            let browserScroll = window.scrollY || document.documentElement.scrollTop;
            yAdj -= browserScroll;

            // TBD : xAdj
        }

        return [xAdj, yAdj];
    }

    // Return what-we-see-coord & actual-coord
    getRelevantEventCoords(pageX, pageY, offsetX, offsetY){
        const [xAdj, yAdj] = this.computeXYAdjustmentAsPerScrollBars();

        const whatWeSeeX = pageX;
        const whatWeSeeY = pageY + yAdj;

        const actualX = offsetX;
        const actualY = offsetY;

        return [whatWeSeeX, whatWeSeeY, actualX, actualY];
    }

    startTouchPaint() {
        this.touchPaintMode = true;
        this.clearSelectionRegion();
    }

    clearTouchPaint() {
        this.touchPaintMode = false;
        this.touchPaintDraw.clear();
    }

    endTouchPaint() {
        this.touchPaintMode = false;

        const bbox = this.touchPaintDraw.getBbox();
        const actual_bbox = this.touchPaintDraw.getActualBbox();

        if ( bbox && actual_bbox ) {
            
            const {minX, minY, maxX, maxY} = bbox;
            const { minActualX, minActualY, maxActualX, maxActualY } = actual_bbox;

            this.touchPaintDraw.clear();

            const width = Math.abs(Math.round(maxX - minX));
            const height = Math.abs(Math.round(maxY - minY));

            this.selectionRegionRect.left = Math.round(minX);
            this.selectionRegionRect.top = Math.round(minY);
            this.selectionRegionRect.width = width;
            this.selectionRegionRect.height = height;

            this.selectionBoxMgr.create(minX, minY);
            this.selectionBoxMgr.updateDimension(`${minY}px`,
                                                    `${minX}px`,
                                                    `${width}px`,
                                                    `${height}px`);
            this.container.appendChild(this.selectionBoxMgr.getSelectionBox());

            this.previewAreaRmb.updateRegionBbox(minActualX, minActualY, maxActualX, maxActualY);
            this.previewAreaRmb.updateSelectionRegionRect(this.selectionRegionRect);
        }
    }

    handleTouchPaint(pageX, pageY, offsetX, offsetY) {
        
        const [whatWeSeeX, whatWeSeeY, actualX, actualY] = this.getRelevantEventCoords(pageX, pageY, offsetX, offsetY);

        this.touchPaintDraw.draw(whatWeSeeX, whatWeSeeY, actualX, actualY);
    }

    setRegionStartOnMouseClick(pageX, pageY, offsetX, offsetY) {

        [this.regionStartX, this.regionStartY, this.regionImageStartX, this.regionImageStartY] = 
                            this.getRelevantEventCoords(pageX, pageY, offsetX, offsetY);

        this.selectionBoxMgr.clear();

        this.selectionRegionRect.left = Math.round(this.regionStartX);
        this.selectionRegionRect.top = Math.round(this.regionStartY);
        
        this.selectionRegionRect.width = 1;
        this.selectionRegionRect.height = 1;

        this.selectionBoxMgr.create(`${this.selectionRegionRect.left}px`,
                                    `${this.selectionRegionRect.top}px`);

        this.container.appendChild(this.selectionBoxMgr.getSelectionBox());
    }

    getMouseOrTouchCoords(event) {
        if (event.type === 'touchstart') {
            event.preventDefault();
            // Get coordinates from the first touch point
            const touch = event.touches[0];
            const pageX = touch.pageX;
            const pageY = touch.pageY;
            const offsetX = touch.clientX - this.pdfCanvas.getBoundingClientRect().left;
            const offsetY = touch.clientY - this.pdfCanvas.getBoundingClientRect().top;

            return [pageX, pageY, offsetX, offsetY];
        } else {
            const { pageX, pageY, offsetX, offsetY } = event;

            return [pageX, pageY, offsetX, offsetY];
        }
    }

    onMouseDown = (event) => {

        const [pageX, pageY, offsetX, offsetY] = this.getMouseOrTouchCoords(event);

        if ( this.touchPaintMode ) {
            if ( event.target === this.pdfCanvas ) {
                this.handleTouchPaint(pageX, pageY, offsetX, offsetY);
            }
        } else {
            this.setRegionStartOnMouseClick(pageX, pageY, offsetX, offsetY);
        }

        this.container.addEventListener('mousemove', this.onMouseMove);
        this.container.addEventListener('mouseup', this.onMouseUp);
    }

    onMouseMove = (event) => {

        if ( this.touchPaintMode ) {
            if ( event.target === this.pdfCanvas ) {
                this.handleTouchPaint(event.pageX, event.pageY, event.offsetX, event.offsetY);
            }
        } else {

        
            [this.regionEndX, this.regionEndY, this.regionImageEndX, this.regionImageEndY] = 
                                this.getRelevantEventCoords(event.pageX, event.pageY, event.offsetX, event.offsetY);

            if ( this.regionEndX < this.regionStartX ) {
                this.selectionRegionRect.left = Math.round(this.regionEndX);
            }
            if ( this.regionEndY < this.regionStartY ) {
                this.selectionRegionRect.top = Math.round(this.regionEndY);
            }
            this.selectionRegionRect.width = Math.abs(Math.round(this.regionEndX - this.regionStartX));
            this.selectionRegionRect.height = Math.abs(Math.round(this.regionEndY - this.regionStartY));

            this.selectionBoxMgr.updateDimension(`${this.selectionRegionRect.top}px`,
                                                `${this.selectionRegionRect.left}px`,
                                                `${this.selectionRegionRect.width}px`,
                                                `${this.selectionRegionRect.height}px`);

        }
    }

    onMouseUp = () => {

        if ( this.touchPaintMode ) {

        } else {
            if ( this.selectionBoxMgr.getOffsetWidth() <= BasicInitializer.ACCEPTABLE_REGION_SIZE ||
                this.selectionBoxMgr.getOffsetHeight() <= BasicInitializer.ACCEPTABLE_REGION_SIZE ) {
                    this.selectionBoxMgr.clear();
            }

            this.previewAreaRmb.updateRegionBbox(this.regionImageStartX, this.regionImageStartY, 
                this.regionImageEndX, this.regionImageEndY);
            this.previewAreaRmb.updateSelectionRegionRect(this.selectionRegionRect);
        }
        this.container.removeEventListener('mousemove', this.onMouseMove);
        this.container.removeEventListener('mouseup', this.onMouseUp);
    }
};
