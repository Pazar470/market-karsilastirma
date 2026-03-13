import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Tekil Prisma örneği — serverless'ta bağlantı sayısını sınırlar.
 * DATABASE_URL'de connection pooler (örn. Supabase pooler :6543) ve
 * ?connect_timeout=10 kullanın. Detay: docs/PERFORMANCE.md
 */
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        // log: ['query'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
