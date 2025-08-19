# backend/app/celery_worker.py

from celery import Celery
import smtplib
from email.mime.text import MIMEText
from app.config import settings # Import the application settings

# Configure Celery
celery_app = Celery(
    "tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task(
    bind=True,
    name="send_reminder_email",
    autoretry_for=(smtplib.SMTPException,), # Automatically retry on any email-related network errors
    retry_kwargs={'max_retries': 3, 'countdown': 60} # Retry up to 3 times, waiting 60 seconds between tries
)
def send_reminder_email(self, recipient_email: str, task_content: str):
    """
    A Celery task that sends a reminder email using a secure connection.
    Includes automatic retries on failure and detailed terminal logging.
    """
    # This print statement will appear as soon as the worker starts the task.
    print(f"TASK RECEIVED: Attempting to send reminder for '{task_content}' to {recipient_email}")

    subject = f"Maya Reminder: {task_content}"
    body = f"This is a friendly reminder for your scheduled task:\n\n'{task_content}'"
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = settings.MAIL_FROM
    msg['To'] = recipient_email

    try:
        # Use a secure connection with SMTP_SSL for Gmail on port 465 for better reliability.
        with smtplib.SMTP_SSL(settings.MAIL_SERVER, 465) as server:
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)
        
        # This print statement will appear in your Celery worker terminal upon success.
        print(f"TASK SUCCEEDED: Reminder email sent to {recipient_email} for task: '{task_content}'")
        return f"Email sent to {recipient_email}"
    except Exception as e:
        print(f"TASK FAILED: Could not send email. Error: {e}. Retrying if possible...")
        # Re-raising the exception is what triggers Celery's automatic retry mechanism.
        raise self.retry(exc=e)
