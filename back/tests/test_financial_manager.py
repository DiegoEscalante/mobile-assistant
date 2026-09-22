import unittest
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from financial_manager import (
    normalize_optional_date,
    transaction_to_dict,
    account_to_dict,
    create_transaction,
    get_transaction,
    get_transactions,
    update_transaction,
    delete_transaction,
    get_cash_flow,
    get_spending_by_category,
    create_account,
    get_accounts,
    get_account,
    update_account,
    delete_account,
)


class TestFinancialManager(unittest.TestCase):

    def test_normalize_optional_date(self):
        """Test date normalization helper with various inputs."""
        self.assertIsNone(normalize_optional_date(None))
        self.assertIsNone(normalize_optional_date("none"))
        self.assertIsNone(normalize_optional_date("NULL"))
        self.assertIsNone(normalize_optional_date(""))
        self.assertEqual(
            normalize_optional_date("2026-09-17"), date(2026, 9, 17)
        )

    def test_transaction_to_dict_none(self):
        """Test transaction_to_dict returns None for empty row."""
        self.assertIsNone(transaction_to_dict(None))

    def test_transaction_to_dict_valid(self):
        """Test transaction_to_dict converts SQL row to structured dict."""
        row = (
            1,  # id
            10,  # account_id
            "expense",  # type
            Decimal("48500.00"),  # amount
            "COP",  # currency
            "RESTAURANTE XYZ",  # merchant
            "food",  # category
            date(2026, 9, 17),  # date
            "credit_card",  # payment_method
            "Dinner",  # description
            datetime(2026, 9, 17, 18, 0, 0),  # created_at
        )

        d = transaction_to_dict(row)
        self.assertEqual(d["id"], 1)
        self.assertEqual(d["account_id"], 10)
        self.assertEqual(d["type"], "expense")
        self.assertEqual(d["amount"], 48500.0)
        self.assertEqual(d["currency"], "COP")
        self.assertEqual(d["merchant"], "RESTAURANTE XYZ")
        self.assertEqual(d["category"], "food")
        self.assertEqual(d["transaction_date"], "2026-09-17")

    def test_account_to_dict_valid(self):
        """Test account_to_dict converts SQL row to structured dict."""
        row = (
            1,
            "Main Savings",
            "bank_account",
            "COP",
            Decimal("1500000.00"),
            datetime(2026, 9, 1, 9, 0, 0),
        )
        d = account_to_dict(row)
        self.assertEqual(d["id"], 1)
        self.assertEqual(d["name"], "Main Savings")
        self.assertEqual(d["account_type"], "bank_account")
        self.assertEqual(d["current_balance"], 1500000.0)

    @patch("financial_manager.get_connection")
    def test_create_transaction(self, mock_get_conn):
        """Test create_transaction executes INSERT query."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = (
            1,
            10,
            "expense",
            Decimal("48500.00"),
            "COP",
            "RESTAURANTE XYZ",
            "food",
            date(2026, 9, 17),
            "credit_card",
            "Dinner",
            datetime(2026, 9, 17, 18, 0, 0),
        )

        result = create_transaction(
            type="expense",
            amount=48500.0,
            merchant="RESTAURANTE XYZ",
            category="food",
        )

        self.assertIsNotNone(result)
        self.assertEqual(result["amount"], 48500.0)
        self.assertEqual(result["merchant"], "RESTAURANTE XYZ")
        mock_cur.execute.assert_called_once()

    @patch("financial_manager.get_connection")
    def test_get_cash_flow(self, mock_get_conn):
        """Test get_cash_flow aggregates income, expenses, and net cash flow."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = (
            Decimal("2000000.00"),  # income
            Decimal("500000.00"),  # expenses
        )

        cf = get_cash_flow()
        self.assertEqual(cf["income"], 2000000.0)
        self.assertEqual(cf["expenses"], 500000.0)
        self.assertEqual(cf["cash_flow"], 1500000.0)

    @patch("financial_manager.get_connection")
    def test_get_spending_by_category(self, mock_get_conn):
        """Test get_spending_by_category aggregates total spending per category."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchall.return_value = [
            ("food", Decimal("150000.00")),
            ("transport", Decimal("50000.00")),
        ]

        spending = get_spending_by_category()
        self.assertEqual(len(spending), 2)
        self.assertEqual(spending[0]["category"], "food")
        self.assertEqual(spending[0]["amount"], 150000.0)
        self.assertEqual(spending[1]["category"], "transport")
        self.assertEqual(spending[1]["amount"], 50000.0)

    @patch("financial_manager.get_connection")
    def test_accounts_crud(self, mock_get_conn):
        """Test account creation, listing, retrieval, update, and deletion."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        # Create
        mock_cur.fetchone.return_value = (
            1,
            "Wallet",
            "cash",
            "COP",
            Decimal("50000.00"),
            datetime(2026, 9, 17, 10, 0, 0),
        )
        acc = create_account(
            name="Wallet", account_type="cash", current_balance=50000.0
        )
        self.assertEqual(acc["name"], "Wallet")

        # List
        mock_cur.fetchall.return_value = [
            (
                1,
                "Wallet",
                "cash",
                "COP",
                Decimal("50000.00"),
                datetime(2026, 9, 17, 10, 0, 0),
            )
        ]
        accs = get_accounts()
        self.assertEqual(len(accs), 1)

        # Delete
        mock_cur.fetchone.return_value = (1, "Wallet")
        deleted = delete_account(1)
        self.assertEqual(deleted["name"], "Wallet")


if __name__ == "__main__":
    unittest.main()
