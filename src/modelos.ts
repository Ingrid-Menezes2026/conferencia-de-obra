import { novoId, type Item } from './db'

// Modelos de checklist. Cada seção tem itens de verificação (check)
// ou de medição (medido x projetado, com tolerância).
type ItemModelo = string | { texto: string; unidade: string; tolerancia: number }

export interface Modelo {
  id: string
  nome: string
  descricao: string
  secoes: Record<string, ItemModelo[]>
}

export const MODELOS: Modelo[] = [
  {
    id: 'fundacao',
    nome: 'Fundação',
    descricao: 'Locação, escavação, armadura e concretagem',
    secoes: {
      'Locação e escavação': [
        'Gabarito e eixos conferidos com o projeto',
        'Cotas de fundo de escavação conforme projeto',
        'Fundo da vala limpo, compactado e sem água',
        { texto: 'Profundidade da escavação', unidade: 'cm', tolerancia: 5 }
      ],
      'Armadura': [
        'Bitolas conforme projeto estrutural',
        'Espaçadores garantindo cobrimento',
        'Arranques de pilares posicionados',
        { texto: 'Espaçamento entre estribos', unidade: 'cm', tolerancia: 1 },
        { texto: 'Cobrimento da armadura', unidade: 'cm', tolerancia: 0.5 }
      ],
      'Concretagem': [
        'Nota fiscal do concreto com fck e slump',
        'Corpos de prova moldados',
        'Adensamento com vibrador',
        'Impermeabilização das vigas baldrame'
      ]
    }
  },
  {
    id: 'estrutura',
    nome: 'Estrutura',
    descricao: 'Formas, armaduras, pilares, vigas e lajes',
    secoes: {
      'Formas e escoramento': [
        'Formas alinhadas, no prumo e estanques',
        'Escoramento travado e apoiado em base firme',
        'Desmoldante aplicado',
        { texto: 'Prumo do pilar (desvio)', unidade: 'mm', tolerancia: 5 },
        { texto: 'Seção do pilar', unidade: 'cm', tolerancia: 0.5 }
      ],
      'Armaduras': [
        'Bitolas e quantidades conforme projeto',
        'Ancoragens e traspasses conforme projeto',
        'Passagens de instalações previstas na laje',
        { texto: 'Espessura da laje', unidade: 'cm', tolerancia: 0.5 }
      ],
      'Concretagem e cura': [
        'Liberação da armadura antes da concretagem',
        'Cura úmida nos primeiros 7 dias',
        'Sem ninhos de concretagem ou armadura exposta após desforma'
      ]
    }
  },
  {
    id: 'alvenaria',
    nome: 'Alvenaria',
    descricao: 'Marcação, elevação, vãos e encunhamento',
    secoes: {
      'Marcação e elevação': [
        'Primeira fiada nivelada e conforme projeto',
        'Juntas de amarração desencontradas',
        'Juntas com espessura uniforme',
        'Ferro-cabelo ou tela de amarração nos pilares',
        { texto: 'Prumo da parede (desvio)', unidade: 'mm', tolerancia: 3 },
        { texto: 'Pé-direito', unidade: 'cm', tolerancia: 1 }
      ],
      'Vãos': [
        'Vergas e contravergas executadas',
        { texto: 'Largura do vão de porta', unidade: 'cm', tolerancia: 0.5 },
        { texto: 'Altura do vão de porta', unidade: 'cm', tolerancia: 0.5 },
        { texto: 'Peitoril da janela', unidade: 'cm', tolerancia: 1 }
      ],
      'Encunhamento': ['Encunhamento feito após prazo mínimo', 'Sem trincas aparentes']
    }
  },
  {
    id: 'instalacoes',
    nome: 'Instalações elétricas e hidráulicas',
    descricao: 'Pontos, tubulações, testes e quadros',
    secoes: {
      'Elétrica': [
        'Quantidade e posição dos pontos conforme projeto',
        'Caixas niveladas e fixadas',
        'Bitolas dos cabos conforme projeto',
        'Quadro com disjuntores identificados',
        'Aterramento executado',
        { texto: 'Altura das tomadas baixas', unidade: 'cm', tolerancia: 2 },
        { texto: 'Altura dos interruptores', unidade: 'cm', tolerancia: 2 }
      ],
      'Hidráulica e esgoto': [
        'Pontos de água conforme projeto',
        'Teste de estanqueidade da água fria/quente',
        'Teste de estanqueidade do esgoto',
        'Caimento das tubulações de esgoto',
        'Registros acessíveis',
        { texto: 'Caimento do esgoto', unidade: '%', tolerancia: 0.5 }
      ]
    }
  },
  {
    id: 'acabamento',
    nome: 'Revestimento e acabamento',
    descricao: 'Reboco, pisos, pintura, esquadrias e louças',
    secoes: {
      'Revestimentos': [
        'Reboco sem fissuras, desplacamento ou som cavo',
        'Pisos e azulejos alinhados, sem peças trincadas',
        'Rejunte uniforme',
        'Caimento do piso para o ralo em áreas molhadas',
        { texto: 'Planicidade do piso (régua 2 m)', unidade: 'mm', tolerancia: 3 }
      ],
      'Pintura': ['Cobertura uniforme, sem manchas', 'Recortes limpos em rodapés e esquadrias'],
      'Esquadrias e louças': [
        'Portas e janelas abrindo e fechando sem esforço',
        'Vedação das esquadrias',
        'Louças e metais fixados e sem vazamento',
        'Limpeza final'
      ]
    }
  },
  {
    id: 'materiais',
    nome: 'Recebimento de materiais',
    descricao: 'Nota, quantidade, especificação e armazenamento',
    secoes: {
      'Documentação': [
        'Nota fiscal confere com o pedido',
        'Especificação (marca, modelo, classe) confere com o projeto',
        'Lote e validade registrados',
        'Laudos ou certificados recebidos (aço, concreto, cimento)'
      ],
      'Conferência física': [
        'Quantidade conferida',
        'Material sem avarias',
        'Amostra fotografada',
        { texto: 'Quantidade recebida x pedida', unidade: 'un', tolerancia: 0 }
      ],
      'Armazenamento': [
        'Cimento e argamassa sobre estrados, protegidos da umidade',
        'Aço sobre apoios, longe do solo',
        'Material estocado em local coberto e organizado'
      ]
    }
  }
]

export function itensDoModelo(m: Modelo): Item[] {
  return Object.entries(m.secoes).flatMap(([secao, itens]) =>
    itens.map(it =>
      typeof it === 'string'
        ? { id: novoId(), secao: `${m.nome} · ${secao}`, texto: it, tipo: 'check' as const, status: null, obs: '', fotos: [] }
        : {
            id: novoId(),
            secao: `${m.nome} · ${secao}`,
            texto: it.texto,
            tipo: 'medicao' as const,
            status: null,
            obs: '',
            fotos: [],
            unidade: it.unidade,
            tolerancia: it.tolerancia,
            projetado: null,
            medido: null
          }
    )
  )
}
