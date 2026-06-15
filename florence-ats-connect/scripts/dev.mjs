// Dev launcher: runs the Express API and the Vite dev server together via the
// local toolchain node (nothing needs to be on PATH). Set API_PORT to move both
// the API and the Vite proxy in lockstep (default 8788).
import { spawn } from 'node:child_process'
import process from 'node:process'

const apiPort = process.env.API_PORT ?? '8788'
const env = { ...process.env, PORT: apiPort, API_PORT: apiPort }
const procs = []

function start(name, args) {
  const p = spawn(process.execPath, args, { stdio: 'inherit', env })
  p.on('exit', (code) => {
    console.log(`[dev] ${name} exited (${code}) — shutting down`)
    for (const q of procs) if (q !== p && q.exitCode === null) q.kill('SIGTERM')
    process.exit(code ?? 0)
  })
  procs.push(p)
  return p
}

start('api', ['--experimental-sqlite', '--watch', '--import', 'tsx', 'server/index.ts'])
start('web', ['node_modules/vite/bin/vite.js', '--host'])

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const q of procs) if (q.exitCode === null) q.kill('SIGTERM')
    process.exit(0)
  })
}
