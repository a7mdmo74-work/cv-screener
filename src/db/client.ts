import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { ensureSqliteDirectory, env } from "@/lib/env";

/** Bump after `prisma generate` so Next.js does not keep a stale client on globalThis. */
const PRISMA_SCHEMA_REVISION = "authentication-v3-user-removal";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRevision: string | undefined;
};

function createPrismaClient(): PrismaClient {
  const sqlitePath = ensureSqliteDirectory(env.DATABASE_URL);
  const adapter = new PrismaBetterSqlite3({ url: `file:${sqlitePath}` });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaRevision === PRISMA_SCHEMA_REVISION
  ) {
    return globalForPrisma.prisma;
  }

  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaRevision = PRISMA_SCHEMA_REVISION;
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();
