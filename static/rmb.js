class RmbBase {
    constructor(containerId, actions) {
        this.container = document.getElementById(containerId);
        this.actions = actions;
        this.contextMenu = this.createContextMenu();
        this.initializeContextMenu();
    }

    // Dynamically create the context menu based on the actions array
    createContextMenu() {
        const menu = document.createElement('div');
        menu.classList.add('context-menu');
        menu.style.display = 'none'; // Hidden initially
        menu.style.position = 'absolute'; // Make sure it's positioned properly

        // Dynamically create menu items based on the provided actions
        this.actions.forEach((actionName, index) => {
            const actionDiv = document.createElement('div');
            actionDiv.innerText = actionName;
            actionDiv.id = `action-${index + 1}`;
            actionDiv.classList.add('menu-item');
            menu.appendChild(actionDiv);

            // Attach event listener for each action (call dynamic handler)
            actionDiv.addEventListener('click', () => this.onAction(index + 1));
        });

        document.body.appendChild(menu);
        return menu;
    }

    // Initialize right-click behavior and menu actions
    initializeContextMenu() {
        // Show custom context menu on right-click
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent the default browser context menu
            this.contextMenu.style.display = 'block';
            this.contextMenu.style.left = `${e.pageX}px`;
            this.contextMenu.style.top = `${e.pageY}px`;
        });

        // Hide the custom menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.contextMenu.style.display = 'none';
            }
        });
    }

    // Dynamic action handler based on the index
    onAction(actionIndex) {
        // This method should be implemented in the derived class
        throw new Error(`Action-${actionIndex} handler must be implemented in the derived class.`);
    }
}


class PreviewAreaRmb extends RmbBase {
    constructor() {
        super('previewArea', ["explain region"]);

        this.regionImageStartX = 0;
        this.regionImageStartY = 0; 
        this.regionImageEndX = 0;
        this.regionImageEndY = 0;

        this.selectionRegionRect = {left : 0, top : 0, width : 0, height : 0};
    }

    updateRegionBbox(startX, startY, endX, endY) {
        
        this.regionImageStartX = startX;
        this.regionImageStartY = startY; 
        this.regionImageEndX = endX;
        this.regionImageEndY = endY;
    }

    updateSelectionRegionRect(rect) {
        this.selectionRegionRect = rect;
    }

    onExplainRegion() {
    
        const pdfCanvas = document.getElementById('pdfCanvas');
        const context = pdfCanvas.getContext('2d');

        const x = (this.regionImageStartX < this.regionImageEndX) ? this.regionImageStartX : this.regionImageEndX;
        const y = (this.regionImageStartY < this.regionImageEndY) ? this.regionImageStartY : this.regionImageEndY;
        
        const left = Math.round(x);
        const top = Math.round(y);
    
        const width = Math.abs(this.regionImageEndX - this.regionImageStartX);
        const height = Math.abs(this.regionImageEndY - this.regionImageStartY);

        if ( width <= MouseControl.ACCEPTABLE_REGION_SIZE || 
                height <= MouseControl.ACCEPTABLE_REGION_SIZE ) {
            return;
        }
    
        const imageData = context.getImageData(left, top, width, height);
    
        // Create a new canvas to hold the cropped image
        const rectCanvas = document.createElement('canvas');
        rectCanvas.width = this.selectionRegionRect.width;
        rectCanvas.height = this.selectionRegionRect.height;
        const rectContext = rectCanvas.getContext('2d');
        
        rectContext.putImageData(imageData, 0, 0);
    
        const dataURL = rectCanvas.toDataURL('image/png');
    
        const imageElement = new Image();
        imageElement.src = dataURL;
        imageElement.alt = 'Extracted Image';
        // Set display to block to ensure new line placement
        imageElement.style.display = 'block';
    
        const roughArea = document.getElementById('roughArea');
        roughArea.appendChild(imageElement);
    
        errorManager.log(1014);
        // console.log('%c ', `font-size:300px; background:url(${dataURL}) no-repeat;`);
        
    }

    onAction(actionIndex) {
        switch (actionIndex) {
            case 1:
                this.onExplainRegion();
                break;
            case 2:
                alert('Preview Area Action-2 clicked!');
                break;
            default:
                alert(`Preview Area Action-${actionIndex} clicked!`);
        }
        this.contextMenu.style.display = 'none'; // Hide menu after action
    }
}


