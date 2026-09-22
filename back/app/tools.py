import platform
import shutil


def get_server_status() -> dict:
    """Return basic information about the server."""

    disk = shutil.disk_usage("/")

    return {
        "hostname": platform.node(),
        "disk_total_gb": round(disk.total / 1024**3, 2),
        "disk_used_gb": round(disk.used / 1024**3, 2),
        "disk_free_gb": round(disk.free / 1024**3, 2),
    }