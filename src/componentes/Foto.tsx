import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export function useFotoURL(id: string) {
  const foto = useLiveQuery(() => db.fotos.get(id), [id])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!foto) return
    const u = URL.createObjectURL(foto.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [foto])
  return { url, foto }
}

export default function Foto({ id, onExcluir }: { id: string; onExcluir?: () => void }) {
  const { url, foto } = useFotoURL(id)
  const [aberta, setAberta] = useState(false)
  if (!url) return <span className="miniatura carregando" />
  return (
    <>
      <button type="button" className="miniatura" onClick={() => setAberta(true)}>
        <img src={url} alt="Foto do item" />
      </button>
      {aberta && (
        <div className="visor" onClick={() => setAberta(false)}>
          <img src={url} alt="Foto do item" />
          <div className="visor-info" onClick={e => e.stopPropagation()}>
            <span>
              {new Date(foto!.criadaEm).toLocaleString('pt-BR')}
              {foto!.autor && ` · ${foto!.autor}`}
              {foto!.lat != null && ` · ${foto!.lat.toFixed(5)}, ${foto!.lng!.toFixed(5)}`}
            </span>
            {onExcluir && <button className="perigo" onClick={() => { if (confirm('Excluir esta foto?')) { setAberta(false); onExcluir() } }}>Excluir</button>}
            <button onClick={() => setAberta(false)}>Fechar</button>
          </div>
        </div>
      )}
    </>
  )
}
