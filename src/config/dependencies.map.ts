// src/config/dependencies.map.ts
export const DEPENDENCY_MAP = {
  // ─── CORE ───
  core: {
    dependencies: {
      "@nestjs/common": "^10.0.0",
      "@nestjs/core": "^10.0.0",
      "@nestjs/platform-express": "^10.0.0",
      "reflect-metadata": "^0.1.13",
      rxjs: "^7.8.1",
      "class-validator": "^0.14.0",
      "class-transformer": "^0.5.1",
      bcrypt: "^5.1.1",
      uuid: "^9.0.0",
    },
    devDependencies: {
      "@nestjs/cli": "^10.0.0",
      "@nestjs/schematics": "^10.0.0",
      "@types/node": "^20.0.0",
      typescript: "^5.1.0",
      "ts-node": "^10.9.0",
    },
  },

  // ─── DATABASES ───
  database: {
    postgresql: { pg: "^8.11.0" },
    mongodb: {},
    mysql: { mysql2: "^3.6.0" },
    sqlite: { "better-sqlite3": "^9.0.0" },
    mssql: { mssql: "^10.0.0" },
  },

  // ─── ORMs ───
  orm: {
    prisma: {
      dependencies: { "@prisma/client": "^5.0.0" },
      devDependencies: { prisma: "^5.0.0" },
    },
    typeorm: {
      dependencies: {
        typeorm: "^0.3.17",
        "@nestjs/typeorm": "^10.0.0",
      },
    },
    mongoose: {
      dependencies: {
        mongoose: "^7.0.0",
        "@nestjs/mongoose": "^10.0.0",
      },
    },
    drizzle: {
      dependencies: {
        "drizzle-orm": "^0.29.0",
      },
      devDependencies: {
        "drizzle-kit": "^0.20.0",
      },
    },
    mikroorm: {
      dependencies: {
        "@mikro-orm/core": "^5.0.0",
        "@mikro-orm/nestjs": "^5.0.0",
        "@mikro-orm/postgresql": "^5.0.0",
      },
    },
  },

  // ─── API STYLES ───
  api: {
    rest: {
      "@nestjs/swagger": "^7.0.0",
      "swagger-ui-express": "^5.0.0",
    },
    graphql: {
      "@nestjs/graphql": "^12.0.0",
      "@nestjs/apollo": "^12.0.0",
      "@apollo/server": "^4.0.0",
      graphql: "^16.0.0",
    },
    grpc: {
      "@nestjs/microservices": "^10.0.0",
      "@grpc/grpc-js": "^1.9.0",
      "@grpc/proto-loader": "^0.7.0",
    },
    websocket: {
      "@nestjs/websockets": "^10.0.0",
      "@nestjs/platform-socket.io": "^10.0.0",
    },
  },

  // ─── AUTH ───
  auth: {
    jwt: {
      "@nestjs/jwt": "^10.0.0",
      "@nestjs/passport": "^10.0.0",
      passport: "^0.6.0",
      "passport-jwt": "^4.0.0",
      "passport-local": "^1.0.0",
    },
    session: {
      "express-session": "^1.17.0",
      "connect-redis": "^7.0.0",
      "@nestjs/passport": "^10.0.0",
      passport: "^0.6.0",
    },
    "google-oauth": {
      "passport-google-oauth20": "^2.0.0",
    },
    "facebook-oauth": {
      "passport-facebook": "^3.0.0",
    },
    "github-oauth": {
      "passport-github2": "^0.1.0",
    },
    "2fa": {
      otplib: "^12.0.0",
      qrcode: "^1.5.0",
    },
    otp: {
      otplib: "^12.0.0",
    },
  },

  // ─── CACHING ───
  caching: {
    redis: {
      "@nestjs/cache-manager": "^2.0.0",
      "cache-manager": "^5.0.0",
      "cache-manager-redis-store": "^3.0.0",
      ioredis: "^5.0.0",
    },
    memcached: {
      "cache-manager-memcached-store": "^3.0.0",
    },
  },

  // ─── EMAIL ───
  email: {
    nodemailer: {
      "@nestjs-modules/mailer": "^1.9.0",
      nodemailer: "^6.9.0",
      handlebars: "^4.7.0",
    },
    sendgrid: {
      "@sendgrid/mail": "^7.7.0",
    },
    "aws-ses": {
      "@aws-sdk/client-ses": "^3.0.0",
    },
    resend: {
      resend: "^2.0.0",
    },
  },

  // ─── SMS ───
  sms: {
    twilio: { twilio: "^4.0.0" },
    "aws-sns": { "@aws-sdk/client-sns": "^3.0.0" },
    vonage: { "@vonage/server-sdk": "^3.0.0" },
    msg91: { msg91: "^1.0.0" },
  },

  // ─── MESSAGE QUEUE ───
  queue: {
    bullmq: {
      "@nestjs/bullmq": "^10.0.0",
      bullmq: "^4.0.0",
    },
    rabbitmq: {
      "@nestjs/microservices": "^10.0.0",
      amqplib: "^0.10.0",
    },
    kafka: {
      "@nestjs/microservices": "^10.0.0",
      kafkajs: "^2.0.0",
    },
  },

  // ─── MONITORING ───
  monitoring: {
    swagger: {
      "@nestjs/swagger": "^7.0.0",
      "swagger-ui-express": "^5.0.0",
    },
    health: {
      "@nestjs/terminus": "^10.0.0",
    },
    winston: {
      "nest-winston": "^1.9.0",
      winston: "^3.11.0",
    },
    pino: {
      "nestjs-pino": "^3.5.0",
      pino: "^8.0.0",
      "pino-pretty": "^10.0.0",
    },
    prometheus: {
      "nestjs-prometheus": "^5.0.0",
      "prom-client": "^15.0.0",
    },
    sentry: {
      "@sentry/node": "^7.0.0",
      "@sentry/tracing": "^7.0.0",
    },
    opentelemetry: {
      "@opentelemetry/sdk-node": "^0.45.0",
      "@opentelemetry/auto-instrumentations-node": "^0.40.0",
    },
  },

  // ─── FILE UPLOAD ───
  upload: {
    s3: {
      "@aws-sdk/client-s3": "^3.0.0",
      multer: "^1.4.0",
      "@nestjs/platform-express": "^10.0.0",
    },
    cloudinary: {
      cloudinary: "^1.41.0",
      multer: "^1.4.0",
    },
    local: {
      multer: "^1.4.0",
    },
  },
};
