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

# Use the official Python image.
FROM python:3.12.3

# Set the working directory in the container.
WORKDIR /app

# Copy the requirements file into the container.
COPY requirements.txt .

# Install dependencies.
RUN pip3.12 install --no-cache-dir -r requirements.txt

# Copy the app source code into the container.
COPY . .

# Expose the port the app runs on.
EXPOSE 8080

# Command to run the Flask app.
CMD ["gunicorn", "-b", "0.0.0.0:8080", "flask_file_accept:app"]
