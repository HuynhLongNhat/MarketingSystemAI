
import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { DatabaseService } from './database/database.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'API health check' })
  check() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  @ApiOperation({ summary: 'Database health check' })
  async checkDatabase() {
    try {
      await this.databaseService.checkConnection();

      return {
        status: 'ok',
        database: 'connected',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
      });
    }
  }
}
