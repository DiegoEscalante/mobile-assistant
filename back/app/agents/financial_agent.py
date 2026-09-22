# ==============================================================================
# PROYECTO: Asistente Personal Inteligente Multi-Agente
# MÓDULO: Agente Financiero (financial_agent.py)
# DESCRIPCIÓN: Especializado en el análisis financiero, cálculo de flujo de caja,
#              categorización de ingresos/gastos y gestión de cuentas bancarias.
# ==============================================================================

import financial_manager

FINANCIAL_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_transaction",
            "description": (
                "Create a financial transaction (income or expense). "
                "Use type='income' for money received and type='expense' for money spent."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                    },
                    "amount": {"type": "number"},
                    "currency": {"type": "string"},
                    "account_id": {"type": "integer"},
                    "merchant": {"type": "string"},
                    "category": {
                        "type": "string",
                        "enum": [
                            "food",
                            "transport",
                            "utilities",
                            "education",
                            "entertainment",
                            "health",
                            "shopping",
                            "other",
                        ],
                    },
                    "transaction_date": {
                        "type": "string",
                        "format": "date",
                    },
                    "payment_method": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": ["type", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_transactions",
            "description": "Retrieve financial transactions with optional filters.",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["income", "expense"]},
                    "category": {"type": "string"},
                    "start_date": {"type": "string", "format": "date"},
                    "end_date": {"type": "string", "format": "date"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_transaction",
            "description": "Get exactly one transaction by numeric ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_id": {"type": "integer"},
                },
                "required": ["transaction_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_transaction",
            "description": "Update an existing transaction by numeric ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_id": {"type": "integer"},
                    "type": {"type": "string", "enum": ["income", "expense"]},
                    "amount": {"type": "number"},
                    "currency": {"type": "string"},
                    "account_id": {"type": "integer"},
                    "merchant": {"type": "string"},
                    "category": {"type": "string"},
                    "transaction_date": {"type": "string", "format": "date"},
                    "payment_method": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": ["transaction_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_transaction",
            "description": "Permanently delete a transaction by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_id": {"type": "integer"},
                },
                "required": ["transaction_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cash_flow",
            "description": (
                "Calculate total income, total expenses, and net cash flow "
                "for an optional date range."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "format": "date"},
                    "end_date": {"type": "string", "format": "date"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_spending_by_category",
            "description": "Calculate total expenses grouped by category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string"},
                    "start_date": {"type": "string", "format": "date"},
                    "end_date": {"type": "string", "format": "date"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_account",
            "description": "Create a new financial account (cash, bank, credit card, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "account_type": {
                        "type": "string",
                        "enum": [
                            "cash",
                            "bank_account",
                            "credit_card",
                            "loan",
                            "other",
                        ],
                    },
                    "currency": {"type": "string"},
                    "current_balance": {"type": "number"},
                },
                "required": ["name", "account_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_accounts",
            "description": "Retrieve all financial accounts.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_account",
            "description": "Get a financial account by numeric ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "account_id": {"type": "integer"},
                },
                "required": ["account_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_account",
            "description": "Update a financial account by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "account_id": {"type": "integer"},
                    "name": {"type": "string"},
                    "account_type": {"type": "string"},
                    "currency": {"type": "string"},
                    "current_balance": {"type": "number"},
                },
                "required": ["account_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_account",
            "description": "Permanently delete an account by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "account_id": {"type": "integer"},
                },
                "required": ["account_id"],
            },
        },
    },
]


class FinancialAgent:
    """Specialized Agent responsible for financial transactions, accounts, cash flow, and budgeting."""

    SYSTEM_PROMPT = (
        "Eres el Agente Financiero, responsable de ingresos, gastos, "
        "cuentas bancarias, flujo de caja y análisis de gastos. "
        "No inventes montos financieros ni detalles de transacciones. "
        "Trata los resultados de las herramientas como la fuente absoluta de la verdad."
    )

    def __init__(self):
        self.tool_functions = {
            "create_transaction": financial_manager.create_transaction,
            "get_transactions": financial_manager.get_transactions,
            "get_transaction": financial_manager.get_transaction,
            "update_transaction": financial_manager.update_transaction,
            "delete_transaction": financial_manager.delete_transaction,
            "get_cash_flow": financial_manager.get_cash_flow,
            "get_spending_by_category": financial_manager.get_spending_by_category,
            "create_account": financial_manager.create_account,
            "get_accounts": financial_manager.get_accounts,
            "get_account": financial_manager.get_account,
            "update_account": financial_manager.update_account,
            "delete_account": financial_manager.delete_account,
        }

    def get_tools(self):
        return FINANCIAL_TOOLS

    def execute_tool(self, name: str, arguments: dict):
        if name not in self.tool_functions:
            raise ValueError(f"Unknown financial tool: {name}")
        return self.tool_functions[name](**arguments)
