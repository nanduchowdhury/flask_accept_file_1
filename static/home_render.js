"use strict";


class HomeRender {

    static golf_description = "Know about the sport and the technicalities. Find out about major tournaments played worldwide.";
    static raga_description = "Find out about the age old ragas of hindustani classical music.";
    static yoga_description = "Different yoga poses are taught. Know about the benefits and how to do the asanas.";
    static oscar_description = "Oscar movies are awarded each year. Know about the nominations - who missed it and who won it.";
    static astronomy_description = "Space around us is almost infinite. Find out what's there in the stars.";
    static stocks_description = "Know about the technicals of stock market. Find out about trading and markets.";
    static nutrition_description = "Our body requires nutrition. Know about the sources of food, vegetables, fruits etc.";
    static grammy_description = "Grammy music awards are the most prestigous. Find out who won and who got nominated over the years.";
    static books_description = "Authors and their books are shown here. Know about authors. And find out what books they published.";
    static electronics_description = "Electronics is the behind the technology that surrounds us. Find out more about the subject.";
    static painting_description = "Learn about different tyes of painting. Find out about famous painters. Learn the process of painting.";
    static medical_care_description = "Know about medical treatment and care. Find out more about the different terminologies.";
    static chemistry_description = "Know more about the subject.";
    static physics_description = "Physics laws govern the universe. Find out more about it.";
    static student_tips_description = "Some tips for students on studying, exams etc. Find out more.";
    static cricket_description = "Learn more about the technicalities of the sport.";
    static philosophy_description = "Find out about great philosophers. Know more about their work and the theories.";
    static photography_description = "Learn about the subject. Develop it as a hobby.";
    static career_description = "Specially made for students and professionals. Learn about career options.";
    static machines_description = "Find out about different machines.";



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
    
    getRandomItemsFromList(array, numItems) {
        const shuffled = array.slice().sort(() => 0.5 - Math.random()); // Shuffle the array
        return shuffled.slice(0, numItems); // Take the first 'count' items
    }

    renderHomeArea_2() {
       
        this.showImageRows();

        this.showTipsWhereToStart = new ShowTips('TripleDashMenuContainer');
        this.showTipsWhereToStart.show("Browse complete menu");
    }

    populateImageRowsColumns(containerId, rowNumber, images) {
        const container = document.getElementById(containerId);
        if (!container) return;
    
        let row = document.querySelector(`.row[data-row="${rowNumber}"]`);
        if (!row) {
            row = document.createElement("div");
            row.className = "row";
            row.dataset.row = rowNumber;
            container.appendChild(row);
        }
    
        images.forEach((item, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "image-text-wrapper";
            wrapper.onclick = () => window.location.href = item.link;
    
            const img = document.createElement("img");
            img.src = item.image;
            img.alt = item.title;
            img.className = "image";
    
            const textContainer = document.createElement("div");
            textContainer.className = "text-container";
    
            const title = document.createElement("div");
            title.className = "title";
            title.textContent = item.title;
    
            const description = document.createElement("div");
            description.className = "description";
            description.textContent = item.description;
    
            textContainer.appendChild(title);
            textContainer.appendChild(description);
            wrapper.appendChild(img);
            wrapper.appendChild(textContainer);
            row.appendChild(wrapper);
        });
    
        // Adjust description wrapping based on image count in row
        if (images.length === 1) {
            row.classList.add("single-image");
        } else {
            row.classList.add("multi-image");
        }
    }

    showImageRows() {

        /*
            Images are downloaded from below - site mentions that images
            can be used freely for commercial purpose.

            https://pixabay.com/
        */
            const images = [
                { image: "/static/images/yoga.jpg", link: BasicInitializer.FLASK_URL + "yoga_km", title: "Yoga", description: HomeRender.yoga_description },
                { image: "/static/images/raga.jpg", link: BasicInitializer.FLASK_URL + "music_km", title: "Hindustani Classical Music", description: HomeRender.raga_description },
                { image: "/static/images/student_tips.jpg", link: BasicInitializer.FLASK_URL + "student_tips_km", title: "Student Tips", description: HomeRender.student_tips_description },
                { image: "/static/images/cricket.jpg", link: BasicInitializer.FLASK_URL + "cricket_km", title: "Cricket", description: HomeRender.cricket_description },
                { image: "/static/images/philosophy.jpg", link: BasicInitializer.FLASK_URL + "philosophy_km", title: "Philosophy", description: HomeRender.philosophy_description },
                { image: "/static/images/photography.jpg", link: BasicInitializer.FLASK_URL + "photography_km", title: "Photography", description: HomeRender.photography_description },
                { image: "/static/images/career.jpg", link: BasicInitializer.FLASK_URL + "career_km", title: "Career", description: HomeRender.raga_description },
                { image: "/static/images/painting.jpg", link: BasicInitializer.FLASK_URL + "painting_km", title: "Painting", description: HomeRender.painting_description },
                { image: "/static/images/medical_care.jpg", link: BasicInitializer.FLASK_URL + "medical_care_km", title: "Medical Care", description: HomeRender.medical_care_description },
                { image: "/static/images/oscars.jpg", link: BasicInitializer.FLASK_URL + "oscar_nominated_movies_km", title: "Oscar Movies", description: HomeRender.oscar_description },
                { image: "/static/images/astronomy.jpg", link: BasicInitializer.FLASK_URL + "astronomy_km", title: "Astronomy", description: HomeRender.astronomy_description },
                { image: "/static/images/stocks.jpg", link: BasicInitializer.FLASK_URL + "stocks_km", title: "Stocks", description: HomeRender.stocks_description },
                { image: "/static/images/nutrition.jpg", link: BasicInitializer.FLASK_URL + "nutrition_km", title: "Nutrition", description: HomeRender.nutrition_description },
                { image: "/static/images/golf.jpg", link: BasicInitializer.FLASK_URL + "golf_km", title: "Golf", description: HomeRender.golf_description },
                { image: "/static/images/grammy.jpg", link: BasicInitializer.FLASK_URL + "grammy_songs_km", title: "Grammy Music", description: HomeRender.grammy_description },
                { image: "/static/images/books.jpg", link: BasicInitializer.FLASK_URL + "authors_km", title: "Authors & Books", description: HomeRender.books_description },
                { image: "/static/images/electronics.jpg", link: BasicInitializer.FLASK_URL + "electronics_km", title: "Electronics", description: HomeRender.electronics_description },
                { image: "/static/images/chemistry.jpg", link: BasicInitializer.FLASK_URL + "chemistry_km", title: "Chemistry", description: HomeRender.chemistry_description },
                { image: "/static/images/physics.jpg", link: BasicInitializer.FLASK_URL + "physics_km", title: "Physics", description: HomeRender.physics_description },
                { image: "/static/images/machines.jpg", link: BasicInitializer.FLASK_URL + "general_machines_km", title: "Machines", description: HomeRender.machines_description }
            ];



        {
            const newImages = images.slice(0, 2);
            this.populateImageRowsColumns("HomeArea_2", 1, newImages);
        }
        {
            const newImages = images.slice(2, 3);
            this.populateImageRowsColumns("HomeArea_2", 2, newImages);
        }
        {
            const newImages = images.slice(3, 5);
            this.populateImageRowsColumns("HomeArea_2", 3, newImages);
        }
        {
            const newImages = images.slice(5, 7);
            this.populateImageRowsColumns("HomeArea_2", 4, newImages);
        }
        {
            const newImages = images.slice(7, 8);
            this.populateImageRowsColumns("HomeArea_2", 5, newImages);
        }
        {
            const newImages = images.slice(8, 10);
            this.populateImageRowsColumns("HomeArea_2", 6, newImages);
        }
        {
            const newImages = images.slice(10, 12);
            this.populateImageRowsColumns("HomeArea_2", 7, newImages);
        }
        {
            const newImages = images.slice(12, 14);
            this.populateImageRowsColumns("HomeArea_2", 8, newImages);
        }
        {
            const newImages = images.slice(14, 16);
            this.populateImageRowsColumns("HomeArea_2", 9, newImages);
        }
        {
            const newImages = images.slice(16, 18);
            this.populateImageRowsColumns("HomeArea_2", 10, newImages);
        }
        {
            const newImages = images.slice(18, 19);
            this.populateImageRowsColumns("HomeArea_2", 11, newImages);
        }
    }

}
