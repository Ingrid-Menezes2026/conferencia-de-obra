import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import ListaPendencias from '../componentes/ListaPendencias'

export default function Pendencias() {
  const pendencias = useLiveQuery(() => db.pendencias.toArray(), [])
  const obras = useLiveQuery(() => db.obras.toArray(), [])
  if (!pendencias || !obras) return null
  return (
    <div className="estreito">
      <div className="cabecalho">
        <div>
          <p className="eyebrow">Acompanhamento</p>
          <h1>Pendências</h1>
          <p className="sub">Correções abertas em todas as obras, ordenadas pelo prazo.</p>
        </div>
      </div>
      <ListaPendencias pendencias={pendencias} obras={obras} />
    </div>
  )
}
