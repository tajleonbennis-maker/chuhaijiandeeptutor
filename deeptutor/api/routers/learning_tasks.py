"""Teacher-authored lesson assignments for Learning Space.

Administrators are the lesson publishers in v1. The stored schema keeps author
and audience fields explicit so a future ``teacher`` role can use the same API
without migrating student progress.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import threading
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from deeptutor.api.routers.auth import require_admin
from deeptutor.multi_user.context import get_current_user
from deeptutor.multi_user.identity import get_user_by_id
from deeptutor.multi_user.paths import SYSTEM_ROOT


router = APIRouter()
_ROOT = SYSTEM_ROOT / "learning_tasks"
_TASKS_FILE = _ROOT / "tasks.json"
_PROGRESS_DIR = _ROOT / "progress"
_LOCK = threading.RLock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read(path: Path, default: Any) -> Any:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return default


def _write(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    temp.replace(path)


def _tasks() -> list[dict[str, Any]]:
    value = _read(_TASKS_FILE, [])
    return value if isinstance(value, list) else []


def _progress(user_id: str) -> dict[str, dict[str, Any]]:
    value = _read(_PROGRESS_DIR / f"{user_id}.json", {})
    return value if isinstance(value, dict) else {}


def _visible(task: dict[str, Any], user_id: str, is_admin: bool) -> bool:
    if is_admin:
        return True
    if task.get("status") != "published":
        return False
    audience = task.get("audience") or {}
    return audience.get("type") == "all" or user_id in (audience.get("user_ids") or [])


class LessonStep(BaseModel):
    id: str = ""
    title: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    content: str = Field(default="", max_length=12000)
    kind: Literal["warmup", "read", "vocabulary", "practice", "discussion", "quiz", "summary"] = "read"
    prompt: str = Field(default="", max_length=4000)


class Audience(BaseModel):
    type: Literal["all", "users"] = "all"
    user_ids: list[str] = Field(default_factory=list)


class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    description: str = Field(default="", max_length=2000)
    subject: str = Field(default="英语", max_length=80)
    grade: str = Field(default="初中", max_length=80)
    difficulty: str = Field(default="适中", max_length=40)
    duration_minutes: int = Field(default=20, ge=1, le=600)
    objectives: list[str] = Field(default_factory=list)
    knowledge_bases: list[str] = Field(default_factory=list)
    steps: list[LessonStep] = Field(default_factory=list)
    audience: Audience = Field(default_factory=Audience)
    due_at: str | None = None
    publish: bool = False


class ProgressRequest(BaseModel):
    completed_step_ids: list[str] = Field(default_factory=list)
    status: Literal["not_started", "in_progress", "completed"] = "in_progress"
    reflection: str = Field(default="", max_length=4000)


def _public_task(task: dict[str, Any], progress: dict[str, Any] | None) -> dict[str, Any]:
    steps = task.get("steps") or []
    done = set((progress or {}).get("completed_step_ids") or [])
    return {
        **task,
        "progress": progress
        or {"status": "not_started", "completed_step_ids": [], "reflection": ""},
        "progress_percent": round((len(done) / len(steps)) * 100) if steps else 0,
    }


@router.get("")
async def list_tasks() -> dict[str, Any]:
    user = get_current_user()
    progress = _progress(user.id)
    items = [
        _public_task(task, progress.get(str(task.get("id"))))
        for task in _tasks()
        if _visible(task, user.id, user.is_admin)
    ]
    items.sort(key=lambda item: str(item.get("updated_at") or ""), reverse=True)
    return {"tasks": items, "can_manage": user.is_admin}


@router.get("/{task_id}")
async def get_task(task_id: str) -> dict[str, Any]:
    user = get_current_user()
    task = next((item for item in _tasks() if item.get("id") == task_id), None)
    if task is None or not _visible(task, user.id, user.is_admin):
        raise HTTPException(status_code=404, detail="Learning task not found")
    return _public_task(task, _progress(user.id).get(task_id))


@router.post("")
async def create_task(
    payload: CreateTaskRequest, _: object = Depends(require_admin)
) -> dict[str, Any]:
    user = get_current_user()
    for user_id in payload.audience.user_ids:
        if get_user_by_id(user_id) is None:
            raise HTTPException(status_code=400, detail=f"Unknown user id: {user_id}")
    now = _now()
    task_id = f"lesson_{uuid4().hex}"
    steps = []
    for index, step in enumerate(payload.steps):
        row = step.model_dump()
        row["id"] = row["id"].strip() or f"step_{index + 1}"
        steps.append(row)
    task = {
        "id": task_id,
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "subject": payload.subject.strip(),
        "grade": payload.grade.strip(),
        "difficulty": payload.difficulty.strip(),
        "duration_minutes": payload.duration_minutes,
        "objectives": [item.strip() for item in payload.objectives if item.strip()],
        "knowledge_bases": [item.strip() for item in payload.knowledge_bases if item.strip()],
        "steps": steps,
        "audience": payload.audience.model_dump(),
        "due_at": payload.due_at,
        "status": "published" if payload.publish else "draft",
        "created_by": {"user_id": user.id, "username": user.username, "role": user.role},
        "created_at": now,
        "updated_at": now,
        "published_at": now if payload.publish else None,
    }
    with _LOCK:
        items = _tasks()
        items.append(task)
        _write(_TASKS_FILE, items)
    return _public_task(task, None)


@router.post("/{task_id}/publish")
async def publish_task(task_id: str, _: object = Depends(require_admin)) -> dict[str, Any]:
    with _LOCK:
        items = _tasks()
        task = next((item for item in items if item.get("id") == task_id), None)
        if task is None:
            raise HTTPException(status_code=404, detail="Learning task not found")
        task["status"] = "published"
        task["published_at"] = task.get("published_at") or _now()
        task["updated_at"] = _now()
        _write(_TASKS_FILE, items)
    return _public_task(task, None)


@router.put("/{task_id}")
async def replace_task(
    task_id: str, payload: CreateTaskRequest, _: object = Depends(require_admin)
) -> dict[str, Any]:
    """Replace lesson content while preserving identity and student progress."""
    user = get_current_user()
    for user_id in payload.audience.user_ids:
        if get_user_by_id(user_id) is None:
            raise HTTPException(status_code=400, detail=f"Unknown user id: {user_id}")
    with _LOCK:
        items = _tasks()
        task = next((item for item in items if item.get("id") == task_id), None)
        if task is None:
            raise HTTPException(status_code=404, detail="Learning task not found")
        steps = []
        for index, step in enumerate(payload.steps):
            row = step.model_dump()
            row["id"] = row["id"].strip() or f"step_{index + 1}"
            steps.append(row)
        task.update(
            {
                "title": payload.title.strip(),
                "description": payload.description.strip(),
                "subject": payload.subject.strip(),
                "grade": payload.grade.strip(),
                "difficulty": payload.difficulty.strip(),
                "duration_minutes": payload.duration_minutes,
                "objectives": [x.strip() for x in payload.objectives if x.strip()],
                "knowledge_bases": [x.strip() for x in payload.knowledge_bases if x.strip()],
                "steps": steps,
                "audience": payload.audience.model_dump(),
                "due_at": payload.due_at,
                "status": "published" if payload.publish else "draft",
                "updated_at": _now(),
                "updated_by": {"user_id": user.id, "username": user.username},
            }
        )
        if payload.publish:
            task["published_at"] = task.get("published_at") or _now()
        _write(_TASKS_FILE, items)
    return _public_task(task, None)


@router.put("/{task_id}/progress")
async def update_progress(task_id: str, payload: ProgressRequest) -> dict[str, Any]:
    user = get_current_user()
    task = next((item for item in _tasks() if item.get("id") == task_id), None)
    if task is None or not _visible(task, user.id, user.is_admin):
        raise HTTPException(status_code=404, detail="Learning task not found")
    valid_steps = {str(step.get("id")) for step in task.get("steps") or []}
    completed = list(dict.fromkeys(x for x in payload.completed_step_ids if x in valid_steps))
    status = payload.status
    if valid_steps and len(completed) == len(valid_steps):
        status = "completed"
    now = _now()
    row = {
        "task_id": task_id,
        "user_id": user.id,
        "status": status,
        "completed_step_ids": completed,
        "reflection": payload.reflection.strip(),
        "started_at": now,
        "updated_at": now,
        "completed_at": now if status == "completed" else None,
    }
    with _LOCK:
        values = _progress(user.id)
        previous = values.get(task_id) or {}
        row["started_at"] = previous.get("started_at") or now
        values[task_id] = row
        _write(_PROGRESS_DIR / f"{user.id}.json", values)
    return _public_task(task, row)
