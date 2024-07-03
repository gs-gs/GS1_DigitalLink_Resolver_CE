# Use the Docker official image
FROM docker:latest

# Set the working directory inside the Docker image
WORKDIR /app

ENV DOCKER_TLS_CERTDIR=/certs

# Copy the entire DLR project to the working directory
COPY . .

# Expose the required ports
EXPOSE 80
EXPOSE 27017
EXPOSE 1433

# Start the application using docker-compose (Assuming docker-compose.yml is set to start the app)
# This RUN command will build the images and start the services defined in the docker-compose.yml file
CMD ["sh", "-c", "dockerd-entrypoint.sh & sleep 10 && docker-compose up"]
