import unittest
from datetime import date, datetime
from unittest.mock import MagicMock, patch

import sys
import os

# Add app directory to sys.path for importing modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from task_manager import (
    task_to_dict,
    create_task,
    get_tasks,
    get_task,
    update_task,
    complete_task,
    delete_task,
    find_tasks,
)


class TestTaskManager(unittest.TestCase):

    def test_task_to_dict_none(self):
        """Test task_to_dict with None row returns None."""
        self.assertIsNone(task_to_dict(None))

    def test_task_to_dict_valid_row(self):
        """Test task_to_dict correctly formats row values."""
        row = (
            1,
            "Submit assignment",
            "Systems engineering paper",
            "pending",
            "high",
            date(2026, 9, 20),
            datetime(2026, 9, 15, 10, 0, 0),
        )
        result = task_to_dict(row)
        self.assertEqual(result["id"], 1)
        self.assertEqual(result["title"], "Submit assignment")
        self.assertEqual(result["description"], "Systems engineering paper")
        self.assertEqual(result["status"], "pending")
        self.assertEqual(result["priority"], "high")
        self.assertEqual(result["due_date"], "2026-09-20")
        self.assertEqual(result["created_at"], "2026-09-15T10:00:00")

    @patch("task_manager.get_connection")
    def test_create_task(self, mock_get_conn):
        """Test task creation invokes SQL INSERT with correct parameters."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = (
            10,
            "Buy groceries",
            "Milk and eggs",
            "pending",
            "medium",
            None,
            datetime(2026, 9, 17, 12, 0, 0),
        )

        result = create_task(
            title="Buy groceries",
            description="Milk and eggs",
            priority="medium",
        )

        self.assertIsNotNone(result)
        self.assertEqual(result["id"], 10)
        self.assertEqual(result["title"], "Buy groceries")
        self.assertEqual(result["status"], "pending")
        self.assertIsNone(result["due_date"])
        mock_cur.execute.assert_called_once()

    @patch("task_manager.get_connection")
    def test_get_tasks(self, mock_get_conn):
        """Test get_tasks query execution and filtering."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchall.return_value = [
            (
                1,
                "Task 1",
                "Desc 1",
                "pending",
                "high",
                date(2026, 9, 20),
                datetime(2026, 9, 15, 10, 0, 0),
            ),
            (
                2,
                "Task 2",
                "Desc 2",
                "pending",
                "medium",
                None,
                datetime(2026, 9, 16, 11, 0, 0),
            ),
        ]

        tasks = get_tasks(status="pending")
        self.assertEqual(len(tasks), 2)
        self.assertEqual(tasks[0]["title"], "Task 1")
        self.assertEqual(tasks[1]["title"], "Task 2")
        mock_cur.execute.assert_called_once()

    @patch("task_manager.get_connection")
    def test_get_task_by_id_found(self, mock_get_conn):
        """Test get_task returns task dict when ID exists."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = (
            5,
            "Specific Task",
            "Details",
            "pending",
            "low",
            None,
            datetime(2026, 9, 17, 14, 0, 0),
        )

        task = get_task(5)
        self.assertIsNotNone(task)
        self.assertEqual(task["id"], 5)
        self.assertEqual(task["title"], "Specific Task")

    @patch("task_manager.get_connection")
    def test_get_task_by_id_not_found(self, mock_get_conn):
        """Test get_task returns None when task ID does not exist."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = None

        task = get_task(999)
        self.assertIsNone(task)

    @patch("task_manager.get_connection")
    def test_update_task(self, mock_get_conn):
        """Test update_task executes UPDATE and returns modified task."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = (
            1,
            "Updated Title",
            "Updated Desc",
            "pending",
            "high",
            date(2026, 9, 25),
            datetime(2026, 9, 15, 10, 0, 0),
        )

        updated = update_task(
            task_id=1,
            title="Updated Title",
            priority="high",
            due_date="2026-09-25",
        )

        self.assertIsNotNone(updated)
        self.assertEqual(updated["title"], "Updated Title")
        self.assertEqual(updated["priority"], "high")
        self.assertEqual(updated["due_date"], "2026-09-25")

    @patch("task_manager.get_connection")
    def test_complete_task(self, mock_get_conn):
        """Test complete_task updates task status to completed."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = (
            1,
            "Submit assignment",
            "completed",
            datetime(2026, 9, 17, 17, 0, 0),
        )

        result = complete_task(1)
        self.assertIsNotNone(result)
        self.assertEqual(result["id"], 1)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["completed_at"], "2026-09-17T17:00:00")

    @patch("task_manager.get_connection")
    def test_delete_task(self, mock_get_conn):
        """Test delete_task returns deleted task metadata."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchone.return_value = (1, "Deleted Task")

        result = delete_task(1)
        self.assertIsNotNone(result)
        self.assertEqual(result["id"], 1)
        self.assertEqual(result["title"], "Deleted Task")

    @patch("task_manager.get_connection")
    def test_find_tasks(self, mock_get_conn):
        """Test find_tasks searches titles matching search query."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_conn.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        mock_cur.fetchall.return_value = [
            (
                1,
                "Buy groceries",
                None,
                "pending",
                "medium",
                None,
                datetime(2026, 9, 15, 10, 0, 0),
            )
        ]

        results = find_tasks("groceries")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Buy groceries")
        mock_cur.execute.assert_called_once_with(
            unittest.mock.ANY, ("%groceries%",)
        )


if __name__ == "__main__":
    unittest.main()
