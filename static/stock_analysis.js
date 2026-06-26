"use strict";

class StockAnalysisMain {
    constructor() {
        this.popoutMgr = new PopoutManager('genericPopoutId');
    }

    computeRiseOrDecline(data, target_pct) {
        const segments = [];
        if (!data || data.length < 2) return segments;

        let startIdx = 0;
        const isRiseMode = target_pct > 0;
        const abs_target_pct = Math.abs(target_pct);

        for (let i = 1; i < data.length; i++) {
            const currentPrice = parseFloat(data[i].stock_price);
            const prevPrice = parseFloat(data[i - 1].stock_price);

            // Trend breaks if direction changes against our mode
            const trendBroken = isRiseMode ? (currentPrice < prevPrice) : (currentPrice > prevPrice);

            if (trendBroken) {
                const endIdx = i - 1;
                if (endIdx > startIdx) {
                    const startPrice = parseFloat(data[startIdx].stock_price);
                    const endPrice = parseFloat(data[endIdx].stock_price);
                    const change = isRiseMode ? ((endPrice - startPrice) / startPrice) * 100 
                                             : ((startPrice - endPrice) / startPrice) * 100;
                    if (change >= abs_target_pct) segments.push({ start: startIdx, end: endIdx });
                }
                startIdx = i;
            } else if (i === data.length - 1) {
                const startPrice = parseFloat(data[startIdx].stock_price);
                const endPrice = currentPrice;
                const change = isRiseMode ? ((endPrice - startPrice) / startPrice) * 100 
                                         : ((startPrice - endPrice) / startPrice) * 100;
                if (change >= abs_target_pct) segments.push({ start: startIdx, end: i });
            }
        }
        return segments;
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

    createStockPricePlot(tabContent, className) {
        let tabContentDiv = document.createElement('div');
        tabContentDiv.className = className;
        tabContentDiv.style.padding = '20px';
        tabContentDiv.style.backgroundColor = '#fff';

        try {
            let data = JSON.parse(tabContent);
            
            // Normalize data: map 'Date' to 'date_time' and 'Close' to 'stock_price' if needed
            if (Array.isArray(data) && data.length > 0 && data[0].Date && data[0].Close) {
                data = data.map(item => ({
                    date_time: item.Date,
                    stock_price: item.Close
                }));
            }

            // Check for valid data for plotting
            if (!Array.isArray(data) || data.length === 0 || data[0].stock_price === undefined) {
                tabContentDiv.innerHTML = this._generateHtml(data, 1, true, []);
                return tabContentDiv;
            }

            const declineDropdown = document.getElementById("analysis-decline-dropdown");
            const target_pct = declineDropdown ? parseFloat(declineDropdown.value) : -2.0;
            let analysisSegments = this.computeRiseOrDecline(data, target_pct);
            

            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 400;
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            canvas.style.border = '1px solid #ddd';
            canvas.style.marginTop = '10px';
            tabContentDiv.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            const padding = { top: 50, right: 30, bottom: 80, left: 80 };
            const chartWidth = canvas.width - padding.left - padding.right;
            const chartHeight = canvas.height - padding.top - padding.bottom;

            const prices = data.map(d => parseFloat(d.stock_price)).filter(p => !isNaN(p));
            const dates = data.map(d => d.date_time);

            const minP = Math.min(...prices);
            const maxP = Math.max(...prices);
            const minPrice = minP * 0.99;
            const maxPrice = maxP === minP ? maxP + 1 : maxP * 1.01;
            const priceRange = maxPrice - minPrice;

            // Chart area background
            ctx.fillStyle = '#fcfcfc';
            ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

            // Y-axis grid & labels
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'right';
            const yTicks = 6;
            for (let i = 0; i < yTicks; i++) {
                const y = padding.top + chartHeight - (i / (yTicks - 1)) * chartHeight;
                const price = minPrice + (i / (yTicks - 1)) * priceRange;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + chartWidth, y);
                ctx.stroke();
                ctx.fillText(price.toFixed(2), padding.left - 10, y + 4);
            }

            // Plot line
            const baseLineWidth = 2;
            ctx.lineWidth = baseLineWidth;
            ctx.lineJoin = 'round';
            for (let i = 1; i < data.length; i++) {
                const prev = data[i - 1];
                const curr = data[i];

                const x1 = data.length > 1 ? padding.left + ((i - 1) / (data.length - 1)) * chartWidth : padding.left + chartWidth / 2;
                const y1 = padding.top + chartHeight - ((parseFloat(prev.stock_price) - minPrice) / priceRange) * chartHeight;

                const x2 = data.length > 1 ? padding.left + (i / (data.length - 1)) * chartWidth : padding.left + chartWidth / 2;
                const y2 = padding.top + chartHeight - ((parseFloat(curr.stock_price) - minPrice) / priceRange) * chartHeight;

                const isHighlighted = (analysisSegments || []).some(seg => i > seg.start && i <= seg.end);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineWidth = isHighlighted ? baseLineWidth + 1 : baseLineWidth;
                ctx.strokeStyle = isHighlighted ? (target_pct > 0 ? '#28a745' : 'red') : 'black';
                ctx.stroke();
            }

            // X-axis labels (Dates)
            ctx.fillStyle = '#333';
            ctx.textAlign = 'left';
            const xLabelsCount = Math.min(dates.length, 5);
            for (let i = 0; i < xLabelsCount; i++) {
                const idx = xLabelsCount > 1 ? Math.floor(i * (dates.length - 1) / (xLabelsCount - 1)) : 0;
                const x = dates.length > 1 ? padding.left + (idx / (dates.length - 1)) * chartWidth : padding.left + chartWidth / 2;
                ctx.save();
                ctx.translate(x, padding.top + chartHeight + 15);
                ctx.rotate(Math.PI / 6);
                ctx.fillText(dates[idx] || '', 0, 0);
                ctx.restore();
            }
        } catch (e) {
            tabContentDiv.innerHTML = "Plot Generation Error: " + e.message;
        }
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
                let key_temp = this._remove_underscore(key);
                html += `<div>${tab}<strong style="color: blue;">${key_temp}</strong>: `;

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

    _remove_underscore(d) {
        let d1 = d.replace(/_/g, ' ');
        return d1;
    }

    _generateTabbedHtml(key, value, level, negativeValuesInRed, listOfKeysToBeShownInTab) {
        const tab = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);

        let key_temp = this._remove_underscore(key);
        let html = `<div>${tab}<strong style="color: blue;">${key_temp}</strong>: </div>`;

        const stockEntries = Object.entries(value);
        const uniqueId = 'tabs_' + Math.random().toString(36).substr(2, 9);

        html += `<div style="margin-left: ${level * 20}px; margin-bottom: 20px;">`;
        // Tab buttons
        html += `<div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">`;
        stockEntries.forEach(([stockName], index) => {
            let stockName_temp = this._remove_underscore(stockName);
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
                        ${stockName_temp}
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
                    let subKey_temp = this._remove_underscore(subKey);
                    html += `<strong>${subKey_temp}</strong>: ${subVal} `;
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

    openDiiFiiPage() {

        let sector = "DII_FII";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['DII_FII_sector_keys']

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.popoutMgr.showPopout();
        });
    }

    openGlobalCuesPage() {

        let sector = "global_cues_impact";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['sectors']

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.popoutMgr.showPopout();
        });
    }

    openSectorWeightsPage() {

        let sector = "sector_weights";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['sectors']

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.popoutMgr.showPopout();
        });
    }

    openIndiaEconomyPage() {

        let sector = "india_economy";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['parameters']

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.popoutMgr.showPopout();
        });
    }

    openStockAnalysisPage(stockName) {
        const monthsDropdown = document.getElementById("analysis-months-dropdown");
        const period = monthsDropdown ? monthsDropdown.value : "12";
        const data = { type: 'stock', name: stockName, period: period };
        basicInitializer.makeServerRequest('/general_stock_analysis_info', data, (response) => {
            const result1 = response.info || "No analysis data available.";
            this.popoutMgr.clear();

            const headerJson = this._generatePlotHeaderInfoJson(stockName, period);
            let headerTab = this.createTabContent(headerJson, 'tabContent active', false, []);
            headerTab.style.marginLeft = '20px';
            headerTab.style.marginTop = '15px';
            this.popoutMgr.appendItem(headerTab);

            let tabContentDiv_1 = this.createStockPricePlot(result1, 'tabContent active');
            this.popoutMgr.appendItem(tabContentDiv_1);

            const insightsHeader = document.createElement('h3');
            insightsHeader.innerText = "Stock Insights";
            insightsHeader.style.marginLeft = '20px';
            insightsHeader.style.fontFamily = 'Arial';
            this.popoutMgr.appendItem(insightsHeader);

            let insights_xml = this.getStockPriceInsights(result1);
            let tabContentDiv_2 = this.createTabContent(insights_xml, 'tabContent active', true, []);
            this.popoutMgr.appendItem(tabContentDiv_2);


            this.popoutMgr.showPopout();
        }, (error) => {
            errorManager.showError(2044, error);
        });
    }

    _generatePlotHeaderInfoJson(stockName, period) {
        const declineDropdown = document.getElementById("analysis-decline-dropdown");
        const analysisTypeText = declineDropdown ? declineDropdown.options[declineDropdown.selectedIndex].text : "N/A";

        return JSON.stringify({
            "Stock": stockName,
            "Months": period,
            "Analysis_type": analysisTypeText
        });
    }

    handleTickerSuggestions(inputElement, suggestionsElement, tickers) {
        const query = inputElement.value.toUpperCase().trim();
        suggestionsElement.innerHTML = '';

        if (query.length === 0) return;

        // Filter tickers that contain the search query
        const matches = tickers.filter(ticker => 
            ticker.toUpperCase().includes(query)
        );

        if (matches.length > 0) {
            // Limit suggestions to improve performance (showing top 15)
            matches.slice(0, 15).forEach(match => {
                const option = document.createElement('option');
                option.value = match;
                suggestionsElement.appendChild(option);
            });
        } else {
            const noMatchOption = document.createElement('option');
            noMatchOption.value = '--no matches--';
            suggestionsElement.appendChild(noMatchOption);
        }
    }

    getStockPriceInsights(result1) {
        let data;
        try {
            data = JSON.parse(result1);
        } catch (e) {
            return JSON.stringify({ error: "Invalid data format" });
        }

        if (!Array.isArray(data) || data.length === 0) {
            return JSON.stringify({ info: "No data available for insights" });
        }

        // Normalize property names and filter valid entries
        const items = data.map(d => ({
            price: parseFloat(d.Close || d.stock_price || 0),
            date: d.Date || d.date_time || ""
        })).filter(d => !isNaN(d.price) && d.date !== "");

        if (items.length === 0) return JSON.stringify({ info: "Insufficient data" });

        let max = items[0], min = items[0], total = 0;
        let upDays = 0, downDays = 0;
        const weeklyGroups = {};

        items.forEach((item, index) => {
            if (item.price > max.price) max = item;
            if (item.price < min.price) min = item;
            total += item.price;

            if (index > 0) {
                if (item.price > items[index - 1].price) upDays++;
                else if (item.price < items[index - 1].price) downDays++;
            }

            let d = this._parseStockDate(item.date);

            const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
            if (!weeklyGroups[monday]) weeklyGroups[monday] = [];
            weeklyGroups[monday].push(item.price);
        });

        const returnPct = ((items[items.length - 1].price - items[0].price) / items[0].price) * 100;
        const mappedItems = items.map(it => ({ stock_price: it.price }));
        const countSegments = (pct) => this.computeRiseOrDecline(mappedItems, pct).length;

        const avg_every_week = [];
        const sortedWeeks = Object.keys(weeklyGroups).sort();
        
        for (let i = 0; i < sortedWeeks.length; i++) {
            const currentWeekPrices = weeklyGroups[sortedWeeks[i]];
            const lastOfCurrent = currentWeekPrices[currentWeekPrices.length - 1];
            const prevClose = i === 0 ? currentWeekPrices[0] : weeklyGroups[sortedWeeks[i - 1]].slice(-1)[0];
            
            const pct = ((lastOfCurrent - prevClose) / prevClose) * 100;

            // Convert YYYY-MM-DD back to Date object for formatting
            const [y, m, dayPart] = sortedWeeks[i].split('-').map(Number);
            const formattedDate = this._formatStockDate(new Date(y, m - 1, dayPart));
            avg_every_week.push(`${formattedDate}     ${pct.toFixed(2)}%`);
        }

        const insights = {
            highest_price: `${max.price.toFixed(2)} on ${max.date}`,
            lowest_price: `${min.price.toFixed(2)} on ${min.date}`,
            avg_price: (total / items.length).toFixed(2),
            return_pct: `${returnPct.toFixed(2)}%`,
            number_of_up_days: upDays,
            number_of_down_days: downDays,
            continuous_fall_counts: [
                `2%     ${countSegments(-2)}`,
                `5%     ${countSegments(-5)}`,
                `7%     ${countSegments(-7)}`,
                `10%    ${countSegments(-10)}`
            ],
            continuous_rise_counts: [
                `2%     ${countSegments(2)}`,
                `5%     ${countSegments(5)}`,
                `7%     ${countSegments(7)}`,
                `10%    ${countSegments(10)}`
            ],
            avg_return_every_week: avg_every_week
        };

        return JSON.stringify(insights);
    }

    _parseStockDate(dateStr) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // Handle DDMonYY (e.g., 04Jun26)
        if (dateStr.length === 7 && !isNaN(dateStr[0])) {
            const dayNum = parseInt(dateStr.substring(0, 2));
            const monStr = dateStr.substring(2, 5);
            const yrNum = 2000 + parseInt(dateStr.substring(5, 7));
            return new Date(yrNum, monthNames.indexOf(monStr), dayNum);
        }
        // Fallback to standard JS date parsing
        return new Date(dateStr);
    }

    _formatStockDate(dateObj) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        const monStr = monthNames[dateObj.getMonth()];
        const yrStr = String(dateObj.getFullYear()).slice(-2);
        return `${dayStr}${monStr}${yrStr}`;
    }
}