# ⚽ FutDashboard Pro Modular

![Versão](https://img.shields.io/badge/versão-2.5%20Pro-green?style=for-the-badge)
![JS](https://img.shields.io/badge/JavaScript-ES6%2B-yellow?style=for-the-badge&logo=javascript)
![CSS](https://img.shields.io/badge/CSS3-Modern-blue?style=for-the-badge&logo=css3)
![Status](https://img.shields.io/badge/Status-Estável-brightgreen?style=for-the-badge)

O **FutDashboard** é uma plataforma completa de gerenciamento técnico e simulação de futebol, desenvolvida para oferecer uma experiência profissional de "Coach" diretamente no navegador. O sistema combina análise de dados, gestão de elenco e um motor de simulação de partidas dinâmico.

---

## 🚀 Principais Funcionalidades

### 📋 Gestão de Carreira e Perfil
- **Múltiplos Saves:** Sistema de slots de salvamento usando IndexedDB.
- **Perfil do Treinador:** Definição de DNA Tático (Posse, Contra-ataque, etc.) e formação favorita.
- **Seleção de Clubes:** Interface visual para escolha de times reais com base em arquivos de dados JSON.

### 🛡️ Gerenciamento de Elenco (Squad Management)
- **Editor de Atletas:** Edição detalhada de atributos, posições, pé preferido e nacionalidade.
- **Análise Visual:** Gráficos de radar para comparação de performance entre jogadores.
- **Histórico e Estatísticas:** Acompanhamento de gols, assistências e notas médias por temporada.
- **Mercado de Transferências:** Sistema de compra e venda de jogadores para fortalecer o time.

### 📐 Prancheta Tática (Tactical Board)
- **Posicionamento Dinâmico:** Arrastar e soltar jogadores no campo com visualização em tempo real.
- **Auto-Escalação:** Algoritmo que escala o melhor time baseado no overall e posições.
- **Entrosamento (Chemistry):** Visualização de conexões entre jogadores no campo.
- **Exportação:** Salvamento da tática em formato PNG ou JSON.

### 🎮 Motor de Simulação (Match Engine)
- **Simulação em Tempo Real:** Log de eventos dinâmico (gols, cartões, substituições).
- **Estatísticas Detalhadas:** Posse de bola, chutes (no alvo), passes, desarmes e defesas.
- **Fator Árbitro:** Cada partida conta com um árbitro aleatório que influencia o rigor das faltas.
- **Visual Premium:** Placar dinâmico e logos dos clubes.

---

## 🛠️ Tecnologias Utilizadas

- **Core:** HTML5 Semântico e JavaScript Moderno (ES6+ Modules).
- **Estilização:** CSS3 Avançado com Variáveis (Custom Properties), Flexbox e CSS Grid.
- **Ícones:** [Lucide Icons](https://lucide.dev/).
- **Gráficos:** Canvas API para radares de atributos.
- **Armazenamento:** IndexedDB (via `idbKeyval`) para persistência de dados local sem necessidade de backend.
- **Utilitários:** `html2canvas` para captura de tela da prancheta.

---

## 📂 Estrutura do Projeto

O sistema utiliza uma arquitetura modular para facilitar a manutenção e escalabilidade:

```bash
Fut_Dashboard/
├── css/                # Estilização modularizada
│   ├── base.css        # Resets e variáveis globais
│   ├── sidebar.css     # Interface lateral e menus
│   ├── pitch.css       # Design do campo de futebol
│   └── ...             # Componentes específicos (league, simulation, ui)
├── data/               # Banco de dados local (JSON)
│   ├── teamsList.json  # Lista de clubes disponíveis
│   └── tactics.json    # Configurações de formações táticas
├── script/             # Lógica do sistema (Módulos ES6)
│   ├── core/           # Motor principal (Storage, AppCore, Transferências)
│   ├── ui/             # Manipulação de DOM e Eventos (Renderer, Views)
│   ├── match/          # Lógica de simulação de partidas
│   ├── tactics/        # Algoritmos de posicionamento e auto-fill
│   └── player/         # Gestão de dados de atletas
├── index.html          # Ponto de entrada e estrutura principal
└── gerador.js          # Utilitário de geração de dados de jogadores
```

---

## 💻 Como Executar

Devido ao uso de **Módulos JavaScript**, o projeto **não pode** ser aberto diretamente via `file://`.

1. **Requisito:** Ter o [VS Code](https://code.visualstudio.com/) instalado.
2. **Extensão:** Instale a extensão **Live Server**.
3. **Execução:**
   - Abra a pasta do projeto no VS Code.
   - Clique no botão `Go Live` no canto inferior direito.
   - O navegador abrirá automaticamente em `http://127.0.0.1:5500`.

---

## 🛡️ Sistema de Proteção Anti-Crash

O sistema inclui um script de monitoramento no `head` do `index.html` que:
- Detecta se o usuário abriu o arquivo incorretamente (via `file://`).
- Captura erros de rede (404 em módulos).
- Exibe alertas amigáveis em caso de bugs críticos de código, facilitando o debug.

---

## 📝 Notas de Versão (v2.5)
- **Modularização Total:** Separação completa de lógica e interface.
- **Novo Dashboard:** Visão geral centralizada com atalhos rápidos.
- **Sistema de Slots:** Permite ter várias carreiras simultâneas.
- **Refatoração de CSS:** Uso de sistema de design consistente em todo o app.

---
Desenvolvido com ❤️ por DeepMind Labs.
