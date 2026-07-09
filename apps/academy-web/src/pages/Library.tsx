import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, isApiConfigured, storedToken } from "../lib/academyAuth";
import {
  contentToObjectUrl,
  contentToText,
  getSignedLibraryDocument,
  listLibraryResources,
  type LibraryResource,
} from "../lib/libraryApi";

type PreviewState = {
  resource: LibraryResource;
  text?: string;
  objectUrl?: string;
  expiresAt?: string;
};

export default function Library() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const canUseLibraryApi = isApiConfigured() && Boolean(storedToken());

  useEffect(() => {
    if (!canUseLibraryApi) return;
    let active = true;
    setError("");
    listLibraryResources()
      .then((data) => {
        if (active) setResources(data);
      })
      .catch((err) => {
        if (active) setError(messageFromError(err));
      });
    return () => {
      active = false;
    };
  }, [canUseLibraryApi]);

  useEffect(() => {
    return () => {
      if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    };
  }, [preview?.objectUrl]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter((resource) =>
      [
        resource.title,
        resource.description ?? "",
        resource.document?.file_name ?? "",
        resource.embed?.origin ?? "",
        resource.tags.join(" "),
      ].join(" ").toLowerCase().includes(q),
    );
  }, [query, resources]);

  async function openResource(resource: LibraryResource) {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    setError("");
    if (resource.kind === "external_embed") {
      setPreview({ resource });
      return;
    }
    if (!resource.document) return;
    setStatus("Opening document...");
    try {
      const signed = await getSignedLibraryDocument(resource.id);
      const mime = signed.resource.document?.mime_type ?? resource.document.mime_type;
      const next: PreviewState = {
        resource: signed.resource,
        expiresAt: signed.expires_at,
      };
      if (mime === "text/plain" || mime === "text/markdown") {
        next.text = contentToText(signed.content_base64);
      } else {
        next.objectUrl = contentToObjectUrl(signed.content_base64, mime);
      }
      setPreview(next);
      setStatus("");
    } catch (err) {
      setStatus("");
      setError(messageFromError(err));
    }
  }

  return (
    <div>
      <section className="border-b border-florence-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-sm font-medium text-florence-slate">Florence Academy Library</p>
              <h1 className="mt-1 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
                PDF study resources and interactive clinical visuals.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-florence-slate sm:text-base">
                Open Academy-published PDFs, class handouts, and approved interactive resources alongside your tutor and practice work.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#resources"
                  className="rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
                >
                  Browse resources
                </a>
                <Link
                  to="/academy/tutor"
                  className="rounded-xl border border-florence-line bg-white px-5 py-3 text-sm font-semibold text-florence-ink hover:bg-florence-mist"
                >
                  Open tutor
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-florence-line bg-florence-mist p-4">
              <p className="text-sm font-medium text-florence-slate">Library status</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Resources" value={String(resources.length)} />
                <Stat label="PDFs" value={String(resources.filter((r) => r.document?.mime_type === "application/pdf").length)} />
                <Stat label="Interactive" value={String(resources.filter((r) => r.kind === "external_embed").length)} />
              </div>
              <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm leading-6 text-florence-slate">
                Academy admins publish and update the library. Students can read assigned resources but cannot upload files here.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="resources" className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Study Library</h2>
            <p className="mt-1 text-sm text-florence-slate">
              {filtered.length} resources shown
            </p>
          </div>
          <label className="w-full md:w-80">
            <span className="sr-only">Search library resources</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="fl-input"
              placeholder="Search PDFs, topics, or visuals"
            />
          </label>
        </div>

        {!canUseLibraryApi && (
          <div className="mt-6 rounded-2xl border border-florence-line bg-florence-mist p-5 text-sm leading-6 text-florence-slate">
            Sign in to view Academy library resources.
          </div>
        )}

        {(status || error) && (
          <div
            className={`mt-6 rounded-xl border p-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-florence-line bg-florence-teal-soft text-florence-teal-dark"
            }`}
          >
            {error || status}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} onOpen={openResource} />
          ))}
          {canUseLibraryApi && filtered.length === 0 && (
            <div className="rounded-2xl border border-florence-line bg-florence-mist p-5 text-sm leading-6 text-florence-slate">
              No library resources are published for your account yet.
            </div>
          )}
        </div>

        {preview && <LibraryPreview preview={preview} />}
      </section>
    </div>
  );
}

function ResourceCard({
  resource,
  onOpen,
}: {
  resource: LibraryResource;
  onOpen: (resource: LibraryResource) => void | Promise<void>;
}) {
  const meta =
    resource.kind === "document"
      ? `${resource.document?.mime_type ?? "document"}, ${formatBytes(resource.document?.size_bytes ?? 0)}`
      : resource.embed?.origin ?? "interactive resource";
  return (
    <article className="flex h-full flex-col rounded-2xl border border-florence-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-snug text-florence-ink">{resource.title}</h3>
          <p className="mt-1 text-xs text-florence-slate">{meta}</p>
        </div>
        <span className="shrink-0 rounded-full bg-florence-mist px-2 py-1 text-xs font-semibold text-florence-slate">
          {resource.visibility === "cohort" ? "Class" : resource.visibility === "academy" ? "Academy" : "Assigned"}
        </span>
      </div>
      {resource.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-florence-slate">{resource.description}</p>
      )}
      {resource.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {resource.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-florence-mist px-2 py-1 text-xs text-florence-slate">
              {tag}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => void onOpen(resource)}
        className="mt-auto w-full rounded-xl bg-florence-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark"
      >
        Open
      </button>
    </article>
  );
}

function LibraryPreview({ preview }: { preview: PreviewState }) {
  const resource = preview.resource;
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-florence-line bg-florence-mist">
      <div className="border-b border-florence-line bg-white p-4">
        <h3 className="text-lg font-semibold text-florence-ink">{resource.title}</h3>
        <p className="mt-1 text-sm text-florence-slate">
          {resource.kind === "document" ? resource.document?.file_name : resource.embed?.origin}
        </p>
      </div>
      {resource.kind === "external_embed" && resource.embed ? (
        <iframe
          title={resource.title}
          src={resource.embed.url}
          sandbox={resource.embed.iframe_sandbox}
          allow={resource.embed.iframe_allow}
          className="h-[620px] w-full bg-white"
        />
      ) : preview.text !== undefined ? (
        <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap p-5 text-sm leading-6 text-florence-ink">
          {preview.text}
        </pre>
      ) : preview.objectUrl && resource.document?.mime_type === "application/pdf" ? (
        <iframe title={resource.title} src={preview.objectUrl} className="h-[620px] w-full bg-white" />
      ) : preview.objectUrl ? (
        <div className="p-5">
          <a
            href={preview.objectUrl}
            download={resource.document?.file_name ?? resource.title}
            className="inline-flex rounded-xl bg-florence-indigo px-4 py-3 text-sm font-semibold text-white"
          >
            Open file
          </a>
        </div>
      ) : null}
      {preview.expiresAt && (
        <p className="border-t border-florence-line bg-white px-4 py-3 text-xs text-florence-slate">
          This secure view refreshes when you reopen the document.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xl font-semibold text-florence-ink">{value}</p>
      <p className="mt-0.5 text-xs text-florence-slate">{label}</p>
    </div>
  );
}

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function formatBytes(value: number): string {
  if (!value) return "0 KB";
  if (value < 1024) return `${value} B`;
  return `${Math.round(value / 1024)} KB`;
}
