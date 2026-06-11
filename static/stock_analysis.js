"use strict";

class StockAnalysisMain {
    constructor() {
        this.popoutMgr = new PopoutManager('genericPopoutId');
    }

    hasNegativeValue(item) {
        const checkNegative = (val) => {
            if (typeof val === 'number' && val < 0) return true;
            if (typeof val === 'string' && /-\d/.test(val)) return true;
            return false;
        };

        if (typeof item === 'object' && item !== null) {
            return Object.values(item).some(checkNegative);
        }
        return checkNegative(item);
    }

    createTabContent(tabContent, className, negativeValuesInRed, listOfKeysToBeShownInTab) {
        let tabContentDiv = document.createElement('div');
        tabContentDiv.className = className;

        
        try {
            const data = JSON.parse(tabContent);
            tabContentDiv.innerHTML = this._generateHtml(data, 1, negativeValuesInRed, listOfKeysToBeShownInTab);
        } catch (e) {
            tabContentDiv.innerHTML = tabContent;
        }

        tabContentDiv.style.fontFamily = 'Arial';
        return tabContentDiv;
    }

    _generateHtml(obj, level = 1, negativeValuesInRed, listOfKeysToBeShownInTab) {
        let html = '';
        const tab = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);

        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            for (const [key, value] of Object.entries(obj)) {
                if (listOfKeysToBeShownInTab.includes(key) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    html += this._generateTabbedHtml(key, value, level, negativeValuesInRed, listOfKeysToBeShownInTab);
                    continue;
                }
                html += `<div>${tab}<strong style="color: blue;">${key}</strong>: `;
                if (Array.isArray(value)) {
                    html += `<br>` + this._generateTableHtml(value, level, negativeValuesInRed);
                } else if (typeof value === 'object' && value !== null) {
                    html += `<br>${this._generateHtml(value, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab)}`;
                } else {
                    html += `${value}`;
                }
                html += `</div><br>`;
            }
        } else if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                html += `<div>${tab}${index + 1}. ${this._generateHtml(item, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab)}</div>`;
            });
        } else {
            html += `${obj}`;
        }
        return html;
    }

    _generateTabbedHtml(key, value, level, negativeValuesInRed, listOfKeysToBeShownInTab) {
        const tab = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);
        let html = `<div>${tab}<strong style="color: blue;">${key}</strong>: </div>`;
        const stockEntries = Object.entries(value);
        const uniqueId = 'tabs_' + Math.random().toString(36).substr(2, 9);

        html += `<div style="margin-left: ${level * 20}px; margin-bottom: 20px;">`;
        // Tab buttons
        html += `<div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">`;
        stockEntries.forEach(([stockName], index) => {
            const activeStyle = index === 0 ? 'background-color: #007bff; color: white; font-weight: bold;' : 'background-color: #f8f9fa; color: #007bff;';
            html += `<button class="btn-${uniqueId}" 
                        onclick="
                            (function(btn){
                                const container = btn.parentElement.parentElement;
                                container.querySelectorAll('.content-${uniqueId}').forEach(c => c.style.display = 'none');
                                container.querySelectorAll('.btn-${uniqueId}').forEach(b => {
                                    b.style.backgroundColor = '#f8f9fa';
                                    b.style.color = '#007bff';
                                    b.style.fontWeight = 'normal';
                                });
                                document.getElementById('content-${uniqueId}-${index}').style.display = 'block';
                                btn.style.backgroundColor = '#007bff';
                                btn.style.color = 'white';
                                btn.style.fontWeight = 'bold';
                            })(this)"
                        style="padding: 2px 6px; font-size: 10px; cursor: pointer; border: 1px solid #007bff; border-radius: 4px; transition: all 0.2s; flex: 0 0 auto; width: auto; white-space: nowrap; ${activeStyle}">
                        ${stockName}
                     </button>`;
        });
        html += `</div>`;

        // Tab contents
        stockEntries.forEach(([stockName, stockData], index) => {
            const display = index === 0 ? 'block' : 'none';
            html += `<div id="content-${uniqueId}-${index}" class="content-${uniqueId}" style="display: ${display}; border: 1px solid #dee2e6; padding: 15px; border-radius: 4px; background-color: #fff;">`;
            html += this._generateHtml(stockData, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab);
            html += `</div>`;
        });
        html += `</div>`;
        return html;
    }

    _generateTableHtml(value, level, negativeValuesInRed) {
        let html = `<table style="border-collapse: collapse; width: auto; margin-left: ${level * 20}px; border: 1px solid blue;">`;
        value.forEach((item, index) => {
            const bgColor = index % 2 === 0 ? 'white' : 'lightblue';
            const isNegative = this.hasNegativeValue(item);
            const textColor = (negativeValuesInRed && isNegative) ? 'red' : 'black';
            
            html += `<tr style="border-bottom: 1px solid blue; background-color: ${bgColor}; color: ${textColor};">`;
            if (typeof item === 'object' && item !== null) {
                html += `<td style="padding: 8px; border-right: 1px solid blue;">`;
                for (const [subKey, subVal] of Object.entries(item)) {
                    html += `<strong>${subKey}</strong>: ${subVal} `;
                }
                html += `</td>`;
            } else {
                html += `<td style="padding: 8px; border-right: 1px solid blue;">${item}</td>`;
            }
            html += `</tr>`;
        });
        html += `</table>`;
        return html;
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

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['stocks_in_momentum']
            let tmp = "nifty_" + sector + "_timeline"
            tmp = tmp.replace('_sector', '');
            tmp = tmp.toLowerCase();
            listOfKeysToBeShownInTab.push(tmp);

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.popoutMgr.showPopout();
        });
    }
}