import {
  squad,
  matchInfo,
  applyMatchResults,
  registerMatchResult,
} from "./core.js";
import { showCustomModal } from "./modal.js";
import { renderApp, switchMainView } from "./ui.js";
import { setTableView } from "./tableView.js";

let simInterval = null;

async function loadOpponentData(selectedValue) {
  if (selectedValue === "generic") {
    return {
      name: matchInfo.away || "Adversário Genérico",
      atk: 65,
      def: 65,
      squad: [],
    };
  }
  try {
    // O timestamp previne que o navegador grave o arquivo JSON velho no cache
    const res = await fetch(
      "data/" + selectedValue + "?t=" + new Date().getTime(),
    );
    if (res.ok) {
      const oppData = await res.json();
      const oppTitulares = (oppData.squad || []).filter(
        (p) => p.status === "titular",
      );
      const len = oppTitulares.length > 0 ? oppTitulares.length : 11;
      return {
        name:
          oppData.matchInfo?.home ||
          oppData.matchInfo?.away ||
          "Adversário Desconhecido",
        atk:
          oppTitulares.reduce(
            (sum, p) =>
              sum +
              ((p.stats?.fin || p.stats?.sho || 65) +
                (p.stats?.vel || p.stats?.pac || 65)) /
                2,
            0,
          ) / len,
        def:
          oppTitulares.reduce(
            (sum, p) =>
              sum +
              ((p.stats?.def || 65) + (p.stats?.fis || p.stats?.phy || 65)) / 2,
            0,
          ) / len,
        squad: oppTitulares,
        fullSquad: oppData.squad || [],
      };
    }
  } catch (e) {
    console.error("Erro ao carregar o arquivo:", e);
  }
  return {
    name: "Adversário (Erro de Leitura)",
    atk: 65,
    def: 65,
    squad: [],
    fullSquad: [],
  };
}

export async function openMatchSimulation() {
  const titulares = squad.filter((p) => p.status === "titular");
  if (titulares.length < 11) {
    showCustomModal(
      "Atenção: Você precisa de exatos 11 jogadores titulares na prancheta para iniciar uma partida!",
      "alert",
      "btn-danger",
    );
    return;
  }

  const logContainer = document.getElementById("simLog");
  const timeEl = document.getElementById("simTime");
  const scoreEl = document.getElementById("simScore");
  const startBtn = document.getElementById("startSimBtn");
  const opponentSelect = document.getElementById("simOpponentSelect");
  const pauseSimBtn = document.getElementById("pauseSimBtn");
  const subSimBtn = document.getElementById("subSimBtn");
  const subPanel = document.getElementById("simSubPanel");

  switchMainView("simulation");

  // Reset da UI para aguardar carregamento
  logContainer.innerHTML =
    "<div class='log-entry log-neutral'>Carregando informações da partida...</div>";
  timeEl.innerText = "00'";
  scoreEl.innerText = "0 x 0";
  startBtn.style.display = "none";
  pauseSimBtn.style.display = "none";
  subSimBtn.style.display = "none";
  subPanel.style.display = "none";
  subSimBtn.disabled = false;
  subSimBtn.style.opacity = "1";
  if (opponentSelect) opponentSelect.disabled = false;

  const homeScorersDiv = document.getElementById("simHomeScorers");
  const awayScorersDiv = document.getElementById("simAwayScorers");
  if (homeScorersDiv) homeScorersDiv.innerHTML = "";
  if (awayScorersDiv) awayScorersDiv.innerHTML = "";

  // Carrega os dados baseados no arquivo selecionado
  let currentOpponent = await loadOpponentData(
    opponentSelect ? opponentSelect.value : "generic",
  );

  const updateUI = () => {
    document.getElementById("simHomeTeam").innerText =
      matchInfo.home || "Seu Time";
    document.getElementById("simAwayTeam").innerText = currentOpponent.name;
    document.getElementById("simMatchTitle").innerText =
      matchInfo.tournament || "Amistoso Internacional";
  };
  updateUI();

  if (opponentSelect) {
    opponentSelect.onchange = async (e) => {
      startBtn.style.display = "none";
      logContainer.innerHTML =
        "<div class='log-entry log-neutral'>Escaneando dados do arquivo JSON...</div>";
      currentOpponent = await loadOpponentData(e.target.value);
      updateUI();
      logContainer.innerHTML =
        "<div class='log-entry log-neutral'>Arquivos do adversário carregados! Aguardando o apito inicial...</div>";
      startBtn.style.display = "block";
    };
  }

  logContainer.innerHTML =
    "<div class='log-entry log-neutral'>Equipes perfiladas. Aguardando o apito do árbitro...</div>";
  startBtn.innerText = "Apito Inicial";
  startBtn.style.display = "block";

  let minute = 0;
  let homeScore = 0;
  let awayScore = 0;
  let isHalfTime = false;
  let homeScorers = [];
  let homeScorersIds = [];
  let awayScorers = [];
  let homeCards = [];
  let awayCards = [];
  let homeInjuriesList = [];

  // Atletas em campo (com energia e possibilidade de expulsão) e no banco
  let homeActivePlayers = titulares.map((p) => ({ ...p, currentStamina: 100 }));
  let homeBench = squad
    .filter(
      (p) =>
        p.status === "reserva" &&
        p.matchStatus !== "red" &&
        p.matchStatus !== "injury",
    )
    .map((p) => ({ ...p, currentStamina: 100 }));

  let awayActivePlayers = currentOpponent.squad.map((p) => ({
    ...p,
    currentStamina: 100,
  }));
  let awayBench = (currentOpponent.fullSquad || [])
    .filter(
      (p) =>
        p.status === "reserva" &&
        p.matchStatus !== "red" &&
        p.matchStatus !== "injury",
    )
    .map((p) => ({ ...p, currentStamina: 100 }));

  let homeRedCards = 0;
  let awayRedCards = 0;
  let homeSubs = 0;
  let awaySubs = 0;

  // Calcula atributos dinâmicos baseados no cansaço e expulsões
  const getHomeAtk = () => {
    if (homeActivePlayers.length === 0) return 10;
    return (
      (homeActivePlayers.reduce(
        (sum, p) =>
          sum +
          (((p.stats?.fin || p.stats?.sho || 50) +
            (p.stats?.vel || p.stats?.pac || 50)) /
            2) *
            (p.currentStamina / 100),
        0,
      ) /
        homeActivePlayers.length) *
      (homeActivePlayers.length / 11)
    );
  };
  const getHomeDef = () => {
    if (homeActivePlayers.length === 0) return 10;
    return (
      (homeActivePlayers.reduce(
        (sum, p) =>
          sum +
          (((p.stats?.def || 50) + (p.stats?.fis || p.stats?.phy || 50)) / 2) *
            (p.currentStamina / 100),
        0,
      ) /
        homeActivePlayers.length) *
      (homeActivePlayers.length / 11)
    );
  };

  const getAwayAtk = () => {
    if (awayActivePlayers.length === 0) return 10;
    return (
      (awayActivePlayers.reduce(
        (sum, p) =>
          sum +
          (((p.stats?.fin || p.stats?.sho || 50) +
            (p.stats?.vel || p.stats?.pac || 50)) /
            2) *
            (p.currentStamina / 100),
        0,
      ) /
        awayActivePlayers.length) *
      (awayActivePlayers.length / 11)
    );
  };
  const getAwayDef = () => {
    if (awayActivePlayers.length === 0) return 10;
    return (
      (awayActivePlayers.reduce(
        (sum, p) =>
          sum +
          (((p.stats?.def || 50) + (p.stats?.fis || p.stats?.phy || 50)) / 2) *
            (p.currentStamina / 100),
        0,
      ) /
        awayActivePlayers.length) *
      (awayActivePlayers.length / 11)
    );
  };

  const updateStatsUI = () => {
    if (!homeScorersDiv || !awayScorersDiv) return;
    const formatStats = (scorersArr, cardsArr) => {
      const counts = {};
      scorersArr.forEach((n) => (counts[n] = (counts[n] || 0) + 1));
      let html = Object.entries(counts)
        .map(([n, c]) => `⚽ ${n} ${c > 1 ? `(${c})` : ""}`)
        .join("<br>");

      if (cardsArr.length > 0) {
        if (html) html += "<br>";
        html += cardsArr
          .map((c) => `${c.type === "red" ? "🟥" : "🟨"} ${c.name}`)
          .join("<br>");
      }
      return html;
    };
    homeScorersDiv.innerHTML = formatStats(homeScorers, homeCards);
    awayScorersDiv.innerHTML = formatStats(awayScorers, awayCards);
  };

  // Controles de Pausa e Substituição Manual
  let isPaused = false;

  const togglePause = () => {
    if (isPaused) {
      isPaused = false;
      pauseSimBtn.innerText = "⏸ Pausar";
      pauseSimBtn.style.background = "var(--warning)";
      pauseSimBtn.style.color = "#000";
      subPanel.style.display = "none";
      simInterval = setInterval(runMinute, 1200);
    } else {
      isPaused = true;
      clearInterval(simInterval);
      pauseSimBtn.innerText = "▶ Retomar";
      pauseSimBtn.style.background = "var(--accent)";
      pauseSimBtn.style.color = "#000";
    }
  };

  pauseSimBtn.onclick = togglePause;

  // Dicionário Dinâmico de Narração Esportiva
  const goalPhrases = [
    "GOOOOOOOOOOOOOOOOOOOL! É NOSSO! Uma pintura de {player}! Bateu na bola com um carinho enorme e estufou a rede adversária! Que golaço!",
    "GOOOOOOOL! {player} manda um foguete de fora da área e a coruja dorme! Golaço espetacular!",
    "GOOOOOOOL! Cruzamento na medida e {player} sobe mais que a zaga para testar pro fundo do gol!",
    "GOOOOOOOL! Sobrou o rebote na pequena área e o matador {player} não perdoa!",
  ];
  const goalWithDisadvantagePhrases = [
    "GOOOOOOOOOOOOOOOOOOOL! É NOSSO! MESMO COM UM A MENOS! {player} tira um coelho da cartola e incendeia a torcida! Que raça!",
    "GOL HERÓICO! GOOOOOOOL! O time se supera com um a menos e {player} guarda no fundo das redes!",
  ];
  const goalWithAdvantagePhrases = [
    "GOOOOOOOOOOOOOOOOOOOL! É NOSSO! Aproveitando a vantagem numérica, {player} acha espaço e não perdoa!",
    "GOOOOOOOL! Com um homem a mais fica fácil! {player} bota a bola na casinha!",
  ];
  const missPhrases = [
    "Peeeeeeeeerdeu! {player} recebe em excelente condição, prepara o canhão, mas a bola passa tirando tinta da trave!",
    "Uuuuh! {player} faz linda jogada individual, chuta cruzado e a bola raspa a trave!",
    "Inacreditável! {player} na cara do gol, tentou encobrir o goleiro e mandou pra fora!",
  ];
  const savePhrases = [
    "ESPAAAAAAAAAAAAAAALMA {goleiro}! {oppAttacker} apareceu cara a cara, mandou o petardo e o nosso camisa 1 voa bonito pra operar um milagre!",
    "MILAGRE DE {goleiro}! Reflexo de gato para defender a cabeçada à queima-roupa de {oppAttacker}!",
    "GIGANTE {goleiro}! Fechou o ângulo e bloqueou o chute venenoso de {oppAttacker}!",
  ];
  const awayGoalPhrases = [
    "GOOOOOOOOOOOOOOOOOOOL! É do {awayTeam}! Cochilo da nossa defesa, a bola sobra açucarada e {oppAttacker} não perdoa!",
    "GOOOOOOOL... Que ducha de água fria. {oppAttacker} ganha na corrida e chuta cruzado pra marcar para o {awayTeam}.",
    "GOOOOOOOL! Falha na marcação e {oppAttacker} sobe sozinho no escanteio para balançar a nossa rede.",
  ];
  const awayGoalWithDisadvantagePhrases = [
    "GOOOOOOOOOOOOOOOOOOOL! É do {awayTeam}! Mesmo com um a menos, eles encontram um contra-ataque mortal e {oppAttacker} não perdoa!",
    "Inacreditável... Tomamos gol de um time com jogador a menos. {oppAttacker} marca para o {awayTeam}.",
  ];
  const awayGoalWithAdvantagePhrases = [
    "GOOOOOOOOOOOOOOOOOOOL! O {awayTeam} aproveita nossa desvantagem numérica, roda a bola e {oppAttacker} marca com facilidade.",
    "A pressão de ter um a menos pesou... {oppAttacker} bota pra dentro. É gol do {awayTeam}.",
  ];

  const getRandomPhrase = (arr, vars) => {
    let phrase = arr[Math.floor(Math.random() * arr.length)];
    for (const [key, value] of Object.entries(vars)) {
      phrase = phrase.replace(`{${key}}`, value);
    }
    return phrase;
  };

  const getHomeGoalPhrase = (playerName) => {
    if (homeRedCards > awayRedCards)
      return getRandomPhrase(goalWithDisadvantagePhrases, {
        player: playerName,
      });
    if (homeRedCards < awayRedCards)
      return getRandomPhrase(goalWithAdvantagePhrases, { player: playerName });
    return getRandomPhrase(goalPhrases, { player: playerName });
  };

  const getAwayGoalPhrase = (awayTeamName, oppAttackerName) => {
    if (awayRedCards > homeRedCards)
      return getRandomPhrase(awayGoalWithDisadvantagePhrases, {
        awayTeam: awayTeamName,
        oppAttacker: oppAttackerName,
      });
    if (awayRedCards < homeRedCards)
      return getRandomPhrase(awayGoalWithAdvantagePhrases, {
        awayTeam: awayTeamName,
        oppAttacker: oppAttackerName,
      });
    return getRandomPhrase(awayGoalPhrases, {
      awayTeam: awayTeamName,
      oppAttacker: oppAttackerName,
    });
  };

  const degradeStamina = (players) => {
    players.forEach((p) => {
      const fis = p.stats?.fis || p.stats?.phy || 50;
      const loss = (100 - fis) * 0.05 + 1; // Perde de 1 a 3.5 por minuto dependendo do físico
      p.currentStamina = Math.max(10, p.currentStamina - loss);
    });
  };

  const handleAISubstitutions = () => {
    if (awaySubs < 5 && awayBench.length > 0) {
      const exhaustedIndex = awayActivePlayers.findIndex(
        (p) => p.currentStamina < 40 && p.aptitude?.[0] !== "GL",
      );
      if (exhaustedIndex > -1) {
        const outPlayer = awayActivePlayers[exhaustedIndex];
        const inPlayer = awayBench.splice(0, 1)[0];
        awayActivePlayers.splice(exhaustedIndex, 1, inPlayer);
        awaySubs++;
        addLog(
          `🔄 SUBSTITUIÇÃO NO ADVERSÁRIO: Sai ${outPlayer.name} para a entrada de ${inPlayer.name}.`,
          "log-neutral",
        );
      }
    }
  };

  // UX Substituição Manual
  subSimBtn.onclick = () => {
    if (!isPaused) togglePause(); // Força a pausa
    if (homeSubs >= 5) {
      alert("Você já realizou as 5 substituições permitidas.");
      return;
    }
    if (homeBench.length === 0) {
      alert("Você não possui mais jogadores no banco de reservas!");
      return;
    }

    subPanel.style.display = "block";
    document.getElementById("simSubsLeft").innerText = 5 - homeSubs;
    const outSelect = document.getElementById("subOutSelect");
    const inSelect = document.getElementById("subInSelect");
    outSelect.innerHTML = homeActivePlayers
      .map(
        (p, i) =>
          `<option value="${i}">${p.name} (${Math.floor(p.currentStamina)}% Físico)</option>`,
      )
      .join("");
    inSelect.innerHTML = homeBench
      .map(
        (p, i) =>
          `<option value="${i}">${p.name} (${p.aptitude?.[0] || "?"})</option>`,
      )
      .join("");
  };

  document.getElementById("cancelSubBtn").onclick = () => {
    subPanel.style.display = "none";
  };

  document.getElementById("confirmSubBtn").onclick = () => {
    const outIdx = document.getElementById("subOutSelect").value;
    const inIdx = document.getElementById("subInSelect").value;
    if (outIdx !== "" && inIdx !== "") {
      const outPlayer = homeActivePlayers[outIdx];
      const inPlayer = homeBench.splice(inIdx, 1)[0];
      homeActivePlayers.splice(outIdx, 1, inPlayer);
      homeSubs++;
      addLog(
        `🔄 SUBSTITUIÇÃO TÁTICA: Sai ${outPlayer.name} para a entrada de ${inPlayer.name}.`,
        "log-neutral",
      );
      subPanel.style.display = "none";
      if (homeSubs >= 5) {
        subSimBtn.disabled = true;
        subSimBtn.style.opacity = "0.5";
      }
    }
  };

  const addLog = (text, type = "log-neutral") => {
    const el = document.createElement("div");
    el.className = `log-entry ${type}`;
    el.innerHTML = `<strong style="font-size:0.9rem;">${minute}'</strong> &nbsp; ${text}`;
    logContainer.appendChild(el);
    logContainer.scrollTop = logContainer.scrollHeight;
  };

  const closeSimulationView = () => {
    switchMainView("dashboard");
    setTableView(false);
  };

  const runMinute = () => {
    minute += Math.floor(Math.random() * 3) + 2;

    // Sistemas Físicos e Táticos Baseados no Tempo
    degradeStamina(homeActivePlayers);
    degradeStamina(awayActivePlayers);
    handleAISubstitutions();

    if (minute >= 45 && !isHalfTime) {
      minute = 45;
      isHalfTime = true;
      timeEl.innerText = "45'";
      clearInterval(simInterval);
      addLog(
        "Apita o árbitro! Fim do primeiro tempo. Os técnicos preparam suas broncas no vestiário!",
        "log-neutral",
      );
      startBtn.innerText = "Rolar a Bola (2º Tempo)";
      startBtn.style.display = "block";
      pauseSimBtn.style.display = "none";
      subSimBtn.style.display = "none";
      return;
    }

    if (minute >= 90) {
      minute = 90;
      timeEl.innerText = "90'";
      clearInterval(simInterval);
      addLog(
        "Fim de Papo! Aponta para o centro do gramado o juizão, termina o espetáculo! O placar reflete a emoção do jogo.",
        "log-neutral",
      );
      startBtn.innerText = "Finalizar e Salvar Resultados";
      startBtn.style.display = "block";
      pauseSimBtn.style.display = "none";
      subSimBtn.style.display = "none";
      if (opponentSelect) opponentSelect.disabled = false;
      startBtn.onclick = () => {
        applyMatchResults(homeScorersIds, homeCards, homeInjuriesList);
        registerMatchResult(
          matchInfo.home || "Seu Time",
          currentOpponent.name,
          homeScore,
          awayScore,
        );
        closeSimulationView();
        renderApp();
      };
      return;
    }

    const currentHomeAtk = getHomeAtk();
    const currentHomeDef = getHomeDef();
    const currentAwayAtk = getAwayAtk();
    const currentAwayDef = getAwayDef();

    timeEl.innerText = minute + "'";
    const rand = Math.random() * 100;

    if (rand < (currentHomeAtk / (currentHomeAtk + currentAwayDef)) * 15) {
      if (homeActivePlayers.length === 0) return;
      const atacantes = homeActivePlayers.filter((p) =>
        ["CA", "SA", "PE", "PD", "MEI"].includes(p.aptitude?.[0]),
      );
      let jogador =
        homeActivePlayers[Math.floor(Math.random() * homeActivePlayers.length)];
      if (atacantes.length > 0)
        jogador = atacantes[Math.floor(Math.random() * atacantes.length)];
      if (
        Math.random() * 100 <
        (jogador.stats?.fin || jogador.stats?.sho || 50) + 10
      ) {
        homeScore++;
        homeScorers.push(jogador.name);
        homeScorersIds.push(jogador.id);
        scoreEl.innerText = `${homeScore} x ${awayScore}`;
        updateStatsUI();
        addLog(getHomeGoalPhrase(jogador.name), "log-goal");
      } else
        addLog(
          getRandomPhrase(missPhrases, { player: jogador.name }),
          "log-chance",
        );
    } else if (
      rand >
      100 - (currentAwayAtk / (currentAwayAtk + currentHomeDef)) * 12
    ) {
      if (awayActivePlayers.length === 0) return;
      const goleiros = homeActivePlayers.filter(
        (p) => p.aptitude?.[0] === "GL",
      );
      const goleiro =
        goleiros.length > 0
          ? goleiros[0]
          : homeActivePlayers.length > 0
            ? homeActivePlayers[0]
            : titulares[0];
      let oppAttackerName = "O atacante adversário";
      if (awayActivePlayers.length > 0) {
        const oppAttackers = awayActivePlayers.filter((p) =>
          ["CA", "SA", "PE", "PD", "MEI"].includes(p.aptitude?.[0]),
        );
        oppAttackerName =
          oppAttackers.length > 0
            ? oppAttackers[Math.floor(Math.random() * oppAttackers.length)].name
            : awayActivePlayers[
                Math.floor(Math.random() * awayActivePlayers.length)
              ].name;
      }
      if (Math.random() * 100 < 35 - (goleiro.stats?.ref || 50) / 4) {
        awayScore++;
        awayScorers.push(oppAttackerName);
        scoreEl.innerText = `${homeScore} x ${awayScore}`;
        updateStatsUI();
        addLog(
          getAwayGoalPhrase(currentOpponent.name, oppAttackerName),
          "log-foul",
        );
      } else
        addLog(
          getRandomPhrase(savePhrases, {
            goleiro: goleiro.name,
            oppAttacker: oppAttackerName,
          }),
          "log-chance",
        );
    } else if (rand > 45 && rand < 52) {
      // Eventos Dinâmicos: Cartões e Lesões (Acontecem esporadicamente)
      if (Math.random() > 0.4) {
        const isHome = Math.random() > 0.5;
        if (isHome && homeActivePlayers.length > 0) {
          let idx = Math.floor(Math.random() * homeActivePlayers.length);
          let p = homeActivePlayers[idx];
          if (Math.random() < 0.15) {
            homeActivePlayers.splice(idx, 1);
            homeRedCards++;
            homeCards.push({ id: p.id, name: p.name, type: "red" });
            updateStatsUI();
            addLog(
              `🟥 RUA! CARTÃO VERMELHO PARA ${p.name}! Entrada dura e o árbitro expulsa o nosso jogador! O time fica com um a menos!`,
              "log-foul",
            );
          } else {
            homeCards.push({ id: p.id, name: p.name, type: "yellow" });
            updateStatsUI();
            addLog(
              `CARTÃO AMARELO! ${p.name} chega atrasado na marcação e é advertido pelo juiz.`,
              "log-neutral",
            );
          }
        } else if (!isHome && awayActivePlayers.length > 0) {
          let idx = Math.floor(Math.random() * awayActivePlayers.length);
          let p = awayActivePlayers[idx];
          if (Math.random() < 0.15) {
            awayActivePlayers.splice(idx, 1);
            awayRedCards++;
            awayCards.push({ name: p.name, type: "red" });
            updateStatsUI();
            addLog(
              `🟥 EXPULSO! ${p.name} do ${currentOpponent.name} faz falta violenta e leva o vermelho direto! Estão com um a menos!`,
              "log-goal",
            );
          } else {
            awayCards.push({ name: p.name, type: "yellow" });
            updateStatsUI();
            addLog(
              `🟨 Falta tática de ${p.name} do ${currentOpponent.name}, que recebe o cartão amarelo.`,
              "log-neutral",
            );
          }
        }
      } else {
        let isHome = Math.random() > 0.5;
        let targetPlayers = isHome ? homeActivePlayers : awayActivePlayers;
        if (targetPlayers.length > 0) {
          let p =
            targetPlayers[Math.floor(Math.random() * targetPlayers.length)];
          p.currentStamina -= 20; // Perde muito fôlego de uma vez só
          if (isHome) {
            homeInjuriesList.push({ id: p.id, name: p.name });
            addLog(
              `🚑 PREOCUPAÇÃO NO BANCO! ${p.name} sofre uma pancada, recebe atendimento no gramado e parece estar mancando. O técnico já olha pro banco.`,
              "log-neutral",
            );
          } else {
            addLog(
              `🚑 Jogo parado para atendimento médico a ${p.name} do ${currentOpponent.name}.`,
              "log-neutral",
            );
          }
        }
      }
    }
  };

  startBtn.onclick = () => {
    if (opponentSelect) opponentSelect.disabled = true;
    startBtn.style.display = "none";
    pauseSimBtn.style.display = "block";
    subSimBtn.style.display = "block";
    if (!isHalfTime)
      addLog(
        "Autoriza o árbitro! Rola a pelota, começa a emoção de mais um grande jogo!",
        "log-neutral",
      );
    else
      addLog(
        "Rola de novo a bola! Começa a etapa complementar e os 45 minutos finais!",
        "log-neutral",
      );
    simInterval = setInterval(runMinute, 1200);
  };
  document.getElementById("closeSimBtn").onclick = async () => {
    clearInterval(simInterval);
    if (minute > 0 && minute < 90) {
      const proceed = await showCustomModal(
        "A partida está em andamento. Deseja abandonar sem salvar o resultado?",
        "confirm",
        "btn-danger",
      );
      if (!proceed) {
        if (!isPaused) simInterval = setInterval(runMinute, 1200);
        return;
      }
    }
    closeSimulationView();
  };
}
