"use strict";

class MouseControl {

    constructor(containerId) {
        this.container = document.getElementById(containerId);

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
    }

    activateRegionSelection() {
        this.container.addEventListener('mousedown', (event) => {
            if (event.button === BasicInitializer.LEFT_MOUSE_BUTTON) {
                this.onMouseDown(event);
            }
        });
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

    setRegionStartOnMouseClick(pageX, pageY, offsetX, offsetY) {

        const [xAdj, yAdj] = this.computeXYAdjustmentAsPerScrollBars();

        this.regionStartX = pageX;
        this.regionStartY = pageY + yAdj;

        this.regionImageStartX = offsetX;
        this.regionImageStartY = offsetY;

        this.selectionBoxMgr.clear();

        this.selectionRegionRect.left = Math.round(this.regionStartX);
        this.selectionRegionRect.top = Math.round(this.regionStartY);
        
        this.selectionRegionRect.width = 1;
        this.selectionRegionRect.height = 1;

        this.selectionBoxMgr.create(`${this.selectionRegionRect.left}px`,
                                    `${this.selectionRegionRect.top}px`);

        this.container.appendChild(this.selectionBoxMgr.getSelectionBox());
    }

    onMouseDown = (event) => {

        const touchOrEvent = event.touches ? event.touches[0] : event;

        const px = touchOrEvent.pageX;
        const py = touchOrEvent.pageY;

        this.setRegionStartOnMouseClick(px, py, event.offsetX, event.offsetY);

        this.container.addEventListener('mousemove', this.onMouseMove);
        this.container.addEventListener('mouseup', this.onMouseUp);
    }

    onMouseMove = (event) => {

        const [xAdj, yAdj] = this.computeXYAdjustmentAsPerScrollBars();

        const touchOrEvent = event.touches ? event.touches[0] : event;

        const px = touchOrEvent.pageX;
        const py = touchOrEvent.pageY;

        this.regionEndX = px;
        this.regionEndY = py + yAdj;

        this.regionImageEndX = event.offsetX;
        this.regionImageEndY = event.offsetY;

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

    setRegionEndOnMouseClick(pageX, pageY, offsetX, offsetY) {

        const [xAdj, yAdj] = this.computeXYAdjustmentAsPerScrollBars();

        this.regionEndX = pageX;
        this.regionEndY = pageY + yAdj;

        this.regionImageEndX = offsetX;
        this.regionImageEndY = offsetY;

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
                                            
        if ( this.selectionBoxMgr.getOffsetWidth() <= BasicInitializer.ACCEPTABLE_REGION_SIZE ||
            this.selectionBoxMgr.getOffsetHeight() <= BasicInitializer.ACCEPTABLE_REGION_SIZE ) {
                this.selectionBoxMgr.clear();
        }

        this.previewAreaRmb.updateRegionBbox(this.regionImageStartX, this.regionImageStartY, 
            this.regionImageEndX, this.regionImageEndY);
        this.previewAreaRmb.updateSelectionRegionRect(this.selectionRegionRect);
    }

    onMouseUp = () => {

        if ( this.selectionBoxMgr.getOffsetWidth() <= BasicInitializer.ACCEPTABLE_REGION_SIZE ||
            this.selectionBoxMgr.getOffsetHeight() <= BasicInitializer.ACCEPTABLE_REGION_SIZE ) {
                this.selectionBoxMgr.clear();
        }

        this.previewAreaRmb.updateRegionBbox(this.regionImageStartX, this.regionImageStartY, 
            this.regionImageEndX, this.regionImageEndY);
        this.previewAreaRmb.updateSelectionRegionRect(this.selectionRegionRect);

        this.container.removeEventListener('mousemove', this.onMouseMove);
        this.container.removeEventListener('mouseup', this.onMouseUp);
    }
};
