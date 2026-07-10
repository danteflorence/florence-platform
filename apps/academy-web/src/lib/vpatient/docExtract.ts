// ───────────────────────────────────────────────────────────────────────────
// Document text extraction for the Scenario Studio. Turns an uploaded
// scenario file (PDF, Word, or plain text) into text the ingest pipeline can
// draft from. The heavy parsers (pdfjs-dist, mammoth) are DYNAMICALLY imported
// so they never touch the main bundle - they load only when an instructor
// actually drops a file in the Studio.
// ───────────────────────────────────────────────────────────────────────────

export interface ExtractResult {
  text: string;
  kind: "pdf" | "docx" | "txt";
  /** Non-fatal notes (e.g. "scanned PDF - little text found"). */
  notes: string[];
}

const MAX_CHARS = 200_000;

async function extractPdf(file: File): Promise<ExtractResult> {
  // pdfjs needs a worker; point it at the bundled worker asset (Vite resolves
  // the ?url import to a hashed file at build time).
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const line = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    parts.push(line);
    if (parts.join("\n").length > MAX_CHARS) break;
  }
  const text = parts.join("\n").slice(0, MAX_CHARS);
  const notes = text.trim().length < 200 ? ["Very little text found - this may be a scanned PDF (image only). Paste the text instead."] : [];
  return { text, kind: "pdf", notes };
}

async function extractDocx(file: File): Promise<ExtractResult> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return { text: value.slice(0, MAX_CHARS), kind: "docx", notes: [] };
}

async function extractTxt(file: File): Promise<ExtractResult> {
  const text = (await file.text()).slice(0, MAX_CHARS);
  return { text, kind: "txt", notes: [] };
}

/** Extract text from a scenario document. Throws on an unsupported type. */
export async function extractDocumentText(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdf(file);
  if (name.endsWith(".docx") || file.type.includes("wordprocessingml")) return extractDocx(file);
  if (name.endsWith(".txt") || file.type.startsWith("text/")) return extractTxt(file);
  // .doc (legacy binary Word) is not supported by mammoth's raw extractor.
  if (name.endsWith(".doc")) throw new Error("Legacy .doc isn't supported - save it as .docx or paste the text.");
  throw new Error("Unsupported file. Upload a PDF, .docx, or .txt - or paste the text.");
}
