# apps/backend/Dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app

# Install Gradle
RUN apt-get update && apt-get install -y wget unzip \
    && wget https://services.gradle.org/distributions/gradle-8.5-bin.zip \
    && unzip gradle-8.5-bin.zip \
    && mv gradle-8.5 /opt/gradle \
    && ln -s /opt/gradle/bin/gradle /usr/bin/gradle \
    && apt-get remove -y wget unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy build files
COPY build.gradle.kts settings.gradle.kts ./

# Copy source code
COPY src src/

# Build the application
RUN gradle build -x test

# Expose port
EXPOSE 8080

# Run the application
CMD ["java", "-jar", "build/libs/spirit-in-physics-backend-0.0.1-SNAPSHOT.jar"]
