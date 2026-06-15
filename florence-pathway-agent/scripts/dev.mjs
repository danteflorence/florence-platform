// Dev launcher: runs the Express API server and the Vite dev server together.
// We invoke binaries via the local toolchain `node` so nothing needs to be on PATH.
import { spawn } from 'node:child_process'
import process from 'node:process'

const procs = []

function start(name, args) {
  const p = spawn(process.execPath, args, { stdio: 'inherit', env: process.env })
  p.on('exit', (code) => {
    console.log(`[dev] ${name} exited (${code}) — shutting down`)
    for (const q of procs) {
      if (q !== p && q.exitCode === null) q.kill('SIGTERM')
    }
    process.exit(code ?? 0)
  })
  procs.push(p)
  return p
}

// API: node:sqlite needs --experimental-sqlite; tsx transpiles the TS server;
// --watch restarts on server-file changes.
start('api', ['--experimental-sqlite', '--watch', '--import', 'tsx', 'server/index.ts'])
// Web: run Vite's bin directly so we don't depend on a PATH entry.
start('web', ['node_modules/vite/bin/vite.js', '--host'])

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const q of procs) if (q.exitCode === null) q.kill('SIGTERM')
    process.exit(0)
  })
}
