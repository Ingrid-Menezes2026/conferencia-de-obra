import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import ListaPendencias from '../componentes/ListaPendencias'

export default function Pendencias() {
  const pendencias = useLiveQuery(() => db.pendencias.toArray(), [])
  const obras = useLiveQuery(() => db.obras.toArray(), [])
  if (!pendencias || !obras) return null
  return (
    <>
      <h1>Pendências de todas as obras</h1>
      <ListaPendencias pendencias={pendencias} obras={obras} />
    </>
  )
}
