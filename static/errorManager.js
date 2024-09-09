class ErrorManager {
    constructor(errorFilePath = 'static/errors.txt') {
        this.errorFilePath = errorFilePath;
        this.errors = new Map();
        this.loadErrorsFromFile();
    }

    loadErrorsFromFile() {
        fetch(this.errorFilePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load the error messages file.');
                }
                return response.text();
            })
            .then(data => {
                const lines = data.split('\n');
                lines.forEach(line => {
                    line = line.trim();
                    // Ignore lines that start with //
                    if (line.startsWith('//') || line.length === 0) {
                        return;
                    }

                    const [code, message] = line.split(':', 2);
                    if (code && message) {
                        this.errors.set(parseInt(code.trim()), message.trim());
                    }
                });
            })
            .catch(error => {
                console.error('Error loading errors:', error);
            });
    }

    showError(code, ...args) {
        if (this.errors.has(code)) {
            let message = this.errors.get(code);

            // Replace placeholders %s with actual arguments
            args.forEach(arg => {
                message = message.replace('%s', arg);
            });

            alert(`Error ${code}: ${message}`);
        } else {
            alert(`Unknown error with code: ${code}`);
        }
    }
}
