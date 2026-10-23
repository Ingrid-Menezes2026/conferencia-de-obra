import { Layers, Trash2, Upload } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DISCIPLINAS, novoId, type Projeto } from '../db'
import { dataHora, usuarioAtual } from '../usuario'
import { baixar } from '../arquivos'

const VisorPdf = lazy(() => import('./VisorPdf'))

const tamanho = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1).replace('.', ',')} MB` : `${Math.round(b / 1e3)} KB`)

// Lista de projetos da obra. "editavel" mostra o envio e a exclusão.
export default function Projetos({ obraId, editavel = true }: { obraId: string; editavel?: boolean }) {
  const projetos = useLiveQuery(() => db.projetos.where('obraId').equals(obraId).sortBy('criadoEm'), [obraId])
  const [enviando, setEnviando] = useState(false)
  const [aberto, setAberto] = useState<Projeto | null>(null)

  if (!projetos) return null
  const porDisciplina = DISCIPLINAS.map(d => [d, projetos.filter(p => p.disciplina === d)] as const).filter(([, l]) => l.length)

  return (
    <>
      {editavel && (
        <div className="acoes esquerda">
          <button onClick={() => setEnviando(true)}><Upload size={17} />Enviar projeto</button>
        </div>
      )}
      {enviando && <FormProjeto obraId={obraId} onFechar={() => setEnviando(false)} />}
      {projetos.length === 0 && !enviando && <div className="vazio"><Layers size={30} /><p>Nenhum projeto cadastrado. Envie as pranchas em PDF ou DWG para consultar durante as vistorias.</p></div>}
      {porDisciplina.map(([d, lista]) => (
        <div key={d}>
          <h4 className="disciplina">{d}</h4>
          <ul className="lista">
            {lista.map(p => (
              <li key={p.id} className="cartao projeto">
                <button className="projeto-abrir" onClick={() => (p.formato === 'pdf' ? setAberto(p) : baixar(p))}>
                  <span className={`formato ${p.formato}`}>{p.formato.toUpperCase()}</span>
                  <span>
                    <strong>{p.nome}{p.revisao && ` · Rev. ${p.revisao}`}</strong>
                    <span className="sub">{p.nomeArquivo} · {tamanho(p.tamanho)}</span>
                    <span className="sub">Enviado por {p.enviadoPor || '—'} em {dataHora(p.criadoEm)}</span>
                  </span>
                </button>
                {editavel && (
                  <button className="link perigo" title="Excluir projeto" onClick={() => confirm(`Excluir o projeto "${p.nome}"?`) && db.projetos.delete(p.id)}><Trash2 size={17} /></button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {projetos.some(p => p.formato === 'dwg') && (
        <p className="sub">Arquivos DWG são baixados para abrir em um visualizador de CAD. A visualização direta no app vem junto com a análise automática.</p>
      )}
      {aberto && (
        <Suspense fallback={<div className="visor"><p className="visor-info">Abrindo projeto…</p></div>}>
          <VisorPdf projeto={aberto} onFechar={() => setAberto(null)} />
        </Suspense>
      )}
    </>
  )
}

function FormProjeto({ obraId, onFechar }: { obraId: string; onFechar: () => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [nome, setNome] = useState('')
  const [disciplina, setDisciplina] = useState<string>('Arquitetônico')
  const [revisao, setRevisao] = useState('')
  const [erro, setErro] = useState('')

  function escolher(f: File | undefined) {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'dwg') { setErro('Envie um arquivo PDF ou DWG.'); return }
    setErro('')
    setArquivo(f)
    if (!nome) setNome(f.name.replace(/\.(pdf|dwg)$/i, ''))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivo) return
    const formato = arquivo.name.toLowerCase().endsWith('.dwg') ? 'dwg' : 'pdf'
    await db.projetos.add({
      id: novoId(), obraId, nome: nome.trim() || arquivo.name, disciplina, revisao: revisao.trim(), formato,
      nomeArquivo: arquivo.name, arquivo, tamanho: arquivo.size, criadoEm: Date.now(), enviadoPor: usuarioAtual()
    })
    onFechar()
  }

  return (
    <form className="painel" onSubmit={salvar}>
      <div className="painel-titulo"><h3>Enviar projeto</h3></div>
      <label>Arquivo (PDF ou DWG)
        <input type="file" accept=".pdf,.dwg,application/pdf" onChange={e => escolher(e.target.files?.[0])} />
      </label>
      {erro && <p className="aviso">{erro}</p>}
      <label>Nome do projeto<input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Planta baixa térreo" /></label>
      <div className="duas">
        <label>Disciplina
          <select value={disciplina} onChange={e => setDisciplina(e.target.value)}>
            {DISCIPLINAS.map(d => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label>Revisão<input value={revisao} onChange={e => setRevisao(e.target.value)} placeholder="Ex.: R02" /></label>
      </div>
      <div className="acoes">
        <button type="button" onClick={onFechar}>Cancelar</button>
        <button className="primario" disabled={!arquivo}>Salvar projeto</button>
      </div>
    </form>
  )
}
