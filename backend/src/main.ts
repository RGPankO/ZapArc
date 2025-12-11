import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());

  // CORS
  app.enableCors();

  // Global validation pipe (minimal validation as requested)
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Enable shutdown hooks for graceful shutdown (required for Prisma)
  app.enableShutdownHooks();

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.NODE_ENV === 'production' ? 'localhost' : '0.0.0.0';

  await app.listen(PORT, HOST);

  logger.log(`Server is running on ${HOST}:${PORT}`);
  logger.log(`Health check available at http://localhost:${PORT}/api/health`);

  if (HOST === '0.0.0.0') {
    const os = await import('os');
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
      const addresses = networkInterfaces[interfaceName];
      for (const address of addresses || []) {
        if (address.family === 'IPv4' && !address.internal && address.address.startsWith('192.168.')) {
          logger.log(`Server also accessible on network at http://${address.address}:${PORT}`);
          break;
        }
      }
    }
  }
}

bootstrap();
