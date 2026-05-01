import { PrismaClient } from '@prisma/client'

import { appConfig, isDbConfigured } from '../config.js'

declare global {
  // eslint-disable-next-line no-var
  var __nbaPrisma__: PrismaClient | undefined
}

export function getPrismaClient() {
  if (!isDbConfigured()) return null

  if (!globalThis.__nbaPrisma__) {
    globalThis.__nbaPrisma__ = new PrismaClient({
      datasources: {
        db: {
          url: appConfig.databaseUrl ?? undefined,
        },
      },
    })
  }

  return globalThis.__nbaPrisma__
}
