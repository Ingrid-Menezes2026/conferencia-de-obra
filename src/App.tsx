import { useRota } from './rota'
import Inicio from './telas/Inicio'
import ObraTela from './telas/ObraTela'
import VistoriaTela from './telas/VistoriaTela'
import Pendencias from './telas/Pendencias'

export default function App() {
  const [tela, id] = useRota()
  return (
    <>
      <header className="topo">
        <a href="#/" className="marca">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
          Conferência de Obra
        </a>
        <nav>
          <a href="#/" className={!tela ? 'ativo' : ''}>Obras</a>
          <a href="#/pendencias" className={tela === 'pendencias' ? 'ativo' : ''}>Pendências</a>
        </nav>
      </header>
      <main>
        {tela === 'obra' && id ? <ObraTela id={id} />
          : tela === 'vistoria' && id ? <VistoriaTela id={id} />
          : tela === 'pendencias' ? <Pendencias />
          : <Inicio />}
      </main>
    </>
  )
}
