"use strict";

/**
 * StockUIBuilder handles all HTML generation, tab-content, 
 * table creation, and canvas-based plotting logic.
 */
class StockUIBuilder {
    constructor(popoutMgr, stockEventColors) {
        this.popoutMgr = popoutMgr;
        this.STOCK_EVENT_COLORS = stockEventColors;
    }

    /**
     * Virtual method called when a tab is clicked or generated.
     * Returns HTML content to be prepended to the tab content area.
     */
    onTabClicked(tabName, parentKey) {
        if (parentKey !== 'related_stocks') return null;
        return `<div style="background-color: #fff3cd; color: #856404; padding: 10px; border: 1px solid #ffeeba; margin-bottom: 15px; border-radius: 4px; font-size: 12px;"><strong>[DEBUG]</strong> onTabClicked hook triggered for: <b>${tabName}</b> (parent: <b>${parentKey}</b>)</div>`;
    }

    /**
     * Recursively formats JSON into an indented HTML tree.
     */
    _getFormattedScrollItems(obj, level = 0) {
        let html = "";
        const indent = level * 16;

        for (const [key, value] of Object.entries(obj)) {
            const label = key.replace(/_/g, " ");
            if (value !== null && typeof value === "object" && !Array.isArray(value)) {
                html += `<div style="margin-left:${indent}px; margin-top:6px; color:#0066cc; font-size:11px;">${label}</div>`;
                html += this._getFormattedScrollItems(value, level + 1);
            } else if (Array.isArray(value)) {
                html += `<div style="margin-left:${indent}px; color:#0066cc; font-size:11px; margin-top:5px;">${label}</div>`;
                value.forEach(item => {
                    if (item !== null && typeof item === "object") {
                        html += this._getFormattedScrollItems(item, level + 1);
                    } else {
                        html += `<div style="margin-left:${(level + 1) * 16}px; font-size:11px; color:#555; padding:2px 0;">• ${item}</div>`;
                    }
                });
            } else {
                html += `<div style="margin-left:${indent}px; font-size:11px; padding:2px 0; color:#555;">
                            <span style="color:#007bff;">${label}</span>: ${value}
                        </div>`;
            }
        }
        return html;
    }

    _safeParsePriceData(info) {
        if (!info || info === "NONE" || info === "N/A") return [];
        if (typeof info === 'object') return info.price_data || [];
        try {
            return JSON.parse(info);
        } catch (e) {
            console.warn("Failed to parse stock price data:", e);
            return [];
        }
    }

    createTabContent(tabContent, className, negativeValuesInRed, 
                      listOfKeysToBeShownInTab, arrayKeyWithColors, listOfKeysToBreakAtFullstop = [], listOfKeysToTreatAsUrl = []) {
        let tabContentDiv = document.createElement('div');
        tabContentDiv.className = className;
        try {
            const data = JSON.parse(tabContent);
            tabContentDiv.innerHTML = this._generateHtml(data, 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors, listOfKeysToBreakAtFullstop, listOfKeysToTreatAsUrl);

            // Initialize lazy loading for initially active tabs (the first button in each group)
            tabContentDiv.querySelectorAll('button[data-tab-name]:first-child').forEach(btn => {
                this._loadDynamicTabContent(btn);
            });

            // Hook to call the virtual method when a tab button is clicked
            tabContentDiv.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-tab-name]');
                if (button) {
                    this._loadDynamicTabContent(button);
                }
            });
        } catch (e) {
            tabContentDiv.innerHTML = tabContent;
        }
        tabContentDiv.style.fontFamily = 'Arial';
        return tabContentDiv;
    }

    /**
     * Internal helper to lazy-load onTabClicked content into the corresponding tab div.
     */
    _loadDynamicTabContent(button) {
        const tabName = button.getAttribute('data-tab-name');
        const parentKey = button.getAttribute('data-parent-key');
        const btnClass = Array.from(button.classList).find(c => c.startsWith('btn-'));
        if (!btnClass) return;

        // Extract the uniqueId to find the associated content div
        const uniqueId = btnClass.replace('btn-', '');
        const groupButtons = Array.from(button.parentElement.querySelectorAll(`.btn-${uniqueId}`));
        const index = groupButtons.indexOf(button);
        const contentDiv = document.getElementById(`content-${uniqueId}-${index}`);

        // Prepend content only if it hasn't been loaded for this tab yet
        if (contentDiv && !contentDiv.dataset.dynamicLoaded) {
            const extraHtml = this.onTabClicked(tabName, parentKey);
            if (extraHtml) contentDiv.insertAdjacentHTML('afterbegin', extraHtml);
            contentDiv.dataset.dynamicLoaded = "true";
        }
    }

    appendDisclaimer() {
        const disclaimer = document.createElement('div');
        disclaimer.style.fontSize = '11px';
        disclaimer.style.color = 'gray';
        disclaimer.style.marginTop = '20px';
        disclaimer.style.padding = '0 20px 20px 20px';
        disclaimer.style.lineHeight = '1.5';
        disclaimer.innerHTML = `<hr>Disclaimer: BluePayload provides market data, analytics, and educational information only. Nothing on this website constitutes investment advice, a recommendation to buy or sell securities, or financial, legal, or tax advice. Users should perform their own research and consult a qualified financial professional before making investment decisions.`;
        this.popoutMgr.appendItem(disclaimer);
    }

    createStockPricePlot(data, className, analysisSegments, highlightPointsOnPlot = [], 
                         negFillColor = 'rgba(231, 63, 181, 0.91)', 
                         posFillColor = 'rgba(74, 138, 248, 0.8)') {
        let tabContentDiv = document.createElement('div');
        tabContentDiv.className = className;
        tabContentDiv.style.padding = '20px';
        tabContentDiv.style.backgroundColor = '#fff';

        try {
            if (!Array.isArray(data) || data.length === 0 || data[0].stock_price === undefined) {
                tabContentDiv.innerHTML = this._generateHtml(data, 1, true, []);
                this.appendDisclaimer(); // This appends to popoutMgr, which might be intended
                return tabContentDiv;
            }

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

            const render = (hoverIdx = -1) => {
                const prices = data.map(d => parseFloat(d.stock_price)).filter(p => !isNaN(p));
                const dates = data.map(d => d.date_time);
                if (prices.length < 2) return;
                const minP = Math.min(...prices);
                const maxP = Math.max(...prices);
                const minPrice = minP * 0.99;
                const maxPrice = maxP === minP ? maxP + 1 : maxP * 1.01;
                const priceRange = maxPrice - minPrice;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fcfcfc';
                ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

                this._drawVolumeBars(ctx, data, padding, chartWidth, chartHeight);
                this._drawYAxis(ctx, padding, chartWidth, chartHeight, minPrice, priceRange);
                this._drawAreaFill(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, analysisSegments, negFillColor, posFillColor);
                this._drawPlotLine(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, analysisSegments);
                this._drawXAxis(ctx, dates, padding, chartWidth, chartHeight);
                this._highlightPointsOnPlot(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, highlightPointsOnPlot);
                this._drawCrosshairsAndTooltip(ctx, data, hoverIdx, padding, chartWidth, chartHeight, minPrice, priceRange, canvas.width);
            };
            this._setupPlotInteractions(canvas, data, padding, chartWidth, render);
            render();
        } catch (e) {
            tabContentDiv.innerHTML = "Plot Generation Error: " + e.message;
        }
        return tabContentDiv;
    }

    _drawVolumeBars(ctx, data, padding, chartWidth, chartHeight) {
        const maxVol = Math.max(...data.map(d => parseFloat(d.volume || 0)));
        if (maxVol > 0) {
            const volAlpha = 0.4;
            const barWidth = Math.max(1, (chartWidth / data.length) * 0.8);
            for (let i = 0; i < data.length; i++) {
                const vol = parseFloat(data[i].volume || 0);
                const vHeight = (vol / maxVol) * (chartHeight * 0.35);
                const x = data.length > 1 ? padding.left + (i / (data.length - 1)) * chartWidth : padding.left + chartWidth / 2;
                const price = parseFloat(data[i].stock_price);
                const prevPrice = i > 0 ? parseFloat(data[i - 1].stock_price) : price;
                ctx.fillStyle = price >= prevPrice ? `rgba(40, 167, 69, ${volAlpha})` : `rgba(220, 53, 69, ${volAlpha})`;
                ctx.fillRect(x - barWidth / 2, padding.top + chartHeight - vHeight, barWidth, vHeight);
            }
        }
    }

    _drawYAxis(ctx, padding, chartWidth, chartHeight, minPrice, priceRange) {
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
    }

    _drawXAxis(ctx, dates, padding, chartWidth, chartHeight) {
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
    }

    _drawPlotLine(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, analysisSegments) {
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
            const segmentMatch = (analysisSegments || []).find(seg => i > seg.start && i <= seg.end);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = segmentMatch ? baseLineWidth + 1 : baseLineWidth;
            ctx.strokeStyle = segmentMatch ? segmentMatch.color : 'black';
            ctx.stroke();
        }
    }

    _drawCrosshairsAndTooltip(ctx, data, hoverIdx, padding, chartWidth, chartHeight, minPrice, priceRange, canvasWidth) {
        if (hoverIdx >= 0 && hoverIdx < data.length) {
            const item = data[hoverIdx];
            const x = data.length > 1 ? padding.left + (hoverIdx / (data.length - 1)) * chartWidth : padding.left + chartWidth / 2;
            const y = padding.top + chartHeight - ((parseFloat(item.stock_price) - minPrice) / priceRange) * chartHeight;
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
            ctx.setLineDash([]);
            const tipLines = [`Date: ${item.date_time}`, `Price: ${parseFloat(item.stock_price).toFixed(2)}`, `Vol: ${item.volume || '0'}`];
            ctx.font = 'bold 11px Arial';
            let maxLineW = 0;
            tipLines.forEach(l => maxLineW = Math.max(maxLineW, ctx.measureText(l).width));
            const tipW = maxLineW + 10;
            const tipH = 45;
            let tipX = x + 10;
            if (tipX + tipW > canvasWidth) tipX = x - tipW - 10;
            let tipY = y - tipH - 10;
            if (tipY < 0) tipY = y + 10;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(tipX, tipY, tipW, tipH);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            tipLines.forEach((l, i) => { ctx.fillText(l, tipX + 5, tipY + 12 + (i * 13)); });
        }
    }

    _setupPlotInteractions(canvas, data, padding, chartWidth, render) {
        const handleInteraction = (e) => {
            const rect = canvas.getBoundingClientRect();
            let clientX;
            if (e.type.startsWith('touch')) {
                if (e.touches.length === 0) return;
                clientX = e.touches[0].clientX;
            } else {
                clientX = e.clientX;
            }
            const x = (clientX - rect.left) * (canvas.width / rect.width);
            if (x >= padding.left && x <= padding.left + chartWidth) {
                const idx = Math.round(((x - padding.left) / chartWidth) * (data.length - 1));
                render(idx);
            } else { render(-1); }
        };
        canvas.addEventListener('mousemove', handleInteraction);
        canvas.addEventListener('mouseleave', () => render(-1));
        canvas.addEventListener('touchstart', handleInteraction, { passive: true });
        canvas.addEventListener('touchmove', handleInteraction, { passive: true });
        canvas.addEventListener('touchend', () => render(-1));
    }

    _drawAreaFill(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, analysisSegments, negFillColor, posFillColor) {
        if (data.length < 2) return;
        const firstPrice = parseFloat(data[0].stock_price);
        const lastPrice = parseFloat(data[data.length - 1].stock_price);
        const baseFillColor = (lastPrice >= firstPrice) ? posFillColor : negFillColor;
        const bottomY = padding.top + chartHeight;
        for (let i = 1; i < data.length; i++) {
            const prev = data[i - 1];
            const curr = data[i];
            const x1 = padding.left + ((i - 1) / (data.length - 1)) * chartWidth;
            const x2 = padding.left + (i / (data.length - 1)) * chartWidth;
            const y1 = padding.top + chartHeight - ((parseFloat(prev.stock_price) - minPrice) / priceRange) * chartHeight;
            const y2 = padding.top + chartHeight - ((parseFloat(curr.stock_price) - minPrice) / priceRange) * chartHeight;
            const segmentMatch = (analysisSegments || []).find(seg => i > seg.start && i <= seg.end);
            let sliceColor = segmentMatch ? segmentMatch.color : baseFillColor;
            const yTop = Math.min(y1, y2);
            if (!Number.isFinite(yTop) || !Number.isFinite(bottomY)) continue;
            const gradient = ctx.createLinearGradient(0, yTop, 0, bottomY);
            ctx.save();
            if (segmentMatch) ctx.globalAlpha = 0.7;
            gradient.addColorStop(0, sliceColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.beginPath();
            ctx.moveTo(x1, bottomY); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, bottomY);
            ctx.closePath(); ctx.fillStyle = gradient; ctx.fill(); ctx.restore();
        }
    }

    _highlightPointsOnPlot(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, highlightPoints) {
        if (!highlightPoints || !Array.isArray(highlightPoints)) return;
        highlightPoints.forEach(item => {
            const idx = data.findIndex(d => d.date_time === item.date);
            if (idx === -1) return;
            const x = data.length > 1 ? padding.left + (idx / (data.length - 1)) * chartWidth : padding.left + chartWidth / 2;
            const y = padding.top + chartHeight - ((parseFloat(data[idx].stock_price) - minPrice) / priceRange) * chartHeight;
            ctx.save();
            ctx.strokeStyle = item.color || 'red';
            ctx.lineWidth = 5; ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, padding.top + chartHeight); ctx.stroke(); ctx.restore();
            const radius = 5; ctx.fillStyle = item.color || 'red';
            ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
        });
    }

    hasNegativeValue(item) {
        const checkNegative = (val) => {
            if (typeof val === 'number' && val < 0) return true;
            if (typeof val === 'string' && /-\d/.test(val)) return true;
            return false;
        };
        if (typeof item === 'object' && item !== null) { return Object.values(item).some(checkNegative); }
        return checkNegative(item);
    }

    _generateHtml(obj, level = 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors, listOfKeysToBreakAtFullstop = [], listOfKeysToTreatAsUrl = []) {
        let html = '';
        const tab = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);
        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            for (const [key, value] of Object.entries(obj)) {
                if (listOfKeysToBeShownInTab.includes(key) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    html += this._generateTabbedHtml(key, value, level, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors, listOfKeysToBreakAtFullstop, listOfKeysToTreatAsUrl);
                    continue;
                }
                let key_temp = this._remove_underscore(key);
                html += `<div>${tab}<span style="display: inline-block; min-width: 150px;"><strong style="color: blue;">${key_temp}</strong></span>&nbsp;&nbsp;:&nbsp;&nbsp;`;
                if (Array.isArray(value)) {
                    if (value.length === 0) { html += `NONE`; } else {
                        const colors = (arrayKeyWithColors && arrayKeyWithColors.key === key) ? arrayKeyWithColors.colors : null;
                        html += `<br>` + this._generateTableHtml(value, level, negativeValuesInRed, colors);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    html += `<br>${this._generateHtml(value, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors, listOfKeysToBreakAtFullstop, listOfKeysToTreatAsUrl)}`;
                } else {
                    const isNegative = negativeValuesInRed && this.hasNegativeValue(value);
                    const colorStyle = isNegative ? 'style="color: red;"' : '';
                    if (listOfKeysToBreakAtFullstop.includes(key) && typeof value === 'string') {
                        const bullets = value.split('.').filter(s => s.trim().length > 0).map(s => `<li>${s.trim()}.</li>`).join('');
                        html += `<ul style="margin-top: 5px; padding-left: 20px;">${bullets}</ul>`;
                    } else if (listOfKeysToTreatAsUrl.includes(key) && typeof value === 'string') {
                        html += `<a href="${value}" target="_blank" style="color: blue; text-decoration: underline;">${value}</a>`;
                    } else { html += `<span ${colorStyle}>${value}</span>`; }
                }
                html += `</div><br>`;
            }
        } else if (Array.isArray(obj)) {
            if (obj.length === 0) { html += `<div>${tab}NONE</div>`; } else {
                obj.forEach((item, index) => {
                    html += `<div>${tab}${index + 1}. ${this._generateHtml(item, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors, listOfKeysToBreakAtFullstop, listOfKeysToTreatAsUrl)}</div>`;
                });
            }
        } else {
            const isNegative = negativeValuesInRed && this.hasNegativeValue(obj);
            const colorStyle = isNegative ? 'style="color: red;"' : '';
            html += `<span ${colorStyle}>${obj}</span>`;
        }
        return html;
    }

    _remove_underscore(d) { return d.replace(/_/g, ' '); }

    _generateTabbedHtml(key, value, level, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors, listOfKeysToBreakAtFullstop = [], listOfKeysToTreatAsUrl = []) {
        const stockEntries = Object.entries(value);
        const uniqueId = 'tabs_' + Math.random().toString(36).substr(2, 9);
        let html = `<div>${'&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level)}<strong style="color: blue;">${this._remove_underscore(key)}</strong>: </div>`;
        html += `<div style="margin-left: ${level * 20}px; margin-bottom: 20px;"><div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">`;
        stockEntries.forEach(([stockName], index) => {
            const activeStyle = index === 0 ? 'background-color: #007bff; color: white; font-weight: bold;' : 'background-color: #f8f9fa; color: #007bff;';
            html += `<button class="btn-${uniqueId}" data-tab-name="${stockName}" data-parent-key="${key}" onclick="(function(btn){ const container = btn.parentElement.parentElement; container.querySelectorAll('.content-${uniqueId}').forEach(c => c.style.display = 'none'); container.querySelectorAll('.btn-${uniqueId}').forEach(b => { b.style.backgroundColor = '#f8f9fa'; b.style.color = '#007bff'; b.style.fontWeight = 'normal'; }); document.getElementById('content-${uniqueId}-${index}').style.display = 'block'; btn.style.backgroundColor = '#007bff'; btn.style.color = 'white'; btn.style.fontWeight = 'bold'; })(this)" style="padding: 2px 6px; font-size: 10px; cursor: pointer; border: 1px solid #007bff; border-radius: 4px; transition: all 0.2s; flex: 0 0 auto; width: auto; white-space: nowrap; ${activeStyle}">${this._remove_underscore(stockName)}</button>`;
        });
        html += `</div>`;
        stockEntries.forEach(([stockName, stockData], index) => {
            const mainContentHtml = this._generateHtml(stockData, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors, listOfKeysToBreakAtFullstop, listOfKeysToTreatAsUrl);
            
            html += `<div id="content-${uniqueId}-${index}" class="content-${uniqueId}" style="display: ${index === 0 ? 'block' : 'none'}; border: 1px solid #dee2e6; padding: 15px; border-radius: 4px; background-color: #fff;">${mainContentHtml}</div>`;
        });
        html += `</div>`; return html;
    }

    _generateTableHtml(value, level, negativeValuesInRed, colors) {
        let html = `<table style="border-collapse: collapse; width: auto; margin-left: ${level * 20}px; border: 1px solid blue;">`;
        let isKeyValueList = false;
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
            const schemaKeys = Object.keys(value[0]);
            if (schemaKeys.length === 1) {
                for (let i = 1; i < value.length; i++) {
                    if (typeof value[i] !== 'object' || value[i] === null || Object.keys(value[i])[0] !== schemaKeys[0]) { isKeyValueList = true; break; }
                }
                if (value.length === 1 && (schemaKeys[0].includes('-') || schemaKeys[0].includes(' ') || !isNaN(schemaKeys[0][0]))) { isKeyValueList = true; }
            }
        }
        if (!isKeyValueList && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
            html += `<tr style="background-color: #eee; font-weight: bold; border-bottom: 2px solid blue;">`;
            Object.keys(value[0]).forEach(key => { html += `<td style="padding: 8px; border-right: 1px solid blue;">${this._remove_underscore(key)}</td>`; });
            html += `</tr>`;
        }
        value.forEach((item, index) => {
            const bgColor = index % 2 === 0 ? 'white' : 'lightblue';
            const isNegative = this.hasNegativeValue(item);
            let textColor = (negativeValuesInRed && isNegative) ? 'red' : 'black';
            if (colors && colors.length > 0) { textColor = colors[index % colors.length]; }
            html += `<tr style="border-bottom: 1px solid blue; background-color: ${bgColor}; color: ${textColor};">`;
            if (typeof item === 'object' && item !== null) {
                if (isKeyValueList) {
                    for (const [subKey, subVal] of Object.entries(item)) {
                        html += `<td style="padding: 8px; border-right: 1px solid blue; font-weight: bold;">${this._remove_underscore(subKey)}</td>`;
                        html += `<td style="padding: 8px; border-right: 1px solid blue; ${/^-?[\d,.]+%?$/.test(subVal.toString()) ? 'text-align: right;' : 'text-align: left;'}">${subVal}</td>`;
                    }
                } else {
                    for (const [subKey, subVal] of Object.entries(item)) {
                        html += `<td style="padding: 8px; border-right: 1px solid blue; ${/^-?[\d,.]+%?$/.test(subVal.toString()) ? 'text-align: right;' : 'text-align: left;'}">${subVal}</td>`;
                    }
                }
            } else { html += `<td style="padding: 8px; border-right: 1px solid blue;">${item}</td>`; }
            html += `</tr>`;
        });
        html += `</table>`; return html;
    }

    _generatePlotHeaderInfoJson(stockName, period) {
        const analysisTypeDropdown = document.getElementById("analysis-type-dropdown");
        const analysisTypeText = analysisTypeDropdown ? analysisTypeDropdown.options[analysisTypeDropdown.selectedIndex].text : "N/A";
        return JSON.stringify({ "Stock": stockName, "Months": period, "Analysis_type": analysisTypeText });
    }
}

/**
 * StockAnalysisUIBuilder extends the base UI builder to fetch
 * and render live stock data when a tab is clicked.
 */ 
class StockAnalysisUIBuilder extends StockUIBuilder {
    constructor(popoutMgr, stockEventColors, dataFetcher, analysisComputer, getStockPriceInsightsFn, getAvgWeeklyReturnFn) {
        super(popoutMgr, stockEventColors);
        this.dataFetcher = dataFetcher; // Function to get data from server
        this.analysisComputer = analysisComputer; // Function to compute segments
        this.getStockPriceInsightsFn = getStockPriceInsightsFn;
        this.getAvgWeeklyReturnFn = getAvgWeeklyReturnFn;
    }

    /**
     * Implements the virtual method to fetch data and render a plot
     * and summary for the selected stock tab.
     */
    onTabClicked(tabName, parentKey) {
        if (parentKey !== 'related_stocks') return null;

        const uniqueId = `dynamic-stock-${Math.random().toString(36).substr(2, 9)}`;
        
        // The method expects a string return for synchronous insertion.
        // We return a placeholder and populate it asynchronously.
        setTimeout(() => {
            const container = document.getElementById(uniqueId);
            if (!container) return;

            const period = "12";
            const analysisType = "ANALYSIS_REGULAR";
            const requestTypes = ['STOCK_BASICS', 'STOCK_SUMMARY'];

            this.dataFetcher(tabName, period, analysisType, requestTypes, (response) => {
                container.innerHTML = '';
                
                if (response.error) {
                    container.innerHTML = `<div style="color:red; font-size:12px;">Error loading ${tabName}: ${response.error}</div>`;
                    return;
                }

                const priceData = this._safeParsePriceData(response.STOCK_BASICS);
                const analysisResult = this.analysisComputer(priceData);

                // 1. Create stock price plot
                const plotDiv = this.createStockPricePlot(analysisResult.data, 'tabContent active', analysisResult.segments, analysisResult.highlightPoints);
                container.appendChild(plotDiv);

                // 2. Put stock summary
                if (response.STOCK_SUMMARY && !response.STOCK_SUMMARY.error) {
                    const summaryTab = this.createTabContent(JSON.stringify(response.STOCK_SUMMARY), 'tabContent active', false, [], null, ['business_summary'], ['website']);
                    container.appendChild(summaryTab);
                }

                // Append stock-price-insights.
                const insightsHeader = document.createElement('h3');
                insightsHeader.innerText = "Stock Insights";
                insightsHeader.style.marginLeft = '20px';
                insightsHeader.style.fontFamily = 'Arial';
                container.appendChild(insightsHeader);
                let insights_xml = this.getStockPriceInsightsFn(JSON.stringify(priceData));
                let insightsTab = this.createTabContent(insights_xml, 'tabContent active', true, []);
                container.appendChild(insightsTab);

                // Append weekly avg return.
                const weeklyReturnHeader = document.createElement('h3');
                weeklyReturnHeader.innerText = "Weekly Average Return";
                weeklyReturnHeader.style.marginLeft = '20px';
                weeklyReturnHeader.style.fontFamily = 'Arial';
                container.appendChild(weeklyReturnHeader);
                let weeklyReturn_xml = this.getAvgWeeklyReturnFn(JSON.stringify(priceData), 12);
                let weeklyReturnTab = this.createTabContent(weeklyReturn_xml, 'tabContent active', true, []);
                container.appendChild(weeklyReturnTab);
            }, (err) => {
                container.innerHTML = `<div style="color:red; font-size:12px;">Failed to fetch data for ${tabName}.</div>`;
            });
        }, 0);

        return `<div id="${uniqueId}" style="padding:10px; font-size:12px; color:#666; font-style:italic;">Loading live performance for ${tabName}...</div>`;
    }
}

class StockAnalysisMain {
    constructor() {
        this.popoutMgr = new PopoutManager('genericPopoutId');

        this.gaTracker = new GoogleAnalytics();

        this.STOCK_EVENT_COLORS = ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'brown', 'teal'];

        this.uiBuilder = new StockAnalysisUIBuilder(
            this.popoutMgr, 
            this.STOCK_EVENT_COLORS, 
            this.getStockDataFromServer.bind(this),
            this.computeAnalysisSegments.bind(this),
            this.getStockPriceInsights.bind(this), // Pass getStockPriceInsights
            this.getAvgWeeklyReturn.bind(this)     // Pass getAvgWeeklyReturn
        );

        this.stockDataCache = new Map();

        this.SELECTED_INDEX_STOCKS = [
            'nifty 50', 'nifty 100', 'nifty bank', 
            'nifty auto', 'nifty pharma', 'nifty metal', 'nifty it', 
            'nifty fmcg', 'nifty realty', 'nifty energy',
            'india vix'
        ];

        this.MAIN_PAGE_STOCK_DEFAULT_TIME_PERIOD = '36';

        this.initMainPagePlotClick();
        this.hideAssistantPointer();
    }

    /**
     * Makes the assistant-pointer disappear after 2 minutes.
     */
    hideAssistantPointer() {
        setTimeout(() => {
            const pointer = document.querySelector('.assistant-pointer');
            if (pointer) pointer.style.display = 'none';
        }, 120000);
    }

    initAnalysisTypeDropdown() {
        const dropdown = document.getElementById('analysis-type-dropdown');
        if (!dropdown) return;

        const options = [
            { value: "ANALYSIS_REGULAR", text: "regular analysis" },
            { value: "ANALYSIS_CONT_DECLINE_2PCT", text: "continous decline 2%" },
            { value: "ANALYSIS_CONT_DECLINE_5PCT", text: "continous decline 5%" },
            { value: "ANALYSIS_CONT_RISE_2PCT", text: "continous rise 2%" },
            { value: "ANALYSIS_CONT_RISE_5PCT", text: "continous rise 5%" },
            { value: "ANALYSIS_DRAWDOWN_5", text: "drawdown 5% from high" },
            { value: "ANALYSIS_RECOVERY", text: "recovery from low" },
            { value: "ANALYSIS_EVENT_TIMELINE", text: "events & news timeline" },
            { value: "ANALYSIS_PEER_COMPARISON", text: "peer comparison" },
            { value: "ANALYSIS_WEEKLY_AVG_RETURN", text: "weekly avg return" }
        ];

        dropdown.innerHTML = '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            dropdown.appendChild(option);
        });

        dropdown.addEventListener('change', () => this.updateAnalysisDescription());
        // Synchronize the initial description with the dropdown's current value
        this.updateAnalysisDescription();
    }

    initAnalysisMonthsDropdown() {
        const dropdown = document.getElementById('analysis-months-dropdown');
        if (!dropdown) return;

        const months = ["1", "2", "3", "4", "5", "6", "9", "12", "18", "24", "30", "36"];
        dropdown.innerHTML = '';
        months.forEach(m => {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = m;
            if (m === "12") option.selected = true;
            dropdown.appendChild(option);
        });
    }

    getStockDataFromServer(stockName, period, analysisType, requestTypes, successCallback, failureCallback) {
        const cacheKey = JSON.stringify({ stockName, period, analysisType, requestTypes });

        if (this.stockDataCache.has(cacheKey)) {
            successCallback(this.stockDataCache.get(cacheKey));
            return;
        }

        const data = { 
            type: requestTypes, 
            name: stockName, 
            period: period, 
            analysis_type: analysisType 
        };

        basicInitializer.makeServerRequest('/general_stock_analysis_info', data, (response) => {
            this.stockDataCache.set(cacheKey, response);
            successCallback(response);
        }, failureCallback);
    }

    /**
     * Initializes a continuous vertical scroll of data on a specific topic card.
     * @param {string} cardAction - The data-action attribute value of the card.
     * @param {string} jsonPath - Path to the JSON file.
     */
    doCardScroll(cardAction, jsonPath) {
        const card = document.querySelector(`.topic-card[data-action="${cardAction}"], .topic-card[data-sector="${cardAction}"]`);
        if (!card) return;

        // Setup the scrolling container
        const container = document.createElement('div');
        container.style.height = '60px';
        container.style.overflow = 'hidden';
        container.style.marginTop = '10px';
        container.style.borderTop = '1px solid #eee';
        container.style.paddingTop = '5px';
        container.style.position = 'relative';

        const scroller = document.createElement('div');
        scroller.style.width = '100%';
        container.appendChild(scroller);

        // Replace static description with scrolling container
        const description = card.querySelector('p');
        if (description) description.remove();
        card.appendChild(container);

        fetch(jsonPath)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                // If the JSON has exactly one root key which is an object, we use its children 
                // to avoid redundant labels (e.g., showing 'GDP' instead of 'parameters - GDP')
                const scrollData = (Object.keys(data).length === 1 && typeof Object.values(data)[0] === 'object') 
                                   ? Object.values(data)[0] : data;
                const itemsHtml = this.uiBuilder._getFormattedScrollItems(scrollData);

                // Double the content for a seamless loop
                scroller.innerHTML = itemsHtml + itemsHtml;

                // Use CSS animation for vertical scroll
                const itemCount = (itemsHtml.match(/<div/g) || []).length;
                const duration = Math.max(10, itemCount * 3);
                scroller.style.animation = `economyScrollAnim ${duration}s linear infinite`;
                
                // Pause scrolling when the user hovers over the card
                card.onmouseenter = () => scroller.style.animationPlayState = 'paused';
                card.onmouseleave = () => scroller.style.animationPlayState = 'running';
            })
            .catch(err => console.error("Failed to load India Economy scroll data:", err));

        // Add global animation keyframes if not already present
        if (!document.getElementById('economy-scroll-styles')) {
            const style = document.createElement('style');
            style.id = 'economy-scroll-styles';
            style.innerHTML = `
                @keyframes economyScrollAnim {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    updateAnalysisDescription() {
        const dropdown = document.getElementById('analysis-type-dropdown');
        const descriptionArea = document.getElementById('analysis-description');
        if (!dropdown || !descriptionArea) return;

        const descriptions = {
            "ANALYSIS_REGULAR": "Displays a standard price and volume chart without specific trend highlighting.",
            "ANALYSIS_CONT_DECLINE_2PCT": "Identifies periods where the stock price has fallen by at least 2% without any intermediate rise.",
            "ANALYSIS_CONT_DECLINE_5PCT": "Identifies periods where the stock price has fallen by at least 5% without any intermediate rise.",
            "ANALYSIS_CONT_RISE_2PCT": "Identifies periods where the stock price has risen by at least 2% without any intermediate fall.",
            "ANALYSIS_CONT_RISE_5PCT": "Identifies periods where the stock price has risen by at least 5% without any intermediate fall.",
            "ANALYSIS_DRAWDOWN_5": "Shows how much the stock has fallen from its peak, highlighting drops of 5% or more.",
            "ANALYSIS_RECOVERY": "Analyzes how the stock has bounced back from its lowest point in the selected period.",
            "ANALYSIS_EVENT_TIMELINE": "Displays significant corporate events, news, and market milestones for the stock.",
            "ANALYSIS_PEER_COMPARISON": "Compares the performance of the selected stock with its industry peers over the chosen period.",
            "ANALYSIS_WEEKLY_AVG_RETURN": "Calculates and displays the average percentage return for each week in the selected period."
        };

        descriptionArea.textContent = descriptions[dropdown.value] || "";
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

    computeDrawdownSegments(data, threshold_pct, posColor = '#00c805', negColor = '#ff3b30') {
        const segments = [];
        if (!data || data.length < 2) return segments;

        let runningHigh = parseFloat(data[0].stock_price);
        let currentStart = 0;
        let lastColor = null;
        
        // Part boundaries
        const GREEN_LIMIT = -2.0; 
        const RED_LIMIT = -Math.abs(threshold_pct);

        for (let i = 0; i < data.length; i++) {
            const price = parseFloat(data[i].stock_price);
            if (price > runningHigh) runningHigh = price;

            const drawdownPct = ((price - runningHigh) / runningHigh) * 100;
            
            let currentColor = null; // Middle part (uncolored)
            if (drawdownPct >= GREEN_LIMIT) {
                currentColor = posColor; // 1st Part: Green
            } else if (drawdownPct <= RED_LIMIT) {
                currentColor = negColor;     // 3rd Part: Red
            }

            if (i === 0) {
                lastColor = currentColor;
                continue;
            }

            if (currentColor !== lastColor) {
                if (lastColor) {
                    segments.push({ start: currentStart, end: i, color: lastColor });
                }
                currentStart = i - 1; // Connect segments
                lastColor = currentColor;
            }
        }

        if (lastColor) {
            segments.push({ start: currentStart, end: data.length - 1, color: lastColor });
        }
        return segments;
    }

    computeRecoverySegments(data, posColor = '#00c805', negColor = '#ff3b30') {
        const segments = [];
        if (!data || data.length < 2) return { 
            segments, 
            redCutoff: "N/A", 
            greenCutoff: "N/A", 
            recoveryRatio: "N/A", 
            recoveryDuration: "N/A" 
        };

        // Find Global Low
        let minPrice = Infinity;
        let minIdx = -1;
        for (let i = 0; i < data.length; i++) {
            const p = parseFloat(data[i].stock_price);
            if (p < minPrice) {
                minPrice = p;
                minIdx = i;
            }
        }

        if (minIdx === -1 || minIdx === data.length - 1) return { 
            segments, 
            redCutoff: "N/A", 
            greenCutoff: "N/A", 
            recoveryRatio: "0%", 
            recoveryDuration: "0 points" 
        };

        const getPct = (idx) => (((parseFloat(data[idx].stock_price) - minPrice) / minPrice) * 100).toFixed(2) + "%";
        
        const countAfterLow = data.length - 1 - minIdx;
        // Dynamic 'few' count based on available recovery window
        const few = Math.max(1, Math.min(2, Math.floor(countAfterLow / 2))); 

        const redEnd = minIdx + few;
        segments.push({ start: minIdx, end: redEnd, color: negColor });

        // Ensure green zone is at least one index after red zone to provide distinct cutoffs
        let greenStart = Math.max(redEnd + 1, data.length - 1 - (few - 1));
        
        // If greenStart is at the very end, it won't form a segment (needs at least 2 points)
        // We try to pull it back by one if it doesn't collide with the red zone
        if (greenStart >= data.length - 1 && (data.length - 2) > redEnd) {
            greenStart = data.length - 2;
        }

        let greenCutoffText = "N/A";
        if (greenStart < data.length - 1) {
            segments.push({ start: greenStart, end: data.length - 1, color: posColor });
            greenCutoffText = getPct(greenStart);
        }

        return {
            segments,
            redCutoff: getPct(redEnd),
            greenCutoff: greenCutoffText,
            recoveryRatio: getPct(data.length - 1),
            recoveryDuration: countAfterLow + " points"
        };
    }

    computeAnalysisSegments(data, events = null, posSegmentColor = '#00c805', negSegmentColor = '#ff3b30') {
        if (Array.isArray(data) && data.length > 0 && data[0].Date && data[0].Close) {
            data = data.map(item => ({
                date_time: item.Date,
                stock_price: item.Close,
                volume: item.Volume
            }));
        }

        const dropdown = document.getElementById("analysis-type-dropdown");
        const selection = dropdown ? dropdown.value : "ANALYSIS_CONT_DECLINE_2PCT";

        let segments = [];
        let info = {};
        let highlightPoints = [];

        if (selection === "ANALYSIS_REGULAR") {
            return { segments, infoJson: JSON.stringify(info), data, highlightPoints };
        }

        if (selection === "ANALYSIS_EVENT_TIMELINE") {
            if (Array.isArray(events)) {
                highlightPoints = events.map((ev, idx) => ({
                    date: ev.date,
                    color: this.STOCK_EVENT_COLORS[idx % this.STOCK_EVENT_COLORS.length]
                }));
            }

            segments = [];
            info = {
                "Description": "Overview of major events influencing stock performance.",
                "Note": "Timeline details are populated based on historical news and filings.",
                "Events": events || "No events found."
            };
            return { segments, infoJson: JSON.stringify(info), data, highlightPoints };
        } else if (selection === "ANALYSIS_RECOVERY") {
            const result = this.computeRecoverySegments(data, posSegmentColor, negSegmentColor);
            segments = result.segments;
            info = {
                "Red_Zone_Cutoff": result.redCutoff,
                "Green_Zone_Cutoff": result.greenCutoff,
                "Recovery_Ratio": result.recoveryRatio,
                "Recovery_Duration": result.recoveryDuration,
                "Note": "Red marks initial recovery, Green marks high recovery from global low"
            };
        } else if (selection == "ANALYSIS_DRAWDOWN") {
            const threshold = parseFloat(selection.split('_')[2]) || 5.0;
            segments = this.computeDrawdownSegments(data, threshold, posSegmentColor, negSegmentColor);
            info = {
                "Green_Zone": `Drawdown >= -2.0% (Near Highs)`,
                "Middle_Part": `Drawdown between -2.0% and -${threshold}% (Ignored)`,
                "Red_Zone": `Drawdown <= -${threshold}% (Correction)`,
                "Segments_Found": segments.length
            };
        } else if ( selection == "ANALYSIS_PEER_COMPARISON") {
            segments = [];
            info = {
            };
        } else if (selection === "ANALYSIS_WEEKLY_AVG_RETURN") {
            segments = [];
            info = {
                "Description": "Weekly percentage return analysis.",
                "Note": "See 'Stock Advance Insights' below for details."
            };
        } else {
            const valueMap = {
                "ANALYSIS_CONT_DECLINE_2PCT": -2.0,
                "ANALYSIS_CONT_DECLINE_5PCT": -5.0,
                "ANALYSIS_CONT_RISE_2PCT": 2.0,
                "ANALYSIS_CONT_RISE_5PCT": 5.0
            };
            const target_pct = valueMap[selection] !== undefined ? valueMap[selection] : (parseFloat(selection) || -2.0);
            const rawSegments = Array.isArray(data) ? this.computeRiseOrDecline(data, target_pct) : [];
            const segmentColor = target_pct > 0 ? posSegmentColor : negSegmentColor;
            segments = rawSegments.map(seg => ({ ...seg, color: segmentColor }));
            info = {
                "Analysis_Segments_Found": segments.length,
                "Target_Threshold": target_pct + "%"
            };
        }
        return { segments, infoJson: JSON.stringify(info), data, highlightPoints };
    }

    _massageRawStockEvents(rawEvents, periodMonths) {
        if (!rawEvents || rawEvents.error) return [];

        const processed = [];
        const news = rawEvents.news || [];
        const actions = rawEvents.actions || [];

        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(periodMonths || 12));

        // Process News: extract title, source link, and format date for the timeline
        news.forEach(item => {
            const data = item.content || item;
            const ts = data.providerPublishTime || data.publishTime || data.published || data.pubDate || data.displayTime;
            if (!ts) return;

            // Standardize Date object creation: handles Unix timestamps (numbers) 
            // and ISO strings (from pubDate/displayTime)
            const dateObj = (typeof ts === 'number') ? new Date(ts * 1000) : new Date(ts);
            if (isNaN(dateObj.getTime())) return;

            if (dateObj < cutoffDate) return;

            const dateStr = this._formatStockDate(dateObj);
            const title = data.title || "Latest News";
            const url = data.url || data.link || (data.clickThroughUrl ? data.clickThroughUrl.url : null);

            const eventHtml = url 
                ? `<small>${title}</small> &nbsp;&nbsp;&nbsp;&nbsp; [<a href='${url}' target='_blank'>Source</a>]` 
                : `<small>${title}</small>`;

            processed.push({ dateObj, date: dateStr, event: eventHtml });
        });

        // Process Actions: extract corporate actions like dividends and splits
        actions.forEach(item => {
            const dateObj = new Date(item.Date);
            if (isNaN(dateObj.getTime())) return;

            if (dateObj < cutoffDate) return;

            const dateStr = this._formatStockDate(dateObj);

            if (item.Dividends > 0) {
                processed.push({ dateObj, date: dateStr, event: `Dividend: ${item.Dividends}` });
            }
            if (item['Stock Splits'] > 0) {
                processed.push({ dateObj, date: dateStr, event: `Stock Split: ${item['Stock Splits']}` });
            }
        });

        // Sort events by date descending
        processed.sort((a, b) => b.dateObj - a.dateObj);

        return processed.map(p => ({
            date: p.date,
            event: p.event
        }));
    }

    getSectorAnalysisInfo(sector, callback) {

        const filePath = `/static/prompts/stocks_${sector}_info.json`;

        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                callback(JSON.stringify(data));
            })
            .catch(error => {
                errorManager.showError(2044, error.message);
            });
    }

    openSectorPage(sector) {
        console.log("Opening sector analysis for:", sector);

        this.gaTracker.trackPageView(`sector-${sector}-page`);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['related_stocks']
            let tmp = "nifty_" + sector + "_timeline"
            tmp = tmp.replace('_sector', '');
            tmp = tmp.toLowerCase();
            listOfKeysToBeShownInTab.push(tmp);

            let tabContentDiv = this.uiBuilder.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        });
    }

    openDiiFiiPage() {

        this.gaTracker.trackPageView(`DII-FII-page`);

        let sector = "DII_FII";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['DII_FII_sector_keys', 'related_stocks']

            let tabContentDiv = this.uiBuilder.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        });
    }

    openGlobalCuesPage() {

        this.gaTracker.trackPageView(`global-cues-page`);

        let sector = "global_cues_impact";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['sectors']

            let tabContentDiv = this.uiBuilder.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        });
    }

    openSectorWeightsPage() {

        this.gaTracker.trackPageView(`sector-weights-page`);

        let sector = "sector_weights";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['sectors', 'related_stocks']

            let tabContentDiv = this.uiBuilder.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        });
    }

    openIndiaEconomyPage() {

        this.gaTracker.trackPageView(`indian-economy-page`);

        let sector = "india_economy";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['parameters']

            let tabContentDiv = this.uiBuilder.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        });
    }

    openIndiaSemiPage() {

        this.gaTracker.trackPageView(`indian-semiconductor-page`);

        let sector = "semiconductor";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['related_stocks']

            let tabContentDiv = this.uiBuilder.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        });
    }

    openIndiaAIPage() {

        this.gaTracker.trackPageView(`indian-AI-page`);

        let sector = "AI";
        console.log("Opening analysis for:", sector);

        this.getSectorAnalysisInfo(sector, (info) => {
            const result1 = info || "No analysis data available for this sector.";
            this.popoutMgr.clear();

            let negativeValuesInRed = true;
            let listOfKeysToBeShownInTab = ['related_stocks']

            let tabContentDiv = this.uiBuilder.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        });
    }

    initMainPagePlotClick() {
        const container = document.getElementById('main-page-plot-container');
        if (container) {
            container.style.cursor = 'pointer';
            container.addEventListener('click', () => this.handleMainPagePlotClick());
        }
    }

    _safeParsePriceData(info) {
        if (!info || info === "NONE" || info === "N/A") return [];
        if (typeof info === 'object') return info.price_data || [];
        try {
            return JSON.parse(info);
        } catch (e) {
            console.warn("Failed to parse stock price data:", e);
            return [];
        }
    }

    handleMainPagePlotClick() {
        const period = this.MAIN_PAGE_STOCK_DEFAULT_TIME_PERIOD;
        const analysisType = 'ANALYSIS_CONT_DECLINE_2PCT';
        const requestTypes = ['STOCK_BASICS'];

        const promises = this.SELECTED_INDEX_STOCKS.map(stockName => 
            new Promise(resolve => 
                this.getStockDataFromServer(stockName, period, analysisType, requestTypes, 
                    res => resolve({ stockName, res }), 
                    () => resolve(null)
                )
            )
        );

        Promise.all(promises).then(results => {
            this.popoutMgr.clear();
            results.forEach(item => {
                if (item && item.res && item.res.STOCK_BASICS && !item.res.error) {
                    const { stockName, res } = item;
                    const info = res.STOCK_BASICS;

                    const title = document.createElement('h3');
                    title.innerText = stockName.toUpperCase();
                    title.style.marginLeft = '20px';
                    title.style.marginTop = '25px';
                    title.style.color = '#007bff';
                    title.style.fontFamily = 'Arial';
                    this.popoutMgr.appendItem(title);

                    const priceData = this.uiBuilder._safeParsePriceData(info);
                    const analysisResult = this.computeAnalysisSegments(priceData);
                    const plotDiv = this.uiBuilder.createStockPricePlot(analysisResult.data, 'tabContent active', analysisResult.segments, analysisResult.highlightPoints);
                    this.popoutMgr.appendItem(plotDiv);

                    const variousReturns = this.getVariousReturn(JSON.stringify(priceData));
                    const returnsTab = this.uiBuilder.createTabContent(variousReturns, 'tabContent active', true, []);
                    returnsTab.style.marginLeft = '20px';
                    this.popoutMgr.appendItem(returnsTab);
                }
            });
            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        });
    }

    /**
     * Starts a continuous carousel animation of major stock indices.
     * Fades the plot in, waits, fades out, and switches to the next stock.
     */
    async animateMainPagePlot() {
        const container = document.getElementById('default-stock-plot-container');
        if (!container) return;
        // Reserve space to prevent layout shifts before the first plot loads.
        // We use a more conservative value for the initial load.
        container.style.minHeight = '300px';

        let index = 0;

        const runCycle = async () => {
            const stockName = this.SELECTED_INDEX_STOCKS[index];
            
            // Render the plot and wait for data to load
            await this.renderDefaultStockPlot(container, stockName);

            // Fade In
            container.style.transition = 'opacity 1.5s ease-in-out';
            container.style.opacity = '1';

            // Keep it visible for 6 seconds
            await new Promise(resolve => setTimeout(resolve, 6000));

            // Fade Out
            container.style.opacity = '0';

            // Wait for transition to finish (1.5s) before starting next
            await new Promise(resolve => setTimeout(resolve, 1500));

            index = (index + 1) % this.SELECTED_INDEX_STOCKS.length;
            runCycle();
        };

        runCycle();
    }

    renderDefaultStockPlot(container, stockName = 'INFY') {
        return new Promise((resolve) => {
            if (!container) return resolve();

        const period = this.MAIN_PAGE_STOCK_DEFAULT_TIME_PERIOD;
        const analysisType = 'ANALYSIS_REGULAR';
        const requestTypes = ['STOCK_BASICS'];
        this.getStockDataFromServer(stockName, period, analysisType, requestTypes, (response) => {
            // Reset min-height before rendering to calculate the actual content height correctly
            container.style.minHeight = '0px';

            container.innerHTML = ''; // Clear previous plot only when the new one is ready
            let info = response.STOCK_BASICS;
            const error = response.error;
            if (error && typeof error === 'string' && error.trim() !== "") {
                errorManager.showError(1045, error);
                resolve();
                return;
            }

            let priceData = this.uiBuilder._safeParsePriceData(info);
            
            const analysisResult = this.computeAnalysisSegments(priceData);
            const plotDiv = this.uiBuilder.createStockPricePlot(analysisResult.data, 'tabContent active', analysisResult.segments, analysisResult.highlightPoints);
            
            container.appendChild(plotDiv);

            // Update the main page plot label with stock name and returns
            const label = document.querySelector('.main-page-plot-label');
            if (label) {
                const variousReturnsJson = this.getVariousReturn(JSON.stringify(priceData));
                const variousReturnsObj = JSON.parse(variousReturnsJson);
                let returnsStr = "";
                if (variousReturnsObj.various_returns) {
                    const formattedReturns = variousReturnsObj.various_returns.map(ret => {
                        // Highlight negative returns in red and non-negative in green
                        const color = this.uiBuilder.hasNegativeValue(ret) ? 'red' : 'green';
                        let displayVal = ret;
                        if (typeof ret === 'object' && ret !== null) {
                            displayVal = Object.values(ret).join(': ');
                        }
                        return `<span style="color: ${color};">${displayVal}</span>`;
                    });

                    // Determine chunk size based on screen width (mobile: 2, desktop: 4)
                    const chunkSize = window.innerWidth <= 768 ? 2 : 4;
                    let chunks = [];
                    for (let i = 0; i < formattedReturns.length; i += chunkSize) {
                        chunks.push(formattedReturns.slice(i, i + chunkSize).join(' | '));
                    }
                    returnsStr = chunks.join('<br>');
                }
                label.innerHTML = `Market Pulse : ${stockName}<br><span style="font-size: 11px; font-weight: normal; margin-left: 10px;">[${returnsStr}]</span>`;
            }

            // Maintain a constant area based on the actual rendered height to ensure no layout shift during next fetch
            const actualHeight = container.offsetHeight;
            if (actualHeight > 0) {
                container.style.minHeight = actualHeight + 'px';
            }

            resolve();
        }, (error) => {
            container.innerHTML = '';
            console.error("Failed to load default stock plot:", error);
            resolve();
        });
        });
    }

    openStockAnalysisPage(stockName) {

        this.gaTracker.trackPageView(`sector-price-analysis-page`);

        if ( !stockName || stockName.trim() === '' ) {
            errorManager.showInfo(2068);
            return;
        }

        const monthsDropdown = document.getElementById("analysis-months-dropdown");
        const period = monthsDropdown ? monthsDropdown.value : "12";

        const analysisDropdown = document.getElementById("analysis-type-dropdown");
        const analysisType = analysisDropdown ? analysisDropdown.value : "ANALYSIS_CONT_DECLINE_2PCT";

        const requestTypes = ['STOCK_BASICS', 'STOCK_SUMMARY', 'STOCK_FINANCIALS'];
        if (analysisType === 'ANALYSIS_EVENT_TIMELINE') {
            requestTypes.push('STOCK_EVENTS');
        }
        if (analysisType === 'ANALYSIS_PEER_COMPARISON') {
            requestTypes.push('STOCK_PEER_COMPARISON');
        }

        this.getStockDataFromServer(stockName, period, analysisType, requestTypes, (response) => {
            const ticker = response['stock-ticker'];
            let info = response.STOCK_BASICS;
            let events = response.STOCK_EVENTS;
            let peersData = response.STOCK_PEER_COMPARISON || {};
            let summary = response.STOCK_SUMMARY || {};
            let financials = response.STOCK_FINANCIALS || {};
            
            const error = response.error;

            if (error && typeof error === 'string' && error.trim() !== "") {
                errorManager.showError(1045, error);
                return;
            }

            let priceData = this.uiBuilder._safeParsePriceData(info);
            
            events = this._massageRawStockEvents(events, period);

            this.popoutMgr.clear();

            const headerJson = this.uiBuilder._generatePlotHeaderInfoJson(ticker, period);
            let headerTab = this.uiBuilder.createTabContent(headerJson, 'tabContent active', false, []);
            headerTab.style.marginLeft = '20px';
            headerTab.style.marginTop = '15px';
            this.popoutMgr.appendItem(headerTab);

            const analysisResult = this.computeAnalysisSegments(priceData, events);

            let analysisInfoTab = this.uiBuilder.createTabContent(analysisResult.infoJson, 'tabContent active', false, [], 
                                        { key: 'Events', colors: this.STOCK_EVENT_COLORS });
            analysisInfoTab.style.marginLeft = '20px';
            this.popoutMgr.appendItem(analysisInfoTab);

            let tabContentDiv_1 = this.uiBuilder.createStockPricePlot(analysisResult.data, 'tabContent active', analysisResult.segments, analysisResult.highlightPoints);
            this.popoutMgr.appendItem(tabContentDiv_1);

            const insightsHeader = document.createElement('h3');
            insightsHeader.innerText = "Stock Insights";
            insightsHeader.style.marginLeft = '20px';
            insightsHeader.style.fontFamily = 'Arial';
            this.popoutMgr.appendItem(insightsHeader);
            let insights_xml = this.getStockPriceInsights(JSON.stringify(priceData));
            let tabContentDiv_2 = this.uiBuilder.createTabContent(insights_xml, 'tabContent active', true, []);
            this.popoutMgr.appendItem(tabContentDiv_2);

            if (Object.keys(summary).length > 0 && !summary.error) {
                const summaryHeader = document.createElement('h3');
                summaryHeader.innerText = "Company Profile";
                summaryHeader.style.marginLeft = '20px';
                summaryHeader.style.marginTop = '25px';
                summaryHeader.style.color = '#007bff';
                summaryHeader.style.fontFamily = 'Arial';
                this.popoutMgr.appendItem(summaryHeader);
                let summaryTab = this.uiBuilder.createTabContent(JSON.stringify(summary), 'tabContent active', false, [], null, ['business_summary'], ['website']);
                summaryTab.style.marginLeft = '20px';
                this.popoutMgr.appendItem(summaryTab);
            }

            if (Object.keys(financials).length > 0 && !financials.error) {
                const finHeader = document.createElement('h3');
                finHeader.innerText = "Financial Statements";
                finHeader.style.marginLeft = '20px';
                finHeader.style.marginTop = '25px';
                finHeader.style.color = '#007bff';
                finHeader.style.fontFamily = 'Arial';
                this.popoutMgr.appendItem(finHeader);
                let finTab = this.uiBuilder.createTabContent(JSON.stringify(financials), 'tabContent active', true,
                                            ['income_statement', 'balance_sheet', 'cash_flow']);
                finTab.style.marginLeft = '20px';
                this.popoutMgr.appendItem(finTab);
            }

            if (analysisType === 'ANALYSIS_REGULAR') {
                const returnsHeader = document.createElement('h3');
                returnsHeader.innerText = "Performance Returns";
                returnsHeader.style.marginLeft = '20px';
                returnsHeader.style.fontFamily = 'Arial';
                this.popoutMgr.appendItem(returnsHeader);

                let variousReturns = this.getVariousReturn(JSON.stringify(priceData));
                let returnsTab = this.uiBuilder.createTabContent(variousReturns, 'tabContent active', true, []);
                this.popoutMgr.appendItem(returnsTab);

            } else if (analysisType === 'ANALYSIS_WEEKLY_AVG_RETURN') {
                const insightsHeader = document.createElement('h3');
                insightsHeader.innerText = "Stock Advance Insights";
                insightsHeader.style.marginLeft = '20px';
                insightsHeader.style.fontFamily = 'Arial';
                this.popoutMgr.appendItem(insightsHeader);
                let insights_xml = this.getAvgWeeklyReturn(JSON.stringify(priceData));
                let tabContentDiv_2 = this.uiBuilder.createTabContent(insights_xml, 'tabContent active', true, []);
                this.popoutMgr.appendItem(tabContentDiv_2);

            } else if (analysisType == 'ANALYSIS_PEER_COMPARISON') {
                // Handle Peer Comparison Display
                for (const [peerName, peerPriceData] of Object.entries(peersData)) {
                    const peerHeader = document.createElement('h3');
                    peerHeader.innerText = `Peer Analysis: ${peerName}`;
                    peerHeader.style.marginLeft = '20px';
                    peerHeader.style.marginTop = '30px';
                    peerHeader.style.fontFamily = 'Arial';
                    peerHeader.style.color = 'blue';
                    this.popoutMgr.appendItem(peerHeader);

                    const peerAnalysis = this.computeAnalysisSegments(peerPriceData);
                    this.popoutMgr.appendItem(this.uiBuilder.createTabContent(peerAnalysis.infoJson, 'tabContent active', false, []));
                    this.popoutMgr.appendItem(this.uiBuilder.createStockPricePlot(peerAnalysis.data, 'tabContent active', peerAnalysis.segments));
                }
            }

            this.uiBuilder.appendDisclaimer();
            this.popoutMgr.showPopout();
        }, (error) => {
            errorManager.showError(2044, error);
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

        items.forEach((item, index) => {
            if (item.price > max.price) max = item;
            if (item.price < min.price) min = item;
            total += item.price;

            if (index > 0) {
                if (item.price > items[index - 1].price) upDays++;
                else if (item.price < items[index - 1].price) downDays++;
            }
        });

        const returnPct = ((items[items.length - 1].price - items[0].price) / items[0].price) * 100;
        const mappedItems = items.map(it => ({ stock_price: it.price }));
        const countSegments = (pct) => this.computeRiseOrDecline(mappedItems, pct).length;

        const currentPrice = items[items.length - 1].price;
        const getDMA = (p) => {
            if (items.length < p) return "N/A";
            const avg = items.slice(-p).reduce((sum, it) => sum + it.price, 0) / p;
            return (((currentPrice - avg) / avg) * 100).toFixed(2) + "%";
        };

        const insights = {
            highest_price: `${max.price.toFixed(2)} on ${max.date}`,
            lowest_price: `${min.price.toFixed(2)} on ${min.date}`,
            avg_price: (total / items.length).toFixed(2),
            return_pct: `${returnPct.toFixed(2)}%`,
            number_of_up_days: upDays,
            number_of_down_days: downDays,
            distance_from_20dma: getDMA(20),
            distance_from_50dma: getDMA(50),
            distance_from_200dma: getDMA(200),
            
            continuous_fall_counts: [
                { "Threshold": "2%", "Count": countSegments(-2) },
                { "Threshold": "5%", "Count": countSegments(-5) },
                { "Threshold": "7%", "Count": countSegments(-7) },
                { "Threshold": "10%", "Count": countSegments(-10) }
            ],
            continuous_rise_counts: [
                { "Threshold": "2%", "Count": countSegments(2) },
                { "Threshold": "5%", "Count": countSegments(5) },
                { "Threshold": "7%", "Count": countSegments(7) },
                { "Threshold": "10%", "Count": countSegments(10) }
            ]
        };

        return JSON.stringify(insights);
    }

    getAvgWeeklyReturn(result1, numWeeks = 8) {
        let data;
        try {
            data = JSON.parse(result1);
        } catch (e) {
            return [];
        }

        if (!Array.isArray(data) || data.length === 0) return [];

        // Normalize property names and filter valid entries
        const items = data.map(d => ({
            price: parseFloat(d.Close || d.stock_price || 0),
            date: d.Date || d.date_time || ""
        })).filter(d => !isNaN(d.price) && d.date !== "");

        if (items.length === 0) return [];

        const weeklyGroups = {};
        items.forEach((item) => {
            let d = this._parseStockDate(item.date);
            const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
            if (!weeklyGroups[monday]) weeklyGroups[monday] = [];
            weeklyGroups[monday].push(item.price);
        });

        const avg_every_week = [];
        const sortedWeeks = Object.keys(weeklyGroups).sort();

        const startIndex = Math.max(0, sortedWeeks.length - numWeeks);
        for (let i = startIndex; i < sortedWeeks.length; i++) {
            const currentWeekPrices = weeklyGroups[sortedWeeks[i]];
            const lastOfCurrent = currentWeekPrices[currentWeekPrices.length - 1];
            const prevClose = i === 0 ? currentWeekPrices[0] : weeklyGroups[sortedWeeks[i - 1]].slice(-1)[0];

            const pct = ((lastOfCurrent - prevClose) / prevClose) * 100;

            // Convert YYYY-MM-DD back to Date object for formatting
            const [y, m, dayPart] = sortedWeeks[i].split('-').map(Number);
            const formattedDate = this._formatStockDate(new Date(y, m - 1, dayPart));
            avg_every_week.push({ "Week": formattedDate, "Return": pct.toFixed(2) + '%' });
        }
        const insights = {
            avg_return_every_week: avg_every_week
        };
        return JSON.stringify(insights);
    }

    getVariousReturn(result1) {
        let data;
        try {
            data = JSON.parse(result1);
        } catch (e) {
            return JSON.stringify({ error: "Invalid data format" });
        }

        if (!Array.isArray(data) || data.length === 0) return JSON.stringify({ info: "No data available" });

        // Normalize data and filter out invalid entries
        const items = data.map(d => ({
            price: parseFloat(d.Close || d.stock_price || 0),
            date: d.Date || d.date_time || ""
        })).filter(d => !isNaN(d.price) && d.date !== "");

        if (items.length === 0) return JSON.stringify({ info: "Insufficient data" });

        const latestPrice = items[items.length - 1].price;
        const latestDateObj = this._parseStockDate(items[items.length - 1].date);
        const latestTime = latestDateObj.getTime();

        const intervals = [
            { label: "1 week return", days: 7 },
            { label: "2 week return", days: 14 },
            { label: "3 week return", days: 21 },
            { label: "1 month return", days: 30 },
            { label: "2 months return", days: 60 },
            { label: "1 qtr return", days: 91 },
            { label: "2 qtr return", days: 182 },
            { label: "3 qtr return", days: 273 },
            { label: "1 year return", days: 365 },
            { label: "2 years return", days: 730 },
            { label: "3 years return", days: 1095 },
            { label: "4 years return", days: 1460 },
            { label: "5 years return", days: 1825 },
            { label: "6 years return", days: 2190 }
        ];

        const returns = [];
        intervals.forEach(interval => {
            const targetTime = latestTime - (interval.days * 24 * 60 * 60 * 1000);
            let match = null;

            // Search backwards from the end for the data point closest to targetTime
            for (let i = items.length - 2; i >= 0; i--) {
                const itemDateObj = this._parseStockDate(items[i].date);
                if (itemDateObj.getTime() <= targetTime) {
                    match = items[i];
                    break;
                }
            }

            if (match) {
                const pct = ((latestPrice - match.price) / match.price) * 100;
                returns.push({ "Interval": interval.label, "Return": pct.toFixed(2) + '%' });
            }
        });

        return JSON.stringify({ various_returns: returns });
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