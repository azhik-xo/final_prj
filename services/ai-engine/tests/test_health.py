from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-engine"
    assert data["source"] == "simulation"
    assert "timestamp" in data
    assert response.headers["x-simulation-mode"] == "true"

def test_root_returns_metadata():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["simulation_mode"] is True
    assert "GlucoGuard" in data["message"]

