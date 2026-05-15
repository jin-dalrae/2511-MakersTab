FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# Python deps first so the layer caches when only app code changes.
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# uvicorn binds to 0.0.0.0 so Fly's proxy can reach it.
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
