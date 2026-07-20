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
                const period = (data.header && data.header.period) ? data.header.period : "weekly avg return";
                const sectorStrings = Object.entries(data.all_sectors).map(([name, info]) => {
                    // Clean "Nifty " prefix for a cleaner look
                    const displayName = name;
                    const value = info.weekly_avg_return;
                    const isNegative = value.startsWith('-');
                    const colorClass = isNegative ? 'banner-neg-val' : 'banner-pos-val';
                    return `${displayName} : <span class="${colorClass}">${value}</span>`;
                });

                // Use non-breaking spaces for a wide separator
                const separator = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
                this.content.innerHTML = "[ " + period + " ]    " + 
                            sectorStrings.join(separator) + separator;
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
