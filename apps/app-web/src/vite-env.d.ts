/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACADEMY_API_URL?: string;
  readonly VITE_APPLY_URL?: string;
  readonly VITE_CORE_URL?: string;
  readonly VITE_DEMO_NURSE_ID?: string;
  readonly VITE_EMPLOYER_CONNECT_API_URL?: string;
  readonly VITE_LIVE_URL?: string;
  readonly VITE_PATHWAY_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
