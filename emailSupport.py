import smtplib
from email.message import EmailMessage
import os

class EmailSupport():
    def __init__(self, eManager):

        self.eManager = eManager

        self.sender_email = "your_email@example.com"
        self.receiver_email = "receiver@example.com"
        self.subject = "Subject of the email"
        self.body = "This is the body of the email"
        self.file_path = "/path/to/your/file.txt"
        self.smtp_server = "smtp.example.com"
        self.smtp_port = 465  # For SSL
        self.login = "your_email@example.com"
        self.password = "your_password"

    def send_email_with_attachment(subject, body, file_path):
        # Create the email message
        msg = EmailMessage()
        msg['From'] = self.sender_email
        msg['To'] = self.receiver_email
        msg['Subject'] = subject
        msg.set_content(body)

        # Check if the file exists and attach it
        if os.path.isfile(file_path):
            with open(file_path, 'rb') as file:
                file_data = file.read()
                file_name = os.path.basename(file_path)
                msg.add_attachment(file_data, maintype='application', subtype='octet-stream', filename=file_name)
        else:
            eManager.show_message(2033, file_path)
            return

        # Send the email via SMTP
        try:
            with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port) as smtp:
                smtp.login(self.login, self.password)
                smtp.send_message(msg)
                print("Email sent successfully!")
        except Exception as e:
            eManager.show_message(2034, str(e))





