class PopoutManager {
    constructor(containerId) {
        this.popout = document.getElementById(containerId);
    }

    showPopout() {
        this.popout.style.display = 'block';

        // Click anywhere outside the popout - to make it disappear
        document.addEventListener('mousedown', (e) => this.onClickOutsideToImplement(e));
    }

    onClickOutsideToImplement(event) {
        if (!this.popout.contains(event.target)) {
            this.closePopout();
        }
    }

    closePopout() {
        this.popout.style.display = 'none';
    }

    // API to append an item (either simple text or a DOM element)
    appendItem(item) {
        let elementToAppend;

        // Check if the item is a string (text) or a DOM element
        if (typeof item === 'string') {
            elementToAppend = document.createTextNode(item); // Handle simple text
        } else {
            elementToAppend = item; // DOM element
        }

        // Append the text node or element to the container
        this.popout.appendChild(elementToAppend);
    }

    clear() {
        this.popout.innerHTML = '';  // Clear the previous content of the popout
    }
}
