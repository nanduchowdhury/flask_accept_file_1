class SelectionBoxManager {
    constructor() {

        this.selectionBox = null;
    }

    create(left, top) {

        if ( this.selectionBox == null ) {

            this.selectionBox = document.createElement('div');
            this.selectionBox.className = 'selectionBox';
            this.selectionBox.style.left = left;
            this.selectionBox.style.top = top;
            this.selectionBox.style.width = `1px`;
            this.selectionBox.style.height = `1px`;

        }
    }

    updateDimension(top, left, width, height) {

        if ( this.selectionBox ) {

            this.selectionBox.style.width = width;
            this.selectionBox.style.height = height;
            this.selectionBox.style.left = left;
            this.selectionBox.style.top = top;
        }
    }

    clear() {
        if ( this.selectionBox ) {
            this.selectionBox.remove();
        }
    }

    getOffsetWidth() {
        if ( this.selectionBox ) {
            return this.selectionBox.offsetWidth;
        }
    }

    getOffsetHeight() {
        if ( this.selectionBox ) {
            return this.selectionBox.offsetHeight;
        }
    }

    getSelectionBox() {
        return this.selectionBox;
    }
}


