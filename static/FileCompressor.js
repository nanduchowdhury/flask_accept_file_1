"use strict";

/*****************************************************
* Usage:
*     c = new FileCompressor();
*
*     // This runs async. Also this will stop any similar call made earlier.
*     c = compressFile("file.png") 
*
*     // This will wait if compression still ongoing
*     compressed_file = this.waitAndGetCompressedFile() 
*
*******************************************************/

class FileCompressor {
    constructor() {
        this.compressedFile = null;
        this.currentAbortController = null;
        this.compressionPromise = null;
    }

    async compressFile(input) {
        // Abort any ongoing compression
        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
    
        // Create a new abort controller for the current task
        this.currentAbortController = new AbortController();
        const signal = this.currentAbortController.signal;
    
        let file;
        let compressedFileName;
    
        // Check if the input is a File object
        if (input instanceof File) {
            // Use the existing name and append `.zip`
            compressedFileName = input.name + ".zip";
            file = input;
        } else if (typeof input === "string" && input.startsWith("data:")) {
            // If input is a dataURL, process as a Blob
            const byteString = atob(input.split(",")[1]);
            const mimeType = input.split(",")[0].split(":")[1].split(";")[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });
    
            // Set a compressed filename based on the MIME type
            compressedFileName = mimeType.startsWith("image/")
                ? "compressedImage.jpg.zip"
                : mimeType.startsWith("video/")
                ? "compressedVideo.mp4.zip"
                : mimeType === "application/pdf"
                ? "compressedDocument.pdf.zip"
                : "compressedFile.dat.zip";
    
            file = new File([blob], compressedFileName, { type: mimeType });
        } else if (input instanceof Blob) {
            // If input is a Blob but not a File, set the file name based on MIME type
            compressedFileName = input.type.startsWith("image/")
                ? "compressedImage.jpg.zip"
                : input.type.startsWith("video/")
                ? "compressedVideo.mp4.zip"
                : input.type === "application/pdf"
                ? "compressedDocument.pdf.zip"
                : "compressedFile.dat.zip";
    
            file = new File([input], compressedFileName, { type: input.type });
        } else {
            throw new Error("Unsupported input type");
        }
    
        this.compressionPromise = new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => {
                console.log(`Compression for ${file.name} was aborted.`);
                reject(new Error("Compression aborted"));
            });
    
            this._compress(file, signal)
                .then((compressedFile) => {
                    this.compressedFile = compressedFile;
                    resolve(compressedFile);
                })
                .catch((error) => {
                    if (error.message !== "Compression aborted") {
                        console.error("Compression error:", error);
                    }
                    reject(error);
                });
        });
    }
    

    async _compress(file, signal) {
        const fileType = file.type;

        if (fileType.startsWith("image/")) {
            return await this.compressImage(file, signal);
        } else if (fileType.startsWith("video/")) {
            return await this.zipFile(file, signal, "compressedVideo.zip");
        } else if (fileType === "application/pdf") {
            return await this.zipFile(file, signal, "compressedDocument.zip");
        } else {
            return await this.zipFile(file, signal, "compressedFile.zip");
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
                        0.7
                    );
                };
            };

            reader.readAsDataURL(file);
        });
    }

    zipFile(file, signal, outputName) {
        return new Promise((resolve, reject) => {
            const zip = new JSZip();
            zip.file(file.name, file);
    
            zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } })
                .then((compressedContent) => {
                    if (signal.aborted) {
                        reject(new Error('Compression aborted'));
                        return;
                    }
                    const compressedFile = new File([compressedContent], outputName, {
                        type: "application/zip",
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                })
                .catch((error) => reject(error));
        });
    }

    async waitAndGetCompressedFile() {
        if (this.compressionPromise) {
            await this.compressionPromise;
        }
        return this.compressedFile;
    }
}



