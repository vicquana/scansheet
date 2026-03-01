import app.main as main_module


def test_health_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_ok_when_dependencies_present(client, monkeypatch):
    monkeypatch.setattr(main_module.shutil, "which", lambda _bin: "/usr/local/bin/audiveris")

    response = client.get("/api/ready")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ready"] is True
    assert payload["checks"]["audiveris_available"] is True
    assert payload["checks"]["download_dir_writable"] is True


def test_ready_503_when_audiveris_missing(client, monkeypatch):
    monkeypatch.setattr(main_module.shutil, "which", lambda _bin: None)

    response = client.get("/api/ready")

    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["ready"] is False
    assert detail["checks"]["audiveris_available"] is False
