class ConceptTracker {

    ALL_TITLES_LEVEL = -1;
    FIRST_TITLE_LEVEL = 0;

    constructor() {
        this.currentLevel = this.ALL_TITLES_LEVEL;
        console.log(this.currentLevel);
        this.maxLevel = this.ALL_TITLES_LEVEL;
        this.levelTitles = new Map();
    }
    setMaxLevel(max) {
        if ( max >= this.FIRST_TITLE_LEVEL ) {
            this.maxLevel = max;
            for (let i = this.FIRST_TITLE_LEVEL; i < max; i++) {
                this.levelTitles.set(i, '');
              }
        }
    }
    getMaxLevel() {
        return this.maxLevel;
    }
    isInitLevel() {
        if ( this.currentLevel == this.ALL_TITLES_LEVEL ) {
            return true;
        }
        return false;
    }
    setNextLevel() {
        this.currentLevel++;
        if ( this.currentLevel >= this.maxLevel ) {
            this.currentLevel = this.maxLevel;
        }
    }
    setCurrentLevel(level) {
        if ( level < this.maxLevel && level >= this.FIRST_TITLE_LEVEL ) {
            this.currentLevel = level;
        }
    }
    getCurrentLevel() {
        return this.currentLevel;
    }
    setLevelTitle(level, title) {
        if ( level < this.maxLevel && level >= this.FIRST_TITLE_LEVEL ) {
            this.levelTitles.set(level, title);
        }
    }
    getLevelTitle(level) {
        let title = 'undefined topic';
        if ( level < this.maxLevel && level >= this.FIRST_TITLE_LEVEL ) {
            title = this.levelTitles.get(level);
        }
        return title;
    }
    getCurrentLevelTitle() {
        return this.getLevelTitle(this.getCurrentLevel());
    }
}
