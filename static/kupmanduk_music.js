"use strict";

class KupmandukMusic {
    constructor(jsonData) {

        this.jsonData = jsonData;

        this.topicLabel = document.getElementById('topic-label');
        this.viewArea_1 = document.getElementById('ViewArea_1');
        this.viewArea_2 = document.getElementById('ViewArea_2');

        this.youtubeMgr = new YoutubeManager('ViewArea_2');
    }

    update() {
        this.topicLabel.innerHTML = this.jsonData.topicLabel;
        // this.viewArea_1.innerHTML = this.jsonData.viewArea_1;
        this.viewArea_1.innerHTML = this.jsonData.viewArea_1.replace(/\n/g, '<br>');
        this.youtubeMgr.showByUrl(this.jsonData.viewArea_2);
    }
}

class YoutubeManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
    }

    showById(videoId) {
        // Create an iframe to embed the YouTube video
        const iframe = document.createElement("iframe");
        iframe.width = "360"; // Width of the video
        iframe.height = "315"; // Height of the video
        iframe.src = `https://www.youtube.com/embed/${videoId}`; // YouTube embed URL
        iframe.title = "YouTube video player";
        iframe.frameBorder = "0"; // No border
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true; // Allow fullscreen playback

        // Clear the container (if needed) and append the iframe
        this.container.innerHTML = ""; // Clear any existing content

        // Add other flexbox properties to center content
        this.container.style.display = "flex";
        this.container.style.justifyContent = "center"; // Center horizontally
        this.container.style.alignItems = "center";     // Center vertically

        this.container.appendChild(iframe);
    }

    getYouTubeVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|embed|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null; // Return the video ID or null if no match
    }

    showByUrl(videoUrl) {
        try {

            const videoId = this.getYouTubeVideoId(videoUrl);
            if(videoId) {
                this.showById(videoId);
            } else {
                console.error("Could not extract video ID from URL.");
            }
        } catch (error) {
            console.error("Invalid URL format:", error);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const kMusic = new KupmandukMusic(musicJsonData);
    kMusic.update();
});



