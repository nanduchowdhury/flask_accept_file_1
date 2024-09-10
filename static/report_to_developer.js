document.addEventListener('DOMContentLoaded', function() {
    const reportItem = document.getElementById('report-item');
    const reportPopup = document.getElementById('reportPopup');
    const cancelButton = document.getElementById('reportIssueCancelButton');
    const sendButton = document.getElementById('reportIssueSendButton');
    const screenshotImage = document.getElementById('screenshotImage');
    const reportMessage = document.getElementById('reportMessage');

    // Function to capture a screenshot of the DOM
    function captureScreenshot() {
        html2canvas(document.body).then(function(canvas) {
            screenshotImage.src = canvas.toDataURL('image/jpeg');
        });
    }

    // Show the report pop-up and capture screenshot
    reportItem.addEventListener('click', function() {
        captureScreenshot();
        reportPopup.classList.remove('report_issue_hidden');
    });

    // Cancel button hides the pop-up
    cancelButton.addEventListener('click', function() {
        reportPopup.classList.add('report_issue_hidden');
    });

    // Send button functionality
    sendButton.addEventListener('click', function() {
        const message = reportMessage.value;
        const screenshot = screenshotImage.src;

        // Send data to the server using fetch or any other method
        fetch('/report', {
            method: 'POST',
            body: JSON.stringify({ screenshot, message }),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                alert('Report sent successfully!');
                reportPopup.classList.add('report_issue_hidden');
            } else {
                alert('Failed to send the report.');
            }
        }).catch(error => {
            console.error('Error:', error);
        });
    });
});
