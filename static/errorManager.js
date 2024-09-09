class ErrorManager {
    constructor() {
        this.errorMessages = {}; // Dictionary to store error codes and messages
        this.loadErrors(); // Load errors from the file
    }

    // Method to load error messages from a text file
    async loadErrors() {
        try {
            const response = await fetch('static/errors.txt');
            const data = await response.text();
            this.parseErrors(data);
        } catch (err) {
            console.error('Error loading error messages:', err);
        }
    }

    // Method to parse the error messages and populate the dictionary
    parseErrors(data) {
        const lines = data.split('\n');
        lines.forEach(line => {
            const [code, message] = line.split(':');
            if (code && message) {
                this.errorMessages[code.trim()] = message.trim();
            }
        });
    }

    // Method to get the error message for a given error code
    getErrorMessage(code) {
        return this.errorMessages[code] || 'Unknown error code';
    }

    // Method to replace %s in the message with provided arguments
    formatMessage(message, args) {
        let formattedMessage = message;
        args.forEach(arg => {
            formattedMessage = formattedMessage.replace('%s', arg);
        });
        return formattedMessage;
    }

    // Method to show error message in console and alert with arguments for %s replacement
    showError(code, ...args) {
        let errorMessage = this.getErrorMessage(code);
        
        // Replace placeholders (%s) with arguments
        if (args.length > 0) {
            errorMessage = this.formatMessage(errorMessage, args);
        }

        // Display the error
        console.error(`Error ${code}: ${errorMessage}`);
        alert(`Error ${code}: ${errorMessage}`);
    }
}
