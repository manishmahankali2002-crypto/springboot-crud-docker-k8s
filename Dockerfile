
FROM eclipse-temurin:22-jre

WORKDIR /app

COPY target/*.jar app.jar

EXPOSE 3000

ENTRYPOINT ["java", "-jar", "app.jar"]
