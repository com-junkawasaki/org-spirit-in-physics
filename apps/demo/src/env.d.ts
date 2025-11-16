/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly HUME_API_KEY?: string
  readonly HUME_API_SECRET?: string
  readonly HUME_API?: string
  // Allow any other environment variables from docker-compose
  readonly [key: string]: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

