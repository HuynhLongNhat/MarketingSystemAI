
import {
  Injectable,
  OnApplicationShutdown,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { db, pool } from '@workspace/db/node';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  async checkConnection(): Promise<boolean> {
    await db.execute(sql`select 1`);
    return true;
  }

  async onApplicationShutdown(): Promise<void> {
    await pool.end();
  }
}
