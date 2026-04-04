FROM eclipse-temurin:21-alpine

WORKDIR /app

RUN adduser -D runner && chown -R runner:runner /app

USER runner

CMD ["sh", "-c", "javac /app/Solution.java && java -cp /app Solution"]