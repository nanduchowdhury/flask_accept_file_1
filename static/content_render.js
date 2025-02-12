"use strict";


class YoutubeManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
    }

    showById(videoId) {
        // Create an iframe to embed the YouTube video
        const iframe = document.createElement("iframe");
        iframe.width = "360"; // Width of the video
        iframe.height = "315"; // Height of the video
        iframe.src = `https://www.youtube.com/embed/${videoId}`; // YouTube embed URL
        iframe.title = "YouTube video player";
        iframe.frameBorder = "0"; // No border
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true; // Allow fullscreen playback

        // Clear the container (if needed) and append the iframe
        this.container.innerHTML = ""; // Clear any existing content

        // Add other flexbox properties to center content
        this.container.style.display = "flex";
        this.container.style.justifyContent = "center"; // Center horizontally
        this.container.style.alignItems = "center";     // Center vertically

        this.container.appendChild(iframe);
    }

    getYouTubeVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|embed|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null; // Return the video ID or null if no match
    }

    showByUrl(videoUrl) {
        try {

            const videoId = this.getYouTubeVideoId(videoUrl);
            if(videoId) {
                this.showById(videoId);
            } else {
                console.error("Could not extract video ID from URL.");
            }
        } catch (error) {
            console.error("Invalid URL format:", error);
        }
    }
}

// Base class with virtual onSelected() method
class TripleDotMenuBase {
    onSelected() {
        console.warn("onSelected() needs to be implemented by the caller!");
    }

    makeServerRequest(requestRoute, data, lamdaOnServerRequestSuccess, lamdaOnServerRequestFailure) {
        fetch(requestRoute, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error);
                });
            }
            return response.json();
        })
        .then(data => {
            lamdaOnServerRequestSuccess(data);
        })
        .catch(error => {
            let message = error.message;

            lamdaOnServerRequestFailure(message);
        });
    }

}

// TripleDot class to handle menu creation and event handling
class TripleDot {
    constructor(dotElementId, menuElementId, menuItemsMap) {
        this.dotElement = document.getElementById(dotElementId);
        this.menuElement = document.getElementById(menuElementId);
        this.menuItemsMap = menuItemsMap;

        this.createMenu();
        this.attachEventListeners();
    }

    createMenu() {
        // Create menu container
        this.menu = document.createElement('div');
        this.menu.classList.add('triple-dot-menu');
        this.menu.style.display = 'none'; // Initially hidden
        document.body.appendChild(this.menu);

        // Add menu items
        for (const [item, handlerObj] of Object.entries(this.menuItemsMap)) {
            const menuItem = document.createElement('div');
            menuItem.classList.add('menu-item');
            menuItem.innerText = item;
            menuItem.addEventListener('click', () => {
                this.menu.style.display = 'none';
                if (handlerObj) {
                    handlerObj.onSelected(item);
                }
            });
            this.menu.appendChild(menuItem);
        }
    }

    attachEventListeners() {
        document.querySelectorAll('.triple-dot').forEach(dot => {
            dot.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent unwanted close

                // Get dot position & set menu position dynamically
                const rect = dot.getBoundingClientRect();

                const menu_left = rect.left + window.scrollX;
                const menu_top = rect.top + window.scrollY;

                this.menu.style.left = `${menu_left}px`;
                this.menu.style.top = `${menu_top}px`;
                this.menu.style.display = 'block';
            });
        });

        // Hide menu when clicking elsewhere
        document.addEventListener('click', () => {
            this.menu.style.display = 'none';
        });
    }

    toggleMenu() {
        this.menuElement.classList.toggle('show-menu');
    }

    closeMenu() {
        this.menuElement.classList.remove('show-menu');
    }
}

class TranslateLanguage extends TripleDotMenuBase {
    constructor(JsonData) {
        super();
        this.JsonData = JsonData;

        this.currentLanguage = 'English';
        this.supportedLanguages = ['Hindi', 'Telugu', 'Bengali', 'English'];
    }

    createPopupAndGetRadioSettings(listOfRadioItemNames, defaultSelected) {
        return new Promise((resolve) => {
          // Create a popup container
          const popupContainer = document.createElement('div');
          popupContainer.style.position = 'fixed';
          popupContainer.style.top = '50%';
          popupContainer.style.left = '50%';
          popupContainer.style.transform = 'translate(-50%, -50%)';
          popupContainer.style.padding = '20px';
          popupContainer.style.border = '1px solid #ccc';
          popupContainer.style.backgroundColor = 'white';
          popupContainer.style.zIndex = '1000';
          popupContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
          popupContainer.style.borderRadius = '8px';
      
          // Add radio buttons to the popup
          listOfRadioItemNames.forEach((item) => {
            const radioContainer = document.createElement('div');
            radioContainer.style.marginBottom = '12px'; // Add spacing between radio buttons
      
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'popupRadioGroup';
            radioInput.value = item;
            if (item === defaultSelected) {
              radioInput.checked = true;
            }
      
            const label = document.createElement('label');
            label.textContent = item;
            label.style.marginLeft = '5px';
      
            radioContainer.appendChild(radioInput);
            radioContainer.appendChild(label);
            popupContainer.appendChild(radioContainer);
          });
      
          // Create OK button
          const okButton = document.createElement('button');
          okButton.textContent = 'OK';
          okButton.style.marginRight = '10px';
          okButton.onclick = () => {
            const selectedRadio = document.querySelector('input[name="popupRadioGroup"]:checked');
            document.body.removeChild(popupContainer);
            resolve(selectedRadio ? selectedRadio.value : null);
          };
      
          // Create Cancel button
          const cancelButton = document.createElement('button');
          cancelButton.textContent = 'Cancel';
          cancelButton.onclick = () => {
            document.body.removeChild(popupContainer);
            resolve(null);
          };
      
          popupContainer.appendChild(okButton);
          popupContainer.appendChild(cancelButton);
      
          // Append the popup to the body
          document.body.appendChild(popupContainer);
        });
    }
      
    onSelected() {

        // Create a new list excluding the current language
        const filteredLanguages = this.supportedLanguages.filter(
            (language) => language !== this.currentLanguage
        );

        this.createPopupAndGetRadioSettings(filteredLanguages, filteredLanguages[0]).then((selectedValue) => {
            if ( selectedValue ) {
                this.currentLanguage = selectedValue;
                this.makeServerRequestForLanguageTranslation();
            }
          });
    }


    makeServerRequestForLanguageTranslation() {

        const data = {
            action: this.currentLanguage,
            section: this.JsonData.section,
            topic: this.JsonData.topic
        };

        this.makeServerRequest('/content_triple_dot_action_km', data, 
            this.lamdaOnBasicInitRequestSuccess, this.lamdaOnBasicInitRequestFailure);
    }

    lamdaOnBasicInitRequestSuccess = (data) => {
        let ViewArea_1 = document.getElementById('ViewArea_1');
        
        ViewArea_1.innerHTML = data.content;
    }

    lamdaOnBasicInitRequestFailure = (msg) => {
        
    }
}

class TryAnotherVideo extends TripleDotMenuBase {
    constructor(JsonData) {
        super();
        this.JsonData = JsonData;

        this.lastYoutubeVideoIndex = 0;
    }

    onSelected() {

        this.youtubeMgr = new YoutubeManager('ViewArea_2');

        if ( this.lastYoutubeVideoIndex >= this.JsonData.youtube_response.length ) {
            this.lastYoutubeVideoIndex = 0;
        } else {
            this.lastYoutubeVideoIndex++;
        }

        this.youtubeMgr.showByUrl(this.JsonData.youtube_response[this.lastYoutubeVideoIndex]);
    }
}



