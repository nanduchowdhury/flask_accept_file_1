"use strict";


class HomeRender {
    constructor() {
        
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
            "learn and know more...",
            "...about things around us..."
        ];
        const homeArea = document.getElementById("HomeArea_1");
    
        this.showLinesFading(texts, homeArea);
    }

    showImageTiles(imageList, container) {
        container.style.display = "grid";
        container.style.gridTemplateColumns = "repeat(auto-fit, minmax(100px, 1fr))";
        container.style.gridAutoRows = "auto";
        container.style.gap = "5px"; // Space between images
        container.style.overflow = "hidden";
        container.style.width = "100%";
        container.style.height = "100%";
    
        // Clear any previous images
        container.innerHTML = "";
    
        imageList.forEach(item => {
            const tile = document.createElement("a");
            tile.href = item.link;
            tile.target = "_blank"; 
            tile.style.position = "relative"; // Ensures the title can be positioned over it
            tile.style.display = "block";
            tile.style.width = "100%";
            tile.style.height = "100%";
    
            const img = document.createElement("img");
            img.src = item.image;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover"; // Ensures images cover the tile without distortion
    
            // Create title overlay
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
            titleOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.4)"; // Slight background to improve readability
            
            // Randomly position the title
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
    
            // Append elements
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
    }

    refreshImages() {
        
        const homeArea_2 = document.getElementById("HomeArea_2");
        
        const images = [
            { image: "/static/images/golf.jpg", link: "https://sites.google.com/view/kupmanduk/sports/golf?authuser=0", title: "Golf" },
            { image: "/static/images/raga.jpg", link: "https://sites.google.com/view/kupmanduk/entertainment/hindustani-classical?authuser=0", title: "Raga" },
            { image: "/static/images/yoga.jpg", link: "https://sites.google.com/view/kupmanduk/health-and-body/yoga?authuser=0", title: "Yoga" },
            { image: "/static/images/oscars.jpg", link: "https://sites.google.com/view/kupmanduk/entertainment/oscar-movies?authuser=0", title: "Oscars" },
            { image: "/static/images/astronomy.jpg", link: "https://sites.google.com/view/kupmanduk/science/astronomy?authuser=0", title: "Astronomy" },
            { image: "/static/images/stocks.jpg", link: "https://sites.google.com/view/kupmanduk/finance/stocks?authuser=0", title: "Stocks" },
            { image: "/static/images/nutrition.jpg", link: "https://sites.google.com/view/kupmanduk/health-and-body/nutrition?authuser=0", title: "Nutrition" },
            { image: "/static/images/grammy.jpg", link: "https://sites.google.com/view/kupmanduk/entertainment/grammy-songs?authuser=0", title: "Grammy" },
            { image: "/static/images/books.jpg", link: "https://sites.google.com/view/kupmanduk/arts/books?authuser=0", title: "Books" },
            { image: "/static/images/electronics.jpg", link: "https://sites.google.com/view/kupmanduk/science/electronics?authuser=0", title: "Electronics" },
            { image: "/static/images/painting.jpg", link: "https://sites.google.com/view/kupmanduk/arts/painting?authuser=0", title: "Painting" },
            { image: "/static/images/medicare.jpg", link: "https://sites.google.com/view/kupmanduk/health-and-body/medicare?authuser=0", title: "Medicare" },
            { image: "/static/images/chemistry.jpg", link: "https://sites.google.com/view/kupmanduk/science/chemistry?authuser=0", title: "Chemistry" },
            { image: "/static/images/machines.jpg", link: "https://sites.google.com/view/kupmanduk/machines/general?authuser=0", title: "Machines" }
        ];
        
        const randomImages = this.getRandomItemsFromList(images, 6);

        this.showImageTiles(randomImages, homeArea_2);
    }
}
