import { useCallback, useEffect, useState } from 'react'

export interface AsyncState<T> {
  data?: T
  error?: string
  loading: boolean
  reload: () => void
}

/** Minimal data-loading hook with reload. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true })

  const load = useCallback(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: undefined }))
    fn()
      .then((d) => live && setState({ data: d, loading: false }))
      .catch((e) => live && setState({ error: String(e?.message ?? e), loading: false }))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => load(), [load])
  return { ...state, reload: load }
}
