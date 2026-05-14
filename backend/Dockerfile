# Microsoft's Playwright base image: Ubuntu 22.04 + Python 3.10 + Chromium pre-baked.
# Saves ~200MB of build-time installs.
FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# Install Python deps first so the layer caches when only app code changes.
COPY requirements.txt ./
RUN pip install -r requirements.txt

# App code.
COPY . .

EXPOSE 8000

# uvicorn binds to 0.0.0.0 so Fly's proxy can reach it.
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
