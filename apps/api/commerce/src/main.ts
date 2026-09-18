/**
 * Boot. Port 3610 — PLAN.md §13 allocates it, between the desk on 3600 and the
 * MCP server on 3620.
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { apiPort } from './config/env';
import { estateBaseUrl } from './config/estate';

loadEnv({ path: join(__dirname, '..', '..', '..', '..', '.env') });

async function bootstrap(): Promise<void> {
  // Read the estate config BEFORE Nest starts, so a missing or wrong
  // ECOMMERCE_DB_URL is a refusal to boot with a sentence explaining itself,
  // rather than five pools that each fail on their first query.
  estateBaseUrl();

  const app = await NestFactory.create(AppModule, { bodyParser: true });

  // Without this, `onApplicationShutdown` never runs and the five pools are
  // left to the process exiting — which works, until a redeploy leaves
  // connections open against a database that meters them.
  app.enableShutdownHooks();

  const port = apiPort();
  await app.listen(port);
  console.log(`thornbury commerce-api listening on :${port} — five systems, no AI`);
}

bootstrap().catch((error) => {
  console.error('commerce-api failed to start:', error);
  process.exit(1);
});
