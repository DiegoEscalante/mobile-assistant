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
    - 'Enviaste $25.000 a Juan Perez'
    - 'Bancolombia: DIEGO, recibiste una transferencia de DIEGO ESCALANTE por $1,000.00 en tu cuenta *3582...'
    """
    text = notification_text.strip()
    lower_text = text.lower()

    # Determine type (income vs expense)
    income_keywords = [
        "recibido",
        "recibiste",
        "recibimos",
        "abono",
        "deposito",
        "deposit",
        "received",
        "payroll",
        "ingreso",
        "transferencia de",
        "te transfirieron",
        "te enviaron",
        "te consignaron",
        "consignacion",
        "consignación",
        "reembolso",
        "devolucion",
        "devolución",
    ]
    is_income = any(kw in lower_text for kw in income_keywords)
    transaction_type = "income" if is_income else "expense"

    # Extract currency
    currency = "COP"
    if "USD" in text or ("$" in text and "usd" in lower_text):
        currency = "USD"
    elif "EUR" in text:
        currency = "EUR"

    # Extract amount
    amount = 0.0
    amount_match = re.search(
        r"(?:COP|\$|USD|EUR)\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:COP|USD|EUR)|(?:por|de|valor|monto)\s*\$?\s*(\d[\d.,]*)",
        text,
        re.IGNORECASE,
    )

    if amount_match:
        raw_num = next(g for g in amount_match.groups() if g is not None).strip()

        # Clean currency separators
        if "," in raw_num and "." in raw_num:
            if raw_num.find(",") < raw_num.find("."):
                raw_num = raw_num.replace(",", "")
            else:
                raw_num = raw_num.replace(".", "").replace(",", ".")
        elif "," in raw_num:
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

    # Clean text of noise before merchant extraction
    clean_text = re.sub(r"^.*?Alertas\s+y\s+Notificaciones\s*", "", text, flags=re.IGNORECASE)
    clean_text = re.sub(r"^.*?com\.google\.android\.gm\s*", "", clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r"tarjeta\s*\**\d+", "", clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r"cuenta\s*\**\d+", "", clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r"fecha\s*:?\s*\d{2}/\d{2}/\d{4}", "", clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r"a\s+las\s+\d{1,2}:\d{2}", "", clean_text, flags=re.IGNORECASE)

    merchant_patterns = [
        # "recibiste una transferencia de <NAME>", "recibiste $X de <NAME>"
        r"(?:recibiste\s+(?:una\s+)?transferencia|transferencia|recibido|abono|pago)\s+(?:por\s+\$?\d[\d.,]*\s*|\$?\d[\d.,]*\s*)?de\s+([A-Za-z0-9\s._-]+?)(?:\s+por|\s+en|\s+el|\s+a|\.|,|conectada|$)",
        # "enviaste $25.000 a <NAME>", "enviaste a <NAME>", "transferencia a <NAME>"
        r"(?:enviaste|transferencia|pagaste|pago)\s+(?:por\s+\$?\d[\d.,]*\s*|\$?\d[\d.,]*\s*)?a\s+([A-Za-z0-9\s._-]+?)(?:\s+por|\s+de|\s+en|\s+el|\.|,|$)",
        # "compra por $... en <MERCHANT>", "compra en <MERCHANT>"
        r"(?:compra\s+(?:por\s+\$?\d[\d.,]*\s*)?en|pagaste\s+en|pago\s+en|en\s+el\s+comercio|en\s+comercio|establecimiento)\s+([A-Za-z0-9\s._-]+?)(?:\s+por|\s+con|\s+el|\s+fecha|\.|,|$)",
        # "at <MERCHANT> for", "en <MERCHANT> por"
        r"(?:at|en)\s+([A-Za-z0-9\s._-]+?)\s+(?:por|for|\$|COP|USD|EUR|con|el|fecha)",
        # generic "en <MERCHANT>"
        r"(?:at|en)\s+([A-Za-z0-9\s._-]+?)(?:\.|$|con|por|fecha|,)",
    ]

    invalid_merchants = {
        "el",
        "la",
        "los",
        "las",
        "un",
        "una",
        "tarjeta",
        "banco",
        "cuenta",
        "tu cuenta",
        "la llave",
        "notificaciones",
        "alertas y notificaciones",
        "nuestra app",
        "el sistema",
        "la persona",
    }

    for pat in merchant_patterns:
        m = re.search(pat, clean_text, re.IGNORECASE)
        if m:
            extracted_m = m.group(1).strip()
            if (
                extracted_m
                and len(extracted_m) > 1
                and extracted_m.lower() not in invalid_merchants
            ):
                merchant = extracted_m
                break

    if merchant == "Comercio desconocido":
        known_merchants = [
            "uber eats",
            "uber",
            "rappi",
            "didi",
            "cabify",
            "d1",
            "exito",
            "éxito",
            "jumbo",
            "olimpica",
            "olímpica",
            "ara",
            "amazon",
            "netflix",
            "spotify",
            "mercadopago",
            "mercado libre",
            "bold",
            "epm",
            "etb",
            "claro",
            "movistar",
            "enel",
            "vanti",
            "zara",
            "starbucks",
            "mcdonalds",
            "falabella",
            "homecenter",
            "farmatodo",
            "cruz verde",
        ]
        for km in known_merchants:
            if re.search(rf"\b{km}\b", text, re.IGNORECASE):
                merchant = km.title()
                break

    # Determine category heuristic
    category = "other"
    merchant_lower = merchant.lower() + " " + lower_text
    if any(
        k in merchant_lower
        for k in [
            "restaurante",
            "food",
            "burger",
            "pizza",
            "cafe",
            "uber eats",
            "rappi",
            "mcdonalds",
            "starbucks",
        ]
    ):
        category = "food"
    elif any(
        k in merchant_lower
        for k in ["uber", "cabify", "didi", "gasolina", "peaje", "terpel", "texaco"]
    ):
        category = "transport"
    elif any(
        k in merchant_lower for k in ["claros", "epm", "etb", "movistar", "enel", "vanti"]
    ):
        category = "utilities"
    elif any(
        k in merchant_lower
        for k in [
            "exito",
            "éxito",
            "jumbo",
            "olimpica",
            "olímpica",
            "d1",
            "ara",
            "shopping",
            "zara",
            "amazon",
            "falabella",
        ]
    ):
        category = "shopping"

    # Detect bank / financial institution
    bank_name = None
    if "bancolombia" in lower_text:
        bank_name = "Bancolombia"
    elif "nequi" in lower_text:
        bank_name = "Nequi"
    elif "davivienda" in lower_text:
        bank_name = "Davivienda"
    elif "daviplata" in lower_text:
        bank_name = "Daviplata"
    elif "nubank" in lower_text or " nu " in f" {lower_text} " or lower_text.startswith("nu "):
        bank_name = "Nu"
    elif "bbva" in lower_text:
        bank_name = "BBVA"
    elif "banco de bogota" in lower_text or "banco bogota" in lower_text:
        bank_name = "Banco de Bogotá"
    elif "banco de occidente" in lower_text:
        bank_name = "Banco de Occidente"
    elif "colpatria" in lower_text or "scotiabank" in lower_text:
        bank_name = "Scotiabank Colpatria"
    elif "banco falabella" in lower_text or "falabella" in lower_text:
        bank_name = "Banco Falabella"
    elif "rappipay" in lower_text:
        bank_name = "RappiPay"

    return {
        "type": transaction_type,
        "amount": amount,
        "currency": currency,
        "merchant": merchant,
        "category": category,
        "bank_name": bank_name,
        "description": f"Ingestión automatizada: {text[:100]}",
    }


def find_or_create_account(bank_name: Optional[str], currency: str = "COP") -> Optional[int]:
    """Search for existing account matching bank_name or auto-create one if missing."""
    if not bank_name:
        return None

    try:
        accounts = financial_manager.get_accounts()
        bank_key = bank_name.lower()

        # 1. Search for existing matching account (e.g. "Bancolombia", "Cuenta Bancolombia", "Ahorros Bancolombia")
        for acc in accounts:
            acc_name_lower = acc["name"].lower()
            if bank_key in acc_name_lower or acc_name_lower in bank_key:
                return acc["id"]

        # 2. Auto-create account if no matching account exists
        new_acc = financial_manager.create_account(
            name=bank_name,
            account_type="bank_account",
            currency=currency,
            current_balance=0.0,
        )
        return new_acc["id"]
    except Exception as e:
        print(f"Error finding/creating account for {bank_name}: {e}")
        return None


def process_bank_webhook(notification_text: str) -> Dict[str, Any]:
    """Process incoming webhook text payload and save transaction to DB."""
    extracted = parse_bank_notification(notification_text)

    # Match or auto-create account for the detected bank
    account_id = find_or_create_account(
        extracted.get("bank_name"), extracted.get("currency", "COP")
    )

    # Deduplicate recent identical transactions
    try:
        recent = financial_manager.get_transactions(
            type=extracted["type"],
            start_date=financial_manager.date.today().isoformat(),
        )
        for tx in recent:
            if (
                tx.get("amount") == extracted["amount"]
                and tx.get("type") == extracted["type"]
                and (
                    tx.get("merchant") == extracted["merchant"]
                    or tx.get("description") == extracted["description"]
                )
            ):
                return {
                    "status": "duplicate_ignored",
                    "extracted": extracted,
                    "transaction": tx,
                }
    except Exception:
        pass

    transaction = financial_manager.create_transaction(
        type=extracted["type"],
        amount=extracted["amount"],
        currency=extracted["currency"],
        account_id=account_id,
        merchant=extracted["merchant"],
        category=extracted["category"],
        payment_method=extracted.get("bank_name"),
        description=extracted["description"],
    )

    return {
        "status": "success",
        "extracted": extracted,
        "transaction": transaction,
    }
