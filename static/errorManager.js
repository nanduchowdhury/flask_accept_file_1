"use strict";

class ErrorManager {
    constructor(errorFilePath = '/static/errors.txt') {
        this.errorFilePath = errorFilePath;
        this.errors = new Map();

        this.MESSAGE_BOX_DISAPPEAR_TIMEOUT = 6000;

        this.logs = [];
        this.lastSentIndex = 0;
        this.interval = 60000; // send-logs interval 3mnts.
        this.serverEndpoint = '/save_logs';
        this.timeoutID = null; // Holds the timeout ID

        this.startSendingLogs();
        
        this.loadErrorsFromFile();
        
        this.initMessageBox();

        // Override console.log to capture logs
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            const logMessage = args.join(' ');
            this.logs.push({ message: logMessage, level: 'INFO' });
            originalConsoleLog.apply(console, args);
        };
    }

    initMessageBox() {
        
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
        const request = new XMLHttpRequest();
        request.open("GET", this.errorFilePath, false); // Synchronous request (blocking)
        request.send(null);
    
        if (request.status === 200) {
            const lines = request.responseText.split('\n');
            this.errors = new Map(); // Ensure errors map is initialized
    
            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('//') || line.length === 0) {
                    return;
                }
    
                const [code, message] = line.split(':', 2);
                if (code && message) {
                    this.errors.set(parseInt(code.trim()), message.trim());
                }
            });
        } else {
            console.error('Failed to load the error messages file.');
        }
    }
    
    showMessage(type, message) {
        switch (type) {
          case 'info':
            this.messageBox.classList.add('info');
            break;
          case 'warn':
            this.messageBox.classList.add('warn');
            break;
          case 'error':
            this.messageBox.classList.add('error');
            break;
          default:
            this.messageBox.classList.add('info');
        }
        // Set the message text and show the message box
        this.messageBoxText.textContent = message;
        this.messageBox.classList.remove('hidden');

        console.log(message);

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
        console.log(message);
    }
}
