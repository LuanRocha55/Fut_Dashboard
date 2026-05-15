import { Storage } from "../core/appStorage.js";
import {
  renderLeagueData,
  renderContinental,
  renderCup,
  renderFixtures,
  renderSeasonHistory,
  renderLeagueScorers,
  updateLeagueState,
  selectedMonth,
  selectedRoundIndex,
} from "./leagueRenderer.js";
import { LEAGUES } from "./leagueConfig.js";
import { showCustomModal } from "../ui/uiModal.js";

// Add exports for inter-module calls
import {
  simulateCurrentRound,
  autoInitLeague,
  createNewLeague,
  generateFixtures,
  getAutoLeagueType,
  formatMatchDate,
  getMatchDate,
} from "./leagueCore.js";

export const updateMonthUI = async () => {
  const data = await Storage.getLeagueData();
  const offset = (data && data.startMonth) || 0;
  const monthDisplay = document.getElementById("currentMonthDisplay");
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  if (monthDisplay) {
    const actualMonthIdx = (offset + selectedMonth) % 12;
    monthDisplay.innerText = monthNames[actualMonthIdx];
  }
};

let _leagueEventsInitialized = false;
export function initLeagueEvents() {
  if (_leagueEventsInitialized) return;
  _leagueEventsInitialized = true;
  const tabTournament = document.getElementById("tabTournament");
  const tabFixtures = document.getElementById("tabFixtures");
  const tabStats = document.getElementById("tabStats");
  const tabHistory = document.getElementById("tabHistory");

  const subTabLeague = document.getElementById("subTabLeague");
  const subTabCup = document.getElementById("subTabCup");
  const subTabContinental = document.getElementById("subTabContinental");
  const tournamentSubNav = document.getElementById("tournamentSubNav");

  const contentStandings = document.getElementById("leagueStandingsContent");
  const contentCup = document.getElementById("leagueCupContent");
  const contentContinental = document.getElementById(
    "leagueContinentalContent",
  );
  const contentFixtures = document.getElementById("leagueFixturesContent");
  const contentStats = document.getElementById("leagueStatsContent");
  const contentHistory = document.getElementById("leagueHistoryContent");

  const statsFilter = document.getElementById("statsCompFilter");

  if (!tabTournament) return;

  const clearTabs = () => {
    [tabTournament, tabFixtures, tabStats, tabHistory].forEach(
      (t) => (t.className = "btn-secondary"),
    );
    [
      contentStandings,
      contentCup,
      contentContinental,
      contentFixtures,
      contentStats,
      contentHistory,
    ].forEach((c) => (c.style.display = "none"));
    tournamentSubNav.style.display = "none";
  };

  const clearSubTabs = () => {
    [subTabLeague, subTabCup, subTabContinental].forEach((t) => {
      t.style.color = "#666";
      t.style.background = "transparent";
    });
    [contentStandings, contentCup, contentContinental].forEach(
      (c) => (c.style.display = "none"),
    );
  };

  const activateSubTab = (tab, content, renderFn) => {
    clearSubTabs();
    tab.style.color = "var(--accent)";
    tab.style.background = "rgba(0,255,136,0.1)";
    content.style.display = "block";
    if (renderFn) renderFn();
  };

  tabTournament.onclick = () => {
    clearTabs();
    tabTournament.className = "btn-primary";
    tournamentSubNav.style.display = "flex";
    activateSubTab(subTabLeague, contentStandings, renderLeagueData);
  };

  subTabLeague.onclick = () =>
    activateSubTab(subTabLeague, contentStandings, renderLeagueData);
  subTabCup.onclick = () => activateSubTab(subTabCup, contentCup, renderCup);
  subTabContinental.onclick = () =>
    activateSubTab(subTabContinental, contentContinental, renderContinental);

  tabFixtures.onclick = () => {
    clearTabs();
    tabFixtures.className = "btn-primary";
    contentFixtures.style.display = "block";
    renderFixtures(true);
  };

  tabStats.onclick = () => {
    clearTabs();
    tabStats.className = "btn-primary";
    contentStats.style.display = "block";
    renderLeagueScorers();
  };

  if (statsFilter) {
    statsFilter.onchange = () => {
      renderLeagueScorers();
    };
  }

  const monthNav = document.getElementById("monthNavigation");
  const viewModeSelect = document.getElementById("fixtureViewMode");
  const roundControl = document.getElementById("fixtureRoundControl");
  const prevRoundBtn = document.getElementById("prevRoundBtn");
  const nextRoundBtn = document.getElementById("nextRoundBtn");

  if (viewModeSelect) {
    viewModeSelect.addEventListener("change", (e) => {
      updateLeagueState({ fixtureViewMode: e.target.value });
      if (e.target.value === "month") {
        if (monthNav) monthNav.style.display = "flex";
        roundControl.style.display = "none";
      } else {
        if (monthNav) monthNav.style.display = "none";
        roundControl.style.display = "flex";
      }
      renderFixtures();
    });
  }

  document.getElementById("prevMonthBtn")?.addEventListener("click", () => {
    let newMonth = selectedMonth - 1;
    if (newMonth < 0) newMonth = 11;
    updateLeagueState({ selectedMonth: newMonth });
    updateMonthUI();
    renderFixtures();
  });

  document.getElementById("nextMonthBtn")?.addEventListener("click", () => {
    let newMonth = selectedMonth + 1;
    if (newMonth > 11) newMonth = 0;
    updateLeagueState({ selectedMonth: newMonth });
    updateMonthUI();
    renderFixtures();
  });

  // Inicializar UI do mês
  updateMonthUI();

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

  if (tabHistory) {
    tabHistory.onclick = () => {
      clearTabs();
      tabHistory.className = "btn-primary";
      contentHistory.style.display = "block";
      renderSeasonHistory();
    };
  }

  document.getElementById("newLeagueBtn").onclick = async () => {
    const data = await Storage.getLeagueData();
    let proceed = true;
    if (data) {
      proceed = await showCustomModal(
        "Criar um novo Campeonato apagará o progresso atual desta carreira. Deseja continuar?",
        "confirm",
        "btn-danger",
      );
    }
    if (proceed) {
      const genderChoice = await showCustomModal(
        `
        <div style="text-align:center;">
          <h3 style="color:#fff;margin-bottom:20px;">Escolha a Modalidade</h3>
          <div style="display:flex;gap:15px;justify-content:center;">
            <button id="modalSelectMale" class="btn-primary" style="padding:15px 30px;">MASCULINO</button>
            <button id="modalSelectFemale" class="btn-primary" style="padding:15px 30px;background:#ff0066;border-color:#ff0066;">FEMININO</button>
          </div>
        </div>
      `,
        "custom",
      );

      if (genderChoice === "male" || genderChoice === "female") {
        resetPlayerStats();
        const leagueType = await getAutoLeagueType();
        await createNewLeague(leagueType, null, genderChoice);
        renderLeagueData();
      }
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
        const flat = data.divisions
          ? data.divisions.flatMap((d) => d.table)
          : [];
        let t = flat.find((x) => x.id === id);
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
        data.continentalCup.phases.push(nextPhase);
        data.continentalCup.currentPhaseIndex++;
        showCustomModal(
          "Fase Continental simulada! Veja quem passou para a próxima fase.",
          "alert",
          "btn-primary",
        );
      } else {
        data.continentalCup.finished = true;
        data.continentalCup.winner = winners[0];
        showCustomModal(
          "A GRANDE FINAL FOI DECIDIDA! O Campeão Continental foi coroado!",
          "alert",
          "btn-warning",
        );
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

          let topDiv = currentData.divisions
            ? currentData.divisions[0]
            : currentData;
          topDiv.table.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.w !== a.w) return b.w - a.w;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
          });

          leagueWinner = topDiv.table[0].name;

          // GESTÃO DE QUALIFICAÇÃO (Mérito Esportivo)
          // 1. Top 4 da Liga
          let qualifiedIds = (Array.isArray(topDiv.table) ? topDiv.table.slice(0, 4) : []).map((t) => t.id);

          // 2. Campeão da Copa (se não estiver no top 4)
          if (currentData.cup && currentData.cup.winner) {
            const cWinnerId = currentData.cup.winner;
            const cWinnerObj = topDiv.table.find((t) => t.id === cWinnerId);
            if (cWinnerObj) cupWinnerName = cWinnerObj.name;
            if (!qualifiedIds.includes(cWinnerId)) qualifiedIds.push(cWinnerId);
          }

          // 3. Campeão Continental (se não estiver qualificado)
          if (currentData.continentalCup && currentData.continentalCup.winner) {
            const contWinnerId = currentData.continentalCup.winner;
            if (!qualifiedIds.includes(contWinnerId))
              qualifiedIds.push(contWinnerId);
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

          const evolutionLog = await advanceSeason();
          const leagueType = await getAutoLeagueType();

          // Passamos os qualificados para a próxima geração
          await createNewLeague(
            leagueType,
            currentData.divisions,
            "male",
            qualifiedIds,
          );


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
      }
    };
  }

  const newLeagueBtn = document.getElementById("newLeagueBtn");
  if (newLeagueBtn) {
    newLeagueBtn.onclick = async () => {
      newLeagueBtn.disabled = true;
      newLeagueBtn.innerText = "GERANDO...";
      try {
        await autoInitLeague();
        await renderLeagueData();
        showCustomModal("🚀 Campeonatos gerados com sucesso!", "alert", "btn-primary");
      } catch (e) {
        console.error(e);
        showCustomModal("❌ Erro ao gerar campeonato: " + e.message, "alert", "btn-danger");
      } finally {
        newLeagueBtn.disabled = false;
        newLeagueBtn.innerText = "GERAR CAMPEONATO";
      }
    };
  }
}
