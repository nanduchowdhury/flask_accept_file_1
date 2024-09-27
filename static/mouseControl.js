class MouseControl {

    constructor(containerId) {
        this.container = document.getElementById(containerId);

        this.previewAreaRmb = new PreviewAreaRmb();

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

    onMouseDown = (event) => {

        this.regionStartX = event.pageX;
        this.regionStartY = event.pageY;

        this.regionImageStartX = event.offsetX;
        this.regionImageStartY = event.offsetY;

        this.selectionBoxMgr.clear();

        this.selectionRegionRect.left = Math.round(this.regionStartX);
        this.selectionRegionRect.top = Math.round(this.regionStartY);
        
        this.selectionRegionRect.width = 1;
        this.selectionRegionRect.height = 1;

        this.selectionBoxMgr.create(`${this.selectionRegionRect.left}px`,
                                    `${this.selectionRegionRect.top}px`);

        this.container.appendChild(this.selectionBoxMgr.getSelectionBox());

        this.container.addEventListener('mousemove', this.onMouseMove);
        this.container.addEventListener('mouseup', this.onMouseUp);
    }

    onMouseMove = (event) => {
        this.regionEndX = event.pageX;
        this.regionEndY = event.pageY;

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
