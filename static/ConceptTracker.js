class ConceptTracker {
    constructor(containerId, headerExplanation = '', options = { color: 'black', font: 'Arial', bold: false }) {
        this.container = document.getElementById(containerId);
        this.sendButton = document.getElementById('sendButton');
        this.detailExplanationContainer = document.getElementById('result1');
        this.renderOptions = options;
        this.levelStrings = [];
        this.originalLevelStrings = []; // Store the original strings
        this.comments = {};
        this.originalColors = {}; // Store original colors for each level
        this.ALL_TITLES_LEVEL = -1;
        this.currentLevel = this.ALL_TITLES_LEVEL;
        this.INIT_LEVEL = 0;
        this.headerExplanation = headerExplanation;
        this.commentStyle = {
            font: 'Arial',
            color: 'gray',
            bold: false,
        };
    }

    // API to intake or set the list of level-strings
    setLevelStrings(levelStrings) {
        this.levelStrings = levelStrings.map((str, index) => this._ensureNumberedLevel(str, index + 1));
        this.originalLevelStrings = [...this.levelStrings]; // Save original strings
        this.render();
    }

    // Ensures that the string starts with a number, if not, prepends it
    _ensureNumberedLevel(str, level) {
        const regex = /^\d+\./;
        return regex.test(str) ? str : `${level}. ${str}`;
    }

    // Detect and modify the list to number the strings if needed
    detectAndModifyLevels() {
        this.levelStrings = this.levelStrings.map((str, index) => this._ensureNumberedLevel(str, index + 1));
        this.render();
    }

    // Render level strings inside container with default styles
    render(options = this.renderOptions) {

        this.renderOptions = options;

        this.container.innerHTML = ''; // Clear container

        // Add the header explanation first
        if (this.headerExplanation) {
            const headerDiv = document.createElement('div');
            headerDiv.innerText = this.headerExplanation;
            headerDiv.style.fontWeight = 'bold';
            this.container.appendChild(headerDiv);
        }

        // Render each level string with a tab before it and comment if any
        this.levelStrings.forEach((str, index) => {
            const div = document.createElement('div');
            const [number, text] = this._splitNumberFromText(str);

            // Create separate spans for number and text
            const numberSpan = document.createElement('span');
            numberSpan.innerText = number;

            const textSpan = document.createElement('span');
            textSpan.innerText = text;
            textSpan.style.color = this.originalColors[index + 1] || this.renderOptions.color; // Use original or default color
            textSpan.style.fontFamily = this.renderOptions.font;
            textSpan.style.fontWeight = this.renderOptions.bold ? 'bold' : 'normal';

            div.dataset.level = index + 1;
            div.appendChild(numberSpan);
            div.appendChild(textSpan);
            this.container.appendChild(div);

            // Add comment if exists
            if (this.comments[index + 1]) {
                const commentDiv = this._createCommentDiv(this.comments[index + 1]);
                this.container.appendChild(commentDiv);
            }
        });
    }

    // Helper to split number and text from a level string
    _splitNumberFromText(str) {
        const match = str.match(/^(\d+\.)\s*(.*)/);
        if (match) {
            return [match[1] + ' ', match[2]];
        }
        return ['', str]; // If no match, return whole string as text
    }

    // Helper to create comment div
    _createCommentDiv(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.innerText = `\t\t${comment}`;
        commentDiv.style.color = this.commentStyle.color;
        commentDiv.style.fontFamily = this.commentStyle.font;
        commentDiv.style.fontWeight = this.commentStyle.bold ? 'bold' : 'normal';
        commentDiv.style.fontSize = 'smaller'; // Comment one size smaller
        return commentDiv;
    }

    // API to change color of any level-string (only the string part, not the number)
    changeColor(level, color) {
        const div = this.container.querySelector(`[data-level='${level + 1}'] span:last-child`);
        if (div) {
            this.originalColors[level] = color;
            div.style.color = color;
        }
    }

    // API to reset color of a level-string to the original color
    resetColor(level) {
        const div = this.container.querySelector(`[data-level='${level + 1}'] span:last-child`);
        if (div && this.originalColors[level]) {
            div.style.color = '';
            delete this.originalColors[level];
        }
    }

    // API to return number of level-strings
    getNumberOfLevels() {
        return this.levelStrings.length;
    }

    // API to change any level-string to underline or not
    setUnderline(level, underline) {
        const div = this.container.querySelector(`[data-level='${level + 1}'] span:last-child`);
        if (div) {
            div.style.textDecoration = underline ? 'underline' : 'none';
        }
    }

    // API to get max level
    getMaxLevel() {
        return this.levelStrings.length;
    }

    // API to set next level
    setNextLevel() {
        if (this.currentLevel < this.getMaxLevel()) {
            this.currentLevel += 1;
            this.sendButton.innerText = "Explain Next";
        }
    }

    isMaxLevelReached() {
        if (this.currentLevel >= this.getMaxLevel()) {
            return true;
        } else {
            return false;
        }
    }

    // API to check if current level is init-level
    isInitLevel() {
        return this.currentLevel === this.ALL_TITLES_LEVEL;
    }

    // API to get/set current level
    getCurrentLevel() {
        return this.currentLevel;
    }

    setCurrentLevel(level) {
        if (level >= this.INIT_LEVEL && level <= this.getMaxLevel()) {
            this.currentLevel = level;
        }
    }

    // API to get the title at a specific level
    getLevelTitle(level) {
        return this.levelStrings[level - this.INIT_LEVEL] || null;
    }

    // API to get the title at current level
    getCurrentLevelTitle() {
        return this.getLevelTitle(this.currentLevel);
    }

    // API to set a comment under a specific level
    setComment(level, commentString) {
        this.comments[level] = commentString;
        this.render();
    }

    // API to set the style of comments
    setCommentStyle(font, color, bold) {
        this.commentStyle = { font, color, bold };
        this.render();
    }

    // API to clear the comment for a specific level
    clearComment(level) {
        delete this.comments[level];
        this.render();
    }

    setInitLevel() {
        this.currentLevel = this.ALL_TITLES_LEVEL;
        this.levelStrings = [...this.originalLevelStrings];
        this.originalColors = {};
        this.comments = {};
        this.render();

        this.sendButton.innerText = "Start Explanation";
        this.detailExplanationContainer.innerHTML = '';
    }

    // API to reset the class to original state
    reset() {
        this.setInitLevel();
        this.levelStrings = [];
        this.comments = {};
        this.originalColors = {};
        this.render();
    }
}
