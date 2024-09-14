"use strict"; 

class PostItNote {

    currentUtterance = null;

    constructor(tab1Content = '', tab2Content = '') {
        try {
            this.tab1Content = tab1Content;
            this.tab2Content = tab2Content;

            this.createLanguageMap();

            this.postItNote = document.createElement('div');
            this.postItNote.className = 'postItNote';

            let tabContainer = document.createElement('div');
            tabContainer.className = 'tabContainer';

            this.tab1Button = this.createTabButtonWithSpeakers('eng', this.tab1Content);
            tabContainer.appendChild(this.tab1Button);

            this.tab2Button = this.createTabButtonWithSpeakers('hindi', this.tab2Content);
            tabContainer.appendChild(this.tab2Button);
            
            this.postItNote.appendChild(tabContainer);

            this.tab1ContentDiv = this.attachTabContent(tab1Content, 'tabContent active');
            this.postItNote.appendChild(this.tab1ContentDiv);

            this.tab2ContentDiv = this.attachTabContent(tab2Content, 'tabContent');
            this.postItNote.appendChild(this.tab2ContentDiv);

            this.arrow = document.createElement('div');
            this.arrow.className = 'arrow';
            this.postItNote.appendChild(this.arrow);

            this._addEventListeners();
            this._appendToResultArea();
        } catch (error) {
            errorManager.showError(1002, error.message);
        }
    }

    createLanguageMap() {
        try {
            this.langMap = new Map([
            ['hi-IN', 'hindi'],
            ['bn-IN', 'bengali'],
            ['en-US', 'english']
            ]);
        } catch (error) {
            errorManager.showError(1003, error.message);
        }
    }

    attachTabContent(tabContent, className) {
        try {
            let tabContentDiv = document.createElement('div');
            tabContentDiv.className = className;
            tabContentDiv.innerText = tabContent;

            return tabContentDiv;
        } catch (error) {
            errorManager.showError(1004, error.message);
        }
    }

    createTabButtonWithSpeakers(tabText, tabContent) {
        try {
            let tabButton = document.createElement('div');
            tabButton.className = 'tabButton active';
            tabButton.innerText = tabText;

            let [tabSpeakerIcon, tabStopIcon] = 
                this.createSpeakerIcons(tabButton, tabContent);

            return tabButton;
        } catch (error) {
            errorManager.showError(1005, error.message);
        }
    }

    createSpeakerIcons(container, text2speak) {
        try {
            let startIcon = document.createElement('i');
            startIcon.className = 'fas fa-volume-up speaker-icon';
            startIcon.onclick = () => this.speakText(startIcon, text2speak);
            container.appendChild(startIcon);

            let stopIcon = document.createElement('i');
            stopIcon.className = 'fas fa-stop stop-icon';
            stopIcon.style.display = 'none';
            stopIcon.onclick = () => this.stopText(stopIcon);
            container.appendChild(stopIcon);

            return [startIcon, stopIcon];
        } catch (error) {
            errorManager.showError(1006, error.message);
        }
    }

    speakText(icon, text2speak) {
        try {
            const text = text2speak;
            const utterance = new SpeechSynthesisUtterance(text);
            this.currentUtterance = utterance;

            // Set language based on text content or other criteria
            if (text.match(/[\u0900-\u097F]/)) { // Hindi
                utterance.lang = 'hi-IN';
            } else if (text.match(/[\u0980-\u09FF]/)) { // Bengali
                utterance.lang = 'bn-IN';
            } else { // Default to English
                utterance.lang = 'en-US';
            }

            // Find and assign an appropriate voice
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(voice => voice.lang === utterance.lang);
            if (voice) {
                utterance.voice = voice;
            } else {
                errorManager.showInfo(1001, this.langMap.get(utterance.lang), utterance.lang);
                return;
            }

            // Toggle icons
            icon.style.display = 'none';
            icon.nextElementSibling.style.display = 'inline-block';

        utterance.onend = function() {
                icon.style.display = 'inline-block';
                icon.nextElementSibling.style.display = 'none';
            };

            speechSynthesis.speak(utterance);
        } catch (error) {
            errorManager.showError(1007, error.message);
        }
    }

    stopText(stopElement) {
        try {
            if (this.currentUtterance) {
                speechSynthesis.cancel();
                stopElement.style.display = 'none';
                stopElement.previousElementSibling.style.display = 'inline-block';
            }
        } catch (error) {
            errorManager.showError(1008, error.message);
        }
    }

    _addEventListeners() {
        try {
            this.tab1Button.addEventListener('click', () => {
                this.tab1ContentDiv.classList.add('active');
                this.tab2ContentDiv.classList.remove('active');
                this.tab1Button.classList.add('active');
                this.tab2Button.classList.remove('active');
            });

            this.tab2Button.addEventListener('click', () => {
                this.tab1ContentDiv.classList.remove('active');
                this.tab2ContentDiv.classList.add('active');
                this.tab1Button.classList.remove('active');
                this.tab2Button.classList.add('active');
            });

            this.arrow.addEventListener('click', (event) => {
                this.postItNote.classList.toggle('collapsed');
                event.stopPropagation(); // Prevents the event from bubbling up to the postItNote
            });
        } catch (error) {
            errorManager.showError(1009, error.message);
        }
    }

    _appendToResultArea() {
        try {
            const resultArea = document.getElementById('result1');
            resultArea.appendChild(this.postItNote);
        } catch (error) {
            errorManager.showError(1010, error.message);
        }
    }

    setTabTitle(tabIndex, title) {
        try {
            /*
            if (tabIndex === 1) {
                this.tab1Button.innerText = title;
            } else if (tabIndex === 2) {
                this.tab2Button.innerText = title;
            }
            */
        } catch (error) {
            errorManager.showError(1011, error.message);
        }
    }
}
