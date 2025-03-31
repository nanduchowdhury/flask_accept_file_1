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

    clear() {
        this.container.innerHTML = "No youtube video available";
    }

    getYouTubeVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|embed|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null; // Return the video ID or null if no match
    }

    showByUrl(videoUrl) {
        try {

            this.clear();

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

    updateJsonData(jsonData) {
        
        for (const [item, handlerObj] of Object.entries(this.menuItemsMap)) {
            if (handlerObj) {
                handlerObj.updateJsonData(jsonData);
            }
        }
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
                setTimeout(() => {
                    this.menu.style.display = 'none';
                }, 2000); // menu disappear after 2000ms = 2 seconds
            
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

    updateJsonData(jsonData) {
        this.JsonData = jsonData;
    }

    resetCurrentLanguage() {
        this.currentLanguage = 'English';
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

                window.errorManager.showInfo(2064, this.currentLanguage);

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
        
        let htmlContent = data.content.replace(/^```html\n|```$/g, '').trim();

        const iframeRender = new HtmlIframeRender();
        iframeRender.render(ViewArea_1, htmlContent);

        window.errorManager.log(2063, this.currentLanguage);
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

    updateJsonData(jsonData) {
        this.JsonData = jsonData;
    }

    onSelected() {

        this.youtubeMgr = new YoutubeManager('ViewArea_2');

        if ( this.lastYoutubeVideoIndex >= this.JsonData.youtube_response.length - 1 ) {
            this.lastYoutubeVideoIndex = 0;
        } else {
            this.lastYoutubeVideoIndex++;
        }

        const url = this.JsonData.youtube_response[this.lastYoutubeVideoIndex];
        this.youtubeMgr.showByUrl(url);

        window.errorManager.log(2062, url);
    }
}

class ContentRender {
    constructor(jsonData) {
        this.jsonData = jsonData;

        const gaTracker = new GoogleAnalytics();
        gaTracker.trackPageView(this.jsonData.section);

        const menuObj = new TripleDashMenuCreator("TripleDashMenuContainer");
        
        this.learnMoreButton = document.getElementById("learnMoreButton");
        this.topicLabelName = document.getElementById("topicLabelName");
        this.topicLabel = document.getElementById('topic-label');
        this.viewArea_1 = document.getElementById('ViewArea_1');
        this.viewArea_2 = document.getElementById('ViewArea_2');

        this.youtubeMgr = new YoutubeManager('ViewArea_2');

        document.getElementById("learnMoreButton").addEventListener("click", this.onLearnMoreButtonClick.bind(this));

        this.createTripleDotMenu(this.jsonData);
        this.update();
        this.logGeoLocation();

        this.showTipsLearnMore = new ShowTips('learnMoreButton');
        this.showTipsLearnMore.show("Click here to learn more");

        this.showTipsJoinFB = new ShowTips('');
        this.showTipsJoinFB.show("If you like the portal,\nplease follow the social links below.", 100);

        // window.errorManager.log(2060, this.jsonData.section, this.jsonData.topic);

        this.alreadyDoneTopicList = [];
    }

    createTripleDotMenu(JsonData) {

        this.translateLanguage = new TranslateLanguage(JsonData);
        this.tryAnotherVideo = new TryAnotherVideo(JsonData);

        const menuActions = {
            "Translate language": this.translateLanguage,
            "Try another YouTube video": this.tryAnotherVideo
        };

        // Initialize TripleDot with menu items and their respective handlers
        this.tripleDot = new TripleDot('triple-dot', 'dropdown-menu', menuActions);
    }

    onLearnMoreButtonClick() {

        window.errorManager.showInfo(2066);

        const data = {
            section: this.jsonData.section,
            alreadyDoneTopicList: this.alreadyDoneTopicList
        };

        window.basicInitializer.makeServerRequest('/content_learn_more', data, 
        this.lamdaOnBasicInitRequestSuccess, this.lamdaOnBasicInitRequestFailure);
    }

    lamdaOnBasicInitRequestSuccess = (data) => {

        this.jsonData = data;

        this.alreadyDoneTopicList = this.jsonData.alreadyDoneTopicList;

        this.tripleDot.updateJsonData(this.jsonData);

        this.update();

        this.translateLanguage.resetCurrentLanguage();

        window.errorManager.log(2061, this.jsonData.section, this.jsonData.topic);
    }

    lamdaOnBasicInitRequestFailure = (msg) => {
        
    }
    
    logGeoLocation() {
        const geoInfo = new GeolocationInfo();
        geoInfo.getFormattedInfo().then(info => window.errorManager.log(1013, info));
    }

    update() {

        const sectionMap = {
            yoga: "Yoga",
            hindustani: "Raga",
            ISS: "International Space Station",
            space_travel: "Space Travel",
            racing: "Racing",
            winter_sports: "Winter Sports",
            general_machines: "General Machines",
            industrial_machines: "Industrial Machines",
            oscar_nominated_movies: "Oscar Nominated",
            grammy_songs: "Grammy",
            astronomy: "Astronomy",
            golf: "Golf",
            stocks: "Stocks",
            mutual_funds: "Mutual Funds",
            economics: "Economics",
            nutrition: "Nutrition",
            medical_care: "Medical Care",
            painting: "Painting",
            cricket: "Cricket",
            career: "Career",
            student_tips: "Student Tips",
            philosophy: "Philosophy",
            photography: "Photography",
            physics: "Physics",
            chemistry: "Chemistry",
            biology: "Biology",
            computer_science: "Computer Science",
            electronics: "Electronics",
            geography: "Geography",
            political_science: "Political Science",
            authors: "Authors",
            internal: "Body"
        };
        
        let section = Object.keys(sectionMap).find(key => this.jsonData.section.includes(key)) 
                      ? sectionMap[Object.keys(sectionMap).find(key => this.jsonData.section.includes(key))]
                      : "content";
        

        this.topicLabelName.textContent = section;

        this.topicLabel.innerHTML = this.jsonData.topic;

        // Preprocess content to remove markdown-style delimiters if any
        let htmlContent = this.jsonData.content_response.replace(/^```html\n|```$/g, '').trim();

        const iframeRender = new HtmlIframeRender();
        iframeRender.render(this.viewArea_1, htmlContent);

        if (this.jsonData.youtube_response.length) {
            this.youtubeMgr.showByUrl(this.jsonData.youtube_response[0]);
        }
    }
}

