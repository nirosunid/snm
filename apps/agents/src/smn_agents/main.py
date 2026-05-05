"""SMN agents service — FastAPI entrypoint.

Issue #1 boots a minimal service with /health.
LLMClient + pipeline + tools are added in later issues (#8 onwards).
"""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="SMN Agents",
    description="AI agent service for carousel generation (planner / writer / visual director / editor).",
    version="0.1.0",
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="smn-agents", version="0.1.0")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "SMN agents service. See /docs for the OpenAPI surface."}
