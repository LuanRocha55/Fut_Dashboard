import { Storage } from "./storage.js";
import { showCustomModal } from "./modal.js";
import { matchInfo, advanceSeason, resetPlayerStats } from "./core.js";
import { LEAGUES } from "./leagueConfig.js";
import {
  fixtureViewMode,
  selectedRoundIndex,
  selectedMonth,
  currentViewDivision,
  updateLeagueState,
  renderLeagueData,
  renderFixtures,
  renderContinental,
  renderLeagueScorers,
  renderSeasonHistory,
  renderCup,
  renderLeagueAssists,
  renderLeagueRatings
} from "./leagueRenderer.js";

export function getMatchDate(type, index, totalRounds) {
  if (type === "league") {
    const month = Math.floor((index * 12) / totalRounds);
    let roundsInMonthBefore = 0;
    for (let i = 0; i < index; i++) {
      if (Math.floor((i * 12) / totalRounds) === month) roundsInMonthBefore++;
    }
    const day = 4 + roundsInMonthBefore * 7;
    return month * 30 + day;
  } else if (type === "cup") {
    const cupPhaseMap = { 0: 3, 1: 6, 2: 9, 3: 11 };
    const month = cupPhaseMap[index];
    return month * 30 + 15;
  } else if (type === "continental") {
    const contPhaseMap = { 0: 2, 1: 5, 2: 8, 3: 10 };
    const month = contPhaseMap[index];
    return month * 30 + 15;
  }
  return 9999;
}

export function formatMatchDate(dateNumber) {
  if (dateNumber === 9999) return "";
  const month = Math.floor(dateNumber / 30);
  const day = dateNumber % 30 || 1;
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const weekDays = ["Ter", "Qua", "Qui", "Sex", "Sáb", "Dom", "Seg"];
  const wd = weekDays[dateNumber % 7];
  return `${wd}, ${day} ${months[month]}`;
}

export function initLeagueEvents() {
  const tabStandings = document.getElementById("tabStandings");
  const tabCup = document.getElementById("tabCup");
  const tabContinental = document.getElementById("tabContinental");
  const tabFixtures = document.getElementById("tabFixtures");
  const tabStats = document.getElementById("tabStats");
  const tabHistory = document.getElementById("tabHistory");

  const contentStandings = document.getElementById("leagueStandingsContent");
  const contentCup = document.getElementById("leagueCupContent");
  const contentContinental = document.getElementById("leagueContinentalContent");
  const contentFixtures = document.getElementById("leagueFixturesContent");
  const contentStats = document.getElementById("leagueStatsContent");
  const contentHistory = document.getElementById("leagueHistoryContent");

  if (!tabStandings) return;

  tabStandings.onclick = () => {
    tabStandings.className = "btn-primary";
    tabCup.className = "btn-secondary";
    if (tabContinental) tabContinental.className = "btn-secondary";
    tabFixtures.className = "btn-secondary";
    tabStats.className = "btn-secondary";
    if (tabHistory) tabHistory.className = "btn-secondary";
    contentStandings.style.display = "block";
    contentCup.style.display = "none";
    if (contentContinental) contentContinental.style.display = "none";
    contentFixtures.style.display = "none";
    contentStats.style.display = "none";
    if (contentHistory) contentHistory.style.display = "none";
  };

  if (tabCup) {
    tabCup.onclick = () => {
      tabStandings.className = "btn-secondary";
      tabCup.className = "btn-primary";
      if (tabContinental) tabContinental.className = "btn-secondary";
      tabFixtures.className = "btn-secondary";
      tabStats.className = "btn-secondary";
      if (tabHistory) tabHistory.className = "btn-secondary";
      contentStandings.style.display = "none";
      contentCup.style.display = "block";
      if (contentContinental) contentContinental.style.display = "none";
      contentFixtures.style.display = "none";
      contentStats.style.display = "none";
      if (contentHistory) contentHistory.style.display = "none";
      renderCup();
    };
  }

  if (tabContinental) {
    tabContinental.onclick = () => {
      tabStandings.className = "btn-secondary";
      tabCup.className = "btn-secondary";
      tabContinental.className = "btn-primary";
      tabFixtures.className = "btn-secondary";
      tabStats.className = "btn-secondary";
      if (tabHistory) tabHistory.className = "btn-secondary";
      contentStandings.style.display = "none";
      contentCup.style.display = "none";
      contentContinental.style.display = "block";
      contentFixtures.style.display = "none";
      contentStats.style.display = "none";
      if (contentHistory) contentHistory.style.display = "none";
      renderContinental();
    };
  }

  tabFixtures.onclick = () => {
    tabStandings.className = "btn-secondary";
    tabCup.className = "btn-secondary";
    if (tabContinental) tabContinental.className = "btn-secondary";
    tabFixtures.className = "btn-primary";
    tabStats.className = "btn-secondary";
    if (tabHistory) tabHistory.className = "btn-secondary";
    contentStandings.style.display = "none";
    contentCup.style.display = "none";
    if (contentContinental) contentContinental.style.display = "none";
    contentFixtures.style.display = "block";
    contentStats.style.display = "none";
    if (contentHistory) contentHistory.style.display = "none";
    renderFixtures(true);
  };

  const monthSelect = document.getElementById("fixtureMonthSelect");
  const viewModeSelect = document.getElementById("fixtureViewMode");
  const roundControl = document.getElementById("fixtureRoundControl");
  const prevRoundBtn = document.getElementById("prevRoundBtn");
  const nextRoundBtn = document.getElementById("nextRoundBtn");

  if (viewModeSelect) {
    viewModeSelect.addEventListener("change", (e) => {
      updateLeagueState({ fixtureViewMode: e.target.value });
      if (e.target.value === "month") {
        monthSelect.style.display = "block";
        roundControl.style.display = "none";
      } else {
        monthSelect.style.display = "none";
        roundControl.style.display = "flex";
      }
      renderFixtures();
    });
  }

  if (monthSelect) {
    monthSelect.addEventListener("change", (e) => {
      updateLeagueState({ selectedMonth: parseInt(e.target.value, 10) });
      renderFixtures();
    });
  }

  if (prevRoundBtn) {
    prevRoundBtn.addEventListener("click", () => {
      if (selectedRoundIndex > 0) {
        updateLeagueState({ selectedRoundIndex: selectedRoundIndex - 1 });
        renderFixtures();
      }
    });
  }

  if (nextRoundBtn) {
    nextRoundBtn.addEventListener("click", async () => {
      const data = await Storage.getLeagueData();
      if (data && selectedRoundIndex < data.rounds.length - 1) {
        updateLeagueState({ selectedRoundIndex: selectedRoundIndex + 1 });
        renderFixtures();
      }
    });
  }

  tabStats.onclick = () => {
    tabStandings.className = "btn-secondary";
    tabCup.className = "btn-secondary";
    if (tabContinental) tabContinental.className = "btn-secondary";
    tabFixtures.className = "btn-secondary";
    tabStats.className = "btn-primary";
    if (tabHistory) tabHistory.className = "btn-secondary";
    contentStandings.style.display = "none";
    contentCup.style.display = "none";
    if (contentContinental) contentContinental.style.display = "none";
    contentFixtures.style.display = "none";
    contentStats.style.display = "block";
    if (contentHistory) contentHistory.style.display = "none";
    renderLeagueScorers();
    renderLeagueAssists();
    renderLeagueRatings();
  };

  if (tabHistory) {
    tabHistory.onclick = () => {
      tabStandings.className = "btn-secondary";
      tabCup.className = "btn-secondary";
      if (tabContinental) tabContinental.className = "btn-secondary";
      tabFixtures.className = "btn-secondary";
      tabStats.className = "btn-secondary";
      tabHistory.className = "btn-primary";
      contentStandings.style.display = "none";
      contentCup.style.display = "none";
      if (contentContinental) contentContinental.style.display = "none";
      contentFixtures.style.display = "none";
      contentStats.style.display = "none";
      contentHistory.style.display = "block";
      renderSeasonHistory();
    };
  }

  document.getElementById("newLeagueBtn").onclick = async () => {
    const proceed = await showCustomModal(
      "Criar um novo Campeonato apagará o progresso atual. Deseja continuar?",
      "confirm",
      "btn-danger",
    );
    if (proceed) {
      resetPlayerStats();
      const leagueType =
        document.getElementById("leagueTypeSelect")?.value || "br";
      await createNewLeague(leagueType);
      renderLeagueData();
    }
  };

  document.getElementById("simRoundBtn").onclick = async () => {
    await simulateCurrentRound(false);
    await renderLeagueData();
  };

  const simAllBtn = document.getElementById("simAllRoundsBtn");
  if (simAllBtn) {
    simAllBtn.onclick = async () => {
      let data = await Storage.getLeagueData();
      if (!data || data.currentRound > data.rounds.length) {
        showCustomModal(
          "O campeonato já terminou ou não foi iniciado!",
          "alert",
          "btn-warning",
        );
        return;
      }

      const proceed = await showCustomModal(
        "Atenção: Deseja simular TODAS as rodadas restantes automaticamente? Seus jogos pendentes também serão simulados pela IA. Isso não pode ser desfeito.",
        "confirm",
        "btn-danger",
      );

      if (proceed) {
        simAllBtn.innerText = "Simulando...";
        simAllBtn.disabled = true;

        while (data.currentRound <= data.rounds.length) {
          await simulateCurrentRound(true);
          data = await Storage.getLeagueData(); // Refresh current iteration state
        }

        simAllBtn.innerText = "Simular Restante 🚀";
        simAllBtn.disabled = false;

        await renderLeagueData();
        showCustomModal(
          "Simulação completa! O campeonato chegou ao fim.",
          "alert",
          "btn-primary",
        );
      }
    };
  }

  const simCupBtn = document.getElementById("simCupBtn");
  if (simCupBtn) {
    simCupBtn.onclick = async () => {
      const data = await Storage.getLeagueData();
      if (!data || !data.cup) return;
      if (data.cup.finished) {
        showCustomModal("A Copa já terminou!", "alert", "btn-warning");
        return;
      }

      const phaseIdx = data.cup.currentPhaseIndex;
      const matches = data.cup.phases[phaseIdx];
      const winners = [];

      matches.forEach((m) => {
        if (!m.played) {
          const hOvr = data.table.find((t) => t.id === m.home)?.ovr || 75;
          const aOvr = data.table.find((t) => t.id === m.away)?.ovr || 75;
          let hScore = Math.floor(Math.random() * 3);
          let aScore = Math.floor(Math.random() * 3);
          if (hOvr > aOvr + 5) hScore += 1;
          if (aOvr > hOvr + 5) aScore += 1;
          let hPen = null,
            aPen = null;
          if (hScore === aScore) {
            hPen = Math.floor(Math.random() * 4) + 2;
            aPen = Math.floor(Math.random() * 4) + 2;
            if (hPen === aPen) hPen++;
          }
          m.homeScore = hScore;
          m.awayScore = aScore;
          m.homePen = hPen;
          m.awayPen = aPen;
          m.played = true;
        }
        const homeWon =
          m.homeScore > m.awayScore ||
          (m.homeScore === m.awayScore && m.homePen > m.awayPen);
        winners.push(homeWon ? m.home : m.away);
      });

      if (phaseIdx < 3) {
        const nextPhase = [];
        for (let i = 0; i < winners.length; i += 2)
          nextPhase.push({
            home: winners[i],
            away: winners[i + 1],
            played: false,
            homeScore: null,
            awayScore: null,
            homePen: null,
            awayPen: null,
          });
        data.cup.phases.push(nextPhase);
        data.cup.currentPhaseIndex++;
        showCustomModal(
          "Fase da Copa simulada! Veja quem passou para a próxima fase.",
          "alert",
          "btn-primary",
        );
      } else {
        data.cup.finished = true;
        data.cup.winner = winners[0];
        showCustomModal(
          "GRANDE FINAL ENCERRADA! O Campeão foi definido!",
          "alert",
          "btn-warning",
        );
      }
      await Storage.saveLeagueData(data);
      renderCup();
    };
  }

  const simContinentalBtn = document.getElementById("simContinentalBtn");
  if (simContinentalBtn) {
    simContinentalBtn.onclick = async () => {
      const data = await Storage.getLeagueData();
      if (!data || !data.continentalCup) return;
      if (data.continentalCup.finished) {
        showCustomModal("O torneio já terminou!", "alert", "btn-warning");
        return;
      }

      const phaseIdx = data.continentalCup.currentPhaseIndex;
      const matches = data.continentalCup.phases[phaseIdx];
      const winners = [];
      
      const getTeamOvr = (id) => {
          const flat = data.divisions ? data.divisions.flatMap(d => d.table) : [];
          let t = flat.find(x => x.id === id);
          if (t) return t.ovr || 75;
          return 75; // Genérico estrangeiro
      };

      matches.forEach((m) => {
        if (!m.played) {
          const hOvr = getTeamOvr(m.home);
          const aOvr = getTeamOvr(m.away);
          let hScore = Math.floor(Math.random() * 3);
          let aScore = Math.floor(Math.random() * 3);
          if (hOvr > aOvr + 5) hScore += 1;
          if (aOvr > hOvr + 5) aScore += 1;
          let hPen = null, aPen = null;
          if (hScore === aScore) {
            hPen = Math.floor(Math.random() * 4) + 2;
            aPen = Math.floor(Math.random() * 4) + 2;
            if (hPen === aPen) hPen++;
          }
          m.homeScore = hScore; m.awayScore = aScore;
          m.homePen = hPen; m.awayPen = aPen; m.played = true;
        }
        const homeWon = m.homeScore > m.awayScore || (m.homeScore === m.awayScore && m.homePen > m.awayPen);
        winners.push(homeWon ? m.home : m.away);
      });

      if (phaseIdx < 3) {
        const nextPhase = [];
        for (let i = 0; i < winners.length; i += 2)
          nextPhase.push({ home: winners[i], away: winners[i + 1], played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null });
        data.continentalCup.phases.push(nextPhase);
        data.continentalCup.currentPhaseIndex++;
        showCustomModal("Fase Continental simulada! Veja quem passou para a próxima fase.", "alert", "btn-primary");
      } else {
        data.continentalCup.finished = true;
        data.continentalCup.winner = winners[0];
        showCustomModal("A GRANDE FINAL FOI DECIDIDA! O Campeão Continental foi coroado!", "alert", "btn-warning");
      }
      await Storage.saveLeagueData(data);
      renderContinental();
    };
  }

  const nextSeasonBtn = document.getElementById("nextSeasonBtn");
  if (nextSeasonBtn) {
    nextSeasonBtn.onclick = async () => {
      const proceed = await showCustomModal(
        "Avançar para a próxima temporada? Isso envelhecerá os jogadores, jovens podem evoluir, veteranos podem declinar ou se aposentar, e uma nova Liga será gerada.",
        "confirm",
        "btn-primary",
      );
      if (proceed) {
        const currentData = await Storage.getLeagueData();
        let leagueWinner = "Nenhum";
        let cupWinnerName = "Nenhum";
        let topScorerStr = "Nenhum";

        if (currentData) {
          let history = (await Storage.getSeasonHistory()) || [];

          let topDiv = currentData.divisions ? currentData.divisions[0] : currentData;
          topDiv.table.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.w !== a.w) return b.w - a.w;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
          });

          leagueWinner = topDiv.table[0].name;
          if (currentData.cup && currentData.cup.winner) {
            const allTeams = currentData.divisions ? currentData.divisions.flatMap(d => d.table) : currentData.table;
            const cWinner = currentData.table.find(
              (t) => t.id === currentData.cup.winner,
            );
            if (cWinner) cupWinnerName = cWinner.name;
          }

          if (currentData.scorers) {
            const scorersArr = Object.values(currentData.scorers).sort(
              (a, b) => b.goals - a.goals,
            );
            if (scorersArr.length > 0)
              topScorerStr = `${scorersArr[0].name} (${scorersArr[0].team}) - ${scorersArr[0].goals} gols`;
          }

          history.push({
            season: history.length + 1,
            leagueWinner,
            cupWinner: cupWinnerName,
            topScorer: topScorerStr,
          });
          await Storage.saveSeasonHistory(history);
        }

        const evolutionLog = await advanceSeason();
        const leagueType =
          document.getElementById("leagueTypeSelect")?.value || "br";
        await createNewLeague(leagueType, currentData.divisions);

        let reportHTML = `
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: var(--warning); margin: 0;">🏆 Fim de Temporada!</h2>
            <p style="color: #ccc; font-size: 0.9rem; margin-top: 5px;">Confira o resumo do ano no futebol nacional.</p>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border: 1px solid #333; text-align: center;">
                <h4 style="color: #888; margin: 0 0 10px 0; font-size: 0.8rem; text-transform: uppercase;">Campeão da Liga</h4>
                <div style="font-size: 1.1rem; font-weight: bold; color: var(--accent);">${leagueWinner}</div>
            </div>
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border: 1px solid #333; text-align: center;">
                <h4 style="color: #888; margin: 0 0 10px 0; font-size: 0.8rem; text-transform: uppercase;">Campeão da Copa</h4>
                <div style="font-size: 1.1rem; font-weight: bold; color: var(--warning);">${cupWinnerName}</div>
            </div>
            <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border: 1px solid #333; text-align: center; grid-column: 1 / span 2;">
                <h4 style="color: #888; margin: 0 0 10px 0; font-size: 0.8rem; text-transform: uppercase;">Artilheiro do Ano</h4>
                <div style="font-size: 1rem; font-weight: bold; color: #00aaff;">${topScorerStr}</div>
            </div>
          </div>
          <h4 style="color: var(--accent); margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; font-size: 0.9rem;">Evolução do Elenco (Relatório Técnico)</h4>
          <div style="max-height: 200px; overflow-y: auto; text-align: left; font-size: 0.85rem; background: #1a1a1a; padding: 10px; border-radius: 8px;">
        `;
        if (evolutionLog.length > 0)
          reportHTML += evolutionLog
            .map(
              (log) =>
                `<div style="padding: 8px 5px; border-bottom: 1px solid #333;">${log}</div>`,
            )
            .join("");
        else
          reportHTML += `<div style="padding: 8px 5px;">A temporada virou, mas nenhuma mudança drástica ocorreu no elenco.</div>`;
        reportHTML += `</div>`;

        await showCustomModal(reportHTML, "alert", "btn-primary");
        renderLeagueData();
      }
    };
  }
}

async function createNewLeague(leagueType = "br", existingDivisions = null) {
  const myTeamName = matchInfo.home || "Meu Time";
  const myTeamId = (await Storage.getCurrentTeamFile()) || "meu_time";
  let divisions = [];

  if (existingDivisions) {
    divisions = existingDivisions;
    // Promoção e Rebaixamento
    for (let i = 0; i < divisions.length - 1; i++) {
      let higherDiv = divisions[i];
      let lowerDiv = divisions[i + 1];
      higherDiv.table.sort((a, b) => b.pts - a.pts || b.w - a.w || b.gd - a.gd || b.gf - a.gf);
      lowerDiv.table.sort((a, b) => b.pts - a.pts || b.w - a.w || b.gd - a.gd || b.gf - a.gf);

      let relegated = higherDiv.table.splice(-3, 3);
      let promoted = lowerDiv.table.splice(0, 3);

      higherDiv.table.push(...promoted);
      lowerDiv.table.push(...relegated);
    }
    divisions.forEach(div => {
      div.table.forEach(t => { t.pts = 0; t.p = 0; t.w = 0; t.d = 0; t.l = 0; t.gf = 0; t.ga = 0; t.gd = 0; });
      div.rounds = generateFixtures(div.table);
    });
  } else {
    let availableTeams = [];
    try {
      const listRes = await fetch("data/teamsList.json", { cache: "no-store" });
      if (listRes.ok) availableTeams = await listRes.json();
    } catch (e) {}

    let pool = availableTeams.filter((t) => t.file !== myTeamId);
    let leaguePool = pool.filter((t) => {
        const ln = (t.league || "").toLowerCase();
        if (leagueType === "br" && (ln.includes("brazil") || ln.includes("brasil") || ln.includes("libertadores") || ln.includes("sudamericana") || ln.includes("primera") || ln.includes("colombia") || ln.includes("argentina") || ln.includes("serie b"))) return true;
        if (leagueType === "en" && (ln.includes("premier") || ln.includes("england") || ln.includes("championship") || ln.includes("league one") || ln.includes("league two"))) return true;
        if (leagueType === "es" && (ln.includes("liga") || ln.includes("spain") || ln.includes("segunda"))) return true;
        if (leagueType === "it" && (ln.includes("serie a") || ln.includes("italy") || ln.includes("serie b") || ln.includes("calcio"))) return true;
        if (leagueType === "de" && (ln.includes("bundesliga") || ln.includes("germany") || ln.includes("3. liga"))) return true;
        return false;
    });

    if (leaguePool.length > 0) pool = leaguePool;
    // Ordena do mais forte pro mais fraco para distribuir nas divisões corretas
    pool.sort((a, b) => (b.ovr || 75) - (a.ovr || 75));

    let level = 1;
    while (pool.length > 0 && level <= 3) {
      let size = (level === 1) ? 19 : 20; 
      if (pool.length < 10) break; 
      let divTeams = pool.splice(0, size).map(t => ({ id: t.file, name: t.name, ovr: t.ovr || 75 }));
      if (level !== 1 && divTeams.length % 2 !== 0) divTeams.pop(); 
      divTeams.sort(() => 0.5 - Math.random());
      
      let table = [];
      if (level === 1) {
          table.push({ id: myTeamId, name: myTeamName, isUser: true, ovr: 80, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 });
      }
      divTeams.forEach(t => table.push({ id: t.id, name: t.name, ovr: t.ovr, isUser: false, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));
      
      divisions.push({ level: level, name: `${level}ª Divisão`, table: table, rounds: generateFixtures(table) });
      level++;
    }

    if (divisions.length === 0) {
        const abstractTeams = LEAGUES[leagueType] || LEAGUES["br"];
        let shuf = [...abstractTeams].sort(() => 0.5 - Math.random());
        let table = [{ id: myTeamId, name: myTeamName, isUser: true, ovr: 80, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }];
        shuf.forEach(t => table.push({ id: t.id, name: t.name, ovr: t.ovr, isUser: false, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }));
        divisions.push({ level: 1, name: "1ª Divisão", table: table, rounds: generateFixtures(table) });
    }
  }

  // Gera os 16 times da Copa misturando as Divisões 1 e 2
  let cupPool = [];
  divisions.forEach(d => { cupPool = cupPool.concat(d.table.filter(t => !t.isUser).map(t => t.id)); });
  cupPool.sort(() => 0.5 - Math.random());
  const cupTeamsId = [myTeamId, ...cupPool.slice(0, 15)];
  cupTeamsId.sort(() => 0.5 - Math.random());

  const phase1 = [];
  for (let i = 0; i < 8; i++) {
    phase1.push({
      home: cupTeamsId[i * 2],
      away: cupTeamsId[i * 2 + 1],
      played: false,
      homeScore: null,
      awayScore: null,
      homePen: null,
      awayPen: null,
    });
  }
  const cupData = {
    currentPhaseIndex: 0,
    phaseNames: ["Oitavas de Final", "Quartas de Final", "Semifinal", "Final"],
    phases: [phase1],
    finished: false,
    winner: null,
  };
  
  let continentalName = leagueType === "br" ? "Copa Libertadores" : "Champions League";
  let contTeamsInfo = [];
  if (existingDivisions) {
      contTeamsInfo = divisions[0].table.slice(0, 4).map(t => ({id: t.id, name: t.name}));
  } else {
      contTeamsInfo = [{id: myTeamId, name: myTeamName}];
      let div1Others = divisions[0].table.filter(t => t.id !== myTeamId).sort((a,b) => b.ovr - a.ovr);
      contTeamsInfo.push(...div1Others.slice(0, 3).map(t => ({id: t.id, name: t.name})));
  }
  
  let availableTeams = [];
  try {
      const listRes = await fetch("data/teamsList.json", { cache: "no-store" });
      if (listRes.ok) availableTeams = await listRes.json();
  } catch (e) {}
  
  let foreignTeams = availableTeams.filter(t => !divisions.some(d => d.table.some(dt => dt.id === t.file)));
  foreignTeams.sort((a,b) => (b.ovr||75) - (a.ovr||75));
  contTeamsInfo.push(...foreignTeams.slice(0, 16 - contTeamsInfo.length).map(t => ({id: t.file, name: t.name})));
  contTeamsInfo.sort(() => 0.5 - Math.random());
  
  const contPhase1 = [];
  for (let i = 0; i < 8; i++) {
    contPhase1.push({ home: contTeamsInfo[i * 2].id, away: contTeamsInfo[i * 2 + 1].id, played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null });
  }
  const continentalData = {
    name: continentalName, teams: contTeamsInfo, currentPhaseIndex: 0,
    phaseNames: ["Oitavas de Final", "Quartas de Final", "Semifinal", "Final"], phases: [contPhase1], finished: false, winner: null
  };

  const leagueData = {
    currentRound: 1,
    divisions: divisions,
    cup: cupData,
    continentalCup: continentalData,
    type: leagueType,
  };
  
  let initialDivision = divisions.findIndex(d => d.table.some(t => t.isUser));
  if (initialDivision === -1) initialDivision = 0;
  updateLeagueState({ currentViewDivision: initialDivision });

  await Storage.saveLeagueData(leagueData);
  showCustomModal(
    `Liga criada com sucesso! Foram geradas ${divisions.length} divisão(ões) conectadas.`,
    "alert",
    "btn-primary",
  );
}

function generateFixtures(teams) {
  const numTeams = teams.length;
  if (numTeams % 2 !== 0) {
    console.error("A geração de rodadas requer um número par de equipes.");
    return [];
  }

  let teamList = [...teams];
  const firstHalfRounds = [];

  for (let i = 0; i < numTeams - 1; i++) {
    const roundFixtures = [];
    for (let j = 0; j < numTeams / 2; j++) {
      const home = teamList[j];
      const away = teamList[numTeams - 1 - j];
      // Alterna o mando de campo para o primeiro time para garantir equilíbrio
      if (j === 0 && i % 2 !== 0) {
        roundFixtures.push({
          home: away.id,
          away: home.id,
          played: false,
          homeScore: null,
          awayScore: null,
        });
      } else {
        roundFixtures.push({
          home: home.id,
          away: away.id,
          played: false,
          homeScore: null,
          awayScore: null,
        });
      }
    }
    firstHalfRounds.push(roundFixtures);

    // Gira as equipes, mantendo a primeira fixa
    const lastTeam = teamList.pop();
    teamList.splice(1, 0, lastTeam);
  }

  // Gera o returno invertendo os mandos
  const secondHalfRounds = firstHalfRounds.map((round) => {
    return round.map((match) => ({
      home: match.away,
      away: match.home,
      played: false,
      homeScore: null,
      awayScore: null,
    }));
  });

  return [...firstHalfRounds, ...secondHalfRounds];
}

function getSimulatedScorer(teamName) {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const surnames = [
    "Silva",
    "Santos",
    "Costa",
    "Oliveira",
    "Pereira",
    "Rodrigues",
    "Almeida",
    "Nunes",
    "Lima",
    "Gomes",
    "García",
    "Smith",
    "Müller",
    "Rossi",
  ];
  const index1 = Math.abs(hash) % surnames.length;
  const index2 = Math.abs(hash * 2) % surnames.length;

  if (Math.random() < 0.6) {
    return "J. " + surnames[index1];
  } else {
    return "M. " + surnames[index2];
  }
}

export async function simulateCurrentRound(silent = false) {
  const data = await Storage.getLeagueData();
  if (!data) return;

  if (!data.divisions && data.table) {
      data.divisions = [{ level: 1, name: "1ª Divisão", table: data.table, rounds: data.rounds }];
  }
  const totalRounds = Math.max(...data.divisions.map(d => d.rounds.length));

  if (data.currentRound > totalRounds) {
    if (!silent)
      showCustomModal("O campeonato já terminou!", "alert", "btn-warning");
    return;
  }

  // Auto-simulate Cup Phase if it's pending before this League Round
  if (data.cup && !data.cup.finished) {
    const nextCupDate = getMatchDate(
      "cup",
      data.cup.currentPhaseIndex,
      totalRounds,
    );
    const currentLeagueDate = getMatchDate(
      "league",
      data.currentRound - 1,
      totalRounds,
    );
    if (nextCupDate <= currentLeagueDate) {
      const phaseIdx = data.cup.currentPhaseIndex;
      const matches = data.cup.phases[phaseIdx];
      const winners = [];
      const allTeamsFlat = data.divisions.flatMap(d => d.table);
      matches.forEach((m) => {
        if (!m.played) {
          const hOvr = allTeamsFlat.find((t) => t.id === m.home)?.ovr || 75;
          const aOvr = allTeamsFlat.find((t) => t.id === m.away)?.ovr || 75;
          let hScore = Math.floor(Math.random() * 3);
          let aScore = Math.floor(Math.random() * 3);
          if (hOvr > aOvr + 5) hScore += 1;
          if (aOvr > hOvr + 5) aScore += 1;
          let hPen = null,
            aPen = null;
          if (hScore === aScore) {
            hPen = Math.floor(Math.random() * 4) + 2;
            aPen = Math.floor(Math.random() * 4) + 2;
            if (hPen === aPen) hPen++;
          }
          m.homeScore = hScore;
          m.awayScore = aScore;
          m.homePen = hPen;
          m.awayPen = aPen;
          m.played = true;
        }
        const homeWon =
          m.homeScore > m.awayScore ||
          (m.homeScore === m.awayScore && m.homePen > m.awayPen);
        winners.push(homeWon ? m.home : m.away);
      });
      if (phaseIdx < 3) {
        const nextPhase = [];
        for (let i = 0; i < winners.length; i += 2)
          nextPhase.push({
            home: winners[i],
            away: winners[i + 1],
            played: false,
            homeScore: null,
            awayScore: null,
            homePen: null,
            awayPen: null,
          });
        data.cup.phases.push(nextPhase);
        data.cup.currentPhaseIndex++;
      } else {
        data.cup.finished = true;
        data.cup.winner = winners[0];
      }
    }
  }
  
  if (data.continentalCup && !data.continentalCup.finished) {
    const nextContDate = getMatchDate("continental", data.continentalCup.currentPhaseIndex, totalRounds);
    const currentLeagueDate = getMatchDate("league", data.currentRound - 1, totalRounds);
    if (nextContDate <= currentLeagueDate) {
      const phaseIdx = data.continentalCup.currentPhaseIndex;
      const matches = data.continentalCup.phases[phaseIdx];
      const winners = [];
      
      const getTeamOvr = (id) => {
          const flat = data.divisions.flatMap(d => d.table);
          let t = flat.find(x => x.id === id);
          if (t) return t.ovr || 75;
          return 75;
      };

      matches.forEach((m) => {
        if (!m.played) {
          const hOvr = getTeamOvr(m.home);
          const aOvr = getTeamOvr(m.away);
          let hScore = Math.floor(Math.random() * 3); let aScore = Math.floor(Math.random() * 3);
          if (hOvr > aOvr + 5) hScore += 1; if (aOvr > hOvr + 5) aScore += 1;
          let hPen = null, aPen = null;
          if (hScore === aScore) { hPen = Math.floor(Math.random() * 4) + 2; aPen = Math.floor(Math.random() * 4) + 2; if (hPen === aPen) hPen++; }
          m.homeScore = hScore; m.awayScore = aScore; m.homePen = hPen; m.awayPen = aPen; m.played = true;
        }
        winners.push((m.homeScore > m.awayScore || (m.homeScore === m.awayScore && m.homePen > m.awayPen)) ? m.home : m.away);
      });
      if (phaseIdx < 3) {
        const nextPhase = [];
        for (let i = 0; i < winners.length; i += 2) nextPhase.push({ home: winners[i], away: winners[i + 1], played: false, homeScore: null, awayScore: null, homePen: null, awayPen: null });
        data.continentalCup.phases.push(nextPhase); data.continentalCup.currentPhaseIndex++;
      } else { data.continentalCup.finished = true; data.continentalCup.winner = winners[0]; }
    }
  }

  let userMatch = null;
  data.divisions.forEach(div => {
      if (data.currentRound <= div.rounds.length) {
          const match = div.rounds[data.currentRound - 1].find(m => div.table.find(t => t.id === m.home)?.isUser || div.table.find(t => t.id === m.away)?.isUser);
          if (match) userMatch = match;
      }
  });

  if (userMatch && !userMatch.played) {
    if (!silent) {
      const proceed = await showCustomModal(
        "O seu jogo desta rodada ainda não foi jogado. Se você avançar, seu jogo também será simulado automaticamente por inteligência artificial. Deseja avançar mesmo assim?",
        "confirm",
        "btn-warning",
      );
      if (!proceed) return;
    }
  }

  if (!data.scorers) data.scorers = {};
  if (!data.assists) data.assists = {};
  if (!data.ratings) data.ratings = {};

  data.divisions.forEach(div => {
    if (data.currentRound <= div.rounds.length) {
      const currentMatches = div.rounds[data.currentRound - 1];
      currentMatches.forEach((match) => {
    if (!match.played) {
      const homeTeam = div.table.find((t) => t.id === match.home);
      const awayTeam = div.table.find((t) => t.id === match.away);

      if (homeTeam && awayTeam) {
        const homeOvr = homeTeam.ovr || (homeTeam.isUser ? 85 : 80);
        const awayOvr = awayTeam.ovr || (awayTeam.isUser ? 85 : 80);

        const homeChance = homeOvr + 5 + Math.random() * 20;
        const awayChance = awayOvr + Math.random() * 20;

        let homeGoals = 0,
          awayGoals = 0;

        if (homeChance > awayChance + 15) {
          homeGoals = Math.floor(Math.random() * 3) + 2;
          awayGoals = Math.floor(Math.random() * 2);
        } else if (homeChance > awayChance) {
          homeGoals = Math.floor(Math.random() * 2) + 1;
          awayGoals = Math.floor(Math.random() * 2);
        } else if (awayChance > homeChance + 15) {
          homeGoals = Math.floor(Math.random() * 2);
          awayGoals = Math.floor(Math.random() * 3) + 2;
        } else {
          homeGoals = Math.floor(Math.random() * 2);
          awayGoals = Math.floor(Math.random() * 2);
        }

        match.homeScore = homeGoals;
        match.awayScore = awayGoals;
        match.played = true;

        const updateScorers = (goals, team) => {
          for (let i = 0; i < goals; i++) {
            const scorerName = getSimulatedScorer(team.name);
            const key = `${scorerName} (${team.name})`;
            if (!data.scorers[key]) {
              data.scorers[key] = {
                name: scorerName,
                team: team.name,
                goals: 0,
              };
            }
            data.scorers[key].goals++;

            // Chance de 70% de gerar uma assistência no gol simulado da IA
            if (Math.random() < 0.7) {
              const assisterName = getSimulatedScorer(team.name + i); // Semente diferente
              if (assisterName !== scorerName) {
                const aKey = `${assisterName} (${team.name})`;
                if (!data.assists[aKey]) {
                  data.assists[aKey] = {
                    name: assisterName,
                    team: team.name,
                    assists: 0,
                  };
                }
                data.assists[aKey].assists++;
              }
            }
          }
        };

        if (homeGoals > 0) updateScorers(homeGoals, homeTeam);
        if (awayGoals > 0) updateScorers(awayGoals, awayTeam);

        const updateSimulatedRatings = (team, gf, ga) => {
          for (let i = 0; i < 3; i++) {
            const pName = getSimulatedScorer(team.name + i + gf);
            const key = `${pName} (${team.name})`;
            if (!data.ratings[key])
              data.ratings[key] = {
                name: pName,
                team: team.name,
                sumRatings: 0,
                matches: 0,
              };
            let r = 6.0 + Math.random() * 2.5;
            if (gf > ga) r += 0.8;
            else if (gf < ga) r -= 0.5;
            data.ratings[key].sumRatings += Math.min(10.0, r);
            data.ratings[key].matches++;
          }
        };
        updateSimulatedRatings(homeTeam, homeGoals, awayGoals);
        updateSimulatedRatings(awayTeam, awayGoals, homeGoals);

        homeTeam.p++;
        homeTeam.gf += homeGoals;
        homeTeam.ga += awayGoals;
        homeTeam.gd = homeTeam.gf - homeTeam.ga;
        awayTeam.p++;
        awayTeam.gf += awayGoals;
        awayTeam.ga += homeGoals;
        awayTeam.gd = awayTeam.gf - awayTeam.ga;

        if (homeGoals > awayGoals) {
          homeTeam.w++;
          homeTeam.pts += 3;
          awayTeam.l++;
        } else if (awayGoals > homeGoals) {
          awayTeam.w++;
          awayTeam.pts += 3;
          homeTeam.l++;
        } else {
          homeTeam.d++;
          awayTeam.d++;
          homeTeam.pts += 1;
          awayTeam.pts += 1;
        }
      }
    }
  });
   }
  });

  data.currentRound++;
  await Storage.saveLeagueData(data);

  if (!silent) {
    if (data.currentRound > totalRounds) {
      showCustomModal(
        "O campeonato acabou! Verifique a tabela de classificação final.",
        "alert",
        "btn-primary",
      );
    } else {
      showCustomModal(
        "Rodada finalizada com sucesso! A tabela foi atualizada.",
        "alert",
        "btn-primary",
      );
    }
  }
}

export async function renderLeagueData() {
  const data = await Storage.getLeagueData();
  const tbody = document.getElementById("leagueTableBody");
  const currentRoundEl = document.getElementById("leagueCurrentRound");
  const totalRoundsEl = document.getElementById("leagueTotalRounds");

  if (!data) {
    tbody.innerHTML = `<tr><td colspan="10" style="padding: 30px; color: #888;">Nenhuma liga ativa. Clique em "Reiniciar / Nova Liga" para começar!</td></tr>`;
    // Limpa também a tela de jogos
    const fixturesContainer = document.getElementById("leagueMatchesList");
    if (fixturesContainer) {
      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Crie uma nova liga para ver o calendário.</div>`;
    }
    return;
  }
  
  if (!data.divisions && data.table) {
      data.divisions = [{ level: 1, name: "1ª Divisão", table: data.table, rounds: data.rounds }];
  }

  const divSelect = document.getElementById("leagueDivisionSelect");
  if (divSelect) {
      if (data.divisions.length > 1) {
          divSelect.style.display = "block";
          divSelect.innerHTML = data.divisions.map((d, i) => `<option value="${i}" ${i === currentViewDivision ? "selected" : ""}>${d.name}</option>`).join("");
      } else {
          divSelect.style.display = "none";
      }
  }

  const currentDiv = data.divisions[currentViewDivision] || data.divisions[0];
  const totalRounds = currentDiv.rounds.length;

  const nextSeasonBtn = document.getElementById("nextSeasonBtn");
  if (nextSeasonBtn) {
    if (data.currentRound > Math.max(...data.divisions.map(d => d.rounds.length)) && (!data.cup || data.cup.finished))
      nextSeasonBtn.style.display = "block";
    else nextSeasonBtn.style.display = "none";
  }

  currentRoundEl.innerText = data.currentRound;
  if (totalRoundsEl) {
    totalRoundsEl.innerText = totalRounds;
  }

  currentDiv.table.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.w !== a.w) return b.w - a.w;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  tbody.innerHTML = "";
  const frag = document.createDocumentFragment();
  currentDiv.table.forEach((t, i) => {
    const tr = document.createElement("tr");
    // Colore a linha do usuário de verde
    if (t.isUser) tr.style.background = "rgba(0, 255, 136, 0.1)";
    tr.innerHTML = `
            <td style="font-weight: bold; color: ${i < 4 ? "var(--rating-top)" : i > 15 ? "var(--danger)" : "#aaa"};">${i + 1}º</td>
            <td style="text-align: left;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: ${t.isUser ? "bold" : "normal"}; color: ${t.isUser ? "var(--accent)" : "#fff"};">
                    ${getTeamLogoHTML(t.name)}
                    <span>${t.name}</span>
                </div>
            </td>
            <td style="font-weight: 900; color: var(--warning);">${t.pts}</td>
            <td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td>
            <td style="font-weight: bold;">${t.gd > 0 ? "+" + t.gd : t.gd}</td>
        `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  await renderFixtures(true);
}

async function renderFixtures(forceUpdateParams = false) {
  const data = await Storage.getLeagueData();
  const fixturesContainer = document.getElementById("leagueMatchesList");
  const monthSelect = document.getElementById("fixtureMonthSelect");
  const currentRoundDisplay = document.getElementById("currentRoundDisplay");
  const currentDiv = data.divisions[currentViewDivision] || data.divisions[0];

  if (!data || !currentDiv.rounds || currentDiv.rounds.length === 0) {
    fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhuma rodada encontrada. Crie uma nova liga para gerar o calendário.</div>`;
    return;
  }

  const totalRounds = currentDiv.rounds.length;
  const currentRoundIdx = Math.min(data.currentRound - 1, totalRounds - 1);

  if (forceUpdateParams || typeof selectedRoundIndex === "undefined") {
    selectedRoundIndex = currentRoundIdx;
    selectedMonth = Math.floor((currentRoundIdx * 12) / totalRounds);
    if (monthSelect) monthSelect.value = selectedMonth;
  }

  fixturesContainer.innerHTML = "";

  const teamData = currentDiv.table.reduce((acc, team) => {
    acc[team.id] = team;
    return acc;
  }, {});

  let matchesFound = false;

  if (fixtureViewMode === "month") {
    const userTeamId = currentDiv.table.find((t) => t.isUser)?.id;
    const schedule = [];

    currentDiv.rounds.forEach((round, rIndex) => {
      const roundMonth = Math.floor((rIndex * 12) / totalRounds);
      if (roundMonth === selectedMonth) {
        const userMatch = round.find(
          (m) => m.home === userTeamId || m.away === userTeamId,
        );
        if (userMatch) {
          schedule.push({
            type: "league",
            index: rIndex,
            match: userMatch,
            title: `Rodada ${rIndex + 1}`,
          });
        }
      }
    });

    const cupPhaseMap = { 0: 3, 1: 6, 2: 9, 3: 11 };
    if (data.cup && !data.cup.finished) {
      for (let phaseIdx = 0; phaseIdx < data.cup.phases.length; phaseIdx++) {
        if (cupPhaseMap[phaseIdx] === selectedMonth) {
          const phaseMatches = data.cup.phases[phaseIdx];
          const userMatch = phaseMatches.find(
            (m) => m.home === userTeamId || m.away === userTeamId,
          );
          if (userMatch) {
            schedule.push({
              type: "cup",
              index: phaseIdx,
              match: userMatch,
              title: `Copa - ${data.cup.phaseNames[phaseIdx]}`,
            });
          }
        }
      }
    }
    
    const contPhaseMap = { 0: 2, 1: 5, 2: 8, 3: 10 };
    if (data.continentalCup && !data.continentalCup.finished) {
      for (let phaseIdx = 0; phaseIdx < data.continentalCup.phases.length; phaseIdx++) {
        if (contPhaseMap[phaseIdx] === selectedMonth) {
          const phaseMatches = data.continentalCup.phases[phaseIdx];
          const userMatch = phaseMatches.find((m) => m.home === userTeamId || m.away === userTeamId);
          if (userMatch) {
            schedule.push({ type: "continental", index: phaseIdx, match: userMatch, title: `${data.continentalCup.name} - ${data.continentalCup.phaseNames[phaseIdx]}` });
          }
        }
      }
    }

    schedule.forEach((item) => {
      item.dateNum = getMatchDate(item.type, item.index, totalRounds);
    });
    schedule.sort((a, b) => a.dateNum - b.dateNum);

    if (schedule.length > 0) {
      const frag = document.createDocumentFragment();
      matchesFound = true;
      schedule.forEach((item) => {
        const match = item.match;
        const isPlayed = match.played;
        let statusLabel = "";

        if (item.type === "league") {
          if (data.currentRound - 1 === item.index) {
            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
          } else if (data.currentRound - 1 > item.index) {
            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
          }
        } else {
          if (data.cup.currentPhaseIndex === item.index && !match.played) {
            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
          } else if (match.played) {
            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
          }
        } else if (item.type === "continental") {
          if (data.continentalCup.currentPhaseIndex === item.index && !match.played) {
            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
          } else if (match.played) {
            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
          }
        }

        const roundHeader = document.createElement("div");
        roundHeader.style.cssText =
          "margin-top: 15px; margin-bottom: 5px; color: var(--accent); font-weight: bold; font-size: 0.85rem; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; display: flex; justify-content: space-between;";
        const dateStr = formatMatchDate(item.dateNum);
        roundHeader.innerHTML = `<span>📅 ${dateStr} - ${item.title}</span> ${statusLabel}`;
        fixturesContainer.appendChild(roundHeader);
        
        const getTeamNameInfo = (id) => {
            let t = teamData[id];
            if (t) return t.name;
            if (data.continentalCup && data.continentalCup.teams) {
                let c = data.continentalCup.teams.find(x => x.id === id);
                if (c) return c.name;
            }
            return "Desconhecido";
        };

        const homeTeamName = getTeamNameInfo(match.home);
        const awayTeamName = getTeamNameInfo(match.away);

        const matchEl = document.createElement("div");
        matchEl.className = "fixture-item user-match";
        if (item.type === "cup") matchEl.style.borderColor = "var(--warning)";
        if (item.type === "continental") matchEl.style.borderColor = "#00aaff";

        let scoreHtml = match.played
          ? `<strong>${match.homeScore}</strong> - <strong>${match.awayScore}</strong>`
          : "VS";
        if (
          match.played &&
          match.homePen !== null &&
          match.homePen !== undefined
        ) {
          scoreHtml = `<strong>${match.homeScore}</strong> (${match.homePen}) - (${match.awayPen}) <strong>${match.awayScore}</strong>`;
        }

        matchEl.innerHTML = `
                      <div class="fixture-team home" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                          <span>${homeTeamName}</span>
                          ${getTeamLogoHTML(homeTeamName)}
                      </div>
                      <div class="fixture-score">
                          ${scoreHtml}
                      </div>
                      <div class="fixture-team away" style="display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
                          ${getTeamLogoHTML(awayTeamName)}
                          <span>${awayTeamName}</span>
                      </div>
                  `;
        frag.appendChild(roundHeader);
        frag.appendChild(matchEl);
      });
      fixturesContainer.appendChild(frag);
    }

    if (!matchesFound) {
      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhum jogo do seu time programado para este mês.</div>`;
    }
  } else {
    if (currentRoundDisplay)
      currentRoundDisplay.innerText = `Rodada ${selectedRoundIndex + 1}`;

    const round = currentDiv.rounds[selectedRoundIndex];
    if (round) {
      matchesFound = true;
      const frag = document.createDocumentFragment();

      let statusLabel = "";
      if (data.currentRound - 1 === selectedRoundIndex) {
        statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.85rem; font-weight: bold;">RODADA ATUAL</span>`;
      } else if (data.currentRound - 1 > selectedRoundIndex) {
        statusLabel = `<span style="float: right; color: #888; font-size: 0.85rem; font-weight: bold;">FINALIZADA</span>`;
      }

      const header = document.createElement("div");
      header.style.cssText =
        "margin-top: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
      header.innerHTML = `<span></span>${statusLabel}`;
      if (statusLabel) frag.appendChild(header);

      round.forEach((match) => {
        const homeTeam = teamData[match.home] || { name: "Time Desconhecido" };
        const awayTeam = teamData[match.away] || { name: "Time Desconhecido" };

        const matchEl = document.createElement("div");
        matchEl.className = "fixture-item";
        if (homeTeam.isUser || awayTeam.isUser) {
          matchEl.classList.add("user-match");
        }

        matchEl.innerHTML = `
                    <div class="fixture-team home" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                        <span>${homeTeam.name}</span>
                        ${getTeamLogoHTML(homeTeam.name)}
                    </div>
                    <div class="fixture-score">
                        ${match.played ? `<strong>${match.homeScore}</strong> - <strong>${match.awayScore}</strong>` : "VS"}
                    </div>
                    <div class="fixture-team away" style="display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
                        ${getTeamLogoHTML(awayTeam.name)}
                        <span>${awayTeam.name}</span>
                    </div>
                `;
        frag.appendChild(matchEl);
      });
      fixturesContainer.appendChild(frag);
    }

    if (!matchesFound) {
      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Rodada não encontrada.</div>`;
    }
  }
}

export async function renderContinental() {
  const data = await Storage.getLeagueData();
  const container = document.getElementById("continentalBracket");
  const title = document.getElementById("continentalTitle");
  if (!data || !data.continentalCup) {
    container.innerHTML = "<div style='text-align:center; color:#888; padding:20px;'>Crie uma nova Liga para gerar a Copa Continental!</div>";
    return;
  }
  if (title) title.innerText = `🌍 ${data.continentalCup.name}`;
  container.innerHTML = "";
  
  const getTeamName = (id) => {
    let t = data.continentalCup.teams.find(x => x.id === id);
    if (t) return t.name;
    const flat = data.divisions ? data.divisions.flatMap(d => d.table) : [];
    t = flat.find(x => x.id === id);
    return t ? t.name : "Desconhecido";
  };

  if (data.continentalCup.finished) {
    const winnerName = getTeamName(data.continentalCup.winner);
    container.innerHTML = `<h3 style='color:var(--warning); text-align:center; margin-bottom:20px;'>🏆 O ${winnerName} é o Campeão da ${data.continentalCup.name}!</h3>`;
  }

  for (let i = data.continentalCup.phases.length - 1; i >= 0; i--) {
    const phaseMatches = data.continentalCup.phases[i];
    const phaseName = data.continentalCup.phaseNames[i];

    const phaseDiv = document.createElement("div");
    phaseDiv.style.marginBottom = "15px";
    phaseDiv.innerHTML = `<h4 style="color:#00aaff; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">${phaseName}</h4>`;

    phaseMatches.forEach((m) => {
      const hName = getTeamName(m.home);
      const aName = getTeamName(m.away);
      let scoreText = "VS";
      if (m.played) {
        if (m.homePen !== null && m.homePen !== undefined) scoreText = `<strong>${m.homeScore}</strong> (${m.homePen}) - (${m.awayPen}) <strong>${m.awayScore}</strong>`;
        else scoreText = `<strong>${m.homeScore}</strong> - <strong>${m.awayScore}</strong>`;
      }
      const isUserMatch = (m.home === (data.table ? data.table.find(t=>t.isUser)?.id : "meu_time")) || (m.away === (data.table ? data.table.find(t=>t.isUser)?.id : "meu_time"));
      const bg = isUserMatch ? "rgba(0, 255, 136, 0.1)" : "#1a1a1a";
      const border = isUserMatch ? "#00aaff" : "#333";

      phaseDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:${bg}; border: 1px solid ${border}; padding: 10px; border-radius: 8px; margin-bottom: 5px;">
                <div style="flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                    <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "#00aaff" : "#fff"}">${hName}</span>
                    ${getTeamLogoHTML(hName)}
                </div>
                <div style="margin: 0 20px; color:var(--warning); font-size:1rem; min-width: 90px; text-align:center;">${scoreText}</div>
                <div style="flex:1; text-align:left; display:flex; align-items:center; justify-content:flex-start; gap:8px;">
                    ${getTeamLogoHTML(aName)}
                    <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "#00aaff" : "#fff"}">${aName}</span>
                </div>
            </div>`;
    });
    container.appendChild(phaseDiv);
  }
}

async function renderLeagueScorers() {
  const data = await Storage.getLeagueData();
  const tbody = document.getElementById("leagueScorersBody");
  const currentDiv = data.divisions ? data.divisions[currentViewDivision] : null;

  if (!data || !data.scorers || Object.keys(data.scorers).length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; color: #888;">Nenhum gol marcado nesta liga ainda.</td></tr>`;
    return;
  }

  const scorersArray = Object.values(data.scorers).sort(
    (a, b) => b.goals - a.goals,
  );
  const topScorers = scorersArray.slice(0, 20); // Show top 20

  const userTeam = currentDiv ? currentDiv.table.find((t) => t.isUser) : null;
  const userTeamName = userTeam ? userTeam.name : null;

  tbody.innerHTML = "";
  topScorers.forEach((scorer, index) => {
    const isUserScorer = scorer.team === userTeamName;
    const highlightStyle = isUserScorer
      ? "background: rgba(0, 255, 136, 0.1);"
      : "";
    const tr = document.createElement("tr");
    tr.style.cssText = highlightStyle;
    tr.innerHTML = `
            <td style="font-weight: bold; color: ${index < 3 ? "var(--warning)" : "#aaa"};">${index + 1}º</td>
            <td style="text-align: left; font-weight: bold; color: ${isUserScorer ? "var(--accent)" : "#fff"};">
                ${scorer.name}
                <div style="font-size: 0.65rem; color: #888; font-weight: normal; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                    ${getTeamLogoHTML(scorer.team)}
                    <span>${scorer.team}</span>
                </div>
            </td>
            <td style="font-weight: 900; color: var(--accent); font-size: 1.1rem;">${scorer.goals}</td>
        `;
    tbody.appendChild(tr);
  });
}

async function renderSeasonHistory() {
  const historyList = document.getElementById("seasonHistoryList");
  if (!historyList) return;

  const history = (await Storage.getSeasonHistory()) || [];

  if (history.length === 0) {
    historyList.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhuma temporada finalizada ainda. Avance de temporada para gerar o histórico.</div>`;
    return;
  }

  historyList.innerHTML = "";
  const reversed = [...history].reverse();
  reversed.forEach((season) => {
    const item = document.createElement("div");
    item.style.cssText =
      "background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;";

    item.innerHTML = `
            <div>
                <h4 style="color: var(--accent); margin: 0 0 10px 0;">Temporada ${season.season}</h4>
                <div style="font-size: 0.85rem; color: #ccc;">
                    <div><strong style="color: var(--warning);">Campeão da Liga:</strong> ${season.leagueWinner}</div>
                    <div style="margin-top: 5px;"><strong style="color: var(--warning);">Campeão da Copa:</strong> ${season.cupWinner}</div>
                </div>
            </div>
            <div style="text-align: right; font-size: 0.85rem; color: #ccc;">
                <div style="color: #00aaff; margin-bottom: 5px;"><strong>Artilheiro:</strong></div>
                <div style="font-weight: bold; font-size: 1.1rem;">${season.topScorer}</div>
            </div>
        `;
    historyList.appendChild(item);
  });
}

export async function renderCup() {
  const data = await Storage.getLeagueData();
  const container = document.getElementById("cupBracket");
  if (!data || !data.cup) {
    container.innerHTML =
      "<div style='text-align:center; color:#888; padding:20px;'>Crie uma nova Liga para gerar a Copa Nacional!</div>";
    return;
  }
  container.innerHTML = "";
  if (data.cup.finished) {
    const flatTeams = data.divisions.flatMap(d => d.table);
    const winnerTeam = flatTeams.find((t) => t.id === data.cup.winner);
    container.innerHTML = `<h3 style='color:var(--warning); text-align:center; margin-bottom:20px;'>🏆 O ${winnerTeam?.name} é o Campeão da Copa!</h3>`;
  }

  for (let i = data.cup.phases.length - 1; i >= 0; i--) {
    const phaseMatches = data.cup.phases[i];
    const phaseName = data.cup.phaseNames[i];
    const flatTeams = data.divisions.flatMap(d => d.table);

    const phaseDiv = document.createElement("div");
    phaseDiv.style.marginBottom = "15px";
    phaseDiv.innerHTML = `<h4 style="color:var(--accent); margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">${phaseName}</h4>`;

    phaseMatches.forEach((m) => {
      const hTeam = flatTeams.find((t) => t.id === m.home) || { name: "???" };
      const aTeam = flatTeams.find((t) => t.id === m.away) || { name: "???" };
      let scoreText = "VS";
      if (m.played) {
        if (m.homePen !== null && m.homePen !== undefined)
          scoreText = `<strong>${m.homeScore}</strong> (${m.homePen}) - (${m.awayPen}) <strong>${m.awayScore}</strong>`;
        else
          scoreText = `<strong>${m.homeScore}</strong> - <strong>${m.awayScore}</strong>`;
      }
      const isUserMatch = hTeam.isUser || aTeam.isUser;
      const bg = isUserMatch ? "rgba(0, 255, 136, 0.1)" : "#1a1a1a";
      const border = isUserMatch ? "var(--accent)" : "#333";

      phaseDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:${bg}; border: 1px solid ${border}; padding: 10px; border-radius: 8px; margin-bottom: 5px;">
                <div style="flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                    <span style="font-weight:${hTeam.isUser ? "bold" : "normal"}; color:${hTeam.isUser ? "var(--accent)" : "#fff"}">${hTeam.name}</span>
                    ${getTeamLogoHTML(hTeam.name)}
                </div>
                <div style="margin: 0 20px; color:var(--warning); font-size:1rem; min-width: 90px; text-align:center;">${scoreText}</div>
                <div style="flex:1; text-align:left; display:flex; align-items:center; justify-content:flex-start; gap:8px;">
                    ${getTeamLogoHTML(aTeam.name)}
                    <span style="font-weight:${aTeam.isUser ? "bold" : "normal"}; color:${aTeam.isUser ? "var(--accent)" : "#fff"}">${aTeam.name}</span>
                </div>
            </div>
         `;
    });
    container.appendChild(phaseDiv);
  }
}

async function renderLeagueAssists() {
  const data = await Storage.getLeagueData();
  const tbody = document.getElementById("leagueAssistsBody");
  const currentDiv = data.divisions ? data.divisions[currentViewDivision] : null;

  if (!data || !data.assists || Object.keys(data.assists).length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; color: #888;">Nenhuma assistência registrada nesta liga ainda.</td></tr>`;
    return;
  }

  const assistsArray = Object.values(data.assists).sort(
    (a, b) => b.assists - a.assists,
  );
  const topAssists = assistsArray.slice(0, 20);

  const userTeam = currentDiv ? currentDiv.table.find((t) => t.isUser) : null;
  const userTeamName = userTeam ? userTeam.name : null;

  tbody.innerHTML = "";
  topAssists.forEach((assister, index) => {
    const isUserAssister = assister.team === userTeamName;
    const highlightStyle = isUserAssister
      ? "background: rgba(0, 255, 136, 0.1);"
      : "";
    const tr = document.createElement("tr");
    tr.style.cssText = highlightStyle;
    tr.innerHTML = `
            <td style="font-weight: bold; color: ${index < 3 ? "var(--warning)" : "#aaa"};">${index + 1}º</td>
            <td style="text-align: left; font-weight: bold; color: ${isUserAssister ? "var(--accent)" : "#fff"};">
                ${assister.name}
                <div style="font-size: 0.65rem; color: #888; font-weight: normal; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                    ${getTeamLogoHTML(assister.team)}
                    <span>${assister.team}</span>
                </div>
            </td>
            <td style="font-weight: 900; color: #00aaff; font-size: 1.1rem;">${assister.assists}</td>
        `;
    tbody.appendChild(tr);
  });
}

async function renderLeagueRatings() {
  const data = await Storage.getLeagueData();
  const tbody = document.getElementById("leagueRatingsBody");
  const currentDiv = data.divisions ? data.divisions[currentViewDivision] : null;

  if (!data || !data.ratings || Object.keys(data.ratings).length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; color: #888;">Nenhuma nota registrada nesta liga ainda.</td></tr>`;
    return;
  }

  const ratingsArray = Object.values(data.ratings)
    .filter((r) => r.matches > 0)
    .map((r) => ({ ...r, avgRating: r.sumRatings / r.matches }))
    .sort((a, b) => b.avgRating - a.avgRating);

  const topRatings = ratingsArray.slice(0, 20);
  const userTeam = currentDiv ? currentDiv.table.find((t) => t.isUser) : null;
  const userTeamName = userTeam ? userTeam.name : null;

  tbody.innerHTML = "";
  topRatings.forEach((player, index) => {
    const isUserPlayer = player.team === userTeamName;
    const highlightStyle = isUserPlayer
      ? "background: rgba(0, 255, 136, 0.1);"
      : "";
    const rColor =
      player.avgRating >= 8.5
        ? "var(--rating-top)"
        : player.avgRating >= 7.5
          ? "var(--rating-high)"
          : player.avgRating >= 6.0
            ? "var(--rating-mid)"
            : player.avgRating >= 5.0
              ? "var(--rating-low)"
              : "var(--rating-bad)";

    const tr = document.createElement("tr");
    tr.style.cssText = highlightStyle;
    tr.innerHTML = `
            <td style="font-weight: bold; color: ${index < 3 ? "var(--warning)" : "#aaa"};">${index + 1}º</td>
            <td style="text-align: left; font-weight: bold; color: ${isUserPlayer ? "var(--accent)" : "#fff"};">
                ${player.name}
                <div style="font-size: 0.65rem; color: #888; font-weight: normal; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                    ${getTeamLogoHTML(player.team)}
                    <span>${player.team}</span>
                </div>
            </td>
            <td style="font-weight: 900; color: ${rColor}; font-size: 1.1rem;">${player.avgRating.toFixed(1)}</td>
        `;
    tbody.appendChild(tr);
  });
}
