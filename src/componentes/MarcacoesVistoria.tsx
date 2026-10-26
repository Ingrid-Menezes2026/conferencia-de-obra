import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, CircleCheck, MapPin } from 'lucide-react'
import { db, type Marcacao, type Ponto } from '../db'
import { salvarFoto } from '../fotos'
import { dataHora, usuarioAtual } from '../usuario'
import Foto from './Foto'

function Miniatura({ m }: { m: Marcacao }) {
  const [url, setUrl] = useState<string>()
  const [aberta, setAberta] = useState(false)
  useEffect(() => {
    if (!m.imagem) return
    const u = URL.createObjectURL(m.imagem)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [m.imagem])
  if (!url) return <span />
  return (
    <>
      <img src={url} alt="Projeto marcado" onClick={() => setAberta(true)} />
      {aberta && <div className="visor" onClick={() => setAberta(false)}><img src={url} alt="Projeto marcado" /></div>}
    </>
  )
}

// Contraprova: foto depois de corrigido. Pode ser feita mesmo com a vistoria arquivada,
// porque a correção acontece depois da visita; fica registrada no histórico.
async function registrarContraprova(m: Marcacao, n: number, arquivos: File[]) {
  const ids: string[] = []
  for (const a of arquivos) ids.push(await salvarFoto(a))
  const por = usuarioAtual()
  const em = Date.now()
  await db.marcacoes.where('id').equals(m.id).modify(reg => {
    const p = reg.pontos.find(x => x.n === n)
    if (!p) return
    p.contraprovas = [...(p.contraprovas ?? []), ...ids]
    p.resolvidoEm ??= em
    p.resolvidoPor ??= por
  })
  const ponto = m.pontos.find(x => x.n === n)
  await db.vistorias.where('id').equals(m.vistoriaId).modify(v => {
    v.historico = [...(v.historico ?? []), { em, por, acao: `Contraprova do ponto ${n}${ponto ? ` (${ponto.descricao})` : ''}: problema resolvido` }]
  })
}

function LinhaPonto({ m, pt }: { m: Marcacao; pt: Ponto }) {
  const camera = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!arquivos.length) return
    setEnviando(true)
    try { await registrarContraprova(m, pt.n, arquivos) } finally { setEnviando(false) }
  }
  return (
    <li className="ponto-vistoria">
      <div className="ponto-linha">
        <span className={`pino estatico ${pt.resolvidoEm ? 'resolvido' : ''}`}>{pt.n}</span>
        <span className="desc">
          <b>{pt.descricao}</b>
          {pt.resolvidoEm
            ? <><span className="selo ok"><CircleCheck size={12} />Resolvido</span><span className="sub">{pt.resolvidoPor} · {dataHora(pt.resolvidoEm)}</span></>
            : <span className="selo nc">Em aberto</span>}
        </span>
        <button className="link" onClick={() => camera.current?.click()} disabled={enviando}>
          <Camera size={16} />{enviando ? 'Salvando…' : 'Contraprova'}
        </button>
        <input ref={camera} type="file" accept="image/*" capture="environment" multiple hidden onChange={escolher} />
      </div>
      <div className="provas">
        <div>
          <span className="rotulo-foto">Prova</span>
          <div className="fotos-ponto">{(pt.provas ?? []).length ? pt.provas!.map(f => <Foto key={f} id={f} />) : <span className="sub">Sem foto</span>}</div>
        </div>
        <div>
          <span className="rotulo-foto ok">Contraprova</span>
          <div className="fotos-ponto">{(pt.contraprovas ?? []).length ? pt.contraprovas!.map(f => <Foto key={f} id={f} />) : <span className="sub">Aguardando correção</span>}</div>
        </div>
      </div>
    </li>
  )
}

// Resumo dos pontos marcados nos projetos durante a vistoria, com prova e contraprova
export default function MarcacoesVistoria({ vistoriaId, onAbrir }: { vistoriaId: string; onAbrir: () => void }) {
  const marcacoes = useLiveQuery(() => db.marcacoes.where('vistoriaId').equals(vistoriaId).toArray(), [vistoriaId])
  const projetos = useLiveQuery(() => db.projetos.toArray(), [])
  if (!marcacoes || !projetos || marcacoes.length === 0) return null
  const ordenadas = [...marcacoes].sort((a, b) => Math.min(999, ...a.pontos.map(p => p.n)) - Math.min(999, ...b.pontos.map(p => p.n)))
  const todos = marcacoes.flatMap(m => m.pontos)
  const resolvidos = todos.filter(p => p.resolvidoEm).length
  return (
    <section className="painel">
      <div className="painel-titulo"><MapPin size={18} /><h3>Marcações nos projetos</h3>
        <button className="link" style={{ marginLeft: 'auto' }} onClick={onAbrir}>Abrir projetos</button>
      </div>
      {todos.length > 0 && <p className="sub" style={{ marginTop: '-.5rem', marginBottom: '.8rem' }}>{resolvidos} de {todos.length} pontos resolvidos (com contraprova)</p>}
      <div className="marcacoes-vistoria">
        {ordenadas.map(m => {
          const p = projetos.find(x => x.id === m.projetoId)
          return (
            <div key={m.id}>
              <div className="marcacao">
                <Miniatura m={m} />
                <div>
                  <strong>{p?.nome ?? 'Projeto excluído'} · pág. {m.pagina}</strong>
                  <span className="sub">Salvo por {m.atualizadoPor} em {dataHora(m.atualizadoEm)}</span>
                  {m.tracos.length > 0 && <span className="sub">{m.tracos.length} desenho{m.tracos.length > 1 ? 's' : ''} à mão</span>}
                </div>
              </div>
              <ol className="pontos-vistoria">
                {[...m.pontos].sort((a, b) => a.n - b.n).map(pt => <LinhaPonto key={pt.n} m={m} pt={pt} />)}
              </ol>
            </div>
          )
        })}
      </div>
    </section>
  )
}
