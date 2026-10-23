import { useState } from 'react'
import { Archive, Building2, ClipboardList, LogOut } from 'lucide-react'
import { useRota } from './rota'
import { definirUsuario, useUsuario } from './usuario'
import Inicio from './telas/Inicio'
import ObraTela from './telas/ObraTela'
import VistoriaTela from './telas/VistoriaTela'
import Pendencias from './telas/Pendencias'
import Arquivo from './telas/Arquivo'

const ICONE = `${import.meta.env.BASE_URL}icon.svg`

export const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')

export default function App() {
  const [tela, id] = useRota()
  const usuario = useUsuario()
  if (!usuario) return <Identificacao />

  const abas = [
    { href: '#/', rotulo: 'Obras', icone: Building2, ativo: !tela || tela === 'obra' || tela === 'vistoria' },
    { href: '#/pendencias', rotulo: 'Pendências', icone: ClipboardList, ativo: tela === 'pendencias' },
    { href: '#/arquivo', rotulo: 'Arquivo', icone: Archive, ativo: tela === 'arquivo' }
  ]

  return (
    <>
      <header className="topo">
        <div className="topo-dentro">
          <a href="#/" className="marca">
            <img src={ICONE} alt="" width={34} height={34} />
            <span>Conferência de Obra<small>Vistoria em campo</small></span>
          </a>
          <nav className="nav-topo">
            {abas.map(a => (
              <a key={a.href} href={a.href} className={a.ativo ? 'ativo' : ''}><a.icone size={17} />{a.rotulo}</a>
            ))}
          </nav>
          <div className="perfil">
            <span className="avatar" title={usuario}>{iniciais(usuario)}</span>
            <span className="nome">{usuario}</span>
            <button title="Trocar usuário" onClick={() => confirm('Sair e trocar de usuário?') && definirUsuario('')}><LogOut size={17} /></button>
          </div>
        </div>
      </header>
      <main>
        {tela === 'obra' && id ? <ObraTela id={id} />
          : tela === 'vistoria' && id ? <VistoriaTela id={id} />
          : tela === 'pendencias' ? <Pendencias />
          : tela === 'arquivo' ? <Arquivo />
          : <Inicio />}
      </main>
      <nav className="nav-baixo">
        {abas.map(a => (
          <a key={a.href} href={a.href} className={a.ativo ? 'ativo' : ''}><a.icone size={22} />{a.rotulo}</a>
        ))}
      </nav>
    </>
  )
}

function Identificacao() {
  const [nome, setNome] = useState('')
  return (
    <div className="entrada">
      <div className="entrada-caixa">
        <div className="entrada-marca">
          <img src={ICONE} alt="" width={76} height={76} />
          <h1>Conferência de Obra</h1>
          <p>Vistorias, medições e pendências em campo</p>
        </div>
        <form className="painel" onSubmit={e => { e.preventDefault(); if (nome.trim()) definirUsuario(nome) }}>
          <label>Seu nome<input value={nome} onChange={e => setNome(e.target.value)} autoFocus placeholder="Ex.: Ingrid Menezes" /></label>
          <p className="sub">Seu nome fica registrado em cada vistoria, item conferido, foto e projeto enviado.</p>
          <div className="acoes"><button className="primario" disabled={!nome.trim()}>Entrar</button></div>
        </form>
      </div>
    </div>
  )
}
