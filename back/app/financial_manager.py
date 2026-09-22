import os
from datetime import date
from decimal import Decimal
from typing import Optional

try:
    import psycopg
except ImportError:
    psycopg = None


DATABASE_URL = (
    f"postgresql://{os.environ.get('POSTGRES_USER', 'assistant')}:"
    f"{os.environ.get('POSTGRES_PASSWORD', 'Diego12112005')}@"
    f"{os.environ.get('POSTGRES_HOST', 'assistant-postgres')}:5432/"
    f"{os.environ.get('POSTGRES_DB', 'assistant')}"
)


def get_connection():
    return psycopg.connect(DATABASE_URL)


def normalize_optional_int(value) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, str):
        val = value.strip().lower()
        if val in ("null", "none", "undefined", "", "0"):
            return None
        try:
            return int(val)
        except ValueError:
            return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def normalize_optional_str(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        val = value.strip()
        if val.lower() in ("null", "none", "undefined", ""):
            return None
        return val
    return str(value)


def normalize_optional_date(value):
    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()

        if value.lower() in ("null", "none", "undefined", ""):
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    if isinstance(value, date):
        return value

    return None


def transaction_to_dict(row):
    if row is None:
        return None

    return {
        "id": row[0],
        "account_id": row[1],
        "type": row[2],
        "amount": float(row[3]),
        "currency": row[4],
        "merchant": row[5],
        "category": row[6],
        "transaction_date": (
            row[7].isoformat() if row[7] else None
        ),
        "payment_method": row[8],
        "description": row[9],
        "created_at": (
            row[10].isoformat() if row[10] else None
        ),
    }


def create_transaction(
    type: str,
    amount: float,
    currency: str = "COP",
    account_id: Optional[int] = None,
    merchant: Optional[str] = None,
    category: str = "other",
    transaction_date: Optional[str] = None,
    payment_method: Optional[str] = None,
    description: Optional[str] = None,
):
    account_id = normalize_optional_int(account_id)
    merchant = normalize_optional_str(merchant)
    category = normalize_optional_str(category) or "other"
    payment_method = normalize_optional_str(payment_method)
    description = normalize_optional_str(description)
    transaction_date = normalize_optional_date(transaction_date) or date.today()

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO transactions (
                    account_id,
                    type,
                    amount,
                    currency,
                    merchant,
                    category,
                    transaction_date,
                    payment_method,
                    description
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s
                )
                RETURNING
                    id,
                    account_id,
                    type,
                    amount,
                    currency,
                    merchant,
                    category,
                    transaction_date,
                    payment_method,
                    description,
                    created_at
                """,
                (
                    account_id,
                    type,
                    amount,
                    currency,
                    merchant,
                    category,
                    transaction_date,
                    payment_method,
                    description,
                ),
            )

            return transaction_to_dict(cur.fetchone())


def get_transaction(transaction_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    account_id,
                    type,
                    amount,
                    currency,
                    merchant,
                    category,
                    transaction_date,
                    payment_method,
                    description,
                    created_at
                FROM transactions
                WHERE id = %s
                """,
                (transaction_id,),
            )

            return transaction_to_dict(cur.fetchone())


def get_transactions(
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    start_date = normalize_optional_date(start_date)
    end_date = normalize_optional_date(end_date)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    account_id,
                    type,
                    amount,
                    currency,
                    merchant,
                    category,
                    transaction_date,
                    payment_method,
                    description,
                    created_at
                FROM transactions
                WHERE (%s::text IS NULL OR type = %s)
                  AND (%s::text IS NULL OR category = %s)
                  AND (%s::date IS NULL OR transaction_date >= %s)
                  AND (%s::date IS NULL OR transaction_date <= %s)
                ORDER BY transaction_date DESC, created_at DESC
                """,
                (
                    type,
                    type,
                    category,
                    category,
                    start_date,
                    start_date,
                    end_date,
                    end_date,
                ),
            )

            return [
                transaction_to_dict(row)
                for row in cur.fetchall()
            ]


def update_transaction(
    transaction_id: int,
    type: Optional[str] = None,
    amount: Optional[float] = None,
    currency: Optional[str] = None,
    account_id: Optional[int] = None,
    merchant: Optional[str] = None,
    category: Optional[str] = None,
    transaction_date: Optional[str] = None,
    payment_method: Optional[str] = None,
    description: Optional[str] = None,
):
    transaction_date = normalize_optional_date(transaction_date)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE transactions
                SET
                    type = COALESCE(%s, type),
                    amount = COALESCE(%s, amount),
                    currency = COALESCE(%s, currency),
                    account_id = COALESCE(%s, account_id),
                    merchant = COALESCE(%s, merchant),
                    category = COALESCE(%s, category),
                    transaction_date = COALESCE(
                        %s, transaction_date
                    ),
                    payment_method = COALESCE(
                        %s, payment_method
                    ),
                    description = COALESCE(
                        %s, description
                    )
                WHERE id = %s
                RETURNING
                    id,
                    account_id,
                    type,
                    amount,
                    currency,
                    merchant,
                    category,
                    transaction_date,
                    payment_method,
                    description,
                    created_at
                """,
                (
                    type,
                    amount,
                    currency,
                    account_id,
                    merchant,
                    category,
                    transaction_date,
                    payment_method,
                    description,
                    transaction_id,
                ),
            )

            return transaction_to_dict(cur.fetchone())


def delete_transaction(transaction_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM transactions
                WHERE id = %s
                RETURNING id, merchant, amount, currency
                """,
                (transaction_id,),
            )

            row = cur.fetchone()

            if row is None:
                return None

            return {
                "id": row[0],
                "merchant": row[1],
                "amount": float(row[2]),
                "currency": row[3],
            }


def get_cash_flow(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    start_date = normalize_optional_date(start_date)
    end_date = normalize_optional_date(end_date)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN type = 'income'
                                THEN amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS income,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN type = 'expense'
                                THEN amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS expenses

                FROM transactions

                WHERE (%s::date IS NULL
                       OR transaction_date >= %s)
                  AND (%s::date IS NULL
                       OR transaction_date <= %s)
                """,
                (
                    start_date,
                    start_date,
                    end_date,
                    end_date,
                ),
            )

            row = cur.fetchone()

            income = Decimal(row[0])
            expenses = Decimal(row[1])
            cash_flow = income - expenses

            return {
                "income": float(income),
                "expenses": float(expenses),
                "cash_flow": float(cash_flow),
            }


def get_spending_by_category(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    start_date = normalize_optional_date(start_date)
    end_date = normalize_optional_date(end_date)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT category, SUM(amount) AS total
                FROM transactions
                WHERE type = 'expense'
                AND (%s::text IS NULL OR category = %s)
                AND (%s::date IS NULL OR transaction_date >= %s)
                AND (%s::date IS NULL OR transaction_date <= %s)
                GROUP BY category
                ORDER BY total DESC
                """,
                (
                    category,
                    category,
                    start_date,
                    start_date,
                    end_date,
                    end_date,
                ),
            )

            return [
                {
                    "category": row[0],
                    "amount": float(row[1]),
                }
                for row in cur.fetchall()
            ]




def account_to_dict(row):
    if row is None:
        return None

    return {
        "id": row[0],
        "name": row[1],
        "account_type": row[2],
        "currency": row[3],
        "current_balance": float(row[4]),
        "created_at": row[5].isoformat() if row[5] else None,
    }


def create_account(
    name: str,
    account_type: str,
    currency: str = "COP",
    current_balance: float = 0,
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO accounts (
                    name,
                    account_type,
                    currency,
                    current_balance
                )
                VALUES (%s, %s, %s, %s)
                RETURNING
                    id,
                    name,
                    account_type,
                    currency,
                    current_balance,
                    created_at
                """,
                (
                    name,
                    account_type,
                    currency,
                    current_balance,
                ),
            )

            return account_to_dict(cur.fetchone())


def get_accounts():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    name,
                    account_type,
                    currency,
                    current_balance,
                    created_at
                FROM accounts
                ORDER BY created_at
                """
            )

            return [
                account_to_dict(row)
                for row in cur.fetchall()
            ]


def get_account(account_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    name,
                    account_type,
                    currency,
                    current_balance,
                    created_at
                FROM accounts
                WHERE id = %s
                """,
                (account_id,),
            )

            return account_to_dict(cur.fetchone())


def update_account(
    account_id: int,
    name: Optional[str] = None,
    account_type: Optional[str] = None,
    currency: Optional[str] = None,
    current_balance: Optional[float] = None,
):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE accounts
                SET
                    name = COALESCE(%s, name),
                    account_type = COALESCE(%s, account_type),
                    currency = COALESCE(%s, currency),
                    current_balance = COALESCE(%s, current_balance)
                WHERE id = %s
                RETURNING
                    id,
                    name,
                    account_type,
                    currency,
                    current_balance,
                    created_at
                """,
                (
                    name,
                    account_type,
                    currency,
                    current_balance,
                    account_id,
                ),
            )

            return account_to_dict(cur.fetchone())


def delete_account(account_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM accounts
                WHERE id = %s
                RETURNING id, name
                """,
                (account_id,),
            )

            row = cur.fetchone()

            if row is None:
                return None

            return {
                "id": row[0],
                "name": row[1],
            }