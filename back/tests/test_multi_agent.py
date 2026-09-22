import unittest
from unittest.mock import MagicMock, patch

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from agents.secretary_agent import SecretaryAgent
from agents.financial_agent import FinancialAgent
from agents.orchestrator import OrchestratorAgent, ask


class TestMultiAgentSystem(unittest.TestCase):

    def test_secretary_agent_tools(self):
        """Test SecretaryAgent exposes task and server status tools."""
        sec_agent = SecretaryAgent()
        tools = sec_agent.get_tools()
        tool_names = [t["function"]["name"] for t in tools]

        self.assertIn("create_task", tool_names)
        self.assertIn("get_tasks", tool_names)
        self.assertIn("get_server_status", tool_names)

    def test_financial_agent_tools(self):
        """Test FinancialAgent exposes transaction and account tools."""
        fin_agent = FinancialAgent()
        tools = fin_agent.get_tools()
        tool_names = [t["function"]["name"] for t in tools]

        self.assertIn("create_transaction", tool_names)
        self.assertIn("get_cash_flow", tool_names)
        self.assertIn("create_account", tool_names)

    def test_orchestrator_tool_aggregation(self):
        """Test OrchestratorAgent aggregates tools from both specialized agents."""
        orch = OrchestratorAgent()
        tool_names = [t["function"]["name"] for t in orch.tools]

        # Secretary tools present
        self.assertIn("create_task", tool_names)
        self.assertIn("get_server_status", tool_names)

        # Financial tools present
        self.assertIn("create_transaction", tool_names)
        self.assertIn("get_spending_by_category", tool_names)

    @patch.object(SecretaryAgent, "execute_tool")
    def test_orchestrator_routes_secretary_tool(self, mock_sec_exec):
        """Test OrchestratorAgent routes secretary tools to SecretaryAgent."""
        mock_sec_exec.return_value = {"status": "ok"}
        orch = OrchestratorAgent()

        res = orch.execute_tool_call("create_task", {"title": "Test Task"})
        self.assertEqual(res, {"status": "ok"})
        mock_sec_exec.assert_called_once_with(
            "create_task", {"title": "Test Task"}
        )

    @patch.object(FinancialAgent, "execute_tool")
    def test_orchestrator_routes_financial_tool(self, mock_fin_exec):
        """Test OrchestratorAgent routes financial tools to FinancialAgent."""
        mock_fin_exec.return_value = {"amount": 500}
        orch = OrchestratorAgent()

        res = orch.execute_tool_call(
            "create_transaction", {"type": "expense", "amount": 500}
        )
        self.assertEqual(res, {"amount": 500})
        mock_fin_exec.assert_called_once_with(
            "create_transaction", {"type": "expense", "amount": 500}
        )

    def test_orchestrator_raises_for_unknown_tool(self):
        """Test OrchestratorAgent raises ValueError for unhandled tool names."""
        orch = OrchestratorAgent()
        with self.assertRaises(ValueError):
            orch.execute_tool_call("unknown_tool", {})


if __name__ == "__main__":
    unittest.main()
