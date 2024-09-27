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
        super('previewArea', [BasicInitializer.EXPLAIN_REGION_RMB, BasicInitializer.POP_OUT_RMB]);

        this.selectRegionMgr = new SelectRegionManager();
    }

    updateRegionBbox(startX, startY, endX, endY) {
        
        this.selectRegionMgr.updateRegionBbox(startX, startY, endX, endY);
    }

    updateSelectionRegionRect(rect) {
        this.selectRegionMgr.updateSelectionRegionRect(rect);
    }

    onExplainRegion() {
    
        this.selectRegionMgr.grabRegionAndShowInRoughAreaAndTalkToServer('pdfCanvas');
    }

    onPopOut() {

        this.pdfPopoutManager = new PdfPopoutManager('genericPopoutId');
        this.pdfPopoutManager.clear(); // Clear the popout

        const pdfCanvas = document.getElementById('pdfCanvas');
        this.pdfPopoutManager.movePdfCanvasToPopout(pdfCanvas); // Move pdfCanvas to the popout
        
        this.pdfPopoutManager.showPopout();

        // this.mouseControl = new MouseControl('genericPopoutId');
        // this.mouseControl.activateRegionSelection();
    }

    onAction(actionIndex) {
        switch (actionIndex) {
            case 1:
                this.onExplainRegion();
                break;
            case 2:
                this.onPopOut();
                break;
            default:
                alert(`Preview Area Action-${actionIndex} clicked!`);
        }
        this.contextMenu.style.display = 'none'; // Hide menu after action
    }
}

class PopOutRmb extends RmbBase {
    constructor() {
        super('genericPopoutId', [BasicInitializer.EXPLAIN_REGION_RMB]);

        this.selectRegionMgr = new SelectRegionManager();
    }

    setSelectedImage(image) {
        this.selectRegionMgr.setSelectedImage(image);
    }

    onExplainRegion() {

        this.selectRegionMgr.showSelectedImageInRoughAreaAndTalkToServer();
    }

    onAction(actionIndex) {
        switch (actionIndex) {
            case 1:
                this.onExplainRegion();
                break;
            default:
                alert(`Preview Area Action-${actionIndex} clicked!`);
        }
        this.contextMenu.style.display = 'none'; // Hide menu after action
    }
}



