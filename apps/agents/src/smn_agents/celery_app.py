"""Celery application — async task queue for the AI pipeline.

Issue #1 wires only the Celery app + a placeholder ping task.
Real pipeline tasks (plan / write / resolve_assets / compose / review)
land in Issue #9.
"""

import os

from celery import Celery

RABBITMQ_USER = os.getenv("RABBITMQ_DEFAULT_USER", "smn")
RABBITMQ_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "smn")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_PORT = os.getenv("RABBITMQ_PORT", "5672")

BROKER_URL = (
    f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/%2F"
)

celery_app = Celery(
    "smn_agents",
    broker=BROKER_URL,
    backend=None,  # state lives in Postgres via the content-jobs collection
    include=["smn_agents.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
)
