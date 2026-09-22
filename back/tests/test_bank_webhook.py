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

    def test_parse_nequi_notification(self):
        """Test parsing Nequi send money notification."""
        text = "Enviaste $25.000 a Juan Perez"
        parsed = parse_bank_notification(text)

        self.assertEqual(parsed["type"], "expense")
        self.assertEqual(parsed["amount"], 25000.0)
        self.assertEqual(parsed["merchant"], "Juan Perez")

    def test_parse_bancolombia_compra(self):
        """Test parsing Bancolombia purchase notification with card mask."""
        text = "Bancolombia le informa compra por $35.000 en D1 con tarjeta *1234"
        parsed = parse_bank_notification(text)

        self.assertEqual(parsed["type"], "expense")
        self.assertEqual(parsed["amount"], 35000.0)
        self.assertEqual(parsed["merchant"], "D1")

    def test_parse_non_monetary_notification(self):
        """Test parsing non-monetary system notification."""
        text = "Vercel 1 new project available to import"
        parsed = parse_bank_notification(text)

        self.assertEqual(parsed["amount"], 0.0)
        self.assertEqual(parsed["merchant"], "Comercio desconocido")

    def test_parse_bank_name_detection(self):
        """Test bank institution name detection."""
        bancolombia_text = "Bancolombia: Compra por $50.000 en EXITO"
        nequi_text = "Nequi: Recibiste $20.000"

        self.assertEqual(parse_bank_notification(bancolombia_text)["bank_name"], "Bancolombia")
        self.assertEqual(parse_bank_notification(nequi_text)["bank_name"], "Nequi")

    def test_parse_bancolombia_incoming_transfer(self):
        """Test parsing Bancolombia incoming transfer email notification."""
        text = (
            "Alertas y Notificaciones Alertas y Notificaciones Alertas y Notificaciones "
            "Bancolombia: DIEGO, recibiste una transferencia de DIEGO ESCALANTE por $1,000.00 "
            "en tu cuenta *3582 conectada a la llave descalanteg05@gmail.com el 21/09/26 a las 21:05."
        )
        parsed = parse_bank_notification(text)

        self.assertEqual(parsed["type"], "income")
        self.assertEqual(parsed["amount"], 1000.0)
        self.assertEqual(parsed["currency"], "COP")
        self.assertEqual(parsed["merchant"], "DIEGO ESCALANTE")

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
