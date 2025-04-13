####################################################
# Following files can be used:
#   dockerfile      env_file        requirements.txt
#
# Following are the commands to prepare for Google-cloud-run.
#
#   0. Create requirements.txt:
#       /usr/bin/pip3.12 freeze > requirements.txt
#       [ may have to remove some entries from requirements.txt if build doesn't go thru. ]
#   1. Build:
#       docker build -t my-flask-app .
#   2. Run:
#       docker run -d -p 8080:8080 --env-file env_file --name flask-app my-flask-app
#   3. Check what's running:
#       docker ps -a
#   4. Check logs of run:
#       docker logs flask-app
#   5. Kill:
#       docker stop flask-app
#       docker rm flask-app
#
#   If the above steps run successfuly, following to deploy in cloud-run:
#       a.  click bottom-left cloud-run
#       b.  Select "Deploy to Cloud Run"
####################################################

# Use a lighter base image
FROM python:3.12.3-slim

# Set environment variables to prevent .pyc and enable UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Copy requirements first (for Docker cache benefits)
COPY requirements.txt .

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libffi-dev \
        libpq-dev \
        build-essential \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove gcc libffi-dev libpq-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy rest of the app
COPY . .

# Expose the port used by the app
EXPOSE 8080

# Start Gunicorn with 1 worker (ideal for Cloud Run)
CMD ["gunicorn", "-w", "1", "--threads", "2", "--preload", "-b", "0.0.0.0:8080", "--timeout", "300", "flask_file_accept:app"]
