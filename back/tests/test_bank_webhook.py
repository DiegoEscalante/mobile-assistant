import unittest
from unittest.mock import patch, MagicMock

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from bank_webhook import parse_bank_notification, process_bank_webhook


class TestBankWebhook(unittest.TestCase):

    def test_parse_expense_notification(self):
        """Test parsing raw expense SMS/notification."""
        text = "Your card was charged COP 48,500 at RESTAURANTE XYZ."
        parsed = parse_bank_notification(text)

        self.assertEqual(parsed["type"], "expense")
        self.assertEqual(parsed["amount"], 48500.0)
        self.assertEqual(parsed["currency"], "COP")
        self.assertEqual(parsed["merchant"], "RESTAURANTE XYZ")
        self.assertEqual(parsed["category"], "food")

    def test_parse_income_notification(self):
        """Test parsing raw income notification."""
        text = "Abono recibido de $1,500,000.00 en BANCO"
        parsed = parse_bank_notification(text)

        self.assertEqual(parsed["type"], "income")
        self.assertEqual(parsed["amount"], 1500000.0)
        self.assertEqual(parsed["currency"], "COP")

    @patch("financial_manager.create_transaction")
    def test_process_bank_webhook(self, mock_create_tx):
        """Test process_bank_webhook parses text and inserts transaction into DB."""
        mock_create_tx.return_value = {
            "id": 100,
            "type": "expense",
            "amount": 48500.0,
            "merchant": "RESTAURANTE XYZ",
        }

        res = process_bank_webhook(
            "Your card was charged COP 48,500 at RESTAURANTE XYZ."
        )

        self.assertEqual(res["status"], "success")
        self.assertEqual(res["transaction"]["id"], 100)
        mock_create_tx.assert_called_once()


if __name__ == "__main__":
    unittest.main()
