"use strict";

class TouchPaintDraw {
    constructor(container) {
        this.container = container;   // The container where the rects will be added
        this.rects = [];              // List to track all rectangle divs (and their coords)
    }

    draw(x, y, actualX, actualY) {
        // Create a new div element to represent a rectangle
        const rect = document.createElement('div');
        rect.style.position = 'absolute';
        rect.style.left = `${x}px`;
        rect.style.top = `${y}px`;
        rect.style.width = '10px';
        rect.style.height = '10px';
        rect.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';  // Transparent blue

        // Append the rectangle to the container and track it
        this.container.appendChild(rect);
        this.rects.push({ element: rect, x, y, actualX, actualY });
    }

    getBbox() {
        // Return the bounding box that covers all drawn rectangles (based on x, y)
        if (this.rects.length === 0) {
            return null;  // No rectangles drawn yet
        }

        const xCoords = this.rects.map(rect => rect.x);
        const yCoords = this.rects.map(rect => rect.y);

        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords) + 10;  // Include rectangle width
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords) + 10;  // Include rectangle height

        return { minX, minY, maxX, maxY };
    }

    getActualBbox() {
        // Return the bounding box based on actualX, actualY values
        if (this.rects.length === 0) {
            return null;  // No rectangles drawn yet
        }

        const actualXCoords = this.rects.map(rect => rect.actualX);
        const actualYCoords = this.rects.map(rect => rect.actualY);

        const minActualX = Math.min(...actualXCoords);
        const maxActualX = Math.max(...actualXCoords) + 10;  // Include rectangle width
        const minActualY = Math.min(...actualYCoords);
        const maxActualY = Math.max(...actualYCoords) + 10;  // Include rectangle height

        return { minActualX, minActualY, maxActualX, maxActualY };
    }

    clear() {
        // Remove all the rectangle div elements from the container
        this.rects.forEach(rect => {
            this.container.removeChild(rect.element);
        });
        this.rects = [];  // Reset the list of rectangles
    }
}




