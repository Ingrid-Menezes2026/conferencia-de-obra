import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { resumo } from '../resumo'
import { dataHora } from '../usuario'

// Todas as vistorias finalizadas, da mais recente para a mais antiga
export default function Arquivo() {
  const vistorias = useLiveQuery(() => db.vistorias.filter(v => v.finalizada).toArray(), [])
  const obras = useLiveQuery(() => db.obras.toArray(), [])
  const [obraId, setObraId] = useState('')

  if (!vistorias || !obras) return null
  const lista = vistorias
    .filter(v => !obraId || v.obraId === obraId)
    .sort((a, b) => (b.finalizadaEm ?? b.data) - (a.finalizadaEm ?? a.data))

  return (
    <>
      <h1>Arquivo de vistorias</h1>
      <p className="sub">Vistorias finalizadas ficam guardadas aqui e não podem mais ser alteradas.</p>
      <label>Obra
        <select value={obraId} onChange={e => setObraId(e.target.value)}>
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </label>
      {lista.length === 0 && <p className="vazio">Nenhuma vistoria arquivada ainda.</p>}
      <ul className="lista">
        {lista.map(v => {
          const r = resumo(v.itens)
          return (
            <li key={v.id}>
              <a href={`#/vistoria/${v.id}`} className="cartao">
                <strong>{v.titulo}</strong>
                <span className="sub">{obras.find(o => o.id === v.obraId)?.nome}</span>
                <span className="sub">Iniciada em {dataHora(v.data)} por {v.criadaPor || v.vistoriador || '—'}</span>
                <span className="sub">Finalizada em {v.finalizadaEm ? dataHora(v.finalizadaEm) : '—'} por {v.finalizadaPor || '—'}</span>
                <span className="barra-resumo">
                  <span className="selo ok">{r.ok} ok</span>
                  <span className="selo nc">{r.nc} não conf.</span>
                  <span className="selo">{r.na} N/A</span>
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </>
  )
}
