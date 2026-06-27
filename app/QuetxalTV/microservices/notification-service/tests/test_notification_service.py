from types import SimpleNamespace

import pytest

from src.email.sender import EmailSender
import src.email.sender as sender_module
import src.db.repository as repository_module
from src.db.repository import NotificationRepository


class FakeTemplate:
    def render(self, **data):
        return f"Hola {data.get('name', 'usuario')}"


class FakeEnv:
    def get_template(self, template_file):
        return FakeTemplate()

    def from_string(self, subject):
        return FakeTemplate()


class FakeSmtp:
    sent = []

    def __init__(self, host, port):
        self.host = host
        self.port = port

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def login(self, user, password):
        self.login_args = (user, password)

    def sendmail(self, from_email, to_email, body):
        self.sent.append((from_email, to_email, body))


def test_email_sender_sends_rendered_message(monkeypatch):
    FakeSmtp.sent = []
    monkeypatch.setattr(sender_module.smtplib, "SMTP_SSL", FakeSmtp)
    monkeypatch.setattr(sender_module.config, "SMTP_HOST", "smtp.test")
    monkeypatch.setattr(sender_module.config, "SMTP_PORT", 465)
    monkeypatch.setattr(sender_module.config, "SMTP_USER", "user")
    monkeypatch.setattr(sender_module.config, "SMTP_PASSWORD", "pass")
    monkeypatch.setattr(sender_module.config, "SMTP_FROM", "from@test")

    sender = EmailSender()
    sender.env = FakeEnv()
    message_id = sender.send("to@test", "Subject {{name}}", "welcome.html", {"name": "Ana"})

    assert message_id
    assert FakeSmtp.sent[0][0] == "from@test"
    assert FakeSmtp.sent[0][1] == "to@test"


def test_email_sender_raises_on_template_error():
    sender = EmailSender()
    sender.env = SimpleNamespace(get_template=lambda _: (_ for _ in ()).throw(RuntimeError("bad template")))

    with pytest.raises(RuntimeError):
        sender.send("to@test", "Subject", "missing.html", {})


class FakeCursor:
    def __init__(self):
        self.queries = []
        self.description = [("notification_id",), ("recipient_email",)]
        self.rows = [("11111111-1111-1111-1111-111111111111", "a@test")]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchone(self):
        return self.rows[0]

    def fetchall(self):
        return self.rows


class FakeConnection:
    def __init__(self):
        self.cursor_obj = FakeCursor()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return self.cursor_obj


@pytest.fixture()
def repository(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr(repository_module, "get_connection", lambda: conn)
    repo = NotificationRepository()
    return repo, conn


def test_repository_queues_and_reads_notifications(repository):
    repo, conn = repository
    notification_id = repo.queue_notification("u1", "a@test", "Ana", "WELCOME", {"name": "Ana"})
    pending = repo.get_pending_notifications(5)

    assert notification_id == "11111111-1111-1111-1111-111111111111"
    assert pending == [{"notification_id": "11111111-1111-1111-1111-111111111111", "recipient_email": "a@test"}]
    assert conn.cursor_obj.queries


def test_repository_marks_sent_and_failed(repository):
    repo, conn = repository
    repo.mark_sent("n1", "m1")
    repo.mark_failed("n1", "error")

    executed = "\n".join(query for query, _ in conn.cursor_obj.queries)
    assert "sp_mark_sent" in executed
    assert "sp_mark_failed" in executed
