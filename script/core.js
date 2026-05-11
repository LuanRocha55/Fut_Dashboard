import { Storage } from "./storage.js";

export let squad = [];
export let formations = {};
export let defaultFormations = {};
export let matchInfo = {};
export let activePlayerId = null;
export let matchHistory = [];

export const ALL_POSITIONS = [
  "GL",
  "ZE",
  "ZD",
  "LE",
  "LD",
  "ME",
  "MD",
  "VOL",
  "MC",
  "MEI",
  "PE",
  "PD",
  "SA",
  "CA",
];

export function setActivePlayerId(id) {
  activePlayerId = id;
}

export function healSquad() {
  let updated = false;
  squad.forEach((p) => {
    if (
      p.matchStatus === "injury" ||
      p.matchStatus === "red" ||
      p.matchStatus === "yellow"
    ) {
      p.matchStatus = "normal";
      updated = true;
    }
    if (p.fitness !== undefined && p.fitness < 100) {
      p.fitness = 100;
      updated = true;
    }
  });
  if (updated) saveToLocal();
  return updated;
}

export function registerMatchResult(homeTeam, awayTeam, homeScore, awayScore) {
  matchHistory.push({ homeTeam, awayTeam, homeScore, awayScore });
  if (matchHistory.length > 5) matchHistory.shift();
  Storage.saveMatchHistory(matchHistory);
}

export function applyMatchResults(
  scorersIds,
  cards,
  injuriesList,
  playersFitness = {},
  playerRatings = {},
  assistsIds = [],
  daysPassed = 7,
  tacklesIds = [],
) {
  let updated = false;

  squad.forEach((p) => {
    // Recupera jogadores suspensos ou machucados (1 jogo de punição/recuperação)
    if (
      p.matchStatus === "red" &&
      !cards.some((c) => c.id === p.id && c.type === "red")
    ) {
      p.matchStatus = "normal";
      updated = true;
    }
    if (
      p.matchStatus === "injury" &&
      !injuriesList.some((inj) => inj.id === p.id)
    ) {
      p.matchStatus = "normal";
      updated = true;
    }

    // Atualiza a energia com base no pós-jogo e recupera fôlego (+12% por dia de descanso)
    let currentFit = p.fitness !== undefined ? p.fitness : 100;
    if (playersFitness && playersFitness[p.id] !== undefined) {
      currentFit = playersFitness[p.id];
    }
    p.fitness = Math.min(100, currentFit + daysPassed * 12);
    updated = true;

    // Atualiza a forma/moral do jogador com base na nota da partida
    if (playerRatings && playerRatings[p.id] !== undefined) {
      p.lastMatchRating = playerRatings[p.id];
      p.matchesPlayed = (p.matchesPlayed || 0) + 1;
      p.sumRatings = (p.sumRatings || 0) + playerRatings[p.id];
      p.avgRating = p.sumRatings / p.matchesPlayed;
      let currentForm = p.form !== undefined ? p.form : 0;
      if (playerRatings[p.id] >= 8.0)
        currentForm = Math.min(2, currentForm + 1);
      else if (playerRatings[p.id] <= 5.5)
        currentForm = Math.max(-2, currentForm - 1);
      else {
        if (currentForm > 0) currentForm -= 1;
        else if (currentForm < 0) currentForm += 1;
      }
      p.form = currentForm;
      const isGK = p.aptitude && p.aptitude[0] === "GL";
      p.rating = calculateOVR(p.stats, p.form, isGK);
    }
  });

  scorersIds.forEach((id) => {
    let p = squad.find((x) => x.id === id);
    if (p) {
      p.goals = (p.goals || 0) + 1;
      updated = true;
    }
  });

  assistsIds.forEach((id) => {
    let p = squad.find((x) => x.id === id);
    if (p) {
      p.assists = (p.assists || 0) + 1;
      updated = true;
    }
  });

  cards.forEach((c) => {
    let p = squad.find((x) => x.id === c.id);
    if (p) {
      if (c.type === "red") {
        p.matchStatus = "red";
        p.status = "reserva";
        updated = true;
      } else if (c.type === "yellow") {
        p.yellowCards = (p.yellowCards || 0) + 1;
        if (p.yellowCards >= 3) {
          p.matchStatus = "red";
          p.status = "reserva";
          p.yellowCards = 0;
        }
        updated = true;
      }
    }
  });

  injuriesList.forEach((inj) => {
    let p = squad.find((x) => x.id === inj.id);
    if (p) {
      p.matchStatus = "injury";
      p.status = "reserva";
      updated = true;
    }
  });

  tacklesIds.forEach((id) => {
    let p = squad.find((x) => x.id === id);
    if (p) {
      p.tackles = (p.tackles || 0) + 1;
      updated = true;
    }
  });

  if (updated) saveToLocal();
}

export function calculateOVR(stats, form = 0, isGK = false) {
  if (!stats) return 5.0; // Média mínima padrão

  let avg;
  if (isGK) {
    const sal = stats.sal || stats.div || stats.def || 75; // Salto
    const man = stats.man || stats.han || stats.def || 75; // Manejo
    const rep = stats.rep || stats.kic || stats.pas || 60; // Reposição
    const ref = stats.ref || stats.def || 75; // Reflexo
    const vel = stats.vel || stats.spd || stats.pac || 40; // Velocidade
    const pos = stats.pos || stats.def || 75; // Posicionamento
    const sta = stats.sta || stats.stm || 50; // Fôlego
    avg = (sal + man + rep + ref + vel + pos + sta) / 7;
  } else {
    const vel = stats.vel || stats.pac || stats.spd || 50;
    const fin = stats.fin || stats.sho || stats.atk || 50;
    const pas = stats.pas || 50;
    const dri = stats.dri || stats.atk || 50;
    const def = stats.def || 50;
    const fis = stats.fis || stats.phy || stats.str || 50;
    const sta = stats.sta || stats.stm || 75;
    avg = (vel + fin + pas + dri + def + fis + sta) / 7;
  }

  const baseOVR = avg / 10;
  const formModifier = form * 0.5; // (Excelente = 2 -> +1.0) | (Boa = 1 -> +0.5) | (Ruim = -1 -> -0.5)

  let finalOVR = baseOVR + formModifier;
  if (finalOVR > 10) finalOVR = 10.0; // Teto Máximo
  if (finalOVR < 1) finalOVR = 1.0; // Piso Mínimo

  return parseFloat(finalOVR.toFixed(1));
}

export function saveToLocal() {
  Storage.saveSquad(squad);
  Storage.saveTactics(formations);
}

export function ensureCaptain(pool = null) {
  let checkPool = pool;
  let isSimulation = true;
  if (!checkPool) {
    checkPool = squad.filter(
      (p) =>
        p.status === "titular" &&
        p.matchStatus !== "red" &&
        p.matchStatus !== "injury",
    );
    isSimulation = false;
  }

  if (checkPool.length === 0) return null;
  if (checkPool.some((p) => p.captain)) return null; // Já existe um capitão no campo

  let newCap = checkPool[0];
  for (let i = 1; i < checkPool.length; i++) {
    const p = checkPool[i];
    const ageP = p.age || 0;
    const ageC = newCap.age || 0;
    if (ageP > ageC) {
      newCap = p;
    } else if (ageP === ageC) {
      const avgP = p.avgRating || 0;
      const avgC = newCap.avgRating || 0;
      if (avgP > avgC) {
        newCap = p;
      } else if (avgP === avgC) {
        const ratP = p.rating || 0;
        const ratC = newCap.rating || 0;
        if (ratP > ratC) newCap = p;
      }
    }
  }

  squad.forEach((p) => (p.captain = false));
  const realPlayer = squad.find((x) => x.id === newCap.id);
  if (realPlayer) realPlayer.captain = true;
  if (isSimulation) newCap.captain = true;

  saveToLocal();
  return newCap;
}

export async function advanceSeason() {
  let evolutionLog = [];

  // Itera de trás para frente para poder remover aposentados do array com segurança
  for (let i = squad.length - 1; i >= 0; i--) {
    let p = squad[i];
    p.age = (p.age || 25) + 1;

    let evResult = 0; // -1 declínio, 0 nada, 1 evolução
    let statChanges = 0;

    if (p.age >= 36) {
      const retireChance = (p.age - 35) * 0.3;
      if (Math.random() < retireChance) {
        evolutionLog.unshift(
          `👴 <strong>${p.name}</strong> anunciou sua aposentadoria aos ${p.age} anos e deixou o clube.`,
        );
        squad.splice(i, 1);
        continue;
      }
    }

    if (p.age <= 24) {
      let matches = p.matchesPlayed || 0;
      let avg = p.avgRating || 6.0;
      if (matches > 5 && avg >= 6.5) {
        evResult = 1;
        statChanges = Math.floor(Math.random() * 3) + 2;
      } else if (Math.random() < 0.4) {
        evResult = 1;
        statChanges = Math.floor(Math.random() * 2) + 1;
      }
    } else if (p.age >= 32) {
      if (Math.random() < 0.6) {
        evResult = -1;
        statChanges = Math.floor(Math.random() * 2) + 1;
      }
    }

    if (evResult !== 0 && p.stats) {
      const statKeys = Object.keys(p.stats);
      const oldRating = p.rating;
      for (let j = 0; j < statChanges; j++) {
        const randStat = statKeys[Math.floor(Math.random() * statKeys.length)];
        if (evResult === 1)
          p.stats[randStat] = Math.min(99, p.stats[randStat] + 1);
        else p.stats[randStat] = Math.max(1, p.stats[randStat] - 1);
      }
      const isGK = p.aptitude && p.aptitude[0] === "GL";
      p.rating = calculateOVR(p.stats, p.form, isGK);

      let diff = (p.rating - oldRating).toFixed(1);
      if (diff > 0.0)
        evolutionLog.push(
          `📈 <span style="color: var(--rating-top);">Evoluiu:</span> <strong>${p.name}</strong> subiu para ${p.rating.toFixed(1)} OVR (+${diff}).`,
        );
      else if (diff < 0.0)
        evolutionLog.push(
          `📉 <span style="color: var(--danger);">Declinou:</span> <strong>${p.name}</strong> caiu para ${p.rating.toFixed(1)} OVR (${diff}).`,
        );
    }

    p.matchesPlayed = 0;
    p.sumRatings = 0;
    p.avgRating = 0;
    p.goals = 0;
    p.assists = 0;
    p.yellowCards = 0;
    p.fitness = 100;
    p.form = 0;
    p.tackles = 0;
  }

  saveToLocal();
  return evolutionLog;
}

export function resetPlayerStats() {
  squad.forEach((p) => {
    p.matchesPlayed = 0;
    p.sumRatings = 0;
    p.avgRating = 0;
    p.goals = 0;
    p.assists = 0;
    p.yellowCards = 0;
    p.fitness = 100;
    p.form = 0;
    p.tackles = 0;
  });
  saveToLocal();
}

export async function resetData() {
  await Storage.removeSquad();
  await Storage.removeTactics();
  location.reload();
}

export function updatePlayerData(id, data) {
  const pIndex = squad.findIndex((x) => x.id === id);
  if (pIndex > -1) {
    // Se o jogador atualizado for o novo capitão, desmarca os outros
    if (data.captain) {
      squad.forEach((player) => {
        if (player.id !== id) player.captain = false;
      });
    }
    // Atualiza os dados do jogador
    squad[pIndex] = { ...squad[pIndex], ...data };
    saveToLocal();
  }
}

export function performSwap(titularId, reserveId) {
  const tIndex = squad.findIndex((p) => p.id === titularId);
  const rIndex = squad.findIndex((p) => p.id === reserveId);

  if (tIndex !== -1 && rIndex !== -1) {
    squad[tIndex].status = "reserva";
    squad[rIndex].status = "titular";

    // Troca a posição física deles no array para manter a ordem tática
    const temp = squad[tIndex];
    squad[tIndex] = squad[rIndex];
    squad[rIndex] = temp;

    saveToLocal();
  }
}

export function downloadJSON() {
  const dataToSave = {
    matchInfo: matchInfo,
    squad: squad,
  };
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(dataToSave, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "data.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function addNewPlayer() {
  const newId = squad.length > 0 ? Math.max(...squad.map((p) => p.id)) + 1 : 1;
  const newPlayer = {
    id: newId,
    name: "Novo Jogador",
    number: 99,
    status: "reserva",
    aptitude: ["MC"],
    age: 20,
    foot: "Destro",
    nationality: "BR",
    playstyle: "Meia Versátil",
    form: 0,
    matchStatus: "normal",
    stats: { vel: 50, fin: 50, pas: 50, dri: 50, def: 50, fis: 50, sta: 75 },
    fitness: 100,
    rating: 5.0,
    captain: false,
  };
  squad.push(newPlayer);
  saveToLocal();
  return newId;
}

export function removePlayer(id) {
  const index = squad.findIndex((p) => p.id === id);
  if (index !== -1) {
    squad.splice(index, 1);
    saveToLocal();
  }
}

// =========================================================
// INTEGRAÇÃO API (Modo Live Strategy e Scouting)
// =========================================================
export const API_KEY = "SUA_CHAVE_AQUI"; // Substitua quando criar a conta na RapidAPI

export async function syncRealData() {
  try {
    console.log("Iniciando varredura da API...");
    // const response = await fetch('https://v3.football.api-sports.io/fixtures?team=131&next=1', {
    //     headers: { 'x-rapidapi-key': API_KEY }
    // });
    // const data = await response.json(); return data.response;
    return { status: "Aguardando Chave API" };
  } catch (error) {
    console.error("Erro ao sincronizar dados da API:", error);
  }
}

export async function initSystem() {
  try {
    let currentTeamFile = (await Storage.getCurrentTeamFile()) || "vasco.json";
    const savedSquad = await Storage.getSquad();
    const savedTactics = await Storage.getTactics();

    const savedHistory = await Storage.getMatchHistory();
    if (savedHistory) matchHistory = savedHistory;

    let remoteData = { squad: null, matchInfo: null };
    let fetchSuccess = false;

    try {
      const response = await fetch("data/teams/" + currentTeamFile, { cache: "no-store" });
      if (response.ok) {
        const textData = await response.text();
        try {
          remoteData = JSON.parse(textData);
          fetchSuccess = true;
          Object.assign(matchInfo, remoteData.matchInfo || {});
        } catch (err) {
          return `ERRO DE SINTAXE no arquivo ${currentTeamFile}! Verifique se você não apagou chaves "}" ou colchetes "]" sem querer. Detalhe: ${err.message}`;
        }
      } else {
        if (currentTeamFile !== "vasco.json")
          await Storage.removeCurrentTeamFile();
        return `ARQUIVO NÃO ENCONTRADO: data/teams/${currentTeamFile} (Erro ${response.status}). Você salvou na pasta correta e com o nome exato? (Cuidado com nomes terminados em .json.json)`;
      }
    } catch (e) {
      if (!savedSquad) {
        return "FALHA DE REDE: O sistema não conseguiu baixar os arquivos locais. O Live Server está realmente rodando na pasta raiz do projeto?";
      }
    }

    let tacticsData = null;
    try {
      const tacticsResponse = await fetch("data/tactics.json", { cache: "no-store" });
      if (tacticsResponse.ok) {
        const txtTac = await tacticsResponse.text();
        try {
          tacticsData = JSON.parse(txtTac);
        } catch (err) {
          return `ERRO DE SINTAXE no arquivo tactics.json! Detalhe: ${err.message}`;
        }
      }
    } catch (e) {
      console.warn("Falha ao carregar tactics.json separadamente.");
    }

    // Fallback de segurança garantida
    const fallbackTactics = {
      "4-2-3-1": [
        { t: 50, l: 5 },
        { t: 20, l: 20 },
        { t: 80, l: 20 },
        { t: 35, l: 20 },
        { t: 65, l: 20 },
        { t: 35, l: 40 },
        { t: 65, l: 40 },
        { t: 20, l: 65 },
        { t: 80, l: 65 },
        { t: 50, l: 65 },
        { t: 50, l: 85 },
      ],
      "4-3-3": [
        { t: 50, l: 5 },
        { t: 20, l: 20 },
        { t: 80, l: 20 },
        { t: 35, l: 20 },
        { t: 65, l: 20 },
        { t: 50, l: 40 },
        { t: 25, l: 50 },
        { t: 75, l: 50 },
        { t: 20, l: 80 },
        { t: 80, l: 80 },
        { t: 50, l: 85 },
      ],
    };

    tacticsData = tacticsData || fallbackTactics;

    Object.assign(defaultFormations, JSON.parse(JSON.stringify(tacticsData)));
    const loadedFormations = savedTactics ? savedTactics : tacticsData;
    Object.assign(formations, loadedFormations);

    if (savedTactics && tacticsData) {
      let updated = false;
      for (let f in tacticsData) {
        if (!formations[f]) {
          formations[f] = tacticsData[f];
          updated = true;
        }
      }
      if (updated) saveToLocal();
    }

    if (savedSquad) {
      const localSquad = savedSquad;
      // Trava de segurança: Verifica se precisa migrar baseado no JSON apenas se a leitura do JSON foi um sucesso
      if (
        fetchSuccess &&
        remoteData.squad &&
        ((localSquad.length > 0 && localSquad[0].positions) ||
          localSquad.length !== remoteData.squad.length ||
          localSquad[0].rating === undefined)
      ) {
        console.log(
          "Atualização de Arquitetura ou Elenco Detectada. Migrando...",
        );
        remoteData.squad.forEach((p) => {
          if (!p.aptitude) p.aptitude = p.positions || ["CA"];
          p.rating = calculateOVR(p.stats, p.form, p.aptitude[0] === "GL");
        });
        squad.push(...remoteData.squad);
        saveToLocal();
      } else {
        console.log("Dados carregados do cache local.");
        localSquad.forEach((p) => {
          if (!p.aptitude) p.aptitude = p.positions || ["CA"];
          p.rating = calculateOVR(p.stats, p.form, p.aptitude[0] === "GL");
        });
        squad.push(...localSquad);
      }
    } else if (fetchSuccess && remoteData.squad) {
      remoteData.squad.forEach((p) => {
        if (!p.aptitude) p.aptitude = p.positions || ["CA"];
        p.rating = calculateOVR(p.stats, p.form, p.aptitude[0] === "GL");
      });
      squad.push(...remoteData.squad);
      saveToLocal();
    } else {
      return `O arquivo ${currentTeamFile} foi lido, mas não possui a lista de jogadores ("squad").`;
    }
    return true;
  } catch (error) {
    console.error("Erro ao carregar o sistema tático:", error);
    return `ERRO INESPERADO NA ENGINE: ${error.message}`;
  }
}

export function resetFormationAlignment(formationName) {
  if (defaultFormations[formationName]) {
    formations[formationName] = JSON.parse(
      JSON.stringify(defaultFormations[formationName]),
    );
    saveToLocal();
  }
}
