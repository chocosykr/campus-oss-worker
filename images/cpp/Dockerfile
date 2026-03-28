FROM gcc:13

WORKDIR /app

RUN useradd -m runner && chown -R runner:runner /app

USER runner

CMD ["sh", "-c", "g++ /app/solution.cpp -o /app/solution && /app/solution"]