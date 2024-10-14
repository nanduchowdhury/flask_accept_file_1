class ReportToDeveloper {
  constructor() {
      this.reportItem = document.getElementById('report-item');
      this.reportPopup = document.getElementById('reportPopup');
      this.cancelButton = document.getElementById('reportIssueCancelButton');
      this.sendButton = document.getElementById('reportIssueSendButton');
      this.screenshotImage = document.getElementById('screenshotImage');
      this.reportMessage = document.getElementById('reportMessage');

      // Bind methods to the class instance
      this.onReportItem = this.onReportItem.bind(this);
      this.onCancel = this.onCancel.bind(this);
      this.onSend = this.onSend.bind(this);

      this.reportItem.addEventListener('click', this.onReportItem);
      this.cancelButton.addEventListener('click', this.onCancel);
      this.sendButton.addEventListener('click', this.onSend);
  }

  onCancel() {
      this.reportPopup.classList.add('report_issue_hidden');
  }

  generateBase64File(pdfBlob, callback) {
      // Convert Blob to base64 string for sending as part of JSON
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result.split(',')[1]); // Get Base64 string without metadata
      reader.onerror = (err) => console.error('Error reading file', err);
      reader.readAsDataURL(pdfBlob);
  }

  onSend() {
    this.createPdfAndSendToServer();
    this.reportPopup.classList.add('report_issue_hidden');
  }

  createPdfAndSendToServer() {
      const pdfBlob = this.generatePDF((pdfBlob) => {
          this.generateBase64File(pdfBlob, (base64File) => {
              const data = {
                  client_uuid: basicInitializer.getClient_UUID(),
                  fileName: 'report.pdf',
                  fileType: 'application/pdf',
                  fileContent: base64File,
                  additionalData: {
                      someKey: 'someValue'
                  }
              };

              fetch('/report_to_user', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(data)
              })
              .then(response => {
                  if (!response.ok) {
                    return response.json().then(data => {
                      throw new Error(data.error); // Access the error message
                  });
                  }
                  return response.json(); // Process successful response
              })
              .then(data => {
                  // Process received data
                  errorManager.showError(1047);
              })
              .catch(error => {
                errorManager.showInfo(1046, error.message);
              });
          });
      });
  }

  onReportItem() {
      this.captureScreenshot();
      this.reportPopup.classList.remove('report_issue_hidden');
  }

  captureScreenshot() {
      html2canvas(document.body).then((canvas) => {
          this.screenshotImage.src = canvas.toDataURL('image/jpeg');
      });
  }

  generatePDF(callback) {
      const message = this.reportMessage.value;
      const screenshot = this.screenshotImage.src;

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();

      const yPosition = 10;
    const lineHeight = 15;

    pdf.text(basicInitializer.getClient_UUID(), 10, yPosition);
    pdf.text(basicInitializer.getClientId(), 10, yPosition + lineHeight);
    pdf.text(message, 10, yPosition + 2 * lineHeight);


      // Convert image to data URL format (Base64)
      const img = new Image();
      img.src = screenshot;

      img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const context = canvas.getContext('2d');
          context.drawImage(img, 0, 0);

          const imgData = canvas.toDataURL('image/png');

          // Insert the image into the PDF
          pdf.addImage(imgData, 'PNG', 10, 80, 180, 150);

          // Return the PDF as a Blob object via callback
          callback(pdf.output('blob'));
      };
  }
}
