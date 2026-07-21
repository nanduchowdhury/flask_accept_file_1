"use strict";

class ManageRotatingBanner {
    constructor(containerId, contentId) {
        this.container = document.getElementById(containerId);
        this.content = document.getElementById(contentId);
    }

    /**
     * Initializes the banner by fetching sector data.
     * @param {string} jsonUrl - Path to the sector summary JSON.
     */
    async init(jsonUrl) {
        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            if (data && data.all_sectors) {
                const sectors = Object.entries(data.all_sectors);
                const itemSeparator = "\u00A0\u00A0\u00A0\u00A0"; // Space between sectors
                const groupSeparator = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"; // Space between periods

                const metrics = [
                    { label: "last week return", key: "last_week_return_pct" },
                    { label: "last 2 qtrs return", key: "last_2_qtrs_return_pct" },
                    { label: "last 6 months return", key: "last_6_month_return_pct" },
                    { label: "last 1 year return", key: "last_1_year_return_pct" }
                ];

                const fullContent = metrics.map(m => {
                    const sectorStrings = sectors.map(([name, info]) => {
                        const val = info[m.key];
                        if (val === undefined || val === null) return null;
                        const isNegative = val < 0;
                        const colorClass = isNegative ? 'banner-neg-val' : 'banner-pos-val';
                        const displayName = name.toLowerCase().replace(/_/g, '-');
                        return `${displayName} : <span class="${colorClass}">${val}%</span>`;
                    }).filter(s => s !== null).join(itemSeparator);

                    return `<span style="color: blue; text-decoration: underline;">[${m.label}]</span>${itemSeparator}${sectorStrings}`;
                }).join(groupSeparator);

                this.content.innerHTML = fullContent + groupSeparator;
                this.setSpeed(180); // Increased duration to reduce rotation speed
                this.start();
            }
        } catch (error) {
            console.error("ManageRotatingBanner Error:", error);
            if (this.content) this.content.innerText = "Market Data Temporarily Unavailable";
        }
    }

    start() {
        if (this.content) this.content.style.animationPlayState = 'running';
    }

    stop() {
        if (this.content) this.content.style.animationPlayState = 'paused';
    }

    /**
     * @param {number} seconds - Duration of one scroll loop. Lower is faster.
     */
    setSpeed(seconds) {
        if (this.content) this.content.style.animationDuration = `${seconds}s`;
    }
}
