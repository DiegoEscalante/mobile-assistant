from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from agent import ask
import task_manager
import financial_manager
from bank_webhook import process_bank_webhook


app = FastAPI(
    title="Intelligent Multi-Agent Personal Assistant API",
    version="1.0.0",
)


# Request & Response Models
class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "es"
    debug: Optional[bool] = False


class ChatResponse(BaseModel):
    response: str
    debug_info: Optional[Dict[str, Any]] = None


class BankWebhookRequest(BaseModel):
    notification: str


class TaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"


class TransactionCreateRequest(BaseModel):
    type: str
    amount: float
    currency: Optional[str] = "COP"
    account_id: Optional[int] = None
    merchant: Optional[str] = None
    category: Optional[str] = "other"
    transaction_date: Optional[str] = None
    payment_method: Optional[str] = None
    description: Optional[str] = None


class AccountCreateRequest(BaseModel):
    name: str
    account_type: str
    currency: Optional[str] = "COP"
    current_balance: Optional[float] = 0.0


# Health Endpoint
@app.get("/health")
def health():
    return {"status": "ok"}


# Assistant Chat Endpoint
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    result = ask(request.message, language=request.language or "es", debug=request.debug or False)
    if isinstance(result, dict):
        return ChatResponse(
            response=result.get("response", ""),
            debug_info=result.get("debug_info"),
        )
    return ChatResponse(response=result)


# Zero-Friction Banking Ingestion Webhook
@app.post("/webhooks/bank")
def bank_webhook(request: BankWebhookRequest):
    if not request.notification:
        raise HTTPException(status_code=400, detail="Notification text is required.")
    return process_bank_webhook(request.notification)


# REST API - Tasks
@app.get("/tasks")
def list_tasks(
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    return task_manager.get_tasks(
        status=status, start_date=start_date, end_date=end_date
    )


@app.post("/tasks")
def create_task(task: TaskCreateRequest):
    return task_manager.create_task(
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        priority=task.priority,
    )


@app.get("/tasks/{task_id}")
def get_task(task_id: int):
    result = task_manager.get_task(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@app.post("/tasks/{task_id}/complete")
def complete_task(task_id: int):
    result = task_manager.complete_task(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    result = task_manager.delete_task(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


# REST API - Transactions
@app.get("/transactions")
def list_transactions(
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    return financial_manager.get_transactions(
        type=type, category=category, start_date=start_date, end_date=end_date
    )


@app.post("/transactions")
def create_transaction(tx: TransactionCreateRequest):
    return financial_manager.create_transaction(
        type=tx.type,
        amount=tx.amount,
        currency=tx.currency,
        account_id=tx.account_id,
        merchant=tx.merchant,
        category=tx.category,
        transaction_date=tx.transaction_date,
        payment_method=tx.payment_method,
        description=tx.description,
    )


# REST API - Accounts
@app.get("/accounts")
def list_accounts():
    return financial_manager.get_accounts()


@app.post("/accounts")
def create_account(acc: AccountCreateRequest):
    return financial_manager.create_account(
        name=acc.name,
        account_type=acc.account_type,
        currency=acc.currency,
        current_balance=acc.current_balance,
    )