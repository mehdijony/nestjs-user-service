// src/generators/docker.generator.ts
import * as fs from "fs-extra";
import * as path from "path";
import { UserConfig } from "../config/feature.matrix";

export class DockerGenerator {
  constructor(
    private config: UserConfig,
    private projectPath: string,
    private templatePath: string,
  ) {}

  async generate(): Promise<void> {
    await this.generateDockerfile();
    await this.generateDockerCompose();
    await this.generateDockerIgnore();
  }

  private async generateDockerfile(): Promise<void> {
    const dockerfile = `
# ─── BUILD STAGE ───
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
${this.config.orm === "prisma" ? "COPY prisma ./prisma/" : ""}

RUN npm ci

COPY . .

${this.config.orm === "prisma" ? "RUN npx prisma generate" : ""}
RUN npm run build

# ─── PRODUCTION STAGE ───
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

${this.config.orm === "prisma" ? "COPY prisma ./prisma/\nRUN npx prisma generate" : ""}
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]`;

    await fs.writeFile(path.join(this.projectPath, "Dockerfile"), dockerfile);
  }

  private async generateDockerCompose(): Promise<void> {
    let services = `version: '3.8'

services:
  # ─── APPLICATION ───
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:`;

    // Database service
    switch (this.config.database) {
      case "postgresql":
        services += `
      - postgres
    networks:
      - app-network

  # ─── POSTGRESQL ───
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${this.config.projectName}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network`;
        break;

      case "mongodb":
        services += `
      - mongo
    networks:
      - app-network

  # ─── MONGODB ───
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: ${this.config.projectName}
    volumes:
      - mongo_data:/data/db
    networks:
      - app-network`;
        break;

      case "mysql":
        services += `
      - mysql
    networks:
      - app-network

  # ─── MYSQL ───
  mysql:
    image: mysql:8
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: ${this.config.projectName}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - app-network`;
        break;
    }

    // Redis
    if (
      this.config.caching === "redis" ||
      this.config.messageQueue === "bullmq"
    ) {
      services += `

  # ─── REDIS ───
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app-network`;
    }

    // RabbitMQ
    if (this.config.messageQueue === "rabbitmq") {
      services += `

  # ─── RABBITMQ ───
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - app-network`;
    }

    // Kafka
    if (this.config.messageQueue === "kafka") {
      services += `

  # ─── ZOOKEEPER ───
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    networks:
      - app-network

  # ─── KAFKA ───
  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks:
      - app-network`;
    }

    // Monitoring
    if (this.config.monitoring.includes("prometheus")) {
      services += `

  # ─── PROMETHEUS ───
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - app-network

  # ─── GRAFANA ───
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    networks:
      - app-network`;
    }

    // Networks and Volumes
    services += `

networks:
  app-network:
    driver: bridge

volumes:`;

    switch (this.config.database) {
      case "postgresql":
        services += "\n  postgres_data:";
        break;
      case "mongodb":
        services += "\n  mongo_data:";
        break;
      case "mysql":
        services += "\n  mysql_data:";
        break;
    }

    if (
      this.config.caching === "redis" ||
      this.config.messageQueue === "bullmq"
    ) {
      services += "\n  redis_data:";
    }
    if (this.config.messageQueue === "rabbitmq") {
      services += "\n  rabbitmq_data:";
    }

    await fs.writeFile(
      path.join(this.projectPath, "docker-compose.yml"),
      services,
    );
  }

  private async generateDockerIgnore(): Promise<void> {
    const content = `node_modules
dist
.env
*.log
.git
coverage
.idea
.vscode`;

    await fs.writeFile(path.join(this.projectPath, ".dockerignore"), content);
  }
}
