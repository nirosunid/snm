---
name: restart-container
description: Restart a Docker Compose service in this project. Usage: /restart-container <service> (e.g. /restart-container agents). Omit the service name to see the full list.
disable-model-invocation: true
tools: Bash
---

# Restart Container

Restart one of the project's Docker Compose services.

## Usage

```
/restart-container <service>
```

## Steps

1. Read `$ARGUMENTS` to get the service name.

2. If `$ARGUMENTS` is empty, print the list below and stop:

   | Service | Description |
   |---------|-------------|
   | `cms` | Payload CMS + Next.js (port 3000) |
   | `agents` | Python FastAPI agent service (port 8001) |
   | `celery-worker` | Celery async task worker |
   | `flower` | Celery monitor UI (port 5555) |
   | `rabbitmq` | RabbitMQ message broker (port 5672 / 15672) |
   | `postgres` | PostgreSQL database (port 5432) |
   | `all` or `*` or `all services` | Restart all services |

   Then tell the user: "Re-run with a service name, e.g. `/restart-container agents`"

3. If the service name is `all` or `*` or `all services` restart all services:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && docker compose restart
   ```
   Then show the container status:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && docker compose ps
   ```

4. If a service name is provided:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && docker compose restart $ARGUMENTS
   ```
   Then show the container status:
   ```bash
   cd /Users/sorin.dinu/Work/projects/products && docker compose ps $ARGUMENTS
   ```

5. Report success or surface any error output from Docker.
