"use strict";

class PDFImageExtractor {
    constructor(file) {
      this.file = file;
      this.images = [];
    }
  
    async extractImages() {
      const arrayBuffer = await this.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  
      this.images = []; // Reset images array
  
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const operatorList = await page.getOperatorList();
  
        operatorList.fnArray.forEach((fn, idx) => {
          if (fn === pdfjsLib.OPS.paintImageXObject) {
            const imgIndex = operatorList.argsArray[idx][0];
            const img = page.objs.get(imgIndex);
            if (img) {
              this.images.push(img);
            }
          }
        });
      }
    }
  
    getNumberOfImages() {
      return this.images.length;
    }
  
    getImageAtIndex(index) {
      if (index < 0 || index >= this.images.length) {
        throw new Error('Index out of bounds');
      }
      return this.images[index];
    }
  }

  

