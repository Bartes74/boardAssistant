import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express, { Express } from 'express';
import { Handler, createServer, proxy } from '@vendia/serverless-express';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';

let cachedServer: Handler | null = null;
let appInstance: INestApplication | null = null;

async function bootstrap(): Promise<Handler> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp: Express = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  await app.init();

  appInstance = app;
  cachedServer = createServer(expressApp);
  return cachedServer;
}

export const handler: Handler = async (event, context) => {
  const server = await bootstrap();
  return proxy(server, event, context, 'PROMISE').promise;
};

export async function closeApp() {
  if (appInstance) {
    await appInstance.close();
    appInstance = null;
    cachedServer = null;
  }
}
