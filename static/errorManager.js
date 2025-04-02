"use strict";

class ErrorManager {
    constructor(errorFilePath = '/static/errors.txt') {
        this.errorFilePath = errorFilePath;
        this.errors = new Map();

        this.MESSAGE_BOX_DISAPPEAR_TIMEOUT = 6000;

        this.logs = [];
        this.lastSentIndex = 0;
        this.interval = 30000;
        this.serverEndpoint = '/save_logs';
        this.timeoutID = null; // Holds the timeout ID

        this.startSendingLogs();
        
        this.loadErrorsFromFile().then(() => {
        
            this.initLog4jAndMessageBox();

            // Override console.log to capture logs
            const originalConsoleLog = console.log;
            console.log = (...args) => {
                const logMessage = args.join(' ');
                this.logs.push({ message: logMessage, level: 'INFO' });
                originalConsoleLog.apply(console, args);
            };
        });
    }

    initLog4jAndMessageBox() {

        // Initialize log4javascript logger
        this.logger = log4javascript.getLogger('ErrorManager');

        // Create a BrowserConsoleAppender for client-side logs
        const consoleAppender = new log4javascript.BrowserConsoleAppender();

        // Override the append method of ConsoleAppender
        const originalAppend = consoleAppender.append;
        consoleAppender.append = (loggingEvent) => {
            const logMessage = consoleAppender.getLayout().format(loggingEvent);
            this.logs.push({
                message: logMessage,
                level: loggingEvent.level.name
            });
            // Call the original append method to continue normal logging to the console
            originalAppend.call(consoleAppender, loggingEvent);
        };

        // Add the modified appender to the logger
        this.logger.addAppender(consoleAppender);


        // Set layout for the logger
        const layout = new log4javascript.PatternLayout('%d{ISO8601} %-5p %c - %m%n');
        consoleAppender.setLayout(layout);

        // Set log level (optional)
        this.logger.setLevel(log4javascript.Level.DEBUG);
        
        // Select the message box elements
        this.messageBox = document.getElementById('messageBox');
        this.messageBoxText = document.getElementById('messageBoxText');
        this.messageBoxOkButton = document.getElementById('messageBoxOkButton');

        // Add event listener to OK button
        this.messageBoxOkButton.addEventListener('click', () => this.hideMessage());
    }

    startSendingLogs() {
        setInterval(() => {
            if (this.logs.length > this.lastSentIndex) {
                // Send logs to the server in batches
                const logsToSend = this.logs.slice(this.lastSentIndex);
                this.sendLogsToServer(logsToSend);
                this.lastSentIndex = this.logs.length;
            }
        }, this.interval);
    }


    sendLogsToServer(logs) {

        const data = {
            client_uuid: basicInitializer.getClient_UUID(),
            clientId: basicInitializer.getClientId(),
            logs: logs
        };

        basicInitializer.makeServerRequest(this.serverEndpoint, data, 
            this.lamdaOnSaveLogsRequestSuccess, this.lamdaOnSaveLogsRequestFailure);
    }

    lamdaOnSaveLogsRequestSuccess = (data) => {
    }

    lamdaOnSaveLogsRequestFailure = (msg) => {
        if ( msg ) {
            this.showError(2045, msg);
        }
    }

    loadErrorsFromFile() {
        return fetch(this.errorFilePath)
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
    

    showMessage(type, message) {
        // Log the message using log4javascript
        switch (type) {
          case 'info':
            this.logger.info(message);
            this.messageBox.classList.add('info');
            break;
          case 'warn':
            this.logger.warn(message);
            this.messageBox.classList.add('warn');
            break;
          case 'error':
            this.logger.error(message);
            this.messageBox.classList.add('error');
            break;
          default:
            this.logger.info(message);
            this.messageBox.classList.add('info');
        }
        // Set the message text and show the message box
        this.messageBoxText.textContent = message;
        this.messageBox.classList.remove('hidden');

        // Automatically hide the message after 30 seconds
        if (this.timeoutID) clearTimeout(this.timeoutID);  // Clear any existing timeout
        this.timeoutID = setTimeout(() => this.hideMessage(), this.MESSAGE_BOX_DISAPPEAR_TIMEOUT);
    }

    hideMessage() {
        this.messageBox.classList.add('hidden');
        this.messageBox.classList.remove('info', 'warn', 'error');
    }

    isBase64(str) {
        const base64Pattern = /^[A-Za-z0-9+/=]+$/;
        return base64Pattern.test(str);
    }

    getRealMessage(code, args) {
        let message;
    
        if (this.errors.has(code)) {
            message = this.errors.get(code);
    
            // Replace placeholders %s with actual arguments
            args.forEach(arg => {
                if (typeof arg === 'object') {
                    
                    const jsonString = JSON.stringify(arg, (key, value) => {
                    
                        // Check if value is an object or an error instance
                        if (value !== null && typeof value === 'object') {
                    
                            // Check if the value is a specific error instance
                            if (value instanceof ReferenceError) {
                                return `ReferenceError: ${value.message}`;
                            } else if (value instanceof Error) {  // For general errors
                                return `${value.name}: ${value.message}`;
                            }
                    
                            if (value instanceof ArrayBuffer || value instanceof Blob || value instanceof Uint8Array) {
                                return 'binary';  // Replace binary data with 'binary'
                            }
                            return value;  // Return other objects as is
                        }
                    
                        // Handle string values
                        if (typeof value === 'string') {
                            if (value.length > 1000 && this.isBase64(value)) {
                                return 'binary (base64)';
                            } else if (value.length > 100 && value.match(/^data:.+;base64,/)) {
                                return 'binary (base64)';
                            }
                        }
                    
                        // Return other types as is
                        return value;
                    });

                    message = message.replace('%s', jsonString);
                } else {
                    // Directly replace for primitive types
                    message = message.replace('%s', arg);
                }
            });
    
            message = `${code}: ${message}`;
        } else {
            message = `Unknown error with code: ${code}`;
        }
    
        return 'MSG-' + message;
    }

    showError(code, ...args) {
        let message = this.getRealMessage(code, args);
        this.showMessage('error', message);
    }

    showWarn(code, ...args) {
        let message = this.getRealMessage(code, args);
        this.showMessage('warn', message);
    }

    showInfo(code, ...args) {
        let message = this.getRealMessage(code, args);
        this.showMessage('info', message);
    }

    log(code, ...args) {
        let message = this.getRealMessage(code, args);
        this.logger.info(message);
    }
}
