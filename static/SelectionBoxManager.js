class SelectionBoxManager {
    constructor(isClearAfterTimeout = false) {

        this.CLEAR_TIMEOUT_INTERVAL = 5000; // clear after 5 seconds.

        this.isClearAfterTimeout = isClearAfterTimeout;
        this.selectionBox = null;
        this.clearTimeoutId = null; // Store the timeout ID
    }

    create(left, top) {
        if (this.selectionBox == null) {
            this.selectionBox = document.createElement('div');
            this.selectionBox.className = 'selectionBox';
            this.selectionBox.style.left = left;
            this.selectionBox.style.top = top;
            this.selectionBox.style.width = `1px`;
            this.selectionBox.style.height = `1px`;

            // Automatically clear the selection box after 3 seconds
            if ( this.isClearAfterTimeout ) {
                this.startClearTimer();
            }
        }
    }

    updateDimension(top, left, width, height) {
        if (this.selectionBox) {
            this.selectionBox.style.width = width;
            this.selectionBox.style.height = height;
            this.selectionBox.style.left = left;
            this.selectionBox.style.top = top;
        }
    }

    clear() {
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
        // Clear the timeout when manually clearing
        if (this.clearTimeoutId) {
            clearTimeout(this.clearTimeoutId);
            this.clearTimeoutId = null;
        }
    }

    startClearTimer() {
        // Clear any existing timer before starting a new one
        if (this.clearTimeoutId) {
            clearTimeout(this.clearTimeoutId);
        }

        // Set the timer to clear the selection box after 3 seconds (3000ms)
        this.clearTimeoutId = setTimeout(() => {
            this.clear();
        }, this.CLEAR_TIMEOUT_INTERVAL);
    }

    getOffsetWidth() {
        if (this.selectionBox) {
            return this.selectionBox.offsetWidth;
        }
    }

    getOffsetHeight() {
        if (this.selectionBox) {
            return this.selectionBox.offsetHeight;
        }
    }

    getSelectionBox() {
        return this.selectionBox;
    }
}
