import { Storage } from "./appStorage.js";
import { showCustomModal } from "../ui/uiModal.js";
import { calculateMarketValue, isTransferWindowOpen } from "./appUtils.js";
import { dbgToast } from "../ui/uiUtils.js";

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

export async function archiveNews(newsId) {
  const coach = await Storage.getCoachInfo();
  if (!coach.archivedNews) coach.archivedNews = [];
  if (!coach.archivedNews.includes(newsId)) {
    coach.archivedNews.push(newsId);
    await Storage.saveCoachInfo(coach);
  }
}

export async function unarchiveNews(newsId) {
  const coach = await Storage.getCoachInfo();
  if (coach.archivedNews) {
    coach.archivedNews = coach.archivedNews.filter(id => id !== newsId);
    await Storage.saveCoachInfo(coach);
  }
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
    home: homeTeam,
    away: awayTeam,
    score: `${homeScore} - ${awayScore}`,
    result: homeScore > awayScore ? "V" : homeScore === awayScore ? "E" : "D",
    date: new Date().toLocaleDateString("pt-BR"),
    timestamp: Date.now(),
  });
}

export async function applyMatchResults(
  playerRatings,
  scorersIds,
  assistsIds,
  cards,
  injuriesList,
  tacklesIds,
  playersFitness,
  compType = "league",
) {
  let updated = false;

  squad.forEach((p) => {
    if (!p.compStats) p.compStats = {};
    if (!p.compStats[compType]) {
      p.compStats[compType] = {
        goals: 0,
        assists: 0,
        matches: 0,
        sumRatings: 0,
        tackles: 0,
      };
    }

    // Atualiza a energia
    let currentFit = p.fitness !== undefined ? p.fitness : 100;
    if (playersFitness && playersFitness[p.id] !== undefined) {
      currentFit = playersFitness[p.id];
    }
    p.fitness = Math.min(100, currentFit + 5); // Recuperação base por jogo (dias reais serão passados pelo calendário)
    updated = true;

    // Atualiza a forma/moral e recalcula OVR
    if (playerRatings && playerRatings[p.id] !== undefined) {
      p.lastMatchRating = playerRatings[p.id];
      if (!p.ratingHistory) p.ratingHistory = [];
      p.ratingHistory.push(playerRatings[p.id]);
      if (p.ratingHistory.length > 5) p.ratingHistory.shift();
      
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
      const isGK = p.aptitude && p.aptitude[0] === "GOL";
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
      p.compStats[compType].goals++;
      updated = true;
    }
  });

  assistsIds.forEach((id) => {
    let p = squad.find((x) => x.id === id);
    if (p) {
      p.assists = (p.assists || 0) + 1;
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
      p.compStats[compType].tackles++;
      updated = true;
    }
  });

  if (updated) {
    // Avançar Calendário e Gerar Propostas
    const coach = await Storage.getCoachInfo();
    if (coach && coach.currentDate) {
      const d = new Date(coach.currentDate);
      const oldMonth = d.getMonth();
      d.setDate(d.getDate() + 7);
      const newMonth = d.getMonth();
      coach.currentDate = d.toISOString().split("T")[0];
      
      // Reset da sessão semanal de treinamento
      coach.trainingUsed = false;

      // Se mudou o mês, reduz tempo de contrato de todos os jogadores
      if (oldMonth !== newMonth) {
        squad.forEach((p) => {
          if (p.contractMonths === undefined) p.contractMonths = 24; 
          if (p.contractMonths > 0) p.contractMonths--;
        });
      }

      // Se a janela estiver aberta, chance de propostas para jogadores listados
      if (isTransferWindowOpen(coach.currentDate)) {
        if (!coach.proposals) coach.proposals = [];
        const listedPlayers = squad.filter(p => p.transferStatus && p.transferStatus !== "none");

        listedPlayers.forEach(p => {
          if (Math.random() < 0.3) {
            const buyerClubs = ["Real Madrid", "Chelsea", "Manchester City", "Flamengo", "Palmeiras", "Al-Hilal", "Juventus", "PSG", "Bayern", "Liverpool"];
            const club = buyerClubs[Math.floor(Math.random() * buyerClubs.length)];
            const type = p.transferStatus === "transfer" ? "Compra" : "Empréstimo";
            const variance = 0.9 + Math.random() * 0.2;
            const offerValue = Math.round((p.marketValue || 0) * variance);

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
    saveToLocal();
  }
}

export function calculateOVR(stats, form = 0, isGK = false, position = null) {
  if (!stats) return 5.0;

  let avg;
  if (isGK || position === "GOL") {
    const alc = stats.alc || stats.div || stats.sal || 70; 
    const seg = stats.seg || stats.han || stats.man || 70; 
    const esp = stats.esp || stats.par || stats.rep || 70; 
    const ref = stats.ref || 70; 
    const pos = stats.pos || 70; 
    const vel = stats.vel || stats.spd || 40;
    const sta = stats.sta || stats.stm || 50;

    avg = ref * 0.3 + pos * 0.25 + alc * 0.2 + seg * 0.15 + ((esp + vel + sta) / 3) * 0.1;
  } else {
    const vel = stats.vel || stats.pac || stats.spd || 50;
    const fin = stats.fin || stats.sho || stats.atk || 50;
    const pas = stats.pas || 50;
    const dri = stats.dri || stats.atk || 50;
    const def = stats.def || 50;
    const fis = stats.fis || stats.phy || stats.str || 50;
    const sta = stats.sta || stats.stm || 50;

    if (position === "ZE" || position === "ZD") {
      avg = def * 0.4 + fis * 0.25 + pas * 0.15 + vel * 0.1 + sta * 0.1;
    } else if (position === "LE" || position === "LD") {
      avg = def * 0.3 + vel * 0.25 + pas * 0.2 + sta * 0.15 + dri * 0.1;
    } else if (position === "VOL") {
      avg = def * 0.3 + pas * 0.25 + fis * 0.2 + sta * 0.15 + dri * 0.1;
    } else if (position === "MC") {
      avg = pas * 0.3 + dri * 0.2 + def * 0.15 + sta * 0.15 + vel * 0.1 + fin * 0.1;
    } else if (position === "MEI") {
      avg = pas * 0.35 + dri * 0.3 + fin * 0.15 + vel * 0.1 + sta * 0.1;
    } else if (position === "ME" || position === "MD") {
      avg = vel * 0.3 + dri * 0.3 + pas * 0.2 + sta * 0.1 + fin * 0.1;
    } else if (position === "PE" || position === "PD") {
      avg = vel * 0.35 + dri * 0.3 + fin * 0.2 + pas * 0.1 + sta * 0.05;
    } else if (position === "SA") {
      avg = dri * 0.3 + fin * 0.25 + pas * 0.2 + vel * 0.15 + sta * 0.1;
    } else if (position === "CA") {
      avg = fin * 0.45 + fis * 0.2 + vel * 0.15 + dri * 0.1 + sta * 0.1;
    } else {
      avg = (vel + fin + pas + dri + def + fis + sta) / 7;
    }
  }

  const formBonus = form * 1.5;
  return Math.min(99.9, Math.max(1, avg + formBonus));
}

export function updatePlayerData(playerId, newData) {
  const p = squad.find((x) => x.id === playerId);
  if (p) {
    Object.assign(p, newData);
    saveToLocal();
  }
}

export function performSwap(id1, id2) {
  const idx1 = squad.findIndex((p) => p.id === id1);
  const idx2 = squad.findIndex((p) => p.id === id2);
  if (idx1 !== -1 && idx2 !== -1) {
    const temp = squad[idx1].status;
    squad[idx1].status = squad[idx2].status;
    squad[idx2].status = temp;
    [squad[idx1], squad[idx2]] = [squad[idx2], squad[idx1]];
    saveToLocal();
  }
}

export function saveToLocal() {
  Storage.saveSquad(squad.squad || squad);
}

export async function initSystem(initialSquad) {
  dbgToast("📂 Carregando dados do save...", "#333");
  try {
    const saved = await Storage.getSquad();
    if (saved) {
      if (!Array.isArray(saved) && saved.squad) {
        squad = saved.squad;
      } else {
        squad = Array.isArray(saved) ? saved : [];
      }
      console.log(`[Core] Elenco carregado do Storage: ${squad.length} jogadores.`);
    } else {
      if (initialSquad && !Array.isArray(initialSquad) && initialSquad.squad) {
        squad = initialSquad.squad;
      } else {
        squad = Array.isArray(initialSquad) ? initialSquad : [];
      }
      console.log(`[Core] Novo elenco inicializado: ${squad.length} jogadores.`);
      saveToLocal();
    }

    const savedFormations = await Storage.getTactics();
    if (savedFormations) {
      formations = savedFormations;
    }

    const res = await fetch("data/tactics.json");
    if (res.ok) {
      defaultFormations = await res.json();
      if (!Object.keys(formations).length) {
        formations = JSON.parse(JSON.stringify(defaultFormations));
      }
    }
    
    dbgToast("✅ Sistema pronto!", "#1a5c2a");
    return true;
  } catch (err) {
    console.error("Erro no initSystem:", err);
    dbgToast("❌ Erro ao iniciar: " + err.message, "#8b0000");
    return err.message;
  }
}

export function resetFormationAlignment(formatName) {
  if (defaultFormations[formatName]) {
    formations[formatName] = JSON.parse(
      JSON.stringify(defaultFormations[formatName]),
    );
    Storage.saveTactics(formations);
  }
}

export async function downloadJSON() {
  const data = {
    squad,
    formations,
    matchHistory,
    coach: await Storage.getCoachInfo(),
    league: await Storage.getLeagueData(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fut_dashboard_save_${Date.now()}.json`;
  a.click();
}

export async function advanceSeason() {
  const evolutionLog = [];
  for (const p of squad) {
    p.age = (p.age || 25) + 1;
    const isGK = p.aptitude && p.aptitude[0] === "GOL";
    const stats = p.stats;
    const oldRating = p.rating || 75;

    for (const s in stats) {
      let change = 0;
      if (p.age <= 23) change = Math.floor(Math.random() * 4); 
      else if (p.age <= 28) change = Math.floor(Math.random() * 2); 
      else if (p.age >= 33) change = -Math.floor(Math.random() * 3); 

      stats[s] = Math.min(99, Math.max(1, stats[s] + change));
    }

    p.rating = calculateOVR(stats, 0, isGK, p.aptitude ? p.aptitude[0] : null);
    p.marketValue = calculateMarketValue(p.rating, p.age);

    const diff = (p.rating - oldRating).toFixed(1);
    if (Math.abs(diff) > 0.1) {
      if (diff > 0)
        evolutionLog.push(
          `📈 <span style="color: var(--accent);">Evoluiu:</span> <strong>${p.name}</strong> (+${diff}).`,
        );
      else if (diff < 0)
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

export function ensureCaptain() {
  if (squad.length > 0 && !squad.some((p) => p.captain)) {
    squad[0].captain = true;
  }
}

export function removePlayer(playerId) {
  const index = squad.findIndex((p) => p.id === playerId);
  if (index !== -1) {
    squad.splice(index, 1);
    saveToLocal();
    return true;
  }
  return false;
}
