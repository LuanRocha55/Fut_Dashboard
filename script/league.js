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
    } catch (e) { }

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
    contTeamsInfo = divisions[0].table.slice(0, 4).map(t => ({ id: t.id, name: t.name }));
  } else {
    contTeamsInfo = [{ id: myTeamId, name: myTeamName }];
    let div1Others = divisions[0].table.filter(t => t.id !== myTeamId).sort((a, b) => b.ovr - a.ovr);
    contTeamsInfo.push(...div1Others.slice(0, 3).map(t => ({ id: t.id, name: t.name })));
  }

  let availableTeams = [];
  try {
    const listRes = await fetch("data/teamsList.json", { cache: "no-store" });
    if (listRes.ok) availableTeams = await listRes.json();
  } catch (e) { }

  let foreignTeams = availableTeams.filter(t => !divisions.some(d => d.table.some(dt => dt.id === t.file)));
  foreignTeams.sort((a, b) => (b.ovr || 75) - (a.ovr || 75));
  contTeamsInfo.push(...foreignTeams.slice(0, 16 - contTeamsInfo.length).map(t => ({ id: t.file, name: t.name })));
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
