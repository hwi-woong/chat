import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import connectPgSimple from "connect-pg-simple";
import type { NextFunction, Response } from "express";
import session from "express-session";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import type { RequestWithSession } from "./common/types/request-with-session";
import { appConfig } from "./config";
import { PG_POOL } from "./infrastructure/database/drizzle.constants";
import type { Pool } from "pg";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = appConfig.port;
  const pool = app.get<Pool>(PG_POOL);
  const PgStore = connectPgSimple(session);

  // Trust the single nginx proxy in front so secure session cookies work behind TLS termination.
  app.set("trust proxy", 1);

  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: appConfig.sessionTableName,
        createTableIfMissing: true
      }),
      secret: appConfig.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: appConfig.isProduction,
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    })
  );

  app.use((req: RequestWithSession, _res: Response, next: NextFunction) => {
    if (req.session) {
      req.session.cookie ??= {} as RequestWithSession["session"]["cookie"];
    }
    next();
  });

  app.enableCors({
    origin: true,
    credentials: true
  });

  app.useGlobalFilters(new ApiExceptionFilter());

  await app.listen(port);
}

bootstrap();
