"""Celery task definitions.

Issue #1 ships a single `ping` task so we can verify the worker is consuming
from RabbitMQ end-to-end. Real pipeline tasks land in Issue #9.
"""

from smn_agents.celery_app import celery_app


@celery_app.task(name="smn_agents.ping")
def ping() -> str:
    return "pong"
