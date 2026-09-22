import unittest
from unittest.mock import patch, MagicMock

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from tools import get_server_status


class TestTools(unittest.TestCase):

    @patch("shutil.disk_usage")
    @patch("platform.node")
    def test_get_server_status(self, mock_node, mock_disk_usage):
        """Test get_server_status returns valid server metrics."""
        mock_node.return_value = "abeja"

        # Mock 100 GB total, 40 GB used, 60 GB free
        usage_mock = MagicMock()
        usage_mock.total = 100 * (1024**3)
        usage_mock.used = 40 * (1024**3)
        usage_mock.free = 60 * (1024**3)
        mock_disk_usage.return_value = usage_mock

        status = get_server_status()

        self.assertEqual(status["hostname"], "abeja")
        self.assertEqual(status["disk_total_gb"], 100.0)
        self.assertEqual(status["disk_used_gb"], 40.0)
        self.assertEqual(status["disk_free_gb"], 60.0)


if __name__ == "__main__":
    unittest.main()
