/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly HUME_API_KEY?: string
  readonly HUME_API_SECRET?: string
  readonly HUME_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

