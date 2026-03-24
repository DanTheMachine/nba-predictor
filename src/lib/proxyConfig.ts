const DEFAULT_PROXY_BASE_URL = 'http://localhost:3002'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export const PROXY_BASE_URL = trimTrailingSlash(import.meta.env.VITE_PROXY_BASE_URL || DEFAULT_PROXY_BASE_URL)
export const PROXY_URL = `${PROXY_BASE_URL}/proxy?url=`
