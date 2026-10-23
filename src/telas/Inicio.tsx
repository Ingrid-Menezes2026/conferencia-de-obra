import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, novoId } from '../db'
import { ir } from '../rota'

export default function Inicio() {
  const obras = useLiveQuery(() => db.obras.orderBy('criadaEm').reverse().toArray(), [])
  const abertas = useLiveQuery(() => db.pendencias.where('status').equals('aberta').toArray(), [])
  const [criando, setCriando] = useState(false)

  if (!obras) return null
  return (
    <>
      <div className="titulo-linha">
        <h1>Obras</h1>
        <button className="primario" onClick={() => setCriando(true)}>+ Nova obra</button>
      </div>

      {criando && <FormObra onFechar={() => setCriando(false)} />}

      {obras.length === 0 && !criando && (
        <div className="vazio">
          <p>Nenhuma obra cadastrada ainda.</p>
          <p>Comece cadastrando a primeira obra. Tudo fica salvo no aparelho e funciona sem internet.</p>
        </div>
      )}

      <ul className="lista">
        {obras.map(o => {
          const n = abertas?.filter(p => p.obraId === o.id).length ?? 0
          return (
            <li key={o.id}>
              <a href={`#/obra/${o.id}`} className="cartao">
                <strong>{o.nome}</strong>
                <span className="sub">{o.endereco || 'Sem endereço'}</span>
                <span className="sub">{o.cliente && `Cliente: ${o.cliente}`}</span>
                {n > 0 && <span className="selo nc">{n} pendência{n > 1 ? 's' : ''}</span>}
              </a>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function FormObra({ onFechar }: { onFechar: () => void }) {
  const [f, setF] = useState({ nome: '', endereco: '', cliente: '', responsavel: '' })
  const campo = (k: keyof typeof f, rotulo: string) => (
    <label>
      {rotulo}
      <input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />
    </label>
  )
  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) return
    const id = novoId()
    await db.obras.add({ id, ...f, criadaEm: Date.now() })
    ir(`/obra/${id}`)
  }
  return (
    <form className="painel" onSubmit={salvar}>
      <h2>Nova obra</h2>
      {campo('nome', 'Nome da obra *')}
      {campo('endereco', 'Endereço')}
      {campo('cliente', 'Cliente')}
      {campo('responsavel', 'Responsável técnico')}
      <div className="acoes">
        <button type="button" onClick={onFechar}>Cancelar</button>
        <button className="primario" disabled={!f.nome.trim()}>Salvar</button>
      </div>
    </form>
  )
}
