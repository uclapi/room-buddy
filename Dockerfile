# Start with a base Node.js 9 image
FROM python:3-alpine

# Update package lists
RUN apk update

# Set the timezone to Europe/London
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Europe/London /etc/localtime && \
    echo "Europe/London" > /etc/timezone

# Get required PostgreSQL Libraries
RUN apk add postgresql-libs && \
    apk add --virtual .build-deps gcc musl-dev postgresql-dev

# Copy everything to the image
COPY . .
WORKDIR src/

# Install Pipenv and gets requirements installed
RUN pip3 install pipenv
ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8
RUN pipenv install --system

# Run migrations and start channels layer and backend worker in parallel
CMD /bin/bash -c "python3 server/manage.py migrate && gunicorn --pythonpath server server.wsgi --bind 0.0.0.0:80 --loglevel=info"
