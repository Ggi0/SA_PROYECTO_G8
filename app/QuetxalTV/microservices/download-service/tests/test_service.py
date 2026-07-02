import types
import sys
from unittest.mock import MagicMock
from datetime import datetime, timedelta

# ─────────────────────────────────────────────
# Clase base real para que DownloadService pueda heredar
# ─────────────────────────────────────────────
class FakeServicer:
    pass

# Mock download_pb2_grpc con clase base real
mock_grpc = types.ModuleType('download_pb2_grpc')
mock_grpc.DownloadServiceServicer = FakeServicer
sys.modules['download_pb2_grpc'] = mock_grpc

# Mock download_pb2 con tipos reales (no MagicMock)
mock_pb2 = types.ModuleType('download_pb2')
mock_pb2.PLAN_UNKNOWN  = 0
mock_pb2.PLAN_BASIC    = 1
mock_pb2.PLAN_STANDARD = 2
mock_pb2.PLAN_PREMIUM  = 3

class FakeInitiateResponse:
    def __init__(self, allowed=False, download_id='', message='', gcs_url='', expires_at=0):
        self.allowed     = allowed
        self.download_id = download_id
        self.message     = message
        self.gcs_url     = gcs_url
        self.expires_at  = expires_at

class FakeListResponse:
    def __init__(self, allowed=False, message='', downloads=None):
        self.allowed   = allowed
        self.message   = message
        self.downloads = downloads or []

class FakeDeleteResponse:
    def __init__(self, success=False, message=''):
        self.success = success
        self.message = message

class FakeDownloadItem:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

mock_pb2.InitiateDownloadResponse = FakeInitiateResponse
mock_pb2.ListDownloadsResponse    = FakeListResponse
mock_pb2.DeleteDownloadResponse   = FakeDeleteResponse
mock_pb2.DownloadItem             = FakeDownloadItem
sys.modules['download_pb2'] = mock_pb2

# Mock repository
sys.modules['repository'] = MagicMock()

# Ahora importamos el módulo real
from service import is_plan_allowed, get_blocked_message, DownloadService

# ─────────────────────────────────────────────
# Constantes de plan
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

    def test_basic_blocked_message_mentions_premium(self):
        assert 'Premium' in get_blocked_message(PLAN_BASIC)

    def test_standard_blocked_message_mentions_premium(self):
        assert 'Premium' in get_blocked_message(PLAN_STANDARD)

    def test_blocked_messages_are_different(self):
        assert get_blocked_message(PLAN_BASIC) != get_blocked_message(PLAN_STANDARD)


class TestDownloadService:
    """Pruebas del servicio con repositorio mockeado."""

    def setup_method(self):
        self.mock_repo = MagicMock()
        self.service = DownloadService.__new__(DownloadService)
        self.service.repo = self.mock_repo

    def _make_request(self, plan, content_id='content_001', title='Test Movie'):
        req = MagicMock()
        req.user_id    = 'user_001'
        req.profile_id = 'profile_001'
        req.content_id = content_id
        req.plan       = plan
        req.title      = title
        req.thumbnail  = ''
        return req

    def test_initiate_download_premium_allowed(self):
        self.mock_repo.find_active_download.return_value = None
        req = self._make_request(PLAN_PREMIUM)
        resp = self.service.InitiateDownload(req, MagicMock())
        assert resp.allowed is True
        self.mock_repo.create_download.assert_called_once()

    def test_initiate_download_basic_blocked(self):
        req = self._make_request(PLAN_BASIC)
        resp = self.service.InitiateDownload(req, MagicMock())
        assert resp.allowed is False
        self.mock_repo.create_download.assert_not_called()

    def test_initiate_download_standard_blocked(self):
        req = self._make_request(PLAN_STANDARD)
        resp = self.service.InitiateDownload(req, MagicMock())
        assert resp.allowed is False
        self.mock_repo.create_download.assert_not_called()

    def test_initiate_download_already_exists(self):
        existing = {
            'download_id': 'dl_existing',
            'gcs_url': 'https://storage.googleapis.com/bucket/file.enc',
            'expires_at': datetime.utcnow() + timedelta(days=10)
        }
        self.mock_repo.find_active_download.return_value = existing
        req = self._make_request(PLAN_PREMIUM)
        resp = self.service.InitiateDownload(req, MagicMock())
        assert resp.allowed is True
        self.mock_repo.create_download.assert_not_called()

    def test_initiate_download_saves_title(self):
        self.mock_repo.find_active_download.return_value = None
        req = self._make_request(PLAN_PREMIUM, title='El Último Quetzal')
        self.service.InitiateDownload(req, MagicMock())
        call_kwargs = self.mock_repo.create_download.call_args[1]
        assert call_kwargs.get('title') == 'El Último Quetzal'

    def test_list_downloads_premium_allowed(self):
        self.mock_repo.get_downloads_by_profile.return_value = []
        req = self._make_request(PLAN_PREMIUM)
        resp = self.service.ListDownloads(req, MagicMock())
        assert resp.allowed is True

    def test_list_downloads_basic_blocked(self):
        req = self._make_request(PLAN_BASIC)
        resp = self.service.ListDownloads(req, MagicMock())
        assert resp.allowed is False
        self.mock_repo.get_downloads_by_profile.assert_not_called()

    def test_list_downloads_standard_blocked(self):
        req = self._make_request(PLAN_STANDARD)
        resp = self.service.ListDownloads(req, MagicMock())
        assert resp.allowed is False

    def test_delete_download_premium_success(self):
        self.mock_repo.soft_delete_download.return_value = True
        req = self._make_request(PLAN_PREMIUM)
        req.download_id = 'dl_001'
        resp = self.service.DeleteDownload(req, MagicMock())
        assert resp.success is True

    def test_delete_download_not_found(self):
        self.mock_repo.soft_delete_download.return_value = False
        req = self._make_request(PLAN_PREMIUM)
        req.download_id = 'dl_inexistente'
        resp = self.service.DeleteDownload(req, MagicMock())
        assert resp.success is False

    def test_delete_download_basic_blocked(self):
        req = self._make_request(PLAN_BASIC)
        req.download_id = 'dl_001'
        resp = self.service.DeleteDownload(req, MagicMock())
        assert resp.success is False
        self.mock_repo.soft_delete_download.assert_not_called()

    def test_delete_download_standard_blocked(self):
        req = self._make_request(PLAN_STANDARD)
        req.download_id = 'dl_001'
        resp = self.service.DeleteDownload(req, MagicMock())
        assert resp.success is False