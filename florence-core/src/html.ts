// Tiny server-rendered pages (sign-in + admin console). No framework — Core is
// zero-dep and these surfaces are simple. Mirrors the role/territory assignment
// UX of labor-economics-agent/rbac.py:streamlit_admin_panel as plain forms.

import type { Org, RoleGrant, User } from "./store.ts";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

const SHELL = (title: string, body: string): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  :root{--teal:#067F7B;--ink:#101828;--muted:#475467;--line:#E4E7EC;--bg:#F8FAFB}
  *{box-sizing:border-box} body{margin:0;font:15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg)}
  a{color:var(--teal)} .wrap{max-width:920px;margin:40px auto;padding:0 20px}
  .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px;margin:0 0 20px}
  .brand{font:700 26px/1 "Playfair Display",Georgia,serif;color:var(--teal)}
  h1{font-size:20px;margin:.2em 0 .6em} h2{font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:0 0 12px}
  label{display:block;font-size:13px;color:var(--muted);margin:10px 0 4px}
  input,select{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:14px}
  button{margin-top:14px;background:var(--teal);color:#fff;border:0;border-radius:10px;padding:11px 16px;font-weight:600;cursor:pointer;width:100%}
  .btn-google{display:block;text-align:center;background:#fff;color:var(--ink);border:1px solid var(--line);padding:11px 16px;border-radius:10px;font-weight:600;text-decoration:none}
  .muted{color:var(--muted);font-size:13px} .err{background:#FEF3F2;color:#B42318;border:1px solid #FECDCA;border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13px}
  .ok{background:#ECFDF3;color:#067647;border:1px solid #ABEFC6;border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:13px} th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)} th{color:var(--muted);font-weight:600}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px} .row{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px} .hr{height:1px;background:var(--line);margin:18px 0}
  .pill{display:inline-block;background:#F2F4F7;border-radius:999px;padding:2px 8px;font-size:12px;margin:0 4px 2px 0}
</style></head><body><div class="wrap">${body}</div></body></html>`;

export function loginPage(opts: { redirect: string; googleEnabled: boolean; error?: string; allowedDomain?: string }): string {
  const r = escapeHtml(opts.redirect);
  const google = opts.googleEnabled
    ? `<a class="btn-google" href="/auth/google/start?redirect=${encodeURIComponent(opts.redirect)}">Sign in with Google</a>
       <div class="muted" style="text-align:center;margin:10px 0">Florence staff (${escapeHtml(opts.allowedDomain ?? "florenceeducation.com")})</div>
       <div class="hr"></div>`
    : `<div class="muted" style="margin-bottom:10px">Google sign-in is not configured on this instance; use email + password.</div>`;
  return SHELL(
    "Sign in · FlorenceRN",
    `<div class="card" style="max-width:440px;margin:60px auto">
      <div class="brand">Florence</div>
      <h1>Sign in to FlorenceRN</h1>
      ${opts.error ? `<div class="err">${escapeHtml(opts.error)}</div>` : ""}
      ${google}
      <form method="post" action="/auth/password">
        <input type="hidden" name="redirect" value="${r}"/>
        <label>Email</label><input type="email" name="email" required autocomplete="username"/>
        <label>Password</label><input type="password" name="password" required autocomplete="current-password"/>
        <button type="submit">Sign in</button>
      </form>
      <div class="muted" style="margin-top:14px">After sign-in you'll return to your app. One login works across Academy, Pathway, ATS Connect, and Pricing.</div>
    </div>`,
  );
}

export interface AdminData {
  me: { email: string; role: string };
  users: Array<{ user: User; roles: string[] }>;
  orgs: Org[];
  grants: RoleGrant[];
  roles: readonly string[];
  notice?: string;
}

export function adminPage(d: AdminData): string {
  const userOptions = d.users.map((u) => `<option value="${escapeHtml(u.user.id)}">${escapeHtml(u.user.email)}</option>`).join("");
  const orgOptions = `<option value="">— none (global staff) —</option>` +
    d.orgs.map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)} (${o.kind})</option>`).join("");
  const roleOptions = d.roles.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");
  const userRows = d.users
    .map(
      (u) =>
        `<tr><td>${escapeHtml(u.user.email)}</td><td>${escapeHtml(u.user.name ?? "")}</td><td>${
          u.roles.map((r) => `<span class="pill">${escapeHtml(r)}</span>`).join("") || '<span class="muted">no role</span>'
        }</td></tr>`,
    )
    .join("");
  const orgRows = d.orgs
    .map((o) => `<tr><td>${escapeHtml(o.name)}</td><td>${o.kind}</td><td>${escapeHtml(o.external_ref ?? "")}</td></tr>`)
    .join("");

  return SHELL(
    "Admin · FlorenceRN Core",
    `<div class="card">
      <div class="brand">Florence Core</div>
      <h1>Identity admin</h1>
      <div class="muted">Signed in as ${escapeHtml(d.me.email)} · ${escapeHtml(d.me.role)} · <a href="/logout-link">sign out</a></div>
      ${d.notice ? `<div class="ok">${escapeHtml(d.notice)}</div>` : ""}
    </div>
    <div class="grid">
      <div class="card">
        <h2>Users</h2>
        <table><tr><th>Email</th><th>Name</th><th>Roles</th></tr>${userRows || '<tr><td colspan="3" class="muted">none yet</td></tr>'}</table>
      </div>
      <div class="card">
        <h2>Orgs</h2>
        <table><tr><th>Name</th><th>Kind</th><th>External ref</th></tr>${orgRows || '<tr><td colspan="3" class="muted">none yet</td></tr>'}</table>
      </div>
    </div>
    <div class="card">
      <h2>Grant a role</h2>
      <form method="post" action="/admin/grant">
        <div class="row">
          <div><label>User</label><select name="userId" required>${userOptions}</select></div>
          <div><label>Role</label><select name="role" required>${roleOptions}</select></div>
          <div><label>Org (employer/university)</label><select name="orgId">${orgOptions}</select></div>
        </div>
        <label>Territory (rep only, e.g. CA,NV or ALL)</label><input name="territory" placeholder="ALL"/>
        <button type="submit">Grant role</button>
      </form>
    </div>
    <div class="grid">
      <div class="card">
        <h2>Create external user</h2>
        <form method="post" action="/admin/users">
          <label>Email</label><input type="email" name="email" required/>
          <label>Name</label><input name="name"/>
          <label>Temporary password</label><input name="password" required/>
          <button type="submit">Create user</button>
        </form>
        <div class="muted" style="margin-top:8px">For employers / universities / nurses who don't sign in with Google. Grant them a role above.</div>
      </div>
      <div class="card">
        <h2>Create org</h2>
        <form method="post" action="/admin/org">
          <label>Kind</label><select name="kind"><option value="employer">employer</option><option value="university">university</option><option value="lender">lender</option><option value="internal">internal</option></select>
          <label>Name</label><input name="name" required/>
          <label>External ref <span class="muted">(ATS employerId / school slug)</span></label><input name="externalRef"/>
          <button type="submit">Create org</button>
        </form>
      </div>
    </div>`,
  );
}
