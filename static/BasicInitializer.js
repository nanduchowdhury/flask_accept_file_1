class BasicInitializer {
    constructor() {
        this.clientId = 'client-' + this.getFormattedTimestamp();
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
        return this.clientId;
    }
}
