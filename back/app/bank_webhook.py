import re
from typing import Dict, Any, Optional

import financial_manager


def parse_bank_notification(notification_text: str) -> Dict[str, Any]:
    """
    Extract structured transaction data from raw bank notification or SMS text.
    Handles formats like:
    - 'Your card was charged COP 48,500 at RESTAURANTE XYZ.'
    - 'Compra por $48.500 en RESTAURANTE XYZ'
    - 'Pago recibido de $150,000 en BANCO'
    """
    text = notification_text.strip()

    # Determine type (income vs expense)
    lower_text = text.lower()
    is_income = any(
        kw in lower_text
        for kw in ["recibido", "abono", "deposito", "deposit", "received", "payroll"]
    )
    transaction_type = "income" if is_income else "expense"

    # Extract currency
    currency = "COP"
    if "USD" in text or "$" in text and "usd" in lower_text:
        currency = "USD"
    elif "EUR" in text:
        currency = "EUR"

    # Extract amount
    # Matches patterns like COP 48,500 or $48.500 or $48,500.00 or 48500
    amount = 0.0
    amount_match = re.search(
        r"(?:COP|\$|USD|EUR)?\s*(\d[\d.,]*)",
        text,
        re.IGNORECASE,
    )

    if amount_match:
        raw_num = amount_match.group(1).strip()
        # Clean currency separators
        if "," in raw_num and "." in raw_num:
            if raw_num.find(",") < raw_num.find("."):
                raw_num = raw_num.replace(",", "")
            else:
                raw_num = raw_num.replace(".", "").replace(",", ".")
        elif "," in raw_num:
            # Check if comma is decimal or thousands
            parts = raw_num.split(",")
            if len(parts[-1]) == 2:
                raw_num = raw_num.replace(",", ".")
            else:
                raw_num = raw_num.replace(",", "")
        elif "." in raw_num:
            parts = raw_num.split(".")
            if len(parts[-1]) != 2:
                raw_num = raw_num.replace(".", "")

        try:
            amount = float(raw_num)
        except ValueError:
            amount = 0.0

    # Extract merchant / source
    merchant = "Comercio desconocido"
    merchant_match = re.search(
        r"(?:at|en)\s+([A-Z0-9\s._-]+?)(?:\.|$|con|por|fecha)", text, re.IGNORECASE
    )
    if merchant_match:
        merchant = merchant_match.group(1).strip()

    # Determine category heuristic
    category = "other"
    merchant_lower = merchant.lower() + " " + lower_text
    if any(
        k in merchant_lower
        for k in ["restaurante", "food", "burger", "pizza", "cafe", "uber eats", "rappi"]
    ):
        category = "food"
    elif any(
        k in merchant_lower
        for k in ["uber", "cabify", "diDi", "gasolina", "peaje", "terpel", "texaco"]
    ):
        category = "transport"
    elif any(
        k in merchant_lower for k in ["claros", "epm", "etb", "movistar", "enel", "vanti"]
    ):
        category = "utilities"
    elif any(
        k in merchant_lower
        for k in ["exito", "jumbo", "olimpica", "d1", "ara", "shopping", "zara"]
    ):
        category = "shopping"

    return {
        "type": transaction_type,
        "amount": amount,
        "currency": currency,
        "merchant": merchant,
        "category": category,
        "description": f"Ingestión automatizada: {text[:100]}",
    }


def process_bank_webhook(notification_text: str) -> Dict[str, Any]:
    """Process incoming webhook text payload and save transaction to DB."""
    extracted = parse_bank_notification(notification_text)

    transaction = financial_manager.create_transaction(
        type=extracted["type"],
        amount=extracted["amount"],
        currency=extracted["currency"],
        merchant=extracted["merchant"],
        category=extracted["category"],
        description=extracted["description"],
    )

    return {
        "status": "success",
        "extracted": extracted,
        "transaction": transaction,
    }
