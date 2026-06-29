import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

# Simulamos los pb2 para no necesitar protoc en tests
import sys
sys.modules['generated'] = MagicMock()
sys.modules['generated.download_pb2'] = MagicMock()
sys.modules['generated.download_pb2_grpc'] = MagicMock()

from service import is_plan_allowed, get_blocked_message

# ─────────────────────────────────────────────
# Constantes de plan (espejan el proto)
# ─────────────────────────────────────────────
PLAN_BASIC    = 1
PLAN_STANDARD = 2
PLAN_PREMIUM  = 3


class TestPlanValidation:
    """Pruebas de la regla de negocio central."""

    def test_premium_plan_is_allowed(self):
        assert is_plan_allowed(PLAN_PREMIUM) is True

    def test_basic_plan_is_blocked(self):
        assert is_plan_allowed(PLAN_BASIC) is False

    def test_standard_plan_is_blocked(self):
         assert is_plan_allowed(PLAN_STANDARD) is False

    def test_unknown_plan_is_blocked(self):
        assert is_plan_allowed(0) is False

    def test_basic_blocked_message_mentions_standard(self):
        msg = get_blocked_message(PLAN_BASIC)
        assert "Estándar" in msg or "estandar" in msg.lower()

    def test_premium_blocked_message_mentions_standard(self):
        msg = get_blocked_message(PLAN_PREMIUM)
        assert "Estándar" in msg or "estandar" in msg.lower()

    def test_blocked_messages_are_different(self):
        """Básico y Premium deben tener mensajes distintos."""
        assert get_blocked_message(PLAN_BASIC) != get_blocked_message(PLAN_PREMIUM)


class TestDownloadService:
    """Pruebas del servicio con repositorio mockeado."""

    def setup_method(self):
        with patch("service.DownloadRepository"):
            from service import DownloadService
            self.service = DownloadService()
            self.mock_repo = self.service.repo

    def _make_request(self, plan, content_id="content_001"):
        req = MagicMock()
        req.user_id    = "user_001"
        req.profile_id = "profile_001"
        req.content_id = content_id
        req.plan       = plan
        return req

    def test_initiate_download_standard_plan_allowed(self):
        self.mock_repo.find_active_download.return_value = None
        req = self._make_request(PLAN_STANDARD)
        resp = self.service.InitiateDownload(req, MagicMock())
        assert resp.allowed is True
        self.mock_repo.create_download.assert_called_once()

    def test_initiate_download_basic_plan_blocked(self):
        req = self._make_request(PLAN_BASIC)
        resp = self.service.InitiateDownload(req, MagicMock())
        assert resp.allowed is False
        self.mock_repo.create_download.assert_not_called()

    def test_initiate_download_premium_plan_blocked(self):
        req = self._make_request(PLAN_PREMIUM)
        resp = self.service.InitiateDownload(req, MagicMock())
        assert resp.allowed is False
        self.mock_repo.create_download.assert_not_called()

    def test_initiate_download_already_exists(self):
        """Si ya existe la descarga no debe crear una nueva."""
        existing = {
            "download_id": "dl_existing",
            "gcs_url": "https://storage.googleapis.com/bucket/file.enc",
            "expires_at": datetime.utcnow() + timedelta(days=10)
        }
        self.mock_repo.find_active_download.return_value = existing
        req = self._make_request(PLAN_STANDARD)
        resp = self.service.InitiateDownload(req, MagicMock())
        assert resp.allowed is True
        self.mock_repo.create_download.assert_not_called()

    def test_list_downloads_standard_plan_allowed(self):
        self.mock_repo.get_downloads_by_profile.return_value = []
        req = self._make_request(PLAN_STANDARD)
        resp = self.service.ListDownloads(req, MagicMock())
        assert resp.allowed is True

    def test_list_downloads_basic_plan_blocked(self):
        req = self._make_request(PLAN_BASIC)
        resp = self.service.ListDownloads(req, MagicMock())
        assert resp.allowed is False
        self.mock_repo.get_downloads_by_profile.assert_not_called()

    def test_delete_download_standard_plan_success(self):
        self.mock_repo.soft_delete_download.return_value = True
        req = self._make_request(PLAN_STANDARD)
        req.download_id = "dl_001"
        resp = self.service.DeleteDownload(req, MagicMock())
        assert resp.success is True

    def test_delete_download_not_found(self):
        self.mock_repo.soft_delete_download.return_value = False
        req = self._make_request(PLAN_STANDARD)
        req.download_id = "dl_inexistente"
        resp = self.service.DeleteDownload(req, MagicMock())
        assert resp.success is False

    def test_delete_download_basic_plan_blocked(self):
        req = self._make_request(PLAN_BASIC)
        req.download_id = "dl_001"
        resp = self.service.DeleteDownload(req, MagicMock())
        assert resp.success is False
        self.mock_repo.soft_delete_download.assert_not_called()
