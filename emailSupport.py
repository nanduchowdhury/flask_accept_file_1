import smtplib
from email.message import EmailMessage
import os

class EmailSupport():
    def __init__(self, eManager):

        self.eManager = eManager

        self.sender_email = "contact@kupmanduk.co.in"
        self.receiver_email = "contact@kupmanduk.co.in"
        self.subject = "scholar-km - report by user"
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 465  # For SSL
        self.login = "nandu.chowdhury"
        self.password = "ksso fbtk ahok knvj"

    def send_email_with_attachment(self, subject, body, file_path):
        # Create the email message
        msg = EmailMessage()
        msg['From'] = self.sender_email
        msg['To'] = self.receiver_email
        msg['Subject'] = self.subject + " - " + subject
        msg.set_content(body)

        # Check if the file exists and attach it
        if os.path.isfile(file_path):
            with open(file_path, 'rb') as file:
                file_data = file.read()
                file_name = os.path.basename(file_path)
                msg.add_attachment(file_data, maintype='application', subtype='octet-stream', filename=file_name)
        else:
            self.eManager.show_message(2033, file_path)
            return

        # Send the email via SMTP
        try:
            with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port) as smtp:
                smtp.login(self.login, self.password)
                smtp.send_message(msg)
                print("Email sent successfully!")
        except Exception as e:
            self.eManager.show_message(2034, str(e))





