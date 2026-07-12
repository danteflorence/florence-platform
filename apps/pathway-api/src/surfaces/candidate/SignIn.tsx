// Candidate sign-in — passwordless email code (C01 full close). Two steps:
// enter your email → enter the 6-digit code Florence emails you. No password
// exists anywhere; the code expires in 10 minutes and locks after 5 attempts.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestSignInCode, verifySignInCode, candidateId } from '../../api'
import { Button, Card, CardHeader, Spinner } from '../../lib/ui'

export default function SignIn() {
  const nav = useNavigate()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = async () => {
    if (!email.includes('@')) { setError('Enter the email you used with Florence.'); return }
    setBusy(true); setError(null)
    try {
      await requestSignInCode(email)
      setStep('code')
    } catch {
      setError('Could not reach the sign-in service. Please try again.')
    } finally { setBusy(false) }
  }

  const verify = async () => {
    setBusy(true); setError(null)
    try {
      const ok = await verifySignInCode(email, code.trim())
      if (ok) {
        nav(`/candidate/${candidateId()}`, { replace: true })
      } else {
        setError('That code didn’t work. Check the 6 digits, or request a new code — codes expire after 10 minutes.')
      }
    } catch {
      setError('Could not reach the sign-in service. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardHeader
          title="Sign in to your pathway"
          subtitle="We’ll email you a one-time code — no password to remember."
        />
        <div className="space-y-4 px-5 py-4">
          {step === 'email' ? (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !busy && void sendCode()}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-florence-500 focus:outline-none focus:ring-1 focus:ring-florence-500"
                />
              </label>
              <Button onClick={() => void sendCode()} disabled={busy}>
                {busy ? <Spinner /> : 'Email me a code'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                If <span className="font-medium">{email}</span> is registered with Florence, a 6-digit code is on its way. It expires in 10 minutes.
              </p>
              <label className="block text-sm font-medium text-slate-700">
                Code
                <input
                  inputMode="numeric"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && !busy && void verify()}
                  placeholder="••••••"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono text-lg tracking-[0.5em] focus:border-florence-500 focus:outline-none focus:ring-1 focus:ring-florence-500"
                />
              </label>
              <Button onClick={() => void verify()} disabled={busy || code.length !== 6}>
                {busy ? <Spinner /> : 'Sign in'}
              </Button>
              <button
                type="button"
                className="block text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                onClick={() => { setStep('email'); setCode('') }}
              >
                Use a different email or request a new code
              </button>
            </>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <p className="text-[11px] text-slate-400">
            Your session is issued by Florence OS sign-in and only unlocks your own records — staff and candidates see different surfaces, and your dossier is never visible to anyone without a role that permits it.
          </p>
        </div>
      </Card>
    </div>
  )
}
