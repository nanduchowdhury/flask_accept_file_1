class GeolocationInfo {
    constructor() {
        // Get API key from https://ipinfo.io/account/token
        this.apiKey = "1ce0867cacbb5c";
        this.geolocationData = null;
        this.dataReady = false;

        this.fetchGeolocationData();
    }

    // Fetch the geolocation data from ipinfo.io and set a flag when the data is ready
    async fetchGeolocationData() {
        try {
            const response = await fetch(`https://ipinfo.io/json?token=${this.apiKey}`);
            if (!response.ok) {
                throw new Error("Error fetching geolocation info");
            }
            const data = await response.json();
            this.geolocationData = {
                ip: data.ip,
                country: data.country,
                region: data.region,
                city: data.city,
                location: data.loc,  // Latitude and longitude
                postal: data.postal,
                timezone: data.timezone,
                org: data.org  // Organization or ISP
            };
            this.dataReady = true;  // Set flag when data is ready
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Wait for data to be ready
    async waitForData() {
        while (!this.dataReady) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
        }
    }

    // Method to get the IP address
    async getIP() {
        await this.waitForData();
        return this.geolocationData.ip || "IP not available";
    }

    // Method to get the country
    async getCountry() {
        await this.waitForData();
        return this.geolocationData.country || "Country not available";
    }

    // Method to get the region
    async getRegion() {
        await this.waitForData();
        return this.geolocationData.region || "Region not available";
    }

    // Method to get the city
    async getCity() {
        await this.waitForData();
        return this.geolocationData.city || "City not available";
    }

    // Method to get the latitude and longitude
    async getLocation() {
        await this.waitForData();
        return this.geolocationData.location || "Location not available";
    }

    // Method to get the postal code
    async getPostalCode() {
        await this.waitForData();
        return this.geolocationData.postal || "Postal-code not available";
    }

    // Method to get the timezone
    async getTimezone() {
        await this.waitForData();
        return this.geolocationData.timezone || "Time-zone not available";
    }

    // Method to get the organization (ISP)
    async getOrganization() {
        await this.waitForData();
        return this.geolocationData.org || "Organization not available";
    }

    async getFormattedInfo() {
        const country = await this.getCountry();
        const region = await this.getRegion();
        const city = await this.getCity();
        const location = await this.getLocation();
        const postalCode = await this.getPostalCode();
        const timezone = await this.getTimezone();
        const organization = await this.getOrganization();

        return `Country - ${country}    Region - ${region}      City - ${city}      Location - ${location}      Postal-Code - ${postalCode}     Timezone - ${timezone}      Organization - ${organization}`;
    }
}


