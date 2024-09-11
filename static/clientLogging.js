class ClientLogger {
    constructor(interval = 10000) {
        this.logs = [];
        this.lastSentIndex = 0;
        this.interval = interval;
        this.clientId = this.getClientId();
        this.startSendingLogs();

        // Override console.log to capture logs
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            const logMessage = args.join(' ');
            this.logs.push(logMessage);
            originalConsoleLog.apply(console, args);
        };
    }

    getFormattedTimestamp() {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
    
        const day = String(now.getDate()).padStart(2, '0');
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
    
        return `${day}${month}${year}-${hours}:${minutes}:${seconds}`;
    }

    getClientId() {
            let clientId = 'client-' + this.getFormattedTimestamp(); // Use timestamp as the clientId
        return clientId;
    }

    startSendingLogs() {
        setInterval(() => this.sendLogsToServer(), this.interval);
    }

    sendLogsToServer() {

        // Only send the new logs (those after lastSentIndex)
        const newLogs = this.logs.slice(this.lastSentIndex);
        if (newLogs.length > 0) {
            fetch('/save_logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clientId: this.clientId, logs: newLogs }),
            })
            .then(response => response.json())
            .then(data => {
                console.log("Logs sent successfully:", data);
                this.lastSentIndex = this.logs.length; // Update the last sent index
            })
            .catch(error => console.error("Error sending logs:", error));
        }
    }
}

