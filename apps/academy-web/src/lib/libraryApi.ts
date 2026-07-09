import { ApiError, apiBaseUrl, storedToken } from "./academyAuth";

export type LibraryResourceKind = "document" | "external_embed";
export type LibraryVisibility = "private" | "cohort" | "academy";
export type LibraryDocumentMime =
  | "application/pdf"
  | "application/epub+zip"
  | "text/plain"
  | "text/markdown";

export interface LibraryDocumentMeta {
  file_name: string;
  mime_type: LibraryDocumentMime;
  size_bytes: number;
  content_sha256: string;
}

export interface LibraryEmbedMeta {
  url: string;
  origin: string;
  iframe_sandbox: string;
  iframe_allow: string;
}

export interface LibraryResource {
  id: string;
  kind: LibraryResourceKind;
  title: string;
  description?: string;
  visibility: LibraryVisibility;
  candidate_id?: string;
  cohort?: string;
  tags: string[];
  document?: LibraryDocumentMeta;
  embed?: LibraryEmbedMeta;
  created_at: string;
  updated_at: string;
}

export interface SignedLibraryDocument {
  resource: LibraryResource;
  content_base64: string;
  expires_at: string;
}

async function call<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new ApiError(0, "api_disabled", "No Academy API is configured");
  const token = storedToken();
  if (!token) throw new ApiError(401, "unauthorized", "Please sign in to use your library");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? "GET",
    credentials: "include",
    headers,
    ...(opts.body !== undefined && { body: JSON.stringify(opts.body) }),
  });
  const json = (await res.json().catch(() => null)) as
    | (T & { error?: { code?: string; message?: string } })
    | null;
  if (!res.ok) {
    const error = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, error?.code ?? "error", error?.message ?? "Request failed");
  }
  return json as T;
}

export async function listLibraryResources(): Promise<LibraryResource[]> {
  const res = await call<{ data: LibraryResource[] }>("/v1/academy/library/resources");
  return res.data;
}

export async function getSignedLibraryDocument(resourceId: string): Promise<SignedLibraryDocument> {
  const signed = await call<{ signed_url: string; expires_at: string }>(
    `/v1/academy/library/resources/${encodeURIComponent(resourceId)}/signed-access`,
    { method: "POST" },
  );
  const base = apiBaseUrl();
  const token = storedToken();
  const res = await fetch(`${base}${signed.signed_url}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  const json = (await res.json().catch(() => null)) as
    | (SignedLibraryDocument & { error?: { code?: string; message?: string } })
    | null;
  if (!res.ok) {
    const error = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, error?.code ?? "error", error?.message ?? "Could not open document");
  }
  return json as SignedLibraryDocument;
}

export function contentToObjectUrl(contentBase64: string, mimeType: string): string {
  const bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export function contentToText(contentBase64: string): string {
  const bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
