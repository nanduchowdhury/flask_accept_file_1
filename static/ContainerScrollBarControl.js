class ContainerScrollBarControl {
    constructor(containerId) {
        this.container = document.getElementById(containerId);

        if (this.container) {
            this.initializeScrollListener();
        }
    }

    initializeScrollListener() {
        // Add the scroll event listener to the container
        this.container.addEventListener('scroll', () => {
            this.onScroll(); // Call the method when the scroll-bar moves
        });
    }

    onScroll() {
        // Derived class can implement this method.
    }
}
