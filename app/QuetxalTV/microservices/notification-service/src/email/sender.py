import smtplib
import uuid
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader
import src.config as config

logger = logging.getLogger(__name__)

class EmailSender:
    def __init__(self):
        self.env = Environment(
            loader=FileSystemLoader("src/email/templates")
        )

    def send(self, to_email: str, subject: str, template_file: str,
             template_data: dict) -> str:
        message_id = str(uuid.uuid4())
        try:
            template = self.env.get_template(template_file)
            html = template.render(**template_data)

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = config.SMTP_FROM
            msg["To"]      = to_email
            msg["Message-ID"] = message_id
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT) as server:
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                server.sendmail(config.SMTP_FROM, to_email, msg.as_string())

            logger.info(f"Email enviado a {to_email} | message_id={message_id}")
            return message_id

        except Exception as e:
            logger.error(f"Error enviando email a {to_email}: {e}")
            raise