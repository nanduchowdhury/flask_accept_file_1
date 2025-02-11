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

    renderHomeArea_2() {
        const texts = [
            "browse thru different sections...",
            "learn about finance...yoga...music etc",
            "get detail description on topics...",
            "...in multiple languages",
            "also get youtube video on topics..."
        ];
        const homeArea = document.getElementById("HomeArea_2");
    
        this.showLinesFading(texts, homeArea);
    }
}
