import task_manager
from tools import get_server_status

SECRETARY_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_server_status",
            "description": (
                "Get basic information about the server, "
                "including hostname and disk usage."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": (
                "Create a new task with a title, optional description, "
                "optional due date, and priority."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title of the task.",
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description of the task.",
                    },
                    "due_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Optional due date in YYYY-MM-DD format.",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "Task priority.",
                    },
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_tasks",
            "description": "Retrieve a list of tasks based on optional filters.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pending", "completed"],
                        "description": "Optional task status filter.",
                    },
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Optional earliest due date.",
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Optional latest due date.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_task",
            "description": (
                "Get exactly one task using its numeric ID. "
                "Only use this tool when the user provides a numeric task ID."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task.",
                    },
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": (
                "Update an existing task's title, description, due date, or priority."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task.",
                    },
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "due_date": {"type": "string", "format": "date"},
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                    },
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "complete_task",
            "description": "Mark a task as completed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task.",
                    },
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Permanently delete a task by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer"},
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_tasks",
            "description": (
                "Find existing tasks by their name or partial title search. "
                "Use this tool whenever the user refers to a task by title."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The task title query.",
                    },
                },
                "required": ["query"],
            },
        },
    },
]


class SecretaryAgent:
    """Specialized Agent responsible for task management, calendar obligations, and server status."""

    SYSTEM_PROMPT = (
        "Eres el Agente Secretario, un asistente ejecutivo responsable de "
        "la gestión de tareas, obligaciones y monitoreo del estado del servidor. "
        "Trata los resultados de las herramientas como autoritativos. Nunca inventes fechas o descripciones de tareas. "
        "Si una tarea no tiene fecha límite, indica claramente que no tiene fecha límite."
    )

    def __init__(self):
        self.tool_functions = {
            "get_server_status": get_server_status,
            "create_task": task_manager.create_task,
            "get_tasks": task_manager.get_tasks,
            "get_task": task_manager.get_task,
            "update_task": task_manager.update_task,
            "complete_task": task_manager.complete_task,
            "delete_task": task_manager.delete_task,
            "find_tasks": task_manager.find_tasks,
        }

    def get_tools(self):
        return SECRETARY_TOOLS

    def execute_tool(self, name: str, arguments: dict):
        if name not in self.tool_functions:
            raise ValueError(f"Unknown secretary tool: {name}")
        return self.tool_functions[name](**arguments)
