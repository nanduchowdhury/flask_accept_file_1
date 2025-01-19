"use strict";

class ReportToDeveloper {
  constructor() {
      this.reportIssueItem = document.getElementById('report-item');
      this.reportIssuePopup = document.getElementById('reportIssuePopup');
      this.reportIssueCancelButton = document.getElementById('reportIssueCancelButton');
      this.reportIssueSendButton = document.getElementById('reportIssueSendButton');
      this.reportIssueScreenshotImage = document.getElementById('screenshotImage');
      this.reportIssueMessage = document.getElementById('reportMessage');

      this.settingsItem = document.getElementById('settings-item');
      this.settingsPopup = document.getElementById('settingsPopup');
      this.settingsCancelButton = document.getElementById('settingsCancelButton');
      this.settingsOkButton = document.getElementById('settingsOkButton');

      // Bind methods to the class instance
      this.onreportIssueItem = this.onreportIssueItem.bind(this);
      this.onReportIssueCancel = this.onReportIssueCancel.bind(this);
      this.onReportIssueSend = this.onReportIssueSend.bind(this);

      this.onSettingsItem = this.onSettingsItem.bind(this);
      this.onSettingsCancel = this.onSettingsCancel.bind(this);
      this.onSettingsOk = this.onSettingsOk.bind(this);

      this.reportIssueItem.addEventListener('click', this.onreportIssueItem);
      this.reportIssueCancelButton.addEventListener('click', this.onReportIssueCancel);
      this.reportIssueSendButton.addEventListener('click', this.onReportIssueSend);

      this.settingsItem.addEventListener('click', this.onSettingsItem);
      this.settingsCancelButton.addEventListener('click', this.onSettingsCancel);
      this.settingsOkButton.addEventListener('click', this.onSettingsOk);
  }

  onReportIssueCancel() {
      this.reportIssuePopup.classList.add('tr_dialog_hidden');
  }

  onSettingsCancel() {

  }

  onSettingsOk() {
    const selectedLanguage = document.querySelector('input[name="language"]:checked');
    if (selectedLanguage) {
        console.log(`Selected language: ${selectedLanguage.value}`);
    } else {
        console.log('No language selected.');
    }
    this.settingsPopup.classList.add('tr_dialog_hidden');
  }

  generateBase64File(pdfBlob, callback) {
      // Convert Blob to base64 string for sending as part of JSON
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result.split(',')[1]); // Get Base64 string without metadata
      reader.onerror = (err) => console.error('Error reading file', err);
      reader.readAsDataURL(pdfBlob);
  }

  onReportIssueSend() {
    this.createPdfAndSendToServer();
    this.reportIssuePopup.classList.add('tr_dialog_hidden');
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

              basicInitializer.makeServerRequest('/report_to_user', data, 
                this.lamdaOnReportToServerRequestSuccess, this.lamdaOnReportToServerRequestFailure);
          });
      });
  }

  lamdaOnReportToServerRequestSuccess = (data) => {
    errorManager.showError(1047);
    }

    lamdaOnReportToServerRequestFailure = (msg) => {
        if ( msg ) {
            errorManager.showInfo(1046, error.message);
        }
    }

  onreportIssueItem() {
      this.captureScreenshot();
      this.reportIssuePopup.classList.remove('tr_dialog_hidden');
  }

  onSettingsItem() {
    this.captureScreenshot();
    this.settingsPopup.classList.remove('tr_dialog_hidden');
  }

  captureScreenshot() {
      html2canvas(document.body).then((canvas) => {
          this.reportIssueScreenshotImage.src = canvas.toDataURL('image/jpeg');
      });
  }

  generatePDF(callback) {
      const message = this.reportIssueMessage.value;
      const screenshot = this.reportIssueScreenshotImage.src;

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
