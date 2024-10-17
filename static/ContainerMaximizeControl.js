"use strict";

class ContainerMaximizeManager {
    constructor() {

        this.result1 = document.getElementById('result1');
        this.result2 = document.getElementById('result2');
        this.roughArea = document.getElementById('roughArea');
        this.previewArea = document.getElementById('previewArea');
        this.previewAndRoughContainer = document.getElementById('PreviewAndRoughAreaContainer');
        this.resultsContainer = document.getElementById('resultsContainer');

        // Bind methods to the class instance
        this.revertLayout = this.revertLayout.bind(this);
        this.handleEscKey = this.handleEscKey.bind(this);


        this.addMaximizeFeatureOnDblClick(this.result1);
        this.addMaximizeFeatureOnDblClick(this.result2);
        this.addMaximizeFeatureOnDblClick(this.previewArea);
        this.addMaximizeFeatureOnDblClick(this.roughArea);

        this.isMaximized = false;
    }

    isAnyContainerMaximized() {
        return this.isMaximized;
    }

    addMaximizeFeatureOnDblClick(element) {
        element.addEventListener('dblclick', () => {
          this.maximizeArea(element);
        });
    }

    popOutPreviewArea() {
      this.maximizeArea(this.previewArea);
    }

    popOutRoughArea() {
      this.maximizeArea(this.roughArea);
    }

    popOutResult1Area() {
      this.maximizeArea(this.result1);
    }

    popOutResult2Area() {
      this.maximizeArea(this.result2);
    }

    maximizeArea(container) {
        container.classList.add('previewResultRoughAreaMaximized');
        this.previewAndRoughContainer.classList.add('previewResultRoughAreaHidden');
        this.resultsContainer.classList.add('previewResultRoughAreaHidden');
        this.isMaximized = true;
        // Close when clicking outside or pressing Esc
        document.addEventListener('keydown', this.handleEscKey);
    }

    revertLayout() {
        document.querySelectorAll('.previewResultRoughAreaMaximized').forEach(area => {
          area.classList.remove('previewResultRoughAreaMaximized');
        });
        this.previewAndRoughContainer.classList.remove('previewResultRoughAreaHidden');
        this.resultsContainer.classList.remove('previewResultRoughAreaHidden');
        
        this.isMaximized = false;
        mouseControl.clearSelectionRegion();

        document.removeEventListener('keydown', this.handleEscKey);
    }

    // Handle pressing the Esc key
    handleEscKey(event) {
        if (event.key === 'Escape') {
          this.revertLayout();
        }
    }  

}
