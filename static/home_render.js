"use strict";


class HomeRender extends RootRender {

    static ISS_description = "Know about the International Space Station - life inside and the experiments done there.";
    static space_travel_description = "Know about space travel and it's complexities.";
    static golf_description = "Know about the sport and the technicalities. Find out about major tournaments played worldwide.";
    static raga_description = "Find out about the age old ragas of hindustani classical music.";
    static yoga_description = "Different yoga poses are taught. Know about the benefits and how to do the asanas.";
    static nobel_description = "Know about many Nobel Laureates.";
    static tariff_description = "Know about what these tariffs are that countries are imposing on one another.";
    static oscar_description = "Oscar movies are awarded each year. Know about the nominations - who missed it and who won it.";
    static astronomy_description = "Space around us is almost infinite. Find out what's there in the stars.";
    static stocks_description = "Know about the technicals of stock market. Find out about trading and markets.";
    static nutrition_description = "Our body requires nutrition. Know about the sources of food, vegetables, fruits etc.";
    static grammy_description = "Grammy music awards are the most prestigous. Find out who won and who got nominated over the years.";
    static crypto_description = "Crypto currencies are coming up fast. What are they and do we realy need them";
    static AI_description = "Artificial Intelligence (AI) is the buzzword. Find out more about it";
    static rock_description = "Rock music and it's history and popularity.";
    static jazz_description = "Jazz music, saxophones and it's history and popularity";
    static country_description = "Sweet country music - and all the history behind it.";
    static body_description = "Know about human body internals and details.";

    static books_description = "Authors and their books are shown here. Know about authors. And find out what books they published.";
    static electronics_description = "Electronics is the behind the technology that surrounds us. Find out more about the subject.";
    static painting_description = "Learn about different tyes of painting. Find out about famous painters. Learn the process of painting.";
    static medical_care_description = "Know about medical treatment and care. Find out more about the different terminologies.";
    static chemistry_description = "Know more about the subject.";
    static physics_description = "Physics laws govern the universe. Find out more about it.";
    static student_tips_description = "Some tips for students on studying, exams etc. Find out more.";
    static IPL_description = "Know more about Indian Premier League (IPL).";
    static philosophy_description = "Find out about great philosophers. Know more about their work and the theories.";
    static photography_description = "Learn about the subject. Develop it as a hobby.";
    static career_description = "Specially made for students and professionals. Learn about career options.";
    static machines_description = "Find out about different machines.";
    static guitar_description = "Start guitar as a hobby - learn more.";
    static gardening_description = "Know more about gardening - learn about the techniques.";


    constructor() {
        super();

        const gaTracker = new GoogleAnalytics();
        gaTracker.trackPageView();

        const menuObj = new TripleDashMenuCreator("TripleDashMenuContainer");      

        this.geoLocInfo = '';
        this.logGeoLocation();
    }

    logGeoLocation() {
        const geoInfo = new GeolocationInfo();
        
        geoInfo.getFormattedInfo().then(info => {
    
            this.geoLocInfo = info;
            window.errorManager.log(1013, info)
    
        }).catch(error => {
            console.error("Failed to retrieve geolocation info :", error);
        });
    }

    showLinesFading(linesList, container) {
        let lineIndex = 0;

        function showNextLine() {
            if (lineIndex < linesList.length) {
                const paragraph = document.createElement("p");
                paragraph.textContent = linesList[lineIndex];
                paragraph.style.opacity = 0; // Start with invisible text
                container.appendChild(paragraph);

                let opacity = 0;
                const fadeIn = setInterval(() => {
                    opacity += 0.05; // Increase opacity gradually
                    paragraph.style.opacity = opacity;
                    if (opacity >= 1) {
                        clearInterval(fadeIn);
                        setTimeout(showNextLine, 1000); // Delay before showing the next line
                    }
                }, 50); // Adjust speed of fading effect

                lineIndex++;
            }
        }

        showNextLine();
    }

    renderHomeArea_1() {

        this.showImageRowsHomeArea_1();

    }        
    
    getRandomItemsFromList(array, numItems) {
        const shuffled = array.slice().sort(() => 0.5 - Math.random()); // Shuffle the array
        return shuffled.slice(0, numItems); // Take the first 'count' items
    }

    renderHomeArea_2() {
       
        this.showImageRowsHomeArea_2();

    }

    parseColorToRGB(color) {
        // Create a dummy canvas to let the browser resolve any valid CSS color
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.fillStyle = color;
        return ctx.fillStyle; // returns "rgb(r,g,b)" or "#rrggbb"
    }

    adjustColor(color, percent) {
        
        let normalized = this.parseColorToRGB(color);

        let r, g, b;

        if (normalized.startsWith("rgb")) {
            [r, g, b] = normalized.match(/\d+/g).map(Number);
        } else {
            if (normalized[0] === "#") normalized = normalized.slice(1);
            let num = parseInt(normalized, 16);
            r = num >> 16;
            g = (num >> 8) & 0x00FF;
            b = num & 0x0000FF;
        }

        // Apply percentage adjustment
        r = Math.min(255, Math.max(0, r + (r * percent / 100)));
        g = Math.min(255, Math.max(0, g + (g * percent / 100)));
        b = Math.min(255, Math.max(0, b + (b * percent / 100)));

        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    createOneImagesBlock(containerId, title, blockBackgroundColor, images) {

        const container = document.getElementById(containerId);

        if (!container || !images || images.length === 0) return;
    
        const titleFontFamily = 'Arial';
        const titleFontSize = "18px";
        const titleFontWeight = "bold";
        const titleTextColor = "red";
       
        const descFontFamily = 'Arial';
        const descFontSize = "12px";
        const descFontWeight = "bold";
        const descTextColor = "black";

        const block = document.createElement("div");
        block.className = "image-block";
        block.style.border = "1px solid #ccc";
        block.style.borderRadius = "10px";
        block.style.padding = "10px";
        block.style.margin = "10px 0";
        const lighter = this.adjustColor(blockBackgroundColor, 40);  // lighter
        const darker  = this.adjustColor(blockBackgroundColor, -40); // darker
        block.style.background = `linear-gradient(to right, ${lighter}, ${darker})`;

        block.style.maxWidth = "500px";
        block.style.width = "fit-content"; // or "auto" depending on your layout
    
        // Main block title
        const blockTitle = document.createElement("div");
        blockTitle.textContent = title;      
        blockTitle.style.fontWeight = "bold";
        blockTitle.style.marginBottom = "5px";
        blockTitle.style.fontSize = "15px";

        const lighter_1 = this.adjustColor("purple", 40);  // lighter
        const darker_1  = this.adjustColor("purple", -40); // darker
        blockTitle.style.background = `linear-gradient(to right, ${lighter_1}, ${darker_1})`;
        blockTitle.style.color = "white";               // for contrast
        blockTitle.style.padding = "4px 8px";           // to add some space around text
        blockTitle.style.borderTopLeftRadius = "8px";   // optional: match rounded corners
        blockTitle.style.borderTopRightRadius = "8px";  // optional: match rounded corners

        block.appendChild(blockTitle);
    
        images.forEach((item, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "image-entry";
            wrapper.style.display = "flex";
            wrapper.style.alignItems = "center";
            wrapper.style.borderRadius = "8px";
            wrapper.style.padding = "8px";
            wrapper.style.cursor = "pointer";
            wrapper.style.transition = "background-color 0.3s";
            wrapper.style.textDecoration = "none";
            wrapper.style.marginBottom = "8px";
    
            // Hover effect
            wrapper.onmouseenter = () => wrapper.style.backgroundColor = "#f0f0f0";
            wrapper.onmouseleave = () => wrapper.style.backgroundColor = "";
    
            wrapper.onclick = () => {
                window.location.href = item.link;
            };
    
            const img = document.createElement("img");
            img.src = item.image;
            img.alt = item.title;
            img.style.width = "150px";
            img.style.height = "100px";
            img.style.objectFit = "contain";
            img.style.borderRadius = "6px";
            img.style.marginRight = "10px";
            img.style.flexShrink = "0";
            img.style.backgroundColor = "#eee";
    
            const textBlock = document.createElement("div");
    
            const imgTitle = document.createElement("div");
            imgTitle.textContent = item.title;

            imgTitle.style.fontFamily = titleFontFamily;
            imgTitle.style.fontSize = titleFontSize;
            imgTitle.style.fontWeight = titleFontWeight;
            imgTitle.style.color = titleTextColor;

            imgTitle.style.marginBottom = "4px";
    
            const imgDescription = document.createElement("div");
            imgDescription.textContent = item.description;

            imgDescription.style.fontFamily = descFontFamily;
            imgDescription.style.fontSize = descFontSize;
            imgDescription.style.fontWeight = descFontWeight;
            imgDescription.style.color = descTextColor
    
            textBlock.appendChild(imgTitle);
            textBlock.appendChild(imgDescription);
    
            wrapper.appendChild(img);
            wrapper.appendChild(textBlock);
            block.appendChild(wrapper);
    
            // Separator (except after the last item)
            if (index < images.length - 1) {
                const separator = document.createElement("div");
                separator.style.height = "1px";
                separator.style.margin = "4px 0";
                separator.style.backgroundColor = "#ccc";
                separator.style.marginLeft = "10px";
                separator.style.marginRight = "10px";
                block.appendChild(separator);
            }
        });
    
        container.appendChild(block);
    }

    showImageRowsHomeArea_1() {

        const images = [
            { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "AI.jpg", 
                    link: BasicInitializer.FLASK_URL + "AI_km", 
                    title: "Artificial Intelligence", description: HomeRender.AI_description },
            { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "internal_organ.jpg", 
                    link: BasicInitializer.FLASK_URL + "internal_organ_km", 
                    title: "Human Body", description: HomeRender.body_description },
            { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "astronomy.jpg", 
                    link: BasicInitializer.FLASK_URL + "astronomy_km", 
                    title: "Astronomy", description: HomeRender.astronomy_description },
            { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "nobel.jpg", 
                link: BasicInitializer.FLASK_URL + "nobel_km", 
                title: "Nobel Laureates", description: HomeRender.nobel_description }
        ];

        {
            const newImages = images.slice(0, 2);
            this.createOneImagesBlock("HomeArea_1", "Featured", "LightBlue", newImages);
        }
        {
            const newImages = images.slice(2, 4);
            this.createOneImagesBlock("HomeArea_1", "More Featured", "LightBlue", newImages);
        }
    }

    showImageRowsHomeArea_2() {

        /*
            Images are downloaded from below - site mentions that images
            can be used freely for commercial purpose.

            https://pixabay.com/
        */

        {
            const images = [
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "gardening.jpg", 
                    link: BasicInitializer.FLASK_URL + "gardening_km", 
                    title: "Gardening", description: HomeRender.gardening_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "guitar.jpg", 
                    link: BasicInitializer.FLASK_URL + "guitar_km", 
                    title: "Learning Guitar", description: HomeRender.guitar_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "photography.jpg", 
                    link: BasicInitializer.FLASK_URL + "photography_km", 
                    title: "Photography", description: HomeRender.photography_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "books.jpg", 
                    link: BasicInitializer.FLASK_URL + "authors_km", 
                    title: "Authors & Books", description: HomeRender.books_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "painting.jpg", 
                    link: BasicInitializer.FLASK_URL + "painting_km", 
                    title: "Painting", description: HomeRender.painting_description }
                
            ];
            this.createOneImagesBlock("HomeArea_2", "Hobbies", "LightGrey", images);
        }
        {
            const images = [
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "grammy.jpg", 
                    link: BasicInitializer.FLASK_URL + "grammy_songs_km", 
                    title: "Grammy Music", description: HomeRender.grammy_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "jazz.jpg", 
                    link: BasicInitializer.FLASK_URL + "jazz_km", 
                    title: "Jazz Music", description: HomeRender.jazz_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "rock.jpg", 
                    link: BasicInitializer.FLASK_URL + "rock_km", 
                    title: "Rock Music", description: HomeRender.rock_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "country.jpg", 
                    link: BasicInitializer.FLASK_URL + "country_km", 
                    title: "Country Music", description: HomeRender.country_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "raga.jpg", 
                    link: BasicInitializer.FLASK_URL + "music_km", 
                    title: "Hindustani Classical Music", description: HomeRender.raga_description }
            ];
            this.createOneImagesBlock("HomeArea_2", "Music", "LightGrey", images);
        }
        {
            const images = [
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "yoga.jpg", 
                    link: BasicInitializer.FLASK_URL + "yoga_km", 
                    title: "Yoga", description: HomeRender.yoga_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "nutrition.jpg", 
                    link: BasicInitializer.FLASK_URL + "nutrition_km", 
                    title: "Nutrition", description: HomeRender.nutrition_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "medical_care.jpg", 
                    link: BasicInitializer.FLASK_URL + "medical_care_km", 
                    title: "Medical Care", description: HomeRender.medical_care_description }
            ];
            this.createOneImagesBlock("HomeArea_2", "Wellness", "LightYellow", images);
        }
        {
            const images = [
                
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "philosophy.jpg", 
                    link: BasicInitializer.FLASK_URL + "philosophy_km", 
                    title: "Philosophy", description: HomeRender.philosophy_description },
                
            ];
            this.createOneImagesBlock("HomeArea_2", "Arts", "LightYellow", images);
        }
        {
            const images = [
                
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "ISS.jpg", 
                    link: BasicInitializer.FLASK_URL + "ISS_km", 
                    title: "Sunita Williams spent months in ISS", 
                    description: HomeRender.ISS_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "electronics.jpg", 
                    link: BasicInitializer.FLASK_URL + "electronics_km", 
                    title: "Electronics", description: HomeRender.electronics_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "chemistry.jpg", 
                    link: BasicInitializer.FLASK_URL + "chemistry_km", 
                    title: "Chemistry", description: HomeRender.chemistry_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "physics.jpg", 
                    link: BasicInitializer.FLASK_URL + "physics_km", 
                    title: "Physics", description: HomeRender.physics_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "machines.jpg", 
                    link: BasicInitializer.FLASK_URL + "general_machines_km", 
                    title: "Machines", description: HomeRender.machines_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "space_travel.jpg", 
                    link: BasicInitializer.FLASK_URL + "space_travel_km", 
                    title: "Sunita Williams returns from ISS", 
                    description: HomeRender.space_travel_description }
            ];
            this.createOneImagesBlock("HomeArea_2", "Science", "LightGreen", images);
        }
        {
            const images = [
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "student_tips.jpg", 
                    link: BasicInitializer.FLASK_URL + "student_tips_km", 
                    title: "Student Tips", description: HomeRender.student_tips_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "career.jpg", 
                    link: BasicInitializer.FLASK_URL + "career_km", 
                    title: "Career", description: HomeRender.raga_description }
            ];
            this.createOneImagesBlock("HomeArea_2", "For Students", "LightGreen", images);
        }
        {
            const images = [
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "stocks.jpg", 
                    link: BasicInitializer.FLASK_URL + "stocks_km", 
                    title: "Stocks", description: HomeRender.stocks_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "oscars.jpg", 
                    link: BasicInitializer.FLASK_URL + "oscar_nominated_movies_km", 
                    title: "Oscar Movies", description: HomeRender.oscar_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "tariff.jpg", 
                    link: BasicInitializer.FLASK_URL + "tariff_km", 
                    title: "Trump Tariffs - what actually are tariffs?", 
                    description: HomeRender.tariff_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "crypto.jpg", 
                    link: BasicInitializer.FLASK_URL + "crypto_km", 
                    title: "Crypto", description: HomeRender.crypto_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "cricket.jpg", 
                    link: BasicInitializer.FLASK_URL + "IPL_km", 
                    title: "IPL", description: HomeRender.IPL_description },
                { image: BasicInitializer.GITHUB_CDN_IMAGES_URL + "golf.jpg", 
                    link: BasicInitializer.FLASK_URL + "golf_km", 
                    title: "Golf", description: HomeRender.golf_description }
            ];
            this.createOneImagesBlock("HomeArea_2", "Misc", "LightYellow", images);
        }
        
    }

}
