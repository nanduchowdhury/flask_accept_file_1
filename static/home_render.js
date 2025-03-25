"use strict";


class HomeRender {
    constructor() {
        const gaTracker = new GoogleAnalytics();
        gaTracker.trackPageView();

        const menuObj = new TripleDashMenuCreator("TripleDashMenuContainer");
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
        const texts = [
            "select a topic below or browse menu...",
            "to know, learn & develop interest..."
        ];
        const homeArea = document.getElementById("HomeArea_1");
    
        this.showLinesFading(texts, homeArea);
    }

    showImageTiles(imageList, container) {
        container.style.display = "grid";
        container.style.gridTemplateColumns = "repeat(auto-fit, minmax(100px, 1fr))";
        container.style.gridAutoRows = "auto";
        container.style.gap = "5px";
        container.style.overflow = "visible"; // Changed from hidden
    
        container.innerHTML = "";
    
        imageList.forEach(item => {
            const tile = document.createElement("a");
            tile.href = item.link;
            tile.target = "_blank";
            tile.style.position = "relative";
            tile.style.display = "inline-block"; // Ensures proper behavior on mobile
            tile.style.width = "100%";
            tile.style.height = "auto";
            tile.style.padding = "5px"; // Increases tap area
            tile.style.boxSizing = "border-box";
    
            const img = document.createElement("img");
            img.src = item.image;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
    
            const titleOverlay = document.createElement("div");
            titleOverlay.innerText = item.title;
            titleOverlay.style.position = "absolute";
            titleOverlay.style.width = "100%";
            titleOverlay.style.textAlign = "center";
            titleOverlay.style.color = "white";
            titleOverlay.style.fontSize = "14px";
            titleOverlay.style.fontWeight = "bold";
            titleOverlay.style.textShadow = "2px 2px 4px rgba(0, 0, 0, 0.7)";
            titleOverlay.style.padding = "5px";
            titleOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
            titleOverlay.style.pointerEvents = "none"; // Allows taps to go through to the link
    
            const positions = ["top", "center", "bottom"];
            const randomPosition = positions[Math.floor(Math.random() * positions.length)];
            if (randomPosition === "top") {
                titleOverlay.style.top = "5px";
            } else if (randomPosition === "center") {
                titleOverlay.style.top = "50%";
                titleOverlay.style.transform = "translateY(-50%)";
            } else {
                titleOverlay.style.bottom = "5px";
            }
    
            tile.appendChild(img);
            tile.appendChild(titleOverlay);
            container.appendChild(tile);
        });
    }        
    
    getRandomItemsFromList(array, numItems) {
        const shuffled = array.slice().sort(() => 0.5 - Math.random()); // Shuffle the array
        return shuffled.slice(0, numItems); // Take the first 'count' items
    }

    renderHomeArea_2() {

        // Initial call to display images immediately
        this.refreshImages();

        // Set an interval to refresh images every 8 seconds
        setInterval(this.refreshImages.bind(this), 8000); // 8 seconds

        this.showTipsWhereToStart = new ShowTips('');
        this.showTipsWhereToStart.show("Click any topic here");

        // this.showTipsJoinFB = new ShowTips('');
        // this.showTipsJoinFB.show("If you like the portal,\nplease consider the Facebook page below.", 40);
    }

    refreshImages() {
        
        const homeArea_2 = document.getElementById("HomeArea_2");
        
        /*
            Images are downloaded from below - site mentions that images
            can be used freely for commercial purpose.

            https://pixabay.com/
        */

        const images = [
            { image: "/static/images/golf.jpg", link: BasicInitializer.FLASK_URL + "golf_km", title: "Golf" },
            { image: "/static/images/raga.jpg", link: BasicInitializer.FLASK_URL + "music_km", title: "Raga" },
            { image: "/static/images/yoga.jpg", link: BasicInitializer.FLASK_URL + "yoga_km", title: "Yoga" },
            { image: "/static/images/oscars.jpg", link: BasicInitializer.FLASK_URL + "oscar_nominated_movies_km", title: "Oscars" },
            { image: "/static/images/astronomy.jpg", link: BasicInitializer.FLASK_URL + "astronomy_km", title: "Astronomy" },
            { image: "/static/images/stocks.jpg", link: BasicInitializer.FLASK_URL + "stocks_km", title: "Stocks" },
            { image: "/static/images/nutrition.jpg", link: BasicInitializer.FLASK_URL + "nutrition_km", title: "Nutrition" },
            { image: "/static/images/grammy.jpg", link: BasicInitializer.FLASK_URL + "grammy_songs_km", title: "Grammy" },
            { image: "/static/images/books.jpg", link: BasicInitializer.FLASK_URL + "authors_km", title: "Books" },
            { image: "/static/images/electronics.jpg", link: BasicInitializer.FLASK_URL + "electronics_km", title: "Electronics" },
            { image: "/static/images/painting.jpg", link: BasicInitializer.FLASK_URL + "painting_km", title: "Painting" },
            { image: "/static/images/medical_care.jpg", link: BasicInitializer.FLASK_URL + "medicare_km", title: "Medical care" },
            { image: "/static/images/chemistry.jpg", link: BasicInitializer.FLASK_URL + "chemistry_km", title: "Chemistry" },
            { image: "/static/images/physics.jpg", link: BasicInitializer.FLASK_URL + "physics_km", title: "Physics" },
            { image: "/static/images/student_tips.jpg", link: BasicInitializer.FLASK_URL + "student_tips_km", title: "Student tips" },
            { image: "/static/images/cricket.jpg", link: BasicInitializer.FLASK_URL + "cricket_km", title: "Cricket" },
            { image: "/static/images/philosophy.jpg", link: BasicInitializer.FLASK_URL + "philosophy_km", title: "Philosophy" },
            { image: "/static/images/photography.jpg", link: BasicInitializer.FLASK_URL + "photography_km", title: "Photography" },
            { image: "/static/images/career.jpg", link: BasicInitializer.FLASK_URL + "career_km", title: "Career" },
            { image: "/static/images/machines.jpg", link: BasicInitializer.FLASK_URL + "general_machines_km", title: "Machines" }
        ];        
        
        const randomImages = this.getRandomItemsFromList(images, 6);

        this.showImageTiles(randomImages, homeArea_2);
    }
}
