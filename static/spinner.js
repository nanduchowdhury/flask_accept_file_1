"use strict";

class Spinner {
    constructor(elementId) {
        this.spinnerElement = document.getElementById(elementId);
    }

    show() {
        if (this.spinnerElement) {
            this.spinnerElement.style.display = 'block';
        }
    }

    hide() {
        if (this.spinnerElement) {
            this.spinnerElement.style.display = 'none';
        }
    }

    // The destructor will automatically hide the spinner
    destroy() {
        this.hide();
    }
}

