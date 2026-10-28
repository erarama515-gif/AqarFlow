import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health(): Promise<{ status: string; checks: Record<string, string>; ts: string }> {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (err) {
      checks.database = 'fail';
    }
    return {
      status: Object.values(checks).every((s) => s === 'ok') ? 'ok' : 'degraded',
      checks,
      ts: new Date().toISOString(),
    };
  }
}
