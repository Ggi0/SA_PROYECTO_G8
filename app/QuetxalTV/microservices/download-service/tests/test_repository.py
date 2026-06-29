import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from datetime import datetime, timedelta
import uuid
import sys

# Mock psycopg2 con módulo real (no MagicMock)
import types
mock_psycopg2 = types.ModuleType('psycopg2')
mock_extras = types.ModuleType('psycopg2.extras')
mock_extras.RealDictCursor = None
mock_psycopg2.extras = mock_extras
mock_psycopg2.connect = MagicMock()
sys.modules['psycopg2']        = mock_psycopg2
sys.modules['psycopg2.extras'] = mock_extras

from repository import DownloadRepository


def make_cursor_mock(fetchone=None, fetchall=None, rowcount=1):
    """Crea un mock de cursor que funciona como context manager."""
    cur = MagicMock()
    cur.fetchone.return_value = fetchone
    cur.fetchall.return_value = fetchall if fetchall is not None else []
    type(cur).rowcount = PropertyMock(return_value=rowcount)
    cur.__enter__ = MagicMock(return_value=cur)
    cur.__exit__ = MagicMock(return_value=False)
    return cur


def make_conn_mock(cursor_mock):
    """Crea un mock de conexión que devuelve el cursor dado."""
    conn = MagicMock()
    conn.cursor.return_value = cursor_mock
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=False)
    return conn


class TestDownloadRepository:

    def setup_method(self):
        mock_psycopg2.connect.reset_mock()
        self.repo = DownloadRepository()

    def test_create_download_executes_insert(self):
        cur  = make_cursor_mock()
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        self.repo.create_download(
            download_id=str(uuid.uuid4()),
            user_id='user_001',
            profile_id='profile_001',
            content_id='content_001',
            gcs_url='https://storage.googleapis.com/bucket/file.enc',
            expires_at=datetime.utcnow() + timedelta(days=30),
            title='El Último Quetzal',
            thumbnail='https://example.com/thumb.jpg'
        )
        cur.execute.assert_called_once()
        sql = cur.execute.call_args[0][0]
        assert 'INSERT INTO downloads' in sql

    def test_create_download_includes_title(self):
        cur  = make_cursor_mock()
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        self.repo.create_download(
            download_id=str(uuid.uuid4()),
            user_id='user_001',
            profile_id='profile_001',
            content_id='content_001',
            gcs_url='https://storage.googleapis.com/bucket/file.enc',
            expires_at=datetime.utcnow() + timedelta(days=30),
            title='Mi Película',
            thumbnail=''
        )
        params = cur.execute.call_args[0][1]
        assert params['title'] == 'Mi Película'

    def test_find_active_download_returns_record(self):
        existing = {'download_id': 'dl_001', 'status': 'COMPLETED'}
        cur  = make_cursor_mock(fetchone=existing)
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        result = self.repo.find_active_download('user_001', 'profile_001', 'content_001')
        assert result == existing

    def test_find_active_download_returns_none(self):
        cur  = make_cursor_mock(fetchone=None)
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        result = self.repo.find_active_download('user_001', 'profile_001', 'content_999')
        assert result is None

    def test_get_downloads_by_profile_returns_list(self):
        records = [
            {'download_id': 'dl_001', 'content_id': 'c001', 'status': 'COMPLETED'},
            {'download_id': 'dl_002', 'content_id': 'c002', 'status': 'QUEUED'},
        ]
        cur  = make_cursor_mock(fetchall=records)
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        result = self.repo.get_downloads_by_profile('user_001', 'profile_001')
        assert len(result) == 2

    def test_get_downloads_by_profile_empty(self):
        cur  = make_cursor_mock(fetchall=[])
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        result = self.repo.get_downloads_by_profile('user_001', 'profile_001')
        assert result == []

    def test_soft_delete_returns_true_when_affected(self):
        cur  = make_cursor_mock(rowcount=1)
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        result = self.repo.soft_delete_download('dl_001', 'user_001')
        assert result is True

    def test_soft_delete_returns_false_when_not_found(self):
        cur  = make_cursor_mock(rowcount=0)
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        result = self.repo.soft_delete_download('dl_inexistente', 'user_001')
        assert result is False

    def test_soft_delete_updates_status(self):
        cur  = make_cursor_mock(rowcount=1)
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        self.repo.soft_delete_download('dl_001', 'user_001')
        sql = cur.execute.call_args[0][0]
        assert 'DELETED' in sql

    def test_purge_expired_returns_count(self):
        cur  = make_cursor_mock(rowcount=3)
        conn = make_conn_mock(cur)
        mock_psycopg2.connect.return_value = conn

        result = self.repo.purge_expired_downloads()
        assert result == 3
