import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Archive } from 'lucide-react'
import { CartaoVistoria } from './ObraTela'

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
    <div className="estreito">
      <div className="cabecalho">
        <div>
          <p className="eyebrow">Histórico</p>
          <h1>Arquivo de vistorias</h1>
          <p className="sub">Vistorias finalizadas ficam guardadas aqui, com data, horário e responsável, e não podem mais ser alteradas.</p>
        </div>
      </div>
      <label>Obra
        <select value={obraId} onChange={e => setObraId(e.target.value)}>
          <option value="">Todas as obras</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </label>
      {lista.length === 0 && <div className="vazio"><Archive size={32} /><p>Nenhuma vistoria arquivada ainda.</p></div>}
      <ul className="lista">
        {lista.map(v => <CartaoVistoria key={v.id} v={v} obraNome={obras.find(o => o.id === v.obraId)?.nome} />)}
      </ul>
    </div>
  )
}
