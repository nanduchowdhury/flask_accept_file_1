"use strict";

class StockAnalysisMain {
    constructor() {
        this.popoutMgr = new PopoutManager('genericPopoutId');

        this.gaTracker = new GoogleAnalytics();

        this.STOCK_EVENT_COLORS = ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'brown', 'teal'];
    }

    initAnalysisTypeDropdown() {
        const dropdown = document.getElementById('analysis-type-dropdown');
        if (!dropdown) return;

        const options = [
            { value: "ANALYSIS_CONT_DECLINE_2PCT", text: "continous decline 2%" },
            { value: "ANALYSIS_CONT_DECLINE_5PCT", text: "continous decline 5%" },
            { value: "ANALYSIS_CONT_RISE_2PCT", text: "continous rise 2%" },
            { value: "ANALYSIS_CONT_RISE_5PCT", text: "continous rise 5%" },
            { value: "ANALYSIS_DRAWDOWN_5", text: "drawdown 5% from high" },
            { value: "ANALYSIS_RECOVERY", text: "recovery from low" },
            { value: "ANALYSIS_EVENT_TIMELINE", text: "event timeline" },
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
                const itemsHtml = this._getFormattedScrollItems(scrollData);

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

/**
 * Recursively formats JSON into an indented HTML tree.
 * Objects are shown as headers.
 * Arrays are expanded item-by-item.
 */
_getFormattedScrollItems(obj, level = 0) {

    let html = "";

    const indent = level * 16;

    for (const [key, value] of Object.entries(obj)) {

        const label = key.replace(/_/g, " ");

        // ---------------------------
        // Object
        // ---------------------------
        if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {

            html += `
                <div style="
                    margin-left:${indent}px;
                    margin-top:6px;
                    color:#0066cc;
                    font-size:11px;
                ">
                    ${label}
                </div>
            `;

            html += this._getFormattedScrollItems(value, level + 1);
        }

        // ---------------------------
        // Array
        // ---------------------------
        else if (Array.isArray(value)) {

            html += `
                <div style="
                    margin-left:${indent}px;
                    color:#0066cc;
                        font-size:11px;
                    margin-top:5px;
                ">
                    ${label}
                </div>
            `;

            value.forEach(item => {

                //----------------------------------
                // array contains object
                //----------------------------------
                if (
                    item !== null &&
                    typeof item === "object"
                ) {

                    html += this._getFormattedScrollItems(
                        item,
                        level + 1
                    );
                }

                //----------------------------------
                // array contains primitive
                //----------------------------------
                else {

                    html += `
                        <div style="
                            margin-left:${(level+1)*16}px;
                            font-size:11px;
                            color:#555;
                            padding:2px 0;
                        ">
                            • ${item}
                        </div>
                    `;
                }
            });
        }

        // ---------------------------
        // Primitive value
        // ---------------------------
        else {

            html += `
                <div style="
                    margin-left:${indent}px;
                    font-size:11px;
                    padding:2px 0;
                    color:#555;
                ">
                    <span style="
                        color:#007bff;
                    ">
                        ${label}
                    </span>

                    : ${value}
                </div>
            `;
        }
    }

    return html;
}

    updateAnalysisDescription() {
        const dropdown = document.getElementById('analysis-type-dropdown');
        const descriptionArea = document.getElementById('analysis-description');
        if (!dropdown || !descriptionArea) return;

        const descriptions = {
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

    computeDrawdownSegments(data, threshold_pct) {
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
                currentColor = '#28a745'; // 1st Part: Green
            } else if (drawdownPct <= RED_LIMIT) {
                currentColor = 'red';     // 3rd Part: Red
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

    computeRecoverySegments(data) {
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
        segments.push({ start: minIdx, end: redEnd, color: 'red' });

        // Ensure green zone is at least one index after red zone to provide distinct cutoffs
        let greenStart = Math.max(redEnd + 1, data.length - 1 - (few - 1));
        
        // If greenStart is at the very end, it won't form a segment (needs at least 2 points)
        // We try to pull it back by one if it doesn't collide with the red zone
        if (greenStart >= data.length - 1 && (data.length - 2) > redEnd) {
            greenStart = data.length - 2;
        }

        let greenCutoffText = "N/A";
        if (greenStart < data.length - 1) {
            segments.push({ start: greenStart, end: data.length - 1, color: '#28a745' });
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

    computeAnalysisSegments(data, events = null) {
        if (Array.isArray(data) && data.length > 0 && data[0].Date && data[0].Close) {
            data = data.map(item => ({
                date_time: item.Date,
                stock_price: item.Close
            }));
        }

        const dropdown = document.getElementById("analysis-type-dropdown");
        const selection = dropdown ? dropdown.value : "ANALYSIS_CONT_DECLINE_2PCT";

        let segments = [];
        let info = {};
        let highlightPoints = [];

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
            const result = this.computeRecoverySegments(data);
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
            segments = this.computeDrawdownSegments(data, threshold);
            info = {
                "Green_Zone": "Drawdown >= -2.0% (Near Highs)",
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
            const segmentColor = target_pct > 0 ? '#28a745' : 'red';
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
            const ts = data.providerPublishTime || data.publishTime || data.pubDate || data.displayTime;
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

    createTabContent(tabContent, className, negativeValuesInRed, 
                                    listOfKeysToBeShownInTab, arrayKeyWithColors) {
                                        
        let tabContentDiv = document.createElement('div');
        tabContentDiv.className = className;

        
        try {
            const data = JSON.parse(tabContent);
            tabContentDiv.innerHTML = this._generateHtml(data, 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors);
        } catch (e) {
            tabContentDiv.innerHTML = tabContent;
        }

        tabContentDiv.style.fontFamily = 'Arial';

        return tabContentDiv;
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

    createStockPricePlot(data, className, analysisSegments, highlightPointsOnPlot = []) {
        let tabContentDiv = document.createElement('div');
        tabContentDiv.className = className;
        tabContentDiv.style.padding = '20px';
        tabContentDiv.style.backgroundColor = '#fff';

        try {
            // Check for valid data for plotting
            if (!Array.isArray(data) || data.length === 0 || data[0].stock_price === undefined) {
                tabContentDiv.innerHTML = this._generateHtml(data, 1, true, []);

                tabContentDiv = this.appendDisclaimer(tabContentDiv);
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

            // Requirement 1 & 2: Area fill under the curve as separate method
            this._drawAreaFill(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, analysisSegments);

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

                const segmentMatch = (analysisSegments || []).find(seg => i > seg.start && i <= seg.end);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineWidth = segmentMatch ? baseLineWidth + 1 : baseLineWidth;
                ctx.strokeStyle = segmentMatch ? segmentMatch.color : 'black';
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

            this._highlightPointsOnPlot(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, highlightPointsOnPlot);

        } catch (e) {
            tabContentDiv.innerHTML = "Plot Generation Error: " + e.message;
        }

        return tabContentDiv;
    }

    _drawAreaFill(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, analysisSegments) {
        if (data.length < 2) return;

        // Requirement 3: Determine base gradient color based on total return
        const firstPrice = parseFloat(data[0].stock_price);
        const lastPrice = parseFloat(data[data.length - 1].stock_price);
        const baseFillColor = (lastPrice >= firstPrice) ? 'rgba(74, 138, 248, 0.8)' : 'rgba(231, 63, 181, 0.91)';
        const bottomY = padding.top + chartHeight;

        // Draw area fill in slices to handle segment-specific colors
        for (let i = 1; i < data.length; i++) {
            const prev = data[i - 1];
            const curr = data[i];

            const x1 = padding.left + ((i - 1) / (data.length - 1)) * chartWidth;
            const x2 = padding.left + (i / (data.length - 1)) * chartWidth;
            const y1 = padding.top + chartHeight - ((parseFloat(prev.stock_price) - minPrice) / priceRange) * chartHeight;
            const y2 = padding.top + chartHeight - ((parseFloat(curr.stock_price) - minPrice) / priceRange) * chartHeight;

            // Requirement 4: Fill color gradient for segments
            const segmentMatch = (analysisSegments || []).find(seg => i > seg.start && i <= seg.end);
            let sliceColor = segmentMatch ? segmentMatch.color : baseFillColor;

            // Start gradient at the top of the current slice to ensure even intensity along the curve
            const yTop = Math.min(y1, y2);
            const gradient = ctx.createLinearGradient(0, yTop, 0, bottomY);
            
            // If using a segment color string directly, we wrap it in a save/restore with globalAlpha
            // to ensure it is "light" as requested.
            ctx.save();
            if (segmentMatch) ctx.globalAlpha = 0.7; 
            gradient.addColorStop(0, sliceColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fade to transparent towards x-axis

            ctx.beginPath();
            ctx.moveTo(x1, bottomY);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2, bottomY);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        }
    }

    _highlightPointsOnPlot(ctx, data, padding, chartWidth, chartHeight, minPrice, priceRange, highlightPoints) {
        if (!highlightPoints || !Array.isArray(highlightPoints)) return;

        highlightPoints.forEach(item => {
            const idx = data.findIndex(d => d.date_time === item.date);
            if (idx === -1) return;

            const x = data.length > 1 ? padding.left + (idx / (data.length - 1)) * chartWidth : padding.left + chartWidth / 2;
            const y = padding.top + chartHeight - ((parseFloat(data[idx].stock_price) - minPrice) / priceRange) * chartHeight;

            // Requirement 5: Mark a vertical-line of 5px width from point-on-curve to x-axis
            ctx.save();
            ctx.strokeStyle = item.color || 'red';
            ctx.lineWidth = 5;
            ctx.globalAlpha = 0.2; // Keep it semi-transparent so it doesn't obscure the curve
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
            ctx.restore();

            const radius = 5;
            ctx.fillStyle = item.color || 'red';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    _generateHtml(obj, level = 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors) {
        let html = '';
        const tab = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);

        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            for (const [key, value] of Object.entries(obj)) {
                if (listOfKeysToBeShownInTab.includes(key) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    html += this._generateTabbedHtml(key, value, level, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors);
                    continue;
                }
                let key_temp = this._remove_underscore(key);
                html += `<div>${tab}<strong style="color: blue;">${key_temp}</strong>: `;

                if (Array.isArray(value)) {
                    if (value.length === 0) {
                        html += `NONE`;
                    } else {
                        const colors = (arrayKeyWithColors && arrayKeyWithColors.key === key) ? arrayKeyWithColors.colors : null;
                        html += `<br>` + this._generateTableHtml(value, level, negativeValuesInRed, colors);
                    }
                } else if (typeof value === 'object' && value !== null) {
                    html += `<br>${this._generateHtml(value, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors)}`;
                } else {
                    const isNegative = negativeValuesInRed && this.hasNegativeValue(value);
                    const colorStyle = isNegative ? 'style="color: red;"' : '';
                    html += `<span ${colorStyle}>${value}</span>`;
                }
                html += `</div><br>`;
            }
        } else if (Array.isArray(obj)) {
            if (obj.length === 0) {
                html += `<div>${tab}NONE</div>`;
            } else {
                obj.forEach((item, index) => {
                    html += `<div>${tab}${index + 1}. ${this._generateHtml(item, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors)}</div>`;
                });
            }
        } else {
            const isNegative = negativeValuesInRed && this.hasNegativeValue(obj);
            const colorStyle = isNegative ? 'style="color: red;"' : '';
            html += `<span ${colorStyle}>${obj}</span>`;
        }
        return html;
    }

    _remove_underscore(d) {
        let d1 = d.replace(/_/g, ' ');
        return d1;
    }

    _generateTabbedHtml(key, value, level, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors) {
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
            html += this._generateHtml(stockData, level + 1, negativeValuesInRed, listOfKeysToBeShownInTab, arrayKeyWithColors);
            html += `</div>`;
        });
        html += `</div>`;
        return html;
    }

    _generateTableHtml(value, level, negativeValuesInRed, colors) {
        let html = `<table style="border-collapse: collapse; width: auto; margin-left: ${level * 20}px; border: 1px solid blue;">`;
        value.forEach((item, index) => {
            const bgColor = index % 2 === 0 ? 'white' : 'lightblue';
            const isNegative = this.hasNegativeValue(item);
            
            let textColor = (negativeValuesInRed && isNegative) ? 'red' : 'black';
            if (colors && colors.length > 0) {
                textColor = colors[index % colors.length];
            }
            
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

        this.gaTracker.trackPageView(`sector-${sector}-page`);

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
            this.appendDisclaimer();
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
            let listOfKeysToBeShownInTab = ['DII_FII_sector_keys']

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.appendDisclaimer();
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

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.appendDisclaimer();
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
            let listOfKeysToBeShownInTab = ['sectors']

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.appendDisclaimer();
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

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.appendDisclaimer();
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
            let listOfKeysToBeShownInTab = ['related_companies']

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.appendDisclaimer();
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
            let listOfKeysToBeShownInTab = ['related_companies']

            let tabContentDiv = this.createTabContent(result1, 'tabContent active',
                                        negativeValuesInRed, listOfKeysToBeShownInTab);

            this.popoutMgr.appendItem(tabContentDiv);
            this.appendDisclaimer();
            this.popoutMgr.showPopout();
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

        const requestTypes = ['STOCK_BASICS'];
        if (analysisType === 'ANALYSIS_EVENT_TIMELINE') {
            requestTypes.push('STOCK_EVENTS');
        }
        if (analysisType === 'ANALYSIS_PEER_COMPARISON') {
            requestTypes.push('STOCK_PEER_COMPARISON');
        }

        const data = { type: requestTypes, name: stockName, period: period, analysis_type: analysisType };
        basicInitializer.makeServerRequest('/general_stock_analysis_info', data, (response) => {
            const ticker = response['stock-ticker'];
            let info = response.STOCK_BASICS;
            let events = response.STOCK_EVENTS;
            let peersData = response.STOCK_PEER_COMPARISON || {};
            const error = response.error;

            if (error && typeof error === 'string' && error.trim() !== "") {
                errorManager.showError(1045, error);
                return;
            }

            const result1 = info || "No analysis data available.";
            let priceData;
            try {
                priceData = JSON.parse(result1);
            } catch (e) {
                priceData = result1;
            }
            
            events = this._massageRawStockEvents(events, period);

            this.popoutMgr.clear();

            const headerJson = this._generatePlotHeaderInfoJson(ticker, period);
            let headerTab = this.createTabContent(headerJson, 'tabContent active', false, []);
            headerTab.style.marginLeft = '20px';
            headerTab.style.marginTop = '15px';
            this.popoutMgr.appendItem(headerTab);

            const analysisResult = this.computeAnalysisSegments(priceData, events);

            let analysisInfoTab = this.createTabContent(analysisResult.infoJson, 'tabContent active', false, [], 
                                        { key: 'Events', colors: this.STOCK_EVENT_COLORS });
            analysisInfoTab.style.marginLeft = '20px';
            this.popoutMgr.appendItem(analysisInfoTab);

            let tabContentDiv_1 = this.createStockPricePlot(analysisResult.data, 'tabContent active', analysisResult.segments, analysisResult.highlightPoints);
            this.popoutMgr.appendItem(tabContentDiv_1);


            const insightsHeader = document.createElement('h3');
            insightsHeader.innerText = "Stock Insights";
            insightsHeader.style.marginLeft = '20px';
            insightsHeader.style.fontFamily = 'Arial';
            this.popoutMgr.appendItem(insightsHeader);
            let insights_xml = this.getStockPriceInsights(result1);
            let tabContentDiv_2 = this.createTabContent(insights_xml, 'tabContent active', true, []);
            this.popoutMgr.appendItem(tabContentDiv_2);

            if (analysisType === 'ANALYSIS_WEEKLY_AVG_RETURN') {
                const insightsHeader = document.createElement('h3');
                insightsHeader.innerText = "Stock Advance Insights";
                insightsHeader.style.marginLeft = '20px';
                insightsHeader.style.fontFamily = 'Arial';
                this.popoutMgr.appendItem(insightsHeader);
                let insights_xml = this.getAvgWeeklyReturn(result1);
                let tabContentDiv_2 = this.createTabContent(insights_xml, 'tabContent active', true, []);
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
                    this.popoutMgr.appendItem(this.createTabContent(peerAnalysis.infoJson, 'tabContent active', false, []));
                    this.popoutMgr.appendItem(this.createStockPricePlot(peerAnalysis.data, 'tabContent active', peerAnalysis.segments));
                }
            }

            this.appendDisclaimer();
            this.popoutMgr.showPopout();
        }, (error) => {
            errorManager.showError(2044, error);
        });
    }

    _generatePlotHeaderInfoJson(stockName, period) {
        const analysisTypeDropdown = document.getElementById("analysis-type-dropdown");
        const analysisTypeText = analysisTypeDropdown ? analysisTypeDropdown.options[analysisTypeDropdown.selectedIndex].text : "N/A";

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
            ]
        };

        return JSON.stringify(insights);
    }

    getAvgWeeklyReturn(result1) {
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