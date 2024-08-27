class PreviewAreaControl {
    constructor() {

    }

    showVideoInCanvas(videoUrl) {
        console.trace(`KPMNDK - trace : `);
    
        const videoElement = document.getElementById('videoOverlay');
        const pdfCanvas = document.getElementById('pdfCanvas');
    
        const ctx = pdfCanvas.getContext('2d');
        ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    
        pdfCanvas.style.display = 'none';
    
        videoElement.src = videoUrl;
        videoElement.style.display = 'block';
    
        previewArea.removeEventListener('mousedown', onMouseDown);
    }
    
    hideVideoShowCanvas() {
        console.trace(`KPMNDK - trace : `);
    
        const videoElement = document.getElementById('videoOverlay');
        const pdfCanvas = document.getElementById('pdfCanvas');
    
        videoElement.pause();
        videoElement.style.display = 'none';
    
        pdfCanvas.style.display = 'block';
    
        previewArea.addEventListener('mousedown', onMouseDown);
    }
    
}
