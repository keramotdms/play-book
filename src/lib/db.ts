import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Lazy Prisma client.
 *
 * Constructed only on first ACCESS, never at import time. This matters for
 * production (firebase mode) where DATABASE_URL is intentionally absent:
 * importing this module must not instantiate or connect to anything.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient(
        process.env.NODE_ENV === 'development'
          ? { log: ['query'] }
          : undefined
      )
    }
    const client = globalForPrisma.prisma
    const value = Reflect.get(client as unknown as object, prop)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
