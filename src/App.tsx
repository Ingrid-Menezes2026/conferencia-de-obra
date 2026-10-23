import { useState } from 'react'
import { useRota } from './rota'
import { definirUsuario, useUsuario } from './usuario'
import Inicio from './telas/Inicio'
import ObraTela from './telas/ObraTela'
import VistoriaTela from './telas/VistoriaTela'
import Pendencias from './telas/Pendencias'
import Arquivo from './telas/Arquivo'

export default function App() {
  const [tela, id] = useRota()
  const usuario = useUsuario()
  if (!usuario) return <Identificacao />
  return (
    <>
      <header className="topo">
        <a href="#/" className="marca">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
          Conferência de Obra
        </a>
        <nav>
          <a href="#/" className={!tela || tela === 'obra' ? 'ativo' : ''}>Obras</a>
          <a href="#/pendencias" className={tela === 'pendencias' ? 'ativo' : ''}>Pendências</a>
          <a href="#/arquivo" className={tela === 'arquivo' ? 'ativo' : ''}>Arquivo</a>
        </nav>
      </header>
      <main>
        {tela === 'obra' && id ? <ObraTela id={id} />
          : tela === 'vistoria' && id ? <VistoriaTela id={id} />
          : tela === 'pendencias' ? <Pendencias />
          : tela === 'arquivo' ? <Arquivo />
          : <Inicio />}
      </main>
      <footer className="rodape">
        Conectado como <b>{usuario}</b> · <button className="link" onClick={() => definirUsuario('')}>trocar</button>
      </footer>
    </>
  )
}

function Identificacao() {
  const [nome, setNome] = useState('')
  return (
    <main className="entrada">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={72} height={72} />
      <h1>Conferência de Obra</h1>
      <form className="painel" onSubmit={e => { e.preventDefault(); if (nome.trim()) definirUsuario(nome) }}>
        <label>Seu nome<input value={nome} onChange={e => setNome(e.target.value)} autoFocus placeholder="Ex.: Ingrid Menezes" /></label>
        <p className="sub">O nome fica registrado em cada vistoria, item conferido, foto e projeto que você enviar.</p>
        <div className="acoes"><button className="primario" disabled={!nome.trim()}>Entrar</button></div>
      </form>
    </main>
  )
}
