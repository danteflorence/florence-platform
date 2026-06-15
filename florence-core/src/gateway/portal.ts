// Developer Portal v0 — a SELF-CONTAINED docs page (no external CDN / scripts) served
// at GET /v1/docs. It fetches the public /v1/openapi.json client-side and renders the
// endpoint catalog + scope reference, so partners + our own engineers can explore the
// Platform API contract. v1 (API-key self-service over Core M2M) comes in a later phase.
export function devPortalHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FlorenceRN Platform API — Developer Portal</title>
<style>
  :root { color-scheme: light dark; --fg:#111; --muted:#666; --line:#e3e3e3; --accent:#0b6; --bg:#fff; --chip:#f2f4f7; }
  @media (prefers-color-scheme: dark){ :root{ --fg:#e8e8e8; --muted:#9aa0a6; --line:#2a2d31; --accent:#3ddc97; --bg:#16181c; --chip:#23262b; } }
  * { box-sizing: border-box; }
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; color: var(--fg); background: var(--bg); margin: 0; padding: 2rem; max-width: 920px; margin-inline: auto; }
  h1 { font-size: 1.5rem; margin: 0 0 .25rem; } .sub { color: var(--muted); margin: 0 0 1.5rem; }
  h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 2rem 0 .5rem; }
  .ep { border: 1px solid var(--line); border-radius: 10px; padding: .6rem .8rem; margin: .4rem 0; }
  .ep .m { font-weight: 700; font-family: ui-monospace, monospace; margin-right: .5rem; }
  .GET { color: var(--accent); } .POST { color: #f59e0b; }
  .path { font-family: ui-monospace, monospace; } .summ { color: var(--muted); display: block; margin-top: .2rem; font-size: .92rem; }
  .scope { display: inline-block; background: var(--chip); border-radius: 6px; padding: .1rem .45rem; margin: .15rem .2rem 0 0; font-family: ui-monospace, monospace; font-size: .82rem; }
  code { background: var(--chip); padding: .1rem .3rem; border-radius: 4px; }
  .note { background: var(--chip); border-radius: 8px; padding: .75rem 1rem; font-size: .9rem; color: var(--muted); }
</style>
</head>
<body>
<h1>FlorenceRN Platform API</h1>
<p class="sub">Headless nurse-production platform. The Nurse Passport is the central object (permissioned views); the Production Ledger is the system of record; every workflow is an event. Auth: Core RS256 — <code>fl_session</code> cookie or <code>Authorization: Bearer</code>.</p>
<div class="note">The employer + lender audiences never receive disallowed data: employers never see visa/nationality/financing (Title VII/IRCA); lenders never see national-origin/visa in a credit decision (ECOA/Reg B). Creates accept an <code>Idempotency-Key</code> header. Contract: <a href="/v1/openapi.json">/v1/openapi.json</a>.</div>
<h2>Getting started</h2>
<div class="note">
  <p><b>Base URLs.</b> Sandbox <code>https://sandbox-api.florencern.com/v1</code> (seeded fake data — test here) · Production <code>https://api.florencern.com/v1</code>.</p>
  <p><b>Auth.</b> Machine-to-machine OAuth2: <code>POST https://id.florencern.com/oauth/token</code> with <code>grant_type=client_credentials</code> + your <code>client_id</code>/<code>client_secret</code>, then send <code>Authorization: Bearer &lt;token&gt;</code>. Tokens are scoped to your role; lender keys are org-bound + consent-gated.</p>
  <p><b>Versioning.</b> <code>/v1</code> is stable; breaking changes ship as <code>/v2</code> with a deprecation window. <b>Rate limits</b> are per-principal (<code>429 + Retry-After</code>). Full onboarding package: see <code>docs/partner-onboarding/</code>.</p>
</div>
<h2>Endpoints</h2>
<div id="eps">Loading the contract…</div>
<h2>Scopes</h2>
<div id="scopes"></div>
<script>
(async () => {
  try {
    const spec = await (await fetch('/v1/openapi.json')).json();
    const eps = document.getElementById('eps'); eps.innerHTML = '';
    const paths = spec.paths || {};
    for (const p of Object.keys(paths).sort()) {
      for (const method of Object.keys(paths[p])) {
        const op = paths[p][method];
        const el = document.createElement('div'); el.className = 'ep';
        const m = method.toUpperCase();
        el.innerHTML = '<span class="m ' + m + '">' + m + '</span>' +
          '<span class="path">' + p + '</span>' +
          (op['x-scope'] ? ' <span class="scope">' + op['x-scope'] + '</span>' : '') +
          '<span class="summ">' + (op.summary || '') + '</span>';
        eps.appendChild(el);
      }
    }
    const sc = document.getElementById('scopes'); const xs = spec['x-scopes'] || {};
    for (const s of Object.keys(xs).sort()) { const c = document.createElement('span'); c.className = 'scope'; c.textContent = s; c.title = xs[s]; sc.appendChild(c); }
  } catch (e) { document.getElementById('eps').textContent = 'Failed to load the contract: ' + e; }
})();
</script>
</body>
</html>`;
}
