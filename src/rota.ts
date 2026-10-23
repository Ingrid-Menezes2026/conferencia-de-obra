import { useEffect, useState } from 'react'

export function useRota() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const f = () => { setHash(location.hash); window.scrollTo(0, 0) }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

export const ir = (caminho: string) => { location.hash = caminho }
