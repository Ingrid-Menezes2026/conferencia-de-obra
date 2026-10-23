import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Building2, CalendarClock, ClipboardCheck, ClipboardList, MapPin, Plus, Search, TriangleAlert, X } from 'lucide-react'
import { db, novoId } from '../db'
import { ir } from '../rota'
import { dataHora, useUsuario } from '../usuario'
import { atrasada } from '../componentes/ListaPendencias'

export default function Inicio() {
  const usuario = useUsuario()
  const obras = useLiveQuery(() => db.obras.orderBy('criadaEm').reverse().toArray(), [])
  const vistorias = useLiveQuery(() => db.vistorias.toArray(), [])
  const abertas = useLiveQuery(() => db.pendencias.where('status').equals('aberta').toArray(), [])
  const [criando, setCriando] = useState(false)
  const [busca, setBusca] = useState('')

  if (!obras || !vistorias || !abertas) return null
  const emAndamento = vistorias.filter(v => !v.finalizada).length
  const atrasadas = abertas.filter(atrasada).length
  const termo = busca.trim().toLowerCase()
  const lista = obras.filter(o => !termo || [o.nome, o.endereco, o.cliente].some(t => t.toLowerCase().includes(termo)))
  const primeiroNome = usuario.split(' ')[0]

  return (
    <>
      <div className="cabecalho">
        <div>
          <p className="eyebrow">Olá, {primeiroNome}</p>
          <h1>Suas obras</h1>
        </div>
        <button className="primario" onClick={() => setCriando(true)}><Plus size={18} />Nova obra</button>
      </div>

      <div className="indicadores">
        <div className="indicador"><div className="rotulo"><Building2 size={15} />Obras</div><div className="valor">{obras.length}</div></div>
        <div className="indicador"><div className="rotulo"><ClipboardCheck size={15} />Em andamento</div><div className="valor">{emAndamento}</div></div>
        <div className="indicador"><div className="rotulo"><ClipboardList size={15} />Pendências</div><div className="valor">{abertas.length}</div></div>
        <div className={`indicador ${atrasadas ? 'alerta' : ''}`}><div className="rotulo"><TriangleAlert size={15} />Atrasadas</div><div className="valor">{atrasadas}</div></div>
      </div>

      {criando && <FormObra onFechar={() => setCriando(false)} />}

      <div className="titulo-linha">
        <h2>Obras <span className="contador">{obras.length}</span></h2>
      </div>
      {obras.length > 3 && (
        <div className="busca">
          <Search size={17} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, endereço ou cliente" />
        </div>
      )}

      {obras.length === 0 && !criando && (
        <div className="vazio">
          <Building2 size={36} />
          <p><b>Nenhuma obra cadastrada ainda</b></p>
          <p>Cadastre a primeira obra para começar. Tudo fica salvo no aparelho e funciona sem internet.</p>
          <button className="primario" onClick={() => setCriando(true)}><Plus size={18} />Cadastrar obra</button>
        </div>
      )}

      <ul className="grade">
        {lista.map(o => {
          const n = abertas.filter(p => p.obraId === o.id).length
          const vs = vistorias.filter(v => v.obraId === o.id)
          const ultima = vs.sort((a, b) => b.data - a.data)[0]
          return (
            <li key={o.id}>
              <a href={`#/obra/${o.id}`} className="cartao">
                <div className="cartao-topo">
                  <span className="cartao-icone"><Building2 size={20} /></span>
                  <div>
                    <strong>{o.nome}</strong>
                    <span className="linha-info"><MapPin size={13} />{o.endereco || 'Sem endereço'}</span>
                    {o.cliente && <span className="sub">{o.cliente}</span>}
                  </div>
                </div>
                <div className="cartao-rodape">
                  <span className="selo">{vs.length} vistoria{vs.length === 1 ? '' : 's'}</span>
                  {n > 0 ? <span className="selo nc">{n} pendência{n > 1 ? 's' : ''}</span> : <span className="selo ok">Sem pendências</span>}
                  {ultima && <span className="linha-info" style={{ margin: 0 }}><CalendarClock size={13} />{dataHora(ultima.data)}</span>}
                </div>
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
  const campo = (k: keyof typeof f, rotulo: string, ph = '') => (
    <label>
      {rotulo}
      <input value={f[k]} placeholder={ph} onChange={e => setF({ ...f, [k]: e.target.value })} />
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
      <div className="painel-titulo">
        <h2>Nova obra</h2>
        <button type="button" className="link" style={{ marginLeft: 'auto' }} onClick={onFechar} aria-label="Fechar"><X size={18} /></button>
      </div>
      {campo('nome', 'Nome da obra *', 'Ex.: Residencial Jardim das Flores')}
      {campo('endereco', 'Endereço', 'Rua, número, cidade')}
      <div className="duas">
        {campo('cliente', 'Cliente')}
        {campo('responsavel', 'Responsável técnico')}
      </div>
      <div className="acoes">
        <button type="button" onClick={onFechar}>Cancelar</button>
        <button className="primario" disabled={!f.nome.trim()}>Cadastrar obra</button>
      </div>
    </form>
  )
}
