import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapPin } from 'lucide-react'
import { db, type Marcacao } from '../db'
import { dataHora } from '../usuario'

function Miniatura({ m }: { m: Marcacao }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!m.imagem) return
    const u = URL.createObjectURL(m.imagem)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [m.imagem])
  const [aberta, setAberta] = useState(false)
  if (!url) return <span />
  return (
    <>
      <img src={url} alt="Projeto marcado" onClick={() => setAberta(true)} />
      {aberta && <div className="visor" onClick={() => setAberta(false)}><img src={url} alt="Projeto marcado" /></div>}
    </>
  )
}

// Resumo dos pontos marcados nos projetos durante a vistoria
export default function MarcacoesVistoria({ vistoriaId, onAbrir }: { vistoriaId: string; onAbrir: () => void }) {
  const marcacoes = useLiveQuery(() => db.marcacoes.where('vistoriaId').equals(vistoriaId).toArray(), [vistoriaId])
  const projetos = useLiveQuery(() => db.projetos.toArray(), [])
  if (!marcacoes || !projetos || marcacoes.length === 0) return null
  const ordenadas = [...marcacoes].sort((a, b) => Math.min(...a.pontos.map(p => p.n), 999) - Math.min(...b.pontos.map(p => p.n), 999))
  return (
    <section className="painel">
      <div className="painel-titulo"><MapPin size={18} /><h3>Marcações nos projetos</h3>
        <button className="link" style={{ marginLeft: 'auto' }} onClick={onAbrir}>Abrir projetos</button>
      </div>
      <div className="marcacoes-vistoria">
        {ordenadas.map(m => {
          const p = projetos.find(x => x.id === m.projetoId)
          return (
            <div key={m.id} className="marcacao">
              <Miniatura m={m} />
              <div>
                <strong>{p?.nome ?? 'Projeto excluído'} · pág. {m.pagina}</strong>
                <span className="sub">Salvo por {m.atualizadoPor} em {dataHora(m.atualizadoEm)}</span>
                <ol>
                  {[...m.pontos].sort((a, b) => a.n - b.n).map(pt => (
                    <li key={pt.n}><span className="pino estatico">{pt.n}</span>{pt.descricao}</li>
                  ))}
                  {m.tracos.length > 0 && <li className="sub">{m.tracos.length} desenho{m.tracos.length > 1 ? 's' : ''} à mão</li>}
                </ol>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
