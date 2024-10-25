"use strict";

class FileCompressor {
    constructor() {
        this.compressedFile = null;
        this.currentAbortController = null;
        this.compressionPromise = null;
    }

    compressFile(file) {
        // Abort any ongoing compression
        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }

        // Create a new abort controller for the current task
        this.currentAbortController = new AbortController();
        const signal = this.currentAbortController.signal;

        // Start a new compression task without returning a promise
        this.compressionPromise = new Promise((resolve, reject) => {
            // Attach handlers to handle abort
            signal.addEventListener('abort', () => {
                console.log(`Compression for ${file.name} was aborted.`);
                reject(new Error('Compression aborted'));
            });

            this._compress(file, signal)
                .then((compressedFile) => {
                    this.compressedFile = compressedFile;
                    resolve(compressedFile);
                })
                .catch((error) => {
                    if (error.message !== 'Compression aborted') {
                        console.error('Compression error:', error);
                    }
                    reject(error);
                });
        });
    }

    async _compress(file, signal) {
        const fileType = file.type;

        if (fileType.startsWith("image/")) {
            return await this.compressImage(file, signal);
        } else if (fileType === "application/pdf") {
            return await this.zipFile(file, signal);
        } else if (fileType.startsWith("video/")) {
            return await this.zipFile(file, signal);
        } else {
            return await this.zipFile(file, signal);
        }
    }

    compressImage(file, signal) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (event) => {
                img.src = event.target.result;

                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");

                    const scaleFactor = 0.5;
                    canvas.width = img.width * scaleFactor;
                    canvas.height = img.height * scaleFactor;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob(
                        (blob) => {
                            if (signal.aborted) {
                                reject(new Error('Compression aborted'));
                                return;
                            }
                            const compressedFile = new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        },
                        file.type,
                        0.7 // Compression quality
                    );
                };
            };

            reader.readAsDataURL(file);
        });
    }

    zipFile(file, signal) {
        return new Promise((resolve, reject) => {
            const zip = new JSZip();
            zip.file(file.name, file);

            zip.generateAsync({ type: "blob" }).then((compressedContent) => {
                if (signal.aborted) {
                    reject(new Error('Compression aborted'));
                    return;
                }
                const compressedFile = new File([compressedContent], `${file.name}.zip`, {
                    type: "application/zip",
                    lastModified: Date.now(),
                });
                resolve(compressedFile);
            });
        });
    }

    async waitAndGetCompressedFile() {
        // Wait for the compression promise to resolve
        if (this.compressionPromise) {
            await this.compressionPromise;
        }
        return this.compressedFile;
    }
}

