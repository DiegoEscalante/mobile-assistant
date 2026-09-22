import os
from datetime import date
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


def task_to_dict(row):
    if row is None:
        return None
    return {
        "id": row[0],
        "title": row[1],
        "description": row[2],
        "status": row[3],
        "priority": row[4],
        "due_date": row[5].isoformat() if row[5] else None,
        "created_at": row[6].isoformat() if row[6] else None,
    }


def create_task(
    title: str,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    priority: str = "medium",
):
    if due_date:
        due_date = date.fromisoformat(due_date)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tasks
                    (title, description, due_date, priority)
                VALUES
                    (%s, %s, %s, %s)
                RETURNING id, title, description, status,
                          priority, due_date, created_at
                """,
                (title, description, due_date, priority),
            )

            return task_to_dict(cur.fetchone())


def get_tasks(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    if start_date:
        start_date = date.fromisoformat(start_date)
    if end_date:
        end_date = date.fromisoformat(end_date)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, status,
                       priority, due_date, created_at
                FROM tasks
                WHERE (%s::text IS NULL OR status = %s)
                  AND (%s::date IS NULL OR due_date >= %s)
                  AND (%s::date IS NULL OR due_date <= %s)
                ORDER BY due_date NULLS LAST, created_at
                """,
                (
                    status,
                    status,
                    start_date,
                    start_date,
                    end_date,
                    end_date,
                ),
            )

            return [task_to_dict(row) for row in cur.fetchall()]


def get_task(task_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, status,
                       priority, due_date, created_at
                FROM tasks
                WHERE id = %s
                """,
                (task_id,),
            )
            return task_to_dict(cur.fetchone())


def update_task(
    task_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    priority: Optional[str] = None,
):
    if due_date:
        due_date = date.fromisoformat(due_date)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE tasks
                SET title = COALESCE(%s, title),
                    description = COALESCE(%s, description),
                    due_date = COALESCE(%s, due_date),
                    priority = COALESCE(%s, priority)
                WHERE id = %s
                RETURNING id, title, description, status,
                          priority, due_date, created_at
                """,
                (
                    title,
                    description,
                    due_date,
                    priority,
                    task_id,
                ),
            )

            return task_to_dict(cur.fetchone())


def complete_task(task_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE tasks
                SET status = 'completed',
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, title, status, completed_at
                """,
                (task_id,),
            )
            row = cur.fetchone()

            if row is None:
                return None

            return {
                "id": row[0],
                "title": row[1],
                "status": row[2],
                "completed_at": row[3].isoformat() if row[3] else None,
            }


def delete_task(task_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM tasks
                WHERE id = %s
                RETURNING id, title
                """,
                (task_id,),
            )
            row = cur.fetchone()

            if row is None:
                return None

            return {
                "id": row[0],
                "title": row[1],
            }


def find_tasks(query: str):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, status,
                       priority, due_date, created_at
                FROM tasks
                WHERE title ILIKE %s
                ORDER BY status, due_date NULLS LAST, created_at
                """,
                (f"%{query}%",),
            )

            return [task_to_dict(row) for row in cur.fetchall()]