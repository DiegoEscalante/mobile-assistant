"""
Legacy agent module entry point.
Forwards requests to the new multi-agent orchestrator in app/agents/
"""

from agents.orchestrator import ask, OrchestratorAgent
from agents.secretary_agent import SecretaryAgent
from agents.financial_agent import FinancialAgent

__all__ = ["ask", "OrchestratorAgent", "SecretaryAgent", "FinancialAgent"]