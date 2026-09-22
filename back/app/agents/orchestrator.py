# ==============================================================================
# PROYECTO: Asistente Personal Inteligente Multi-Agente
# MÓDULO: Agente Orquestador (orchestrator.py)
# DESCRIPCIÓN: Administra el flujo de conversación, clasifica intenciones y
#              coordina la ejecución de herramientas (Function Calling) entre los
#              agentes especializados (SecretaryAgent y FinancialAgent).
# ==============================================================================

import json
import logging
import os
from datetime import date
from typing import Dict, Any, Union

try:
    import ollama
except ImportError:
    ollama = None

from agents.secretary_agent import SecretaryAgent
from agents.financial_agent import FinancialAgent

# Configuración del registrador de logs del orquestador
logger = logging.getLogger("assistant.orchestrator")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class OrchestratorAgent:
    """
    Agente Orquestador Principal que intercepta las consultas del usuario,
    detecta intenciones, despacha llamadas a funciones registradas en los agentes
    Secretario y Financiero, y sintetiza las respuestas finales utilizando Llama 3.1 8B.
    """

    SYSTEM_PROMPT = (
        "Eres un Asistente Personal Inteligente Multi-Agente. "
        "Gestionas tareas, obligaciones, estado del servidor, transacciones financieras, "
        "flujo de caja y cuentas bancarias. "
        "Trata los resultados de las herramientas como la única verdad. Nunca inventes datos almacenados no existentes. "
        "Después de ejecutar las herramientas, proporciona respuestas claras, concisas y útiles."
    )

    def __init__(self, ollama_host: str = "http://ollama:11434"):
        self.secretary_agent = SecretaryAgent()
        self.financial_agent = FinancialAgent()

        self.tools = (
            self.secretary_agent.get_tools() + self.financial_agent.get_tools()
        )

        self.client = (
            ollama.Client(host=ollama_host)
            if (ollama and hasattr(ollama, "Client"))
            else None
        )

    def get_system_prompt(self, language: str = "es") -> str:
        today_str = date.today().isoformat()
        lang_instruction = "Responde estrictamente en español." if language == "es" else "Respond strictly in English."
        if language == "es":
            return (
                "Eres un Asistente Personal Inteligente Multi-Agente. "
                f"La fecha de hoy es {today_str}. "
                "Gestionas tareas, obligaciones, estado del servidor, transacciones financieras, "
                "flujo de caja y cuentas bancarias. "
                "IMPORTANTE: Al consultar transacciones o flujo de caja sin límites de fecha explícitos solicitados por el usuario, "
                "deja start_date y end_date como null para incluir todos los registros. "
                "Trata los resultados de las herramientas como la única verdad. Nunca inventes datos almacenados no existentes. "
                "Después de ejecutar las herramientas, proporciona respuestas claras, concisas y útiles.\n"
                f"{lang_instruction}"
            )
        else:
            return (
                "You are an Intelligent Multi-Agent Personal Assistant. "
                f"Today's date is {today_str}. "
                "You manage tasks, obligations, server status, financial transactions, "
                "cash flow, and bank accounts. "
                "IMPORTANT: When querying transactions or cash flow without explicit date boundaries requested by the user, "
                "leave start_date and end_date as null to include all records. "
                "Treat tool results as the source of truth. Never invent missing stored data. "
                "After tools execute, provide clear, concise, and helpful responses.\n"
                f"{lang_instruction}"
            )

    def sanitize_arguments(self, arguments: dict) -> dict:
        """Convert string representation of null/none/undefined to Python None."""
        sanitized = {}
        for key, val in arguments.items():
            if isinstance(val, str) and val.strip().lower() in ("null", "none", "undefined"):
                sanitized[key] = None
            else:
                sanitized[key] = val
        return sanitized

    def execute_tool_call(self, name: str, arguments: dict):
        """Route tool call to appropriate agent."""
        arguments = self.sanitize_arguments(arguments)
        if name in self.secretary_agent.tool_functions:
            return self.secretary_agent.execute_tool(name, arguments)
        elif name in self.financial_agent.tool_functions:
            return self.financial_agent.execute_tool(name, arguments)
        else:
            raise ValueError(f"Unknown tool requested by LLM: '{name}'")

    def ask(
        self,
        message: str,
        language: str = "es",
        debug: bool = False,
        model: str = os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
    ) -> Union[str, Dict[str, Any]]:
        if not self.client:
            err_msg = "El cliente de Ollama no está inicializado." if language == "es" else "Ollama client is not initialized."
            return {"response": err_msg, "debug_info": {"error": err_msg}} if debug else err_msg

        system_prompt = self.get_system_prompt(language=language)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ]

        logger.info(f"🤖 Calling LLM model '{model}' with {len(self.tools)} available tools (lang={language})...")
        try:
            response = self.client.chat(
                model=model,
                messages=messages,
                tools=self.tools,
            )
        except Exception as e:
            logger.error(f"❌ Failed to communicate with Ollama: {e}", exc_info=True)
            err_msg = f"LLM error: {str(e)}"
            return {"response": err_msg, "debug_info": {"error": err_msg}} if debug else err_msg

        debug_info = {
            "prompt": message,
            "tool_calls": [],
            "raw_llm_response": getattr(response.message, "content", ""),
        }

        if not response.message.tool_calls:
            logger.info("ℹ️ [LLM DECISION] Model decided NOT to call any tools.")
            logger.info(f"💬 [DIRECT RESPONSE] {response.message.content}")
            if debug:
                return {"response": response.message.content, "debug_info": debug_info}
            return response.message.content

        logger.info(f"🛠️ [LLM DECISION] Model requested {len(response.message.tool_calls)} tool call(s).")
        messages.append(response.message)

        for idx, tool_call in enumerate(response.message.tool_calls, 1):
            name = tool_call.function.name
            raw_args = tool_call.function.arguments or {}
            sanitized_args = self.sanitize_arguments(raw_args)

            logger.info(f"--- Tool Call #{idx}: '{name}' ---")
            logger.info(f"   [RAW ARGS]       {raw_args}")
            logger.info(f"   [SANITIZED ARGS] {sanitized_args}")

            tool_debug = {
                "tool_name": name,
                "raw_arguments": raw_args,
                "sanitized_arguments": sanitized_args,
                "status": "pending",
                "result": None,
                "error": None,
            }

            try:
                result = self.execute_tool_call(name, raw_args)
                tool_debug["status"] = "success"
                tool_debug["result"] = result
                logger.info(f"   ✅ [TOOL RESULT] {result}")
            except Exception as e:
                tool_debug["status"] = "failed"
                tool_debug["error"] = str(e)
                logger.error(f"   ❌ [TOOL ERROR] Failed executing '{name}': {e}", exc_info=True)
                result = {"error": f"Tool execution failed: {str(e)}"}

            debug_info["tool_calls"].append(tool_debug)

            messages.append(
                {
                    "role": "tool",
                    "name": name,
                    "content": json.dumps(result) if not isinstance(result, str) else result,
                }
            )

        logger.info("🧠 [LLM SYNTHESIS] Sending tool execution results back to model...")
        try:
            final_response = self.client.chat(
                model=model,
                messages=messages,
            )
            final_content = final_response.message.content
            logger.info(f"💬 [FINAL RESPONSE] {final_content}")
            logger.info("==================================================")
        except Exception as e:
            logger.error(f"❌ Failed during final synthesis: {e}", exc_info=True)
            final_content = f"Error generating final response: {str(e)}"
            debug_info["error"] = str(e)

        if debug:
            return {"response": final_content, "debug_info": debug_info}

        return final_content


_default_orchestrator = None


def get_orchestrator():
    global _default_orchestrator
    if _default_orchestrator is None:
        _default_orchestrator = OrchestratorAgent()
    return _default_orchestrator


def ask(message: str, language: str = "es", debug: bool = False) -> Union[str, Dict[str, Any]]:
    """Convenience function for FastAPI /chat endpoint."""
    return get_orchestrator().ask(message, language=language, debug=debug)
