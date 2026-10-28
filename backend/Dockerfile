ARG PYTHON_IMAGE=python:3.13-slim@sha256:cf50a4f6ac4f026458b08d5222023d700ac806410dff5e9ca8728fa44f2b850f
FROM ${PYTHON_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Calc recalculates a stripped data/formula copy, never rewrites the user's workbook.
# Official fixed release and checksum; changing this requires a deliberate runtime update.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libxinerama1 libnss3 libcups2 libdbus-1-3 libcairo2 \
    libx11-6 libxext6 libsm6 libice6 fonts-dejavu-core \
    && python -c "import urllib.request; urllib.request.urlretrieve('https://download.documentfoundation.org/libreoffice/stable/26.2.6/deb/x86_64/LibreOffice_26.2.6_Linux_x86-64_deb.tar.gz', '/tmp/office.tar.gz')" \
    && echo 'fd0e8f8f2408dd2e5b90286e60f3f97cf566ba441cd48cfc5bcc68067303e0bc  /tmp/office.tar.gz' | sha256sum -c - \
    && mkdir /tmp/nodebi-office && tar -xzf /tmp/office.tar.gz -C /tmp/nodebi-office \
    && apt-get install -y --no-install-recommends /tmp/nodebi-office/*/DEBS/*.deb \
    && ln -s /opt/libreoffice26.2/program/soffice /usr/local/bin/libreoffice \
    && rm -rf /tmp/nodebi-office /tmp/office.tar.gz /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0t64 libx11-xcb1 \
    && libreoffice --version \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-runtime.txt ./
RUN pip install -r requirements-runtime.txt

COPY pyproject.toml alembic.ini ./
COPY migrations ./migrations
COPY app ./app

RUN pip install --no-deps .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
