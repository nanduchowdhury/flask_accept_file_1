"use strict";

class StockAnalysisMain {
    constructor() {
        this.popoutMgr = new PopoutManager('genericPopoutId');
    }

    createTabContent(tabContent, className) {
        let tabContentDiv = document.createElement('div');
        tabContentDiv.className = className;

        try {
            const data = JSON.parse(tabContent);
            let formattedHtml = '';
            for (const [key, value] of Object.entries(data)) {
                formattedHtml += `<strong>${key}</strong><br>`;
                if (Array.isArray(value)) {
                    formattedHtml += `<ol style="margin-top: 5px;">`;
                    value.forEach(item => {
                        formattedHtml += `<li>${item}</li>`;
                    });
                    formattedHtml += `</ol><br>`;
                } else {
                    formattedHtml += `${value}<br><br>`;
                }
            }
            tabContentDiv.innerHTML = formattedHtml;
        } catch (e) {
            // Fallback if tabContent is not valid JSON
            tabContentDiv.innerHTML = tabContent;
        }

        tabContentDiv.style.fontFamily = 'Arial';

        return tabContentDiv;
    }

    getSectorAnalysisInfo(sector, callback) {
        const data = { sector: sector };
        basicInitializer.makeServerRequest('/stock_sector_analysis_info', data, (response) => {
            callback(response.info);
        }, (error) => {
            errorManager.showError(2044, error);
        });
    }

    openSectorPage(sector) {
        console.log("Opening sector analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();
            let tabContentDiv = this.createTabContent(result1, 'tabContent active');
            this.popoutMgr.appendItem(tabContentDiv);
            this.popoutMgr.showPopout();
        });
    }
}