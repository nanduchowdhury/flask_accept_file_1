"use strict";

class RootInitializer {

    constructor() {

        this.clientId = '';
        this.client_uuid = '';
    }

    getClientId() {    
        return this.clientId;
    }

    setClient_UUID(uuid) {
        this.client_uuid = uuid;
    }

    getClient_UUID() {    
        return this.client_uuid;
    }

    getFormattedTimestamp() {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
    
        const day = String(now.getDate()).padStart(2, '0');
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
    
        return `${day}${month}${year}-${hours}:${minutes}:${seconds}`;
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

            if (error.message.includes('<html')) {
                errorManager.showError(2043);
                message = '';
            } else if (error.message.includes('Failed to fetch')) {
                errorManager.showError(2043);
                message = '';
            }
            lamdaOnServerRequestFailure(message);
        });
    }
}

class ContentInitializer extends RootInitializer {

    constructor() {
        super();

        this.clientId = 'client-' + this.getFormattedTimestamp();
        this.client_uuid = '';

        const data = {
            client_uuid: this.getClient_UUID(),
            clientId: this.getClientId(),
            additionalData: {
                someKey: "someValue"
            }
        };
    
        this.makeServerRequest('/content_init', data, 
            this.lamdaOnContentInitRequestSuccess, this.lamdaOnContentInitRequestFailure);
    
    }

    lamdaOnContentInitRequestSuccess = (data) => {
        this.setClient_UUID(data.client_uuid);
        console.log(data.client_uuid);
        if ( !this.getClient_UUID() ) {
            errorManager.showError(2044);
        }
    }

    lamdaOnContentInitRequestFailure = (msg) => {
        if ( msg ) {
            errorManager.showError(1048, msg);
        }
    }
    
}

class BasicInitializer extends RootInitializer{

    static LEFT_MOUSE_BUTTON = 0;
    static ACCEPTABLE_REGION_SIZE = 10;
    static EXPLAIN_REGION_RMB = "Explain Selection";
    static MCQ_RMB = "Multi-Choice Questions (MCQ)"
    static POP_OUT_RMB = "Pop Out/In";
    static PASTE_FROM_CLIPBOARD = "Paste from Clipboard ";
    static TOUCH_PAINT_REGION_START_END_RMB = "Start/End Paint Region";
    static START_LEARN = "Start Learning";
    static LEARN_NEXT = "Learn More";
    static WAIT_TIME_FOR_AI_MODEL_INIT = 90000;
    static PDF_PAGE_RENDERING_DEBOUNCE_DELAY = 200; // 200ms

    static ENGLISH_TEXT_FONT = 'Arial';
    static HINID_BENGALI_TEXT_FONT = 'Courier New';

    static FLASK_URL = 'https://kupmanduk.co.in/';

    static GITHUB_CDN = "https://cdn.jsdelivr.net/gh/nanduchowdhury/flask_accept_file_1@main/";
    static GITHUB_CDN_IMAGES_URL = this.GITHUB_CDN + "static/images/";
    

    constructor() {

        super();

        this.clientId = 'client-' + this.getFormattedTimestamp();
        this.client_uuid = '';

        this.signed_main_content_url = '';

        this.initializeVoices();
        this.sendInitToServer();

        this.onBrowserRefresh = this.onBrowserRefresh.bind(this);
        // Add the event listener for beforeunload
        window.addEventListener('beforeunload', this.onBrowserRefresh);
    }

    onBrowserRefresh(event) {
        const confirmationMessage = 'Are you sure you want to leave this page? Current learning session will be lost.';
        event.returnValue = confirmationMessage; // Standard
        return confirmationMessage; // For older browsers
    }

    /******************************************************************
    * There is an issue that on some browsers (especially chrome) the 
    * available voices do not load at the very first time.
    * Load them here to init all voices.
    ********************************************************************/
    initializeVoices() {
        let voices = window.speechSynthesis.getVoices();

        if (voices.length === 0) {
            // If the voices are not yet loaded, set up the event listener
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                // Now you can use the voices array
                errorManager.log(1012);
            };
        } else {
            // If voices are already loaded, use them immediately
            errorManager.log(1012);
        }
    }

    convertMultiLine(text, maxCharsPerLine) {
        if (typeof text !== 'string') {
            errorManager.showError(2048);
        }
        if (typeof maxCharsPerLine !== 'number') {
            errorManager.showError(2049);
        }
        if (maxCharsPerLine <= 0) {
            errorManager.showError(2050);
        }
    
        // Split the input text into words
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = '';
    
        words.forEach(word => {
            // If adding the word would exceed the maxCharsPerLine, push the current line
            if ((currentLine + word).length > maxCharsPerLine) {
                if (currentLine) {
                    lines.push(currentLine.trim()); // Add the current line to the lines array
                }
                currentLine = word; // Start a new line with the current word
            } else {
                // Otherwise, add the word to the current line
                currentLine += (currentLine ? ' ' : '') + word;
            }
        });
    
        // Add the last line if it has content
        if (currentLine) {
            lines.push(currentLine.trim());
        }
    
        return lines;
    }

    createInMemoryPngFromText(lines, fileName = 'copy_paste_text.png') {
        if (!Array.isArray(lines) || lines.length === 0) {
            errorManager.showError(2051);
        }
    
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
    
        // Canvas settings
        const lineHeight = 30; // Height of each line
        const fontSize = 20; // Font size in pixels
        const font = '20px Arial'; // Font style
        const padding = 20; // Padding around the text
        const textColor = '#000000'; // Text color
        const bgColor = '#ffffff'; // Background color
    
        // Calculate canvas dimensions
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width)) * 2 + 2 * padding;
        const canvasHeight = lines.length * lineHeight + 2 * padding;
    
        // Set canvas size
        canvas.width = Math.ceil(maxWidth);
        canvas.height = Math.ceil(canvasHeight);
    
        // Draw background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        // Draw text
        ctx.fillStyle = textColor;
        ctx.font = font;
        lines.forEach((line, index) => {
            const x = padding;
            const y = padding + (index + 1) * lineHeight - (lineHeight - fontSize) / 2;
            ctx.fillText(line, x, y);
        });
    
        // Convert canvas to PNG File
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Create a File object from the Blob
                        const file = new File([blob], fileName, { type: 'image/png' });
                        resolve(file); // Return the File object
                    } else {
                        errorManager.showError(2052);
                    }
                },
                'image/png', // Output format
                1.0 // Quality (not relevant for PNG, but required by API)
            );
        });
    }

    sendInitToServer() {
        
        const data = {
            client_uuid: this.getClient_UUID(),
            clientId: this.getClientId(),
            additionalData: {
                someKey: "someValue"
            }
        };

        this.makeServerRequest('/basic_init', data, 
            this.lamdaOnBasicInitRequestSuccess, this.lamdaOnBasicInitRequestFailure);
    }

    lamdaOnBasicInitRequestSuccess = (data) => {
        this.setClient_UUID(data.client_uuid);
        this.setMainContentSignedURL(data.signed_main_content_url);
        console.log(data.client_uuid);
        if ( !this.getClient_UUID() ) {
            errorManager.showError(2044);
        }
    }

    lamdaOnBasicInitRequestFailure = (msg) => {
        if ( msg ) {
            errorManager.showError(1048, msg);
        }
    }

    setMainContentSignedURL(signed_main_content_url) {
        this.signed_main_content_url = signed_main_content_url;
    }

    getMainContentSignedURL() {
        return this.signed_main_content_url;
    }

    clearBeforeStartNewExplanation() {

        pdfLoader.stopLoadPdf();
        cTracker.reset();
        document.getElementById('result1').innerHTML = '';
        document.getElementById('roughArea').innerHTML = '';
    }

    isTextEnglish(text) {
        // Check if the text contains English letters (A-Z, a-z)
        if (text.match(/[A-Za-z]/)) {
            return true;
        }
        return false;
    }
    
    isTextHindi(text) {
        if (text.match(/[\u0900-\u097F]/)) { // Hindi
            return true;
        }
        return false;
    }

    isTextBengali(text) {
        if (text.match(/[\u0980-\u09FF]/)) { // Bengali
            return true;
        }
        return false;
    }

    isTextChinese(text) {
        if (text.match(/[\u4E00-\u9FFF]/)) { // Chinese
            return true;
        }
        return false;
    }

    isTextJapanese(text) {
        if (text.match(/[\u3040-\u30FF]/)) { // Japanese
            return true;
        }
        return false;
    }

    isTextTamil(text) {
        if (text.match(/[\u0B80-\u0BFF]/)) { // Tamil
            return true;
        }
        return false;
    }

    //////////////////////////////////////////////////////
    //
    // Based on container 'position', get the top and left.
    // This is particularly useful for containers which can
    // be maximized.
    //
    ///////////////////////////////////////////////////////
    getTopLeftCoordsOfContainer(container) {
        const computedStyle = window.getComputedStyle(container);
        const containerRect = container.getBoundingClientRect();

        const position = computedStyle.position;

        let left = 0;
        let top = 0;

        if ( position == "fixed" ) {
            top = container.scrollTop;
            left = container.scrollLeft;
        } else {
            top = window.scrollY + containerRect.top;
            left = window.scrollX + containerRect.left;
        }

        return {top, left};
    }

    getActualObjectBbox(object) {
        const rect = object.getBoundingClientRect();

        const left = rect.left + window.scrollX;
        const top = rect.top + window.scrollY;
        const right = rect.right + window.scrollX;
        const bottom = rect.bottom + window.scrollY;

        return {left, top, right, bottom};
    }

}

class ShowTips {
    constructor(elementId) {
        this.element = elementId ? document.getElementById(elementId) : null;
        this.tipElement = document.createElement("div");
        this.tipElement.style.position = "absolute";
        this.tipElement.style.backgroundColor = "rgba(255, 255, 0, 0.6)"; // Yellow with opacity
        this.tipElement.style.padding = "5px";
        this.tipElement.style.border = "1px solid black";
        this.tipElement.style.borderRadius = "5px";
        this.tipElement.style.display = "none";
        this.tipElement.style.zIndex = "1000";
        this.tipElement.style.whiteSpace = "pre-wrap"; // Allow new lines
        
        document.body.appendChild(this.tipElement);

        this.disappearanceTime = 15000; // 15 seconds
        this.blinkDuration = this.disappearanceTime; // Blink for the first 5 seconds
        this.blinkInterval = null;
    }

    show(text, afterSeconds = 0) {
        setTimeout(() => {
            this.tipElement.textContent = text;
            this.tipElement.style.display = "block";
            
            if (this.element) {
                const rect = this.element.getBoundingClientRect();
                this.tipElement.style.top = `${rect.top + window.scrollY - this.tipElement.offsetHeight + 40}px`;
                this.tipElement.style.left = `${rect.left + window.scrollX - 60}px`;
            } else {
                this.tipElement.style.top = `${window.innerHeight / 2 - this.tipElement.offsetHeight / 2}px`;
                this.tipElement.style.left = `${window.innerWidth / 2 - this.tipElement.offsetWidth / 2}px`;
            }
            
            let visible = true;
            this.blinkInterval = setInterval(() => {
                this.tipElement.style.visibility = visible ? "hidden" : "visible";
                visible = !visible;
            }, 500); // Blink every 500ms
            
            setTimeout(() => {
                clearInterval(this.blinkInterval);
                this.tipElement.style.visibility = "visible";
                
                setTimeout(() => {
                    this.tipElement.style.display = "none";
                }, this.disappearanceTime - this.blinkDuration);
            }, this.blinkDuration);
        }, afterSeconds * 1000); // Convert seconds to milliseconds
    }
}


  class HtmlIframeRender {
    constructor() {
    }

    render(viewArea, htmlContent) {
        // Clear previous content
        viewArea.replaceChildren();

        // Create the iframe element
        let iframe = document.createElement("iframe");
        iframe.id = "myIframe";
        iframe.frameBorder = "0";
        iframe.style.width = "100%";
        iframe.scrolling = "no"; // No iframe scrollbars
        iframe.style.overflow = "hidden"; 

        // Append the iframe to viewArea
        viewArea.appendChild(iframe);

        // Write content into iframe with custom styles
        iframe.onload = () => {
            let doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <style>
                    html, body { margin: 0; padding: 0; overflow: hidden; width: 100%; }
                    h1 { background-color: lightblue; padding: 10px; color: navy; }
                    h2 { background-color: lightgreen; padding: 10px; color: darkgreen; }
                </style>
                ${htmlContent}
            `);
            doc.close();

            // Adjust iframe height dynamically to fit content
            setTimeout(() => {
                let body = doc.body,
                    html = doc.documentElement;
                
                let height = Math.max(body.scrollHeight, html.scrollHeight);
                iframe.style.height = height + "px";
            }, 100); // Small delay for content rendering
        };

        if ('srcdoc' in iframe) {
            iframe.srcdoc = `
                <style>
                    html, body { margin: 0; padding: 0; overflow: hidden; width: 100%; }
                    h1 { background-color: lightblue; padding: 10px; color: navy; }
                    h2 { background-color: lightgreen; padding: 10px; color: darkgreen; }
                </style>
                ${htmlContent}
            `;
            iframe.onload();
        }
    }
  }

  class BrowserStartStop {
    constructor() {
        this.startTime = Date.now();

        // Store start time in sessionStorage to handle page reloads
        if (!sessionStorage.getItem("startTime")) {
            sessionStorage.setItem("startTime", this.startTime);
        }

        this.ackServerBeforeExit();
    }

    sendExitData(closeActionInvoked) {
        let elapsedTime = Date.now() - Number(sessionStorage.getItem("startTime")); // Convert to number

        let data = new URLSearchParams({ "elapsed_time": elapsedTime,
            "close_action_invoked": closeActionInvoked
});

        if (!navigator.sendBeacon("/user-exit", data)) {
            fetch("/user-exit", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: data
            });
        }
    }

    ackServerBeforeExit() {
        // Handle normal page unload
        window.addEventListener("beforeunload", () => this.sendExitData("tab-close"));

        // Handle tab becoming inactive (user switches tabs or minimizes window)
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.sendExitData("tab_switch_or_minimize");
        });

        // Handle mobile/tab freezing or app switch
        window.addEventListener("pagehide", () => this.sendExitData("mobile_app_switch_freeze"));

        // Handle if running inside an iframe
        if (window !== window.top) {
            window.addEventListener("unload", () => this.sendExitData("run_in_iframe"));
        }
    }
}

class GoogleAnalytics {
    constructor(measurementId = "G-4NLLJX710S") {
        this.measurementId = measurementId;
        this.isGAInitialized = false;
        this.initializeGA();
    }

    initializeGA() {
        if (!window.dataLayer) {
            window.dataLayer = [];
        }

        function gtag(){ window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', this.measurementId, {
            send_page_view: false // Prevents automatic page_view to avoid conflicts
        });

        // Ensure GA is initialized before sending the first event
        setTimeout(() => {
            this.isGAInitialized = true;
        }, 1000); // Adjust the delay if needed
    }

    trackEvent(eventName, eventParams = {}) {
        if (typeof window.gtag === 'function' && this.isGAInitialized) {
            window.gtag('event', eventName, eventParams);
        } else {
            console.warn('Google Analytics is not initialized yet');
        }
    }

    trackPageView(screenName = "default_screen") {
        const pagePath = window.location.pathname;
        const pageTitle = screenName;

        if (!this.isGAInitialized) {
            setTimeout(() => this.trackPageView(screenName), 500);
            return;
        }

        this.trackEvent('page_view', { 
            page_path: pagePath,
            page_title: pageTitle,
            screen_name: screenName
        });
    }

    trackButtonClick(buttonName) {
        this.trackEvent('button_click', { button_name: buttonName });
    }
}

class TripleDashMenuItem {
    doOnClick() {
        throw new Error("doOnClick() must be implemented in a derived class");
    }
}

class TripleDashMenu {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.menuData = {};
        this.createMenu();
        this.setupOutsideClickHandler();
    }

    createMenu() {
        this.menuButton = document.createElement("div");
        this.menuButton.innerHTML = "≡"; // Triple dash menu icon
        this.menuButton.style.cssText = `
            position: absolute; top: 10px; right: 10px; 
            font-size: 24px; cursor: pointer; 
            background: white; padding: 5px; border-radius: 5px; 
            z-index: 9999; /* Keeps it above all elements */
        `;

        this.menuContainer = document.createElement("ul");
        this.menuContainer.style.cssText = `
            display: none; position: absolute; top: 40px; right: 10px; 
            background: white; border: 1px solid black; 
            list-style: none; padding: 5px; min-width: 120px;
            box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2); /* Adds visibility */
            z-index: 9999; /* Ensures it's always on top */
        `;

        this.menuButton.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevent immediate closure
            this.toggleMenu();
        });

        this.container.appendChild(this.menuButton);
        this.container.appendChild(this.menuContainer);
    }

    toggleMenu() {
        if (this.menuContainer.style.display === "block") {
            this.hideMenu();
        } else {
            this.showMenu();
        }
    }

    showMenu() {
        this.menuContainer.style.display = "block";
    }

    hideMenu() {
        this.menuContainer.style.display = "none";
    }

    setupOutsideClickHandler() {
        document.addEventListener("click", (event) => {
            if (
                !this.menuContainer.contains(event.target) && 
                event.target !== this.menuButton
            ) {
                this.hideMenu();
            }
        });

        document.addEventListener("touchstart", (event) => {
            if (
                !this.menuContainer.contains(event.target) && 
                event.target !== this.menuButton
            ) {
                this.hideMenu();
            }
        });
    }

    addMenuItem(parentItemName, thisItemName, itemObj) {
        if (!(itemObj instanceof TripleDashMenuItem)) {
            throw new Error("itemObj must be an instance of TripleDashMenuItem");
        }

        const menuItem = document.createElement("li");
        menuItem.textContent = thisItemName;
        menuItem.style.cssText = `padding: 5px; cursor: pointer; position: relative;`;

        menuItem.addEventListener("click", () => {
            itemObj.doOnClick(); // Executes the menu action
            // **No hideMenu() here** so the menu stays open
        });

        if (!parentItemName) {
            this.menuContainer.appendChild(menuItem);
        } else {
            let parentItem = this.menuData[parentItemName];
            if (!parentItem) {
                throw new Error(`Parent item '${parentItemName}' not found`);
            }

            if (!parentItem.submenu) {
                parentItem.submenu = document.createElement("ul");
                parentItem.submenu.style.cssText = `
                    display: none; position: absolute; right: 100%; top: 0; 
                    background: white; border: 1px solid black; 
                    list-style: none; padding: 5px; min-width: 120px;
                    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2); /* Improves visibility */
                    z-index: 1000;
                `;
                parentItem.element.appendChild(parentItem.submenu);

                parentItem.element.addEventListener("mouseenter", () => {
                    parentItem.element.style.fontWeight = "bold"; // Bold parent item
                    parentItem.submenu.style.display = "block";
                });

                parentItem.element.addEventListener("mouseleave", () => {
                    parentItem.element.style.fontWeight = "normal"; // Reset parent item
                    parentItem.submenu.style.display = "none";
                });
            }

            parentItem.submenu.appendChild(menuItem);
        }

        this.menuData[thisItemName] = { element: menuItem };
    }
}



// Example of a derived class implementing doOnClick()
class SampleMenuItem extends TripleDashMenuItem {
    constructor(itemName = '') {
        super();
        this.itemName = itemName;
    }

    doOnClick() {
        if ( this.itemName != '' ) {
            const link = BasicInitializer.FLASK_URL + this.itemName;
            window.open(link, "_blank"); // Open link in a new tab
        }
    }
}

class TripleDashMenuCreator {
    constructor(containerId) {
        this.menu = new TripleDashMenu(containerId);
        this.addItems();
    }

    addItems() {
        this.menu.addMenuItem("", "Arts", new SampleMenuItem());
        this.menu.addMenuItem("Arts", "Painting", new SampleMenuItem("painting_km"));
        this.menu.addMenuItem("Arts", "Photography", new SampleMenuItem("photography_km"));
        this.menu.addMenuItem("Arts", "Philosophy", new SampleMenuItem("philosophy_km"));

        this.menu.addMenuItem("", "Science", new SampleMenuItem());
        this.menu.addMenuItem("Science", "Physics", new SampleMenuItem("physics_km"));
        this.menu.addMenuItem("Science", "Chemistry", new SampleMenuItem("chemistry_km"));
        this.menu.addMenuItem("Science", "Biology", new SampleMenuItem("biology_km"));
        this.menu.addMenuItem("Science", "Computer Science", new SampleMenuItem("computer_science_km"));
        this.menu.addMenuItem("Science", "Electronics", new SampleMenuItem("electronics_km"));
        this.menu.addMenuItem("Science", "Geography", new SampleMenuItem("geography_km"));
        this.menu.addMenuItem("Science", "Political Science", new SampleMenuItem("political_science_km"));
        this.menu.addMenuItem("Science", "AI", new SampleMenuItem("AI_km"));
        this.menu.addMenuItem("Science", "Indistrial Machines", new SampleMenuItem("industrial_machines_km"));
        this.menu.addMenuItem("Science", "General Machines", new SampleMenuItem("general_machines_km"));
        
        this.menu.addMenuItem("", "Space & Astronomy", new SampleMenuItem());
        this.menu.addMenuItem("Space & Astronomy", "ISS", new SampleMenuItem("ISS_km"));
        this.menu.addMenuItem("Space & Astronomy", "Space Travel", new SampleMenuItem("space_travel_km"));
        this.menu.addMenuItem("Space & Astronomy", "Astronomy", new SampleMenuItem("astronomy_km"));

        this.menu.addMenuItem("", "Wellness", new SampleMenuItem());
        this.menu.addMenuItem("Wellness", "Nutrition", new SampleMenuItem("nutrition_km"));
        this.menu.addMenuItem("Wellness", "Yoga", new SampleMenuItem("yoga_km"));
        this.menu.addMenuItem("Wellness", "Medical Care", new SampleMenuItem("medical_care_km"));
        this.menu.addMenuItem("Wellness", "Body", new SampleMenuItem("internal_organ_km"));

        this.menu.addMenuItem("", "Music", new SampleMenuItem());
        this.menu.addMenuItem("Music", "Jazz", new SampleMenuItem("jazz_km"));
        this.menu.addMenuItem("Music", "Rock", new SampleMenuItem("rock_km"));
        this.menu.addMenuItem("Music", "Country", new SampleMenuItem("country_km"));
        this.menu.addMenuItem("Music", "Hindustani Classical", new SampleMenuItem("music_km"));

        this.menu.addMenuItem("", "Sports", new SampleMenuItem());
        this.menu.addMenuItem("Sports", "Cricket", new SampleMenuItem("cricket_km"));
        this.menu.addMenuItem("Sports", "Golf", new SampleMenuItem("golf_km"));
        this.menu.addMenuItem("Sports", "Racing", new SampleMenuItem("racing_km"));
        this.menu.addMenuItem("Sports", "Winter Sports", new SampleMenuItem("winter_sports_km"));

        this.menu.addMenuItem("", "Entertainment", new SampleMenuItem());
        this.menu.addMenuItem("Entertainment", "Oscar Movies", new SampleMenuItem("oscar_nominated_movies_km"));
        this.menu.addMenuItem("Entertainment", "Grammy Music", new SampleMenuItem("grammy_songs_km"));
        this.menu.addMenuItem("Entertainment", "Author & Books", new SampleMenuItem("authors_km"));

        this.menu.addMenuItem("", "Finance", new SampleMenuItem());
        this.menu.addMenuItem("Finance", "Crypto", new SampleMenuItem("crypto_km"));
        this.menu.addMenuItem("Finance", "Tariff", new SampleMenuItem("tariff_km"));
        this.menu.addMenuItem("Finance", "Stocks", new SampleMenuItem("stocks_km"));
        this.menu.addMenuItem("Finance", "Economics", new SampleMenuItem("economics_km"));
        this.menu.addMenuItem("Finance", "Mutual Funds", new SampleMenuItem("mutual_funds_km"));

        this.menu.addMenuItem("", "Students", new SampleMenuItem());
        this.menu.addMenuItem("Students", "Student Tips", new SampleMenuItem("student_tips_km"));
        this.menu.addMenuItem("Students", "Career", new SampleMenuItem("career_km"));
    }
}

class RootRender {

    constructor() { 
        this.subscribeButton = document.getElementById("subscribeButton");
        this.subscribeButton.addEventListener("click", this.onSubscribeButtonClick.bind(this));

        this.subscribeUserInput = document.getElementById("newsletter-input");
    }

    onSubscribeButtonClick() {
        
        const data = {
            userInput: this.subscribeUserInput.value,
            geoInfo: this.geoLocInfo  // Store formatted geolocation info here
        };

        window.basicInitializer.makeServerRequest('/subscribe', data, 
            this.lamdaOnSubscribeSuccess, this.lamdaOnSubscribeFailure);

        window.errorManager.showInfo(2067);
    }

    lamdaOnSubscribeSuccess = (data) => {
    }

    lamdaOnSubscribeFailure = (msg) => {
        console.log("Subscribe failed : ", msg);
    }
}

