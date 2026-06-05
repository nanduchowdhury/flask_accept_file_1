"use strict";

class StockAnalysisMain {
    constructor() {
        this.popoutMgr = new PopoutManager('genericPopoutId');
    }

    createTabContent(tabContent, className) {
        let tabContentDiv = document.createElement('div');
        tabContentDiv.className = className;
        tabContentDiv.innerHTML = tabContent;

        tabContentDiv.style.fontFamily = 'Arial';

        return tabContentDiv;
    }

    openSectorPage(sector) {
        console.log("Opening sector analysis for:", sector);

        // Using dummy data as per original implementation
        const result1 = "Dummy text data...";

        this.popoutMgr.clear();
        
        let tabContentDiv = this.createTabContent(result1, 'tabContent active');
        this.popoutMgr.appendItem(tabContentDiv);

        this.popoutMgr.showPopout();
    }
}