class MouseControl {

    static LEFT_MOUSE_BUTTON = 0;
    static ACCEPTABLE_REGION_SIZE = 10;

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
        this.selectionBox = null;
    }

    deActivateRegionSelection() {
        this.container.removeEventListener('mousedown', (event) => {
            if (event.button === MouseControl.LEFT_MOUSE_BUTTON) {
                this.onMouseDown(event);
            }
        });
    }

    activateRegionSelection() {
        this.container.addEventListener('mousedown', (event) => {
            if (event.button === MouseControl.LEFT_MOUSE_BUTTON) {
                this.onMouseDown(event);
            }
        });
    }

    onMouseDown = (event) => {
        console.trace(`KPMNDK - trace : `);

        this.regionStartX = event.pageX;
        this.regionStartY = event.pageY;

        this.regionImageStartX = event.offsetX;
        this.regionImageStartY = event.offsetY;

        if ( this.selectionBox ) this.selectionBox.remove();

        this.selectionRegionRect.left = Math.round(this.regionStartX);
        this.selectionRegionRect.top = Math.round(this.regionStartY);
        
        this.selectionRegionRect.width = 1;
        this.selectionRegionRect.height = 1;

        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selectionBox';
        this.selectionBox.style.left = `${this.selectionRegionRect.left}px`;
        this.selectionBox.style.top = `${this.selectionRegionRect.top}px`;
        this.selectionBox.style.width = `1px`;
        this.selectionBox.style.height = `1px`;

        this.container.appendChild(this.selectionBox);

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

        this.selectionBox.style.width = `${this.selectionRegionRect.width}px`;
        this.selectionBox.style.height = `${this.selectionRegionRect.height}px`;
        this.selectionBox.style.left = `${this.selectionRegionRect.left}px`;
        this.selectionBox.style.top = `${this.selectionRegionRect.top}px`;
    }

    onMouseUp = () => {
        console.trace(`KPMNDK - trace : `);

        if ( this.selectionBox.offsetWidth <= MouseControl.ACCEPTABLE_REGION_SIZE ||
            this.selectionBox.offsetHeight <= MouseControl.ACCEPTABLE_REGION_SIZE ) {
                this.selectionBox.remove();
            }

        this.previewAreaRmb.updateRegionBbox(this.regionImageStartX, this.regionImageStartY, 
            this.regionImageEndX, this.regionImageEndY);
        this.previewAreaRmb.updateSelectionRegionRect(this.selectionRegionRect);

        this.container.removeEventListener('mousemove', this.onMouseMove);
        this.container.removeEventListener('mouseup', this.onMouseUp);
    }
};
