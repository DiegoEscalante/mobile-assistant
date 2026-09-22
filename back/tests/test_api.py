import unittest
from unittest.mock import patch, MagicMock

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

try:
    from fastapi.testclient import TestClient
    from main import app
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False


class TestAPIEndpoints(unittest.TestCase):

    def setUp(self):
        if not HAS_FASTAPI:
            self.skipTest("FastAPI / TestClient not installed in host Python environment")
        self.client = TestClient(app)

    def test_health_endpoint(self):
        """Test GET /health returns status ok."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    @patch("main.ask")
    def test_chat_endpoint(self, mock_ask):
        """Test POST /chat returns AI agent response."""
        mock_ask.return_value = "You have 2 pending tasks."
        response = self.client.post("/chat", json={"message": "Show tasks"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"response": "You have 2 pending tasks."})

    @patch("main.process_bank_webhook")
    def test_bank_webhook_endpoint(self, mock_process):
        """Test POST /webhooks/bank executes banking notification processing."""
        mock_process.return_value = {"status": "success", "transaction": {"id": 1}}
        response = self.client.post(
            "/webhooks/bank",
            json={"notification": "Your card was charged COP 48,500 at RESTAURANTE XYZ."},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    @patch("main.task_manager.get_tasks")
    def test_tasks_list_endpoint(self, mock_get_tasks):
        """Test GET /tasks returns task array."""
        mock_get_tasks.return_value = [{"id": 1, "title": "Test Task"}]
        response = self.client.get("/tasks")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    @patch("main.financial_manager.get_accounts")
    def test_accounts_list_endpoint(self, mock_get_accounts):
        """Test GET /accounts returns account list."""
        mock_get_accounts.return_value = [{"id": 1, "name": "Main Bank"}]
        response = self.client.get("/accounts")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)


if __name__ == "__main__":
    unittest.main()
