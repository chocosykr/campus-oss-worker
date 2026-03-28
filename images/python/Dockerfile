FROM python:3.11-alpine

WORKDIR /app

RUN adduser -D runner

USER runner

CMD ["python", "/app/solution.py"]