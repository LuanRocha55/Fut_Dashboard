import { Storage } from "./appStorage.js";
import { showCustomModal } from "../ui/uiModal.js";
import { calculateMarketValue, isTransferWindowOpen } from "./appUtils.js";

export let squad = [];
export let formations = {};
export let defaultFormations = {};
export let matchInfo = {};
export let activePlayerId = null;
export let matchHistory = [];

export const ALL_POSITIONS = [
  "GOL",
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

export function expandAptitudes(originalAptitudes) {
  if (!originalAptitudes || !Array.isArray(originalAptitudes)) return ["CA"];
  const expanded = new Set(originalAptitudes);

  const map = {
    ZE: ["ZD", "VOL"],
    ZD: ["ZE", "VOL"],
    LE: ["ZE", "ME"],
    LD: ["ZD", "MD"],
    VOL: ["MC", "ZE", "ZD"],
    MC: ["VOL", "MEI"],
    MEI: ["MC", "SA", "PE", "PD"],
    ME: ["LE", "PE", "MC"],
    MD: ["LD", "PD", "MC"],
    PE: ["ME", "SA", "PD"],
    PD: ["MD", "SA", "PE"],
    SA: ["CA", "MEI", "PE", "PD"],
    CA: ["SA"],
  };

  originalAptitudes.forEach((pos) => {
    if (map[pos]) {
      map[pos].forEach((sec) => expanded.add(sec));
    }
  });

  return Array.from(expanded);
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
  matchHistory.push({
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    timestamp: new Date().toISOString(),
  });
  if (matchHistory.length > 10) matchHistory.shift();
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
  compType = "league",
) {
  let updated = false;

  squad.forEach((p) => {
    // Inicializa stats por competição se não existir
    if (!p.compStats) p.compStats = {};
    if (!p.compStats[compType])
      p.compStats[compType] = {
        goals: 0,
        assists: 0,
        matches: 0,
        sumRatings: 0,
        tackles: 0,
      };

    // Recupera jogadores suspensos ou machucados
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

    // Atualiza a energia
    let currentFit = p.fitness !== undefined ? p.fitness : 100;
    if (playersFitness && playersFitness[p.id] !== undefined) {
      currentFit = playersFitness[p.id];
    }
    p.fitness = Math.min(100, currentFit + daysPassed * 12);
    updated = true;

    // Atualiza a forma/moral e recalcula OVR
    if (playerRatings && playerRatings[p.id] !== undefined) {
      p.lastMatchRating = playerRatings[p.id];
      p.matchesPlayed = (p.matchesPlayed || 0) + 1;
      p.sumRatings = (p.sumRatings || 0) + playerRatings[p.id];
      p.avgRating = p.sumRatings / p.matchesPlayed;

      // Stats da Competição
      p.compStats[compType].matches++;
      p.compStats[compType].sumRatings += playerRatings[p.id];

      let currentForm = p.form !== undefined ? p.form : 0;
      if (playerRatings[p.id] >= 8.5)
        currentForm = Math.min(2, currentForm + 1);
      else if (playerRatings[p.id] <= 5.0)
        currentForm = Math.max(-2, currentForm - 1);

      p.form = currentForm;
      const isGK = p.aptitude && p.aptitude[0] === "GL";
      p.rating = calculateOVR(
        p.stats,
        p.form,
        isGK,
        p.aptitude ? p.aptitude[0] : null,
      );
    }
  });

  scorersIds.forEach((id) => {
    let p = squad.find((x) => x.id === id);
    if (p) {
      p.goals = (p.goals || 0) + 1;
      if (!p.compStats) p.compStats = {};
      if (!p.compStats[compType])
        p.compStats[compType] = {
          goals: 0,
          assists: 0,
          matches: 0,
          sumRatings: 0,
          tackles: 0,
        };
      p.compStats[compType].goals++;
      updated = true;
    }
  });

  assistsIds.forEach((id) => {
    let p = squad.find((x) => x.id === id);
    if (p) {
      p.assists = (p.assists || 0) + 1;
      if (!p.compStats) p.compStats = {};
      if (!p.compStats[compType])
        p.compStats[compType] = {
          goals: 0,
          assists: 0,
          matches: 0,
          sumRatings: 0,
          tackles: 0,
        };
      p.compStats[compType].assists++;
      updated = true;
    }
  });

  cards.forEach((c) => {
    let p = squad.find((x) => x.id === c.id);
    if (p) {
      if (c.type === "red") {
        p.matchStatus = "red";
        p.status = "reserva";
      } else if (c.type === "yellow") {
        p.yellowCards = (p.yellowCards || 0) + 1;
        if (p.yellowCards >= 3) {
          p.matchStatus = "red";
          p.status = "reserva";
          p.yellowCards = 0;
        }
      }
      updated = true;
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
      if (!p.compStats) p.compStats = {};
      if (!p.compStats[compType])
        p.compStats[compType] = {
          goals: 0,
          assists: 0,
          matches: 0,
          sumRatings: 0,
          tackles: 0,
        };
      p.compStats[compType].tackles++;
      updated = true;
    }
  });

  if (updated) {
    // Avançar Calendário e Gerar Propostas
    Storage.getCoachInfo().then(async (coach) => {
      if (coach && coach.currentDate) {
        const d = new Date(coach.currentDate);
        d.setDate(d.getDate() + 7);
        coach.currentDate = d.toISOString().split("T")[0];

        // Se a janela estiver aberta, chance de propostas para jogadores listados
        if (isTransferWindowOpen(coach.currentDate)) {
          if (!coach.proposals) coach.proposals = [];
          
          const listedPlayers = squad.filter(p => p.transferStatus && p.transferStatus !== "none");
          
          listedPlayers.forEach(p => {
            // 30% de chance de proposta por jogo por jogador listado
            if (Math.random() < 0.3) {
              const buyerClubs = ["Real Madrid", "Chelsea", "Manchester City", "Flamengo", "Palmeiras", "Al-Hilal", "Juventus", "PSG", "Bayern", "Liverpool", "Inter", "Benfica"];
              const club = buyerClubs[Math.floor(Math.random() * buyerClubs.length)];
              const type = p.transferStatus === "transfer" ? "Compra" : "Empréstimo";
              
              // Valor da proposta: 90% a 110% do valor de mercado
              const variance = 0.9 + Math.random() * 0.2;
              const offerValue = Math.round((p.marketValue || 0) * variance);

              // Evitar duplicados para o mesmo jogador do mesmo clube
              if (!coach.proposals.some(pr => pr.playerId === p.id && pr.from === club)) {
                coach.proposals.push({
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  playerId: p.id,
                  playerName: p.name,
                  from: club,
                  value: offerValue,
                  type: type,
                  date: coach.currentDate
                });
              }
            }
          });
        }

        await Storage.saveCoachInfo(coach);
      }
    });
    saveToLocal();
  }
}

export function calculateOVR(stats, form = 0, isGK = false, position = null) {
  if (!stats) return 5.0;

  let avg;
  if (isGK || position === "GOL") {
    const alc = stats.alc || stats.div || stats.sal || 70; // Reach / Alcance
    const seg = stats.seg || stats.han || stats.man || 70; // Catching / Segurança
    const esp = stats.esp || stats.par || stats.rep || 70; // Parrying / Espalmada
    const ref = stats.ref || 70; // Reflexes
    const pos = stats.pos || 70; // Awareness / Posicionamento
    const vel = stats.vel || stats.spd || 40;
    const sta = stats.sta || stats.stm || 50;

    // Pesos eFootball: Reflexos (30%), Posicionamento (25%), Alcance (20%)
    avg =
      ref * 0.3 +
      pos * 0.25 +
      alc * 0.2 +
      seg * 0.15 +
      ((esp + vel + sta) / 3) * 0.1;
  } else {
    const vel = stats.vel || stats.pac || stats.spd || 50;
    const fin = stats.fin || stats.sho || stats.atk || 50;
    const pas = stats.pas || stats.pass || 50;
    const dri = stats.dri || stats.dribble || 50;
    const def = stats.def || stats.defense || 50;
    const fis = stats.fis || stats.phy || stats.str || 50;
    const sta = stats.sta || stats.stm || 70;

    if (["ZE", "ZD", "LE", "LD"].includes(position)) {
      avg = def * 0.5 + fis * 0.2 + vel * 0.15 + pas * 0.1 + sta * 0.05;
    } else if (["VOL", "MC", "MEI", "ME", "MD"].includes(position)) {
      avg = pas * 0.4 + dri * 0.2 + def * 0.15 + fis * 0.15 + sta * 0.1;
    } else if (["PE", "PD", "SA", "CA"].includes(position)) {
      avg = fin * 0.5 + vel * 0.2 + dri * 0.2 + pas * 0.05 + sta * 0.05;
    } else {
      avg = (vel + fin + pas + dri + def + fis + sta) / 7;
    }
  }

  const formBonus = form * 2; // Bônus de forma agora proporcional (1 estrela = +2 OVR)
  return Math.min(99, Math.max(1, Math.round(avg + formBonus)));
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
        p &&
        p.status === "titular" &&
        p.matchStatus !== "red" &&
        p.matchStatus !== "injury",
    );
    isSimulation = false;
  }

  if (checkPool.length === 0) return null;
  if (checkPool.some((p) => p.captain)) return null;

  let newCap = checkPool.reduce((prev, current) => {
    if ((current.age || 0) > (prev.age || 0)) return current;
    if ((current.age || 0) === (prev.age || 0)) {
      if ((current.avgRating || 0) > (prev.avgRating || 0)) return current;
      if ((current.rating || 0) > (prev.rating || 0)) return current;
    }
    return prev;
  });

  squad.forEach((p) => (p.captain = false));
  const realPlayer = squad.find((x) => x && x.id === newCap.id);
  if (realPlayer) realPlayer.captain = true;
  if (isSimulation) newCap.captain = true;

  saveToLocal();
  return newCap;
}

export async function advanceSeason() {
  let evolutionLog = [];
  for (let i = squad.length - 1; i >= 0; i--) {
    let p = squad[i];
    p.age = (p.age || 25) + 1;
    let evResult = 0;
    let statChanges = 0;

    if (p.age >= 36 && Math.random() < (p.age - 35) * 0.3) {
      evolutionLog.unshift(
        `👴 <strong>${p.name}</strong> anunciou sua aposentadoria aos ${p.age} anos.`,
      );
      squad.splice(i, 1);
      continue;
    }

    if (p.age <= 24) {
      if ((p.matchesPlayed || 0) > 5 && (p.avgRating || 6.0) >= 6.5) {
        evResult = 1;
        statChanges = Math.floor(Math.random() * 3) + 2;
      } else if (Math.random() < 0.4) {
        evResult = 1;
        statChanges = Math.floor(Math.random() * 2) + 1;
      }
    } else if (p.age >= 32 && Math.random() < 0.6) {
      evResult = -1;
      statChanges = Math.floor(Math.random() * 2) + 1;
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
      p.rating = calculateOVR(
        p.stats,
        p.form,
        p.aptitude && p.aptitude[0] === "GL",
        p.aptitude ? p.aptitude[0] : null,
      );
      let diff = (p.rating && oldRating) ? (p.rating - oldRating).toFixed(1) : "0.0";
      if (diff > 0.0)
        evolutionLog.push(
          `📈 <span style="color: var(--rating-top);">Evoluiu:</span> <strong>${p.name}</strong> (+${diff}).`,
        );
      else if (diff < 0.0)
        evolutionLog.push(
          `📉 <span style="color: var(--danger);">Declinou:</span> <strong>${p.name}</strong> (${diff}).`,
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

  const reportHtml = `
    <div style="text-align: center; margin-bottom: 15px;">
        <h3 style="color: var(--accent); margin: 0 0 5px 0;">Fim de Temporada!</h3>
        <p style="font-size: 1rem; color: #aaa; margin: 0;">Relatório de Desempenho e Evolução</p>
    </div>
    <div style="max-height: 350px; overflow-y: auto; text-align: left; background: #1a1a1a; padding: 15px; border-radius: 8px; font-size: 0.9rem;">
        ${evolutionLog.length > 0 ? evolutionLog.map((l) => `<div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #333;">${l}</div>`).join("") : "<div style='text-align: center; color: #888;'>Nenhum jogador teve alterações significativas de atributos nesta temporada.</div>"}
    </div>
  `;
  await showCustomModal(reportHtml, "alert", "btn-primary");

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

export function updatePlayerData(id, data) {
  const pIndex = squad.findIndex((x) => x.id === id);
  if (pIndex > -1) {
    if (data.captain)
      squad.forEach((p) => {
        if (p.id !== id) p.captain = false;
      });
    squad[pIndex] = { ...squad[pIndex], ...data };
    saveToLocal();
  }
}

export function performSwap(titularId, reserveId) {
  const tIndex = squad.findIndex((p) => p && p.id === titularId);
  const rIndex = squad.findIndex((p) => p && p.id === reserveId);

  if (tIndex !== -1 && rIndex !== -1) {
    const isTitularSlot = tIndex < 11;
    const isReserveSlot = rIndex >= 11;

    // Se sai de um slot do campo, vira reserva
    if (isTitularSlot) squad[tIndex].status = "reserva";
    // Se entra em um slot do campo, vira titular
    if (isReserveSlot) squad[rIndex].status = "titular";

    const temp = squad[tIndex];
    squad[tIndex] = squad[rIndex];
    squad[rIndex] = temp;

    saveToLocal();
  }
}

export function downloadJSON() {
  const dataToSave = { matchInfo: matchInfo, squad: squad };
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

export async function initSystem() {
  try {
    squad.length = 0;
    matchHistory.length = 0;
    let currentTeamFile = (await Storage.getCurrentTeamFile()) || "vasco.json";
    const savedSquad = await Storage.getSquad();
    const savedTactics = await Storage.getTactics();
    const savedHistory = await Storage.getMatchHistory();
    if (savedHistory) matchHistory = savedHistory;

    let remoteData = { squad: null, matchInfo: null };

    try {
      const response = await fetch("data/teams/" + currentTeamFile, {
        cache: "no-store",
      });
      if (response.ok) {
        remoteData = await response.json();
        Object.assign(matchInfo, remoteData.matchInfo || {});
      } else {
        if (currentTeamFile !== "vasco.json")
          await Storage.removeCurrentTeamFile();
        return `ERRO: Arquivo ${currentTeamFile} não encontrado.`;
      }
    } catch (e) {
      if (!savedSquad)
        return "ERRO DE REDE: O sistema não conseguiu carregar os dados iniciais.";
    }

    let tacticsData = null;
    try {
      const tacticsResponse = await fetch("data/tactics.json", {
        cache: "no-store",
      });
      if (tacticsResponse.ok) tacticsData = await tacticsResponse.json();
    } catch (e) {
      console.warn("Falha ao carregar tactics.json");
    }

    const fallbackTactics = {
      "4-2-3-1": [
        { t: 50, l: 5 },
        { t: 20, l: 20 },
        { t: 80, l: 20 },
        { t: 35, l: 20 },
        { t: 65, l: 20 },
        { t: 35, l: 35 },
        { t: 65, l: 35 },
        { t: 20, l: 65 },
        { t: 80, l: 65 },
        { t: 50, l: 65 },
        { t: 50, l: 92 },
      ],
      "4-3-3": [
        { t: 50, l: 5 },
        { t: 20, l: 20 },
        { t: 80, l: 20 },
        { t: 35, l: 20 },
        { t: 65, l: 20 },
        { t: 50, l: 35 },
        { t: 25, l: 50 },
        { t: 75, l: 50 },
        { t: 20, l: 78 },
        { t: 80, l: 78 },
        { t: 50, l: 92 },
      ],
    };

    tacticsData = tacticsData || fallbackTactics;
    Object.assign(defaultFormations, tacticsData);
    Object.assign(formations, savedTactics || tacticsData);

    const sourceSquad =
      savedSquad && savedSquad.length > 0
        ? savedSquad
        : remoteData.squad && remoteData.squad.length > 0
          ? remoteData.squad
          : null;

    if (sourceSquad) {
      sourceSquad.forEach((p) => {
        // Garantir que temos aptidões base
        if (!p.aptitude) p.aptitude = p.positions || ["CA"];

        // Se o jogador já tem MUITAS posições, ele provavelmente já foi expandido.
        // Vamos expandir apenas se a lista for curta (original), evitando recursividade infinita no save.
        if (p.aptitude.length < 5) {
          p.aptitude = expandAptitudes(p.aptitude);
        }

        const isGK =
          p.aptitude &&
          (p.aptitude.includes("GOL") || p.aptitude.includes("GL"));
        p.rating = calculateOVR(p.stats, p.form, isGK, p.aptitude[0]) || 5.0;

        // Enriquecimento: Valor de Mercado
        if (!p.marketValue) {
          p.marketValue = calculateMarketValue(p.rating, p.age || 25);
        }
      });
      squad.push(...sourceSquad);
      saveToLocal();
    } else {
      return "ERRO: Lista de jogadores não encontrada.";
    }
    return true;
  } catch (error) {
    console.error("Erro no initSystem:", error);
    return `ERRO CRÍTICO: ${error.message}`;
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
