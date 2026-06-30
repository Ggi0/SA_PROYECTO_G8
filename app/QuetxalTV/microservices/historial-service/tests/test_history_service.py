from types import SimpleNamespace
from uuid import uuid4

import pytest

import app.history.service as service_module
from app.history.service import HistorialAppService


class FakeRepository:
    def __init__(self):
        self.movie = None
        self.episode = None
        self.ready = True

    def guardar_progreso_pelicula(self, data):
        self.movie = data

    def guardar_progreso_serie(self, data):
        self.episode = data

    def obtener_continuar_viendo(self, profile_id, limit):
        return [{"profile_id": profile_id, "limit": limit}]

    def obtener_progreso_contenido(self, profile_id, content_id):
        return {"profile_id": profile_id, "content_id": content_id}

    def obtener_logs_auditoria(self, table_filter, action_filter, limit, offset):
        return [(table_filter, action_filter, limit, offset)]

    def verificar_conexion_base_datos(self):
        return self.ready


@pytest.fixture()
def service(monkeypatch):
    repo = FakeRepository()
    monkeypatch.setattr(service_module, "HistorialRepository", lambda: repo)
    svc = HistorialAppService()
    return svc, repo


def test_update_movie_progress_validates_and_saves(service):
    svc, repo = service
    request = SimpleNamespace(
        profile_id=str(uuid4()),
        content_id=str(uuid4()),
        minute_reached=12,
        total_duration_min=0,
    )

    assert svc.update_movie_progress(request) == "Progreso de película guardado correctamente"
    assert repo.movie["total_duration_min"] is None


def test_update_episode_progress_validates_and_saves(service):
    svc, repo = service
    request = SimpleNamespace(
        profile_id=str(uuid4()),
        content_id=str(uuid4()),
        season_id=str(uuid4()),
        episode_id=str(uuid4()),
        season_num=1,
        episode_num=2,
        minute_reached=15,
        total_duration_min=45,
    )

    assert svc.update_episode_progress(request) == "Progreso de serie guardado correctamente"
    assert repo.episode["episode_num"] == 2


def test_validation_errors(service):
    svc, _ = service
    with pytest.raises(ValueError, match="UUID"):
        svc.get_continue_watching("bad", 10)
    with pytest.raises(ValueError, match="minute_reached"):
        svc.update_movie_progress(SimpleNamespace(profile_id=str(uuid4()), content_id=str(uuid4()), minute_reached=-1, total_duration_min=10))


def test_queries_and_audit_filters(service):
    svc, _ = service
    profile_id = str(uuid4())
    content_id = str(uuid4())

    assert svc.get_continue_watching(profile_id, 0)[0]["limit"] == 20
    assert svc.get_content_progress(profile_id, content_id)["content_id"] == content_id
    assert svc.get_history_audit_logs("watch_progress", "insert", 999, -1) == [("watch_progress", "INSERT", 500, 0)]
    with pytest.raises(ValueError, match="table_name"):
        svc.get_history_audit_logs("users")
    with pytest.raises(ValueError, match="action"):
        svc.get_history_audit_logs(action="DELETE")


def test_health_checks(service):
    svc, repo = service
    assert svc.health_live()["status"] == "LIVE"
    assert svc.health_ready()["status"] == "READY"
    repo.ready = False
    assert svc.health_ready()["status"] == "NOT_READY"
