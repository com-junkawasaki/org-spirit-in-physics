# apps/backend/Dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app

# Copy Gradle wrapper and build files
COPY gradlew gradlew.bat build.gradle.kts settings.gradle.kts ./
COPY gradle gradle/

# Copy source code
COPY src src/

# Build the application
RUN ./gradlew build -x test

# Expose port
EXPOSE 8080

# Run the application
CMD ["java", "-jar", "build/libs/spirit-in-physics-backend-0.0.1-SNAPSHOT.jar"]
