// ============================================================================
// Resume / packet PDF — the document that actually rides into an employer ATS.
// Zero-dependency PDF writer (standard Helvetica fonts, Letter pages): every
// ATS effectively requires a resume file on a candidate, and a text-based PDF
// parses cleanly in ATS resume parsers. Content comes from the packet's
// DATA-MINIMIZED view (sharedFields + passport summary) — never from withheld
// fields — so the document obeys the same compliance wall as the packet.
// ============================================================================
import type { ApplicationPacket, FlorenceCandidate, JobRequisition } from '../shared/types'

const PAGE_W = 612 // Letter
const PAGE_H = 792
const MARGIN = 54
const LINE = 14

interface Line {
  text: string
  size: number
  bold: boolean
  gap?: number // extra space BEFORE this line
}

/** Escape + latin1-fold a string for a PDF literal string (WinAnsi-ish). */
function esc(s: string): string {
  let out = ''
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 63
    if (ch === '\\' || ch === '(' || ch === ')') out += `\\${ch}`
    else if (c >= 32 && c <= 126) out += ch
    else if (c > 126 && c <= 255) out += `\\${c.toString(8).padStart(3, '0')}`
    else out += '?'
  }
  return out
}

/** Rough width estimate for Helvetica (avg glyph ≈ 0.5em) — good enough to wrap. */
function wrap(text: string, size: number, maxWidth: number): string[] {
  const perChar = size * 0.5
  const maxChars = Math.max(16, Math.floor(maxWidth / perChar))
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

/** Assemble the PDF byte stream from laid-out lines. */
function renderPdf(lines: Line[]): Buffer {
  // Paginate.
  const pages: Line[][] = []
  let page: Line[] = []
  let y = PAGE_H - MARGIN
  for (const l of lines) {
    y -= (l.gap ?? 0) + LINE * (l.size > 12 ? 1.4 : 1)
    if (y < MARGIN + LINE) {
      pages.push(page)
      page = []
      y = PAGE_H - MARGIN - LINE
    }
    page.push({ ...l, gap: undefined, _y: y } as Line & { _y: number })
  }
  if (page.length) pages.push(page)

  // Content stream per page.
  const streams = pages.map((pls) => {
    let s = ''
    for (const l of pls as (Line & { _y: number })[]) {
      const font = l.bold ? '/F2' : '/F1'
      s += `BT ${font} ${l.size} Tf 1 0 0 1 ${MARGIN} ${l._y.toFixed(1)} Tm (${esc(l.text)}) Tj ET\n`
    }
    return s
  })

  // Objects: 1 Catalog, 2 Pages, 3 F1, 4 F2, then per page: content(5+2i), page(6+2i).
  const objs: string[] = []
  const pageObjIds = pages.map((_, i) => 6 + i * 2)
  objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`
  objs[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  objs[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
  streams.forEach((s, i) => {
    objs[5 + i * 2] = `<< /Length ${Buffer.byteLength(s, 'latin1')} >>\nstream\n${s}endstream`
    objs[6 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + i * 2} 0 R >>`
  })

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let i = 1; i < objs.length; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1')
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`
  }
  const xrefAt = Buffer.byteLength(pdf, 'latin1')
  const n = objs.length
  pdf += `xref\n0 ${n}\n0000000000 65535 f \n`
  for (let i = 1; i < n; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

/** Generic zero-dep PDF from text blocks — reused by Demand Radar demand briefs. */
export function composePdf(items: { text: string; size?: number; bold?: boolean; gap?: number }[]): Buffer {
  const width = PAGE_W - MARGIN * 2
  const L: Line[] = []
  for (const it of items) {
    const size = it.size ?? 10
    wrap(it.text, size, width).forEach((t, i) => L.push({ text: t, size, bold: it.bold ?? false, gap: i === 0 ? it.gap ?? 0 : 0 }))
  }
  return renderPdf(L)
}

const LABELS: Record<string, string> = {
  fullName: 'Name', email: 'Email', phone: 'Phone', readinessBand: 'Readiness band',
  nclexStatus: 'NCLEX status', licenseStatus: 'License status', specialtyExperience: 'Specialties',
  yearsExperience: 'Years of experience', expectedStartWindow: 'Expected start window',
  targetStates: 'Target states',
}

/** Build the employer-facing resume/packet PDF (data-minimized fields only). */
export function buildResumePdf(args: {
  packet: ApplicationPacket
  candidate?: FlorenceCandidate | null
  requisition?: JobRequisition | null
}): Buffer {
  const { packet, candidate, requisition } = args
  const name = packet.sharedFields['fullName'] ?? candidate?.fullName ?? 'FlorenceRN Candidate'
  const width = PAGE_W - MARGIN * 2
  const L: Line[] = []
  const push = (text: string, size = 10, bold = false, gap = 0) =>
    wrap(text, size, width).forEach((t, i) => L.push({ text: t, size, bold, gap: i === 0 ? gap : 0 }))

  push(name, 18, true)
  push('FlorenceRN verified candidate packet', 10, false, 2)
  if (requisition) push(`For: ${requisition.title} — ${requisition.city ?? ''} ${requisition.state ?? ''} (req ${requisition.atsRequisitionId ?? requisition.id})`, 10, false, 2)

  push('Readiness summary', 12, true, 14)
  push(packet.readinessPassport.shareableSummaryText || 'Readiness summary available on request.', 10, false, 4)
  push(`Credential completeness: ${packet.readinessPassport.credentialCompletenessPct}%  ·  Human QA: ${packet.readinessPassport.humanQaStatus}`, 10, false, 4)

  push('Profile', 12, true, 14)
  const shown = new Set<string>()
  for (const [k, v] of Object.entries(packet.sharedFields)) {
    if (!v || k === 'fullName') continue
    shown.add(k)
    push(`${LABELS[k] ?? k}: ${v}`, 10, false, 2)
  }
  if (!shown.has('specialtyExperience') && candidate?.specialtyExperience?.length)
    push(`${LABELS['specialtyExperience']}: ${candidate.specialtyExperience.join(', ')}`, 10, false, 2)
  if (!shown.has('yearsExperience') && candidate?.yearsExperience != null)
    push(`${LABELS['yearsExperience']}: ${candidate.yearsExperience}`, 10, false, 2)

  if (packet.documents.length) {
    push('Documents in packet', 12, true, 14)
    for (const d of packet.documents) push(`- ${d.label}${d.shareApproved ? '' : ' (pending share approval)'}`, 10, false, 2)
  }

  if (packet.withheldFields.length) {
    push('Compliance note', 12, true, 14)
    push(
      'Certain candidate attributes are deliberately withheld from this packet pre-offer in line with EEO/Title VII guidance. They are available post-offer through FlorenceRN with candidate consent.',
      9, false, 2,
    )
  }

  push(`Packet ${packet.id} · consent ${packet.consentId ?? 'on file'} · generated ${new Date().toISOString().slice(0, 10)} · FlorenceRN ATS Connect`, 8, false, 16)
  return renderPdf(L)
}

export function resumeFilename(packet: ApplicationPacket, candidate?: FlorenceCandidate | null): string {
  const name = (packet.sharedFields['fullName'] ?? candidate?.fullName ?? 'candidate').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
  return `florencern-${name}-${packet.id.slice(0, 8)}.pdf`
}
