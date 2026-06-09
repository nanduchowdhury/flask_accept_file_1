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

            const formatRecursive = (obj, level = 1) => {
                let html = '';
                const tab = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);
                const childTab = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level + 1);

                if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                    for (const [key, value] of Object.entries(obj)) {
                        html += `<div>${tab}<strong>${key}</strong>: `;
                        if (Array.isArray(value)) {
                            html += `<br>`;
                            value.forEach((item, index) => {
                                html += `<div>${childTab}${index + 1}. ${formatRecursive(item, level + 2)}</div>`;
                            });
                        } else if (typeof value === 'object' && value !== null) {
                            html += `<br>${formatRecursive(value, level + 1)}`;
                        } else {
                            html += `${value}`;
                        }
                        html += `</div><br>`; // Newline after writing all values for a key
                    }
                } else if (Array.isArray(obj)) {
                    obj.forEach((item, index) => {
                        html += `<div>${tab}${index + 1}. ${formatRecursive(item, level + 1)}</div>`;
                    });
                } else {
                    html += `${obj}`;
                }
                return html;
            };

            tabContentDiv.innerHTML = formatRecursive(data);
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