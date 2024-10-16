"use strict";

class DetailAreaManager {
    constructor(resultAreaId) {
        this.resultArea = document.getElementById(resultAreaId);
        this.headers = {}; // To keep track of headers and their associated PostItNote objects
    }

    addHeader(headerText, color = 'green', font = 'Arial', size = '16px', bold = false) {
        if (!this.headers[headerText]) {
            const header = document.createElement('h2');
            header.textContent = headerText;
            header.style.color = color;
            header.style.fontFamily = font;
            header.style.fontSize = size;
            header.style.fontWeight = bold ? 'bold' : 'normal'; // If bold is true, set font-weight to bold
            header.id = this._generateId(headerText);
            this.resultArea.appendChild(header);
            this.headers[headerText] = { header, postItNote: null };
        }
    }

    // Method to add a PostItNote object next to the header
    addExplanation(headerText, postItNote) {
        if (!this.headers[headerText]) {
            this.addHeader(headerText); // Add header if not exists
        }
        const headerInfo = this.headers[headerText];
        if (headerInfo.postItNote) {
            headerInfo.postItNote.remove(); // Remove existing post-it note before adding a new one
        }
        headerInfo.postItNote = postItNote.getElement(); // Assume PostItNote object has getElement() method
        headerInfo.header.insertAdjacentElement('afterend', headerInfo.postItNote);
    }

    // Method to remove the PostItNote object
    removeExplanation(headerText) {
        const headerInfo = this.headers[headerText];
        if (headerInfo && headerInfo.postItNote) {
            headerInfo.postItNote.remove();
            headerInfo.postItNote = null;
        }
    }

    // Method to change the color of a header
    changeColor(headerText, color) {
        const headerInfo = this.headers[headerText];
        if (headerInfo) {
            headerInfo.header.style.color = color;
        }
    }

    // Method to scroll to the specific header
    jumpToHeader(headerText) {
        const headerInfo = this.headers[headerText];
        if (headerInfo) {
            headerInfo.header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Method to remove both header and post-it note
    removeHeader(headerText) {
        const headerInfo = this.headers[headerText];
        if (headerInfo) {
            headerInfo.header.remove();
            if (headerInfo.postItNote) {
                headerInfo.postItNote.remove();
            }
            delete this.headers[headerText];
        }
    }

    // Helper method to generate unique ID for each header
    _generateId(headerText) {
        return 'header-' + headerText.replace(/\s+/g, '-').toLowerCase();
    }
}


