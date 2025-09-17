import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class ExamsStartupCheck implements OnModuleInit {
  async onModuleInit() {
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL es obligatorio en producción');
    }
  }
}
