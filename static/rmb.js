"use strict";

class RmbBase {
    constructor(containerId, actions) {
        this.container = document.getElementById(containerId);
        this.actions = actions;
        this.contextMenu = this.createContextMenu();
        this.initializeContextMenu();

        this.pageX = 0;
        this.pageY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
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

            this.pageX = e.pageX;
            this.pageY = e.pageY;
            this.offsetX = e.offsetX;
            this.offsetY = e.offsetY;

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

class MainTopicsAreaRmb extends RmbBase {
    constructor() {
        super('result2', [BasicInitializer.POP_OUT_RMB]);
    }
    onPopInOut() {

        if ( containerMaximizeManager.isAnyContainerMaximized() ) {
            containerMaximizeManager.revertLayout();
        } else {
            containerMaximizeManager.popOutResult2Area();
        }
    }

    onAction(actionIndex) {
        switch (actionIndex) {
            case 1:
                this.onPopInOut();
                break;
            default:
                alert(`Preview Area Action-${actionIndex} clicked!`);
        }
        this.contextMenu.style.display = 'none'; // Hide menu after action
    }
}

class DetailExplanationAreaRmb extends RmbBase {
    constructor() {
        super('result1', [BasicInitializer.POP_OUT_RMB]);
    }
    onPopInOut() {

        if ( containerMaximizeManager.isAnyContainerMaximized() ) {
            containerMaximizeManager.revertLayout();
        } else {
            containerMaximizeManager.popOutResult1Area();
        }
    }

    onAction(actionIndex) {
        switch (actionIndex) {
            case 1:
                this.onPopInOut();
                break;
            default:
                alert(`Preview Area Action-${actionIndex} clicked!`);
        }
        this.contextMenu.style.display = 'none'; // Hide menu after action
    }
}

class RoughAreaRmb extends RmbBase {
    constructor() {
        super('roughArea', [BasicInitializer.POP_OUT_RMB]);
    }
    onPopInOut() {

        if ( containerMaximizeManager.isAnyContainerMaximized() ) {
            containerMaximizeManager.revertLayout();
        } else {
            containerMaximizeManager.popOutRoughArea();
        }
    }

    onAction(actionIndex) {
        switch (actionIndex) {
            case 1:
                this.onPopInOut();
                break;
            default:
                alert(`Preview Area Action-${actionIndex} clicked!`);
        }
        this.contextMenu.style.display = 'none'; // Hide menu after action
    }
}

class PreviewAreaRmb extends RmbBase {
    constructor() {
        super('previewArea', [BasicInitializer.EXPLAIN_REGION_RMB, 
            BasicInitializer.POP_OUT_RMB, 
            BasicInitializer.TOUCH_PAINT_REGION_START_END_RMB, 
            BasicInitializer.MCQ_RMB,
            BasicInitializer.PASTE_FROM_CLIPBOARD]);

        this.selectRegionMgr = new SelectRegionManager();

        this.touchPaintRegionStartOrEndIndicator = '';

        this.pdfCanvas = document.getElementById('pdfCanvas');
        this.ctx = pdfCanvas.getContext('2d');
    }

    updateRegionBbox(startX, startY, endX, endY) {
        
        this.selectRegionMgr.updateRegionBbox(startX, startY, endX, endY);
    }

    updateSelectionRegionRect(rect) {
        this.selectRegionMgr.updateSelectionRegionRect(rect);
    }

    onMCQ() {
        if ( cTracker.isInitLevel() ) {
            errorManager.showError(2046);
        } else {
            let mcq = new mcqServerManager();
            mcq.getMcqFromServer();
        }
    }

    onExplainRegion() {
    
        if ( cTracker.isInitLevel() ) {
            errorManager.showError(1054);
        } else {
            this.selectRegionMgr.grabRegionAndShowInRoughAreaAndTalkToServer('pdfCanvas');
        }
    }

    onPaste() {
        this.pasteFromClipboard();
    }

    onPopInOut() {

        if ( containerMaximizeManager.isAnyContainerMaximized() ) {
            containerMaximizeManager.revertLayout();
        } else {
            containerMaximizeManager.popOutPreviewArea();
        }
    }

    pasteImage(blob) {
        // Convert the blob to an image
        const img = new Image();
        const imgSrc = URL.createObjectURL(blob);

        img.onerror = () => {
            errorManager.showError(2054);
        };

        img.onload = () => {
            // Set canvas size to match image dimensions
            this.pdfCanvas.width = img.width;
            this.pdfCanvas.height = img.height;

            basicInitializer.clearBeforeStartNewExplanation();
            SharedData.DataSource = 'Picture';

            // Draw the image on the canvas
            this.ctx.drawImage(img, 0, 0, this.pdfCanvas.width, this.pdfCanvas.height);

            previewAreaControl.lamdaEntryBeforeGcsUpload();
            sendRecvManager.uploadGcsAndInitAIModel(previewAreaControl.lamdaOnGcsUploadFinish);
        };

        img.src = imgSrc;
    }

    pasteText(text, x = 10, y = 20, lineHeight = 30) {
        const lines = basicInitializer.convertMultiLine(text, 30);

        basicInitializer.createInMemoryPngFromText(lines)
        .then((file) => {
    
            basicInitializer.clearBeforeStartNewExplanation();
            SharedData.DataSource = 'File';

            previewAreaControl.showInPreviewArea(file);

            previewAreaControl.lamdaEntryBeforeGcsUpload();
            sendRecvManager.uploadGcsAndInitAIModel(previewAreaControl.lamdaOnGcsUploadFinish);

            previewAreaControl.hideVideoShowCanvas();

        })
        .catch((err) => {
            errorManager.showError(2053, err);
        });
    }

    async pasteFromClipboard() {
        try {
            // Reset the width & height.
            this.pdfCanvas.width = 300;
            this.pdfCanvas.height = 300;

            const clipboardItems = await navigator.clipboard.read();

            for (const item of clipboardItems) {
                if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {

                    const imageType = item.types.find(type => type.startsWith('image/'));
                    if (imageType) {
                        // Get the image blob from the clipboard
                        const blob = await item.getType(imageType);
                        this.pasteImage(blob);
                    }

                } else if (item.types.includes('text/plain')) {

                    const blob = await item.getType('text/plain');
                    const text = await blob.text(); // Get text from clipboard
                    this.pasteText(text);

                } else {
                    errorManager.showError(2055);
                }
            }
        } catch (err) {
            errorManager.showError(2056, err);
        }
    }

    triggerTapPaintRegionStart() {
        if ( this.touchPaintRegionStartOrEndIndicator != 'START' ) {
            mouseControl.startTouchPaint();
            this.touchPaintRegionStartOrEndIndicator = 'START';
            return true;
        }
        return false;
    }

    triggerTapPaintRegionEnd() {
        if ( this.touchPaintRegionStartOrEndIndicator === 'START' ) {
            mouseControl.endTouchPaint();
            this.touchPaintRegionStartOrEndIndicator = 'END';
            return true;
        }
        return false;
    }

    onTouchPaintStartEnd() {
        if ( !this.triggerTapPaintRegionStart() ) {
            this.triggerTapPaintRegionEnd();
        }
    }

    onAction(actionIndex) {

        switch (actionIndex) {
            case 1:
                this.triggerTapPaintRegionEnd();
                this.onExplainRegion();
                break;
            case 2:
                mouseControl.clearTouchPaint();
                this.onPopInOut();
                break;
            case 3:
                this.onTouchPaintStartEnd();
                break;
            case 4:
                this.onMCQ();
                break;
            case 5:
                this.onPaste();
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



