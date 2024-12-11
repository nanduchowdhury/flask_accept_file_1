"use strict";

class mcqManager {
    constructor(xmlData) {
        this.data = xmlData; // XML data of questions and answers
        this.userAnswers = {};
        this.popout = null; // To hold the popout DOM element
        this.title = "MCQ"; // Default title

    }

    setTitle(title) {
        this.title = title || "MCQ";
        if (this.popout) {
            const titleElement = this.popout.querySelector('.mcq-title');
            if (titleElement) {
                titleElement.textContent = this.title;
            }
        }
    }

    show() {
        return new Promise((resolve) => {
            // Create the popout container
            this.popout = document.createElement('div');
            this.popout.className = 'mcq-popout';
            document.body.appendChild(this.popout);

            // Add the title
            const titleDiv = document.createElement('div');
            titleDiv.className = 'mcq-title';
            titleDiv.textContent = this.title;
            this.popout.appendChild(titleDiv);

            // Add the close button
            const closeButton = document.createElement('div');
            closeButton.className = 'close-btn';
            closeButton.innerHTML = '&times;'; // Simple 'X' icon
            closeButton.onclick = () => {
                this.closePopout();
                resolve(""); // Resolve with empty string on close
            };
            this.popout.appendChild(closeButton);

            // Add questions and choices
            const form = document.createElement('form');
            Object.keys(this.data).forEach((questionKey, index) => {
                const questionData = this.data[questionKey];
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question';

                const questionText = document.createElement('h3');
                questionText.textContent = `${index + 1}. ${questionKey}`;
                questionDiv.appendChild(questionText);

                Object.keys(questionData.choices).forEach(choiceKey => {
                    const choiceLabel = document.createElement('label');
                    const choiceInput = document.createElement('input');
                    choiceInput.type = 'radio';
                    choiceInput.name = questionKey;
                    choiceInput.value = choiceKey;
                    choiceInput.onclick = () => {
                        this.userAnswers[questionKey] = choiceKey;
                    };
                    choiceLabel.appendChild(choiceInput);
                    choiceLabel.appendChild(document.createTextNode(` ${choiceKey}: ${questionData.choices[choiceKey]}`));
                    questionDiv.appendChild(choiceLabel);
                    questionDiv.appendChild(document.createElement('br'));
                });

                form.appendChild(questionDiv);
            });

            this.popout.appendChild(form);

            // Add evaluation button
            const evalButton = document.createElement('button');
            evalButton.className = 'eval-btn';
            evalButton.textContent = 'Evaluate';
            evalButton.onclick = (event) => {
                event.preventDefault();
                const result = this.evaluate(); // Evaluate and get result
                this.closePopout();
                resolve(result); // Resolve with the result string
            };
            this.popout.appendChild(evalButton);
        });
    }

    closePopout() {
        if (this.popout) {
            document.body.removeChild(this.popout);
            this.popout = null;
        }
    }

    evaluate() {
        let score = 0;
        const totalQuestions = Object.keys(this.data).length;
        let resultHTML = "";
    
        Object.keys(this.data).forEach(questionKey => {
            const questionData = this.data[questionKey];
            const correctAnswer = questionData.answer;
            const userAnswer = this.userAnswers[questionKey] || null;
    
            // Add question
            resultHTML += `<p><strong>${questionKey}</strong><br>`;
            Object.keys(questionData.choices).forEach(choiceKey => {
                let choiceText = `${choiceKey}: ${questionData.choices[choiceKey]}`;
                if (choiceKey === correctAnswer && userAnswer === correctAnswer) {
                    // Correct answer chosen
                    resultHTML += `<span style="color: green; font-weight: bold;">${choiceText}</span><br>`;
                } else if (choiceKey === correctAnswer) {
                    // Correct answer not chosen
                    resultHTML += `<span style="color: green;">${choiceText}</span><br>`;
                } else if (choiceKey === userAnswer) {
                    // User's wrong choice
                    resultHTML += `<span style="color: red; font-weight: bold;">${choiceText}</span><br>`;
                } else {
                    // Other options
                    resultHTML += `${choiceText}<br>`;
                }
            });
            resultHTML += `</p>`;
    
            if (userAnswer === correctAnswer) {
                score++;
            }
        });
    
        const percentage = ((score / totalQuestions) * 100).toFixed(2);
        resultHTML += `<p><strong>Your score: ${score}/${totalQuestions} (${percentage}%)</strong></p>`;

        // Close the pop-out
        this.closePopout();
    
        return resultHTML;
    }
    
}

class mcqServerManager {

    constructor() {

        this.spinner = new Spinner('loadingSpinner');
    }
    
    getMcqFromServer() {
        this.spinner.show();

        const data = {
            client_uuid: basicInitializer.getClient_UUID(),
            additionalData: {
                someKey: "someValue"
            }
        };

        basicInitializer.makeServerRequest('/generate_MCQ', data, 
            this.lamdaOnMcqRequestSuccess, this.lamdaOnMcqRequestFailure);
    }

    lamdaOnMcqRequestSuccess = (data) => {
        this.spinner.hide();

        if ( data.result1 ) {

            const jsonData = JSON.parse(data.result1);

            const mcq = new mcqManager(jsonData);
            mcq.setTitle("General MCQ");
            mcq.show().then((result) => {
                console.log(result); // Process the result string

                const postIt = new PostItNote(result, '');

                const container = document.getElementById('roughArea');
                container.appendChild(postIt.getElement());

            });
        }
    }

    lamdaOnMcqRequestFailure = (msg) => {
        this.spinner.hide();
        if ( msg ) {
            errorManager.showError(2047, msg);
        }
    }
}


