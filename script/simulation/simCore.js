import {
  squad,
  matchInfo,
  ALL_POSITIONS,
  ensureCaptain,
  applyMatchResults,
  registerMatchResult,
} from "../core/appCore.js";
import { showCustomModal } from "../ui/uiModal.js";
import { switchMainView } from "../ui/uiMain.js";
import { setTableView } from "../ui/uiTableView.js";
import { Storage } from "../core/appStorage.js";
import { getMatchDate } from "../league/leagueMain.js";
import {
  getHomeGoalPhrase,
  getAwayGoalPhrase,
  getMissPhrase,
  getSavePhrase,
  getOppSavePhrase,
} from "../match/narrator.js";
import { handleMatchPostGame } from "../match/matchPostGame.js";
import { startPenaltyShootout } from "../match/penalties.js";
import {
  loadOpponentData,
  getRandomReferee,
  getTeamAtk,
  getTeamDef,
  degradeStamina,
} from "../match/matchEngine.js";
import { getRatingColor, getTeamLogoHTML } from "../ui/uiGraphics.js";
import { playSound, soundGoal, soundMiss, soundWhistle } from "./audio.js";
import {
  getTacticalPositions,
  smartAssignToSlots,
  calculateMatchPowers,
} from "./simTactics.js";
import { loadBadgesLazy, loadLeagueLogosLazy } from "../ui/teams.js";
import { getFIFAEvent, generateFIFAMatches } from "../core/fifaCalendar.js";
export async function openMatchSimulation() {
  const coachInfo = await Storage.getCoachInfo();
  const fifaEvent = getFIFAEvent(coachInfo?.currentDate, coachInfo?.calendarType || "europe");
  if (fifaEvent) {
    openFIFAMatchSimulation(fifaEvent, coachInfo);
    return;
  }

  const titulares = squad.filter((p) => p.status === "titular");
  if (titulares.length < 11) {
    showCustomModal(
      `ESCALAÇÃO INVÁLIDA: O seu time possui atualmente ${titulares.length} jogadores titulares. É obrigatório ter exatos 11 jogadores escalados na Prancheta Tática para poder entrar em campo!`,
      "alert",
      "btn-danger",
    );
    return;
  }

  let isSimulationActive = true;

  const logContainer = document.getElementById("simLog");
  const timeEl = document.getElementById("simTime");
  const scoreEl = document.getElementById("simScore");
  const startBtn = document.getElementById("startSimBtn");
  const opponentSelect = document.getElementById("simOpponentSelect");
  const pauseSimBtn = document.getElementById("pauseSimBtn");
  const subOutList = document.getElementById("subOutList");
  const subInList = document.getElementById("subInList");
  const confirmSubBtn = document.getElementById("confirmSubBtn");
  const penaltiesBtn = document.getElementById("penaltiesBtn");

  let homeShots = 0,
    awayShots = 0;
  let homeShotsOnTarget = 0,
    awayShotsOnTarget = 0;
  let homeFouls = 0,
    awayFouls = 0;
  let homePasses = 0,
    awayPasses = 0;
  let homeCorners = 0,
    awayCorners = 0;
  let homeCrosses = 0,
    awayCrosses = 0;
  let homeOffsides = 0,
    awayOffsides = 0;
  let homeLongBalls = 0,
    awayLongBalls = 0;
  let homeTackles = 0,
    awayTackles = 0;
  let homeSaves = 0,
    awaySaves = 0;
  let homeXG = 0.0,
    awayXG = 0.0;
  let homePassesCompleted = 0,
    awayPassesCompleted = 0;
  let homeDribbles = 0,
    awayDribbles = 0;
  let homeInterceptions = 0,
    awayInterceptions = 0;
  let homePossession = 50;
  let currentReferee = getRandomReferee();

  let currentPlaystyle = (coachInfo && coachInfo.playstyle) || "possession";

  const updateTacticButtons = () => {
    document.querySelectorAll(".tactic-btn").forEach((btn) => {
      if (btn.dataset.style === currentPlaystyle) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  };

  document.querySelectorAll(".tactic-btn").forEach((btn) => {
    btn.onclick = () => {
      currentPlaystyle = btn.dataset.style;
      updateTacticButtons();
      addLog(
        `📋 TÁTICA ALTERADA: O time agora joga no estilo <strong>${btn.innerText.trim()}</strong>.`,
        "log-neutral",
      );
    };
  });
  updateTacticButtons();

  switchMainView("simulation");

  // Reset da UI para aguardar carregamento
  logContainer.innerHTML =
    "<div class='log-entry log-neutral'>Carregando informações da partida...</div>";
  if (timeEl) timeEl.innerText = "00'";
  if (scoreEl) scoreEl.innerText = "0 x 0";
  startBtn.style.display = "none";
  pauseSimBtn.style.display = "none";
  if (subOutList) subOutList.innerHTML = "";
  if (subInList) subInList.innerHTML = "";
  if (confirmSubBtn) {
    confirmSubBtn.disabled = true;
    confirmSubBtn.style.opacity = "0.5";
  }
  if (penaltiesBtn) penaltiesBtn.style.display = "none";
  if (opponentSelect) opponentSelect.disabled = false;

  const homeScorersDiv = document.getElementById("simHomeScorers");
  const awayScorersDiv = document.getElementById("simAwayScorers");
  if (homeScorersDiv) homeScorersDiv.innerHTML = "";
  if (awayScorersDiv) awayScorersDiv.innerHTML = "";

  let currentOpponentId = opponentSelect ? opponentSelect.value : "generic";
  let isLeagueMatch = false;
  let leagueData = await Storage.getLeagueData();
  let myTeamId = (await Storage.getCurrentTeamFile()) || "meu_time";
  let leagueMatch = null;
  let cupMatch = null;
  let isHomeInLeague = true;
  let isHomeInCup = true;
  let isHomeInContinental = true;
  let isCupMatch = false;
  let isContinentalMatch = false;
  let continentalMatch = null;
  let currentMatchDate = 0;

  if (leagueData) {
    let userDiv = leagueData.divisions
      ? leagueData.divisions.find((d) => d.table.some((t) => t.isUser))
      : leagueData;
    const totalRounds = userDiv.rounds.length;

    let nextLeagueDate = 9999;
    let nextLeagueMatch = null;
    let nextLeagueRound = leagueData.currentRound - 1;
    if (nextLeagueRound < totalRounds) {
      nextLeagueDate = getMatchDate("league", nextLeagueRound, totalRounds);
      const currentMatches = userDiv.rounds[nextLeagueRound];
      nextLeagueMatch = currentMatches.find(
        (m) => m.home === myTeamId || m.away === myTeamId,
      );
    }

    let nextCupDate = 9999;
    let nextCupMatch = null;
    let nextCupPhase = leagueData.cup ? leagueData.cup.currentPhaseIndex : 9999;
    if (
      leagueData.cup &&
      !leagueData.cup.finished &&
      nextCupPhase < leagueData.cup.phases.length
    ) {
      nextCupDate = getMatchDate("cup", nextCupPhase, totalRounds);
      const phaseMatches = leagueData.cup.phases[nextCupPhase];
      nextCupMatch = phaseMatches.find(
        (m) => m.home === myTeamId || m.away === myTeamId,
      );
    }

    let nextContDate = 9999;
    let nextContMatch = null;
    let nextContPhase = leagueData.continentalCup
      ? leagueData.continentalCup.currentPhaseIndex
      : 9999;
    if (
      leagueData.continentalCup &&
      !leagueData.continentalCup.finished &&
      nextContPhase < leagueData.continentalCup.phases.length
    ) {
      nextContDate = getMatchDate("continental", nextContPhase, totalRounds);
      const phaseMatches = leagueData.continentalCup.phases[nextContPhase];
      nextContMatch = phaseMatches.find(
        (m) => m.home === myTeamId || m.away === myTeamId,
      );
    }

    let matches = [];
    if (nextLeagueMatch)
      matches.push({
        type: "league",
        date: nextLeagueDate,
        match: nextLeagueMatch,
      });
    if (nextCupMatch)
      matches.push({ type: "cup", date: nextCupDate, match: nextCupMatch });
    if (nextContMatch)
      matches.push({
        type: "continental",
        date: nextContDate,
        match: nextContMatch,
      });

    matches.sort((a, b) => a.date - b.date);

    if (matches.length > 0) {
      const nextMatchInfo = matches[0];
      currentMatchDate = nextMatchInfo.date;

      if (nextMatchInfo.type === "league") {
        isLeagueMatch = true;
        leagueMatch = nextMatchInfo.match;
        isHomeInLeague = leagueMatch.home === myTeamId;
        currentOpponentId = isHomeInLeague
          ? leagueMatch.away
          : leagueMatch.home;
      } else if (nextMatchInfo.type === "cup") {
        isCupMatch = true;
        cupMatch = nextMatchInfo.match;
        isHomeInCup = cupMatch.home === myTeamId;
        currentOpponentId = isHomeInCup ? cupMatch.away : cupMatch.home;
      } else if (nextMatchInfo.type === "continental") {
        isContinentalMatch = true;
        continentalMatch = nextMatchInfo.match;
        isHomeInContinental = continentalMatch.home === myTeamId;
        currentOpponentId = isHomeInContinental
          ? continentalMatch.away
          : continentalMatch.home;
      }
    }

    if (isLeagueMatch || isCupMatch || isContinentalMatch) {
      if (opponentSelect) {
        let opt = opponentSelect.querySelector(
          `option[value="${currentOpponentId}"]`,
        );
        if (!opt) {
          opt = document.createElement("option");
          opt.value = currentOpponentId;
          opt.innerText = "Carregando Oponente...";
          opponentSelect.appendChild(opt);
        }
        opponentSelect.value = currentOpponentId;
        opponentSelect.disabled = true;
      }
    }
  }

  // Carrega os dados baseados no arquivo selecionado
  let currentOpponent = await loadOpponentData(currentOpponentId, leagueData);

  const updateUI = () => {
    const homeTeamEl = document.getElementById("simHomeTeam");
    if (homeTeamEl) homeTeamEl.innerText = matchInfo.home || "Seu Time";

    const awayTeamEl = document.getElementById("simAwayTeam");
    if (awayTeamEl) awayTeamEl.innerText = currentOpponent.name;

    document.getElementById("simHomeLogo").innerHTML = getTeamLogoHTML(
      matchInfo.home || "Seu Time",
    );
    document.getElementById("simAwayLogo").innerHTML = getTeamLogoHTML(
      currentOpponent.name,
    );

    const matchTitleEl = document.getElementById("simMatchTitle");
    if (matchTitleEl) {
      matchTitleEl.innerText =
        isLeagueMatch || isCupMatch || isContinentalMatch
          ? isLeagueMatch
            ? `Campeonato Nacional - Rodada ${leagueData.currentRound}`
            : isCupMatch
              ? `Copa Nacional - ${leagueData.cup.phaseNames[leagueData.cup.currentPhaseIndex]}`
              : `${leagueData.continentalCup.name} - ${leagueData.continentalCup.phaseNames[leagueData.continentalCup.currentPhaseIndex]}`
          : matchInfo.tournament || "Amistoso Internacional";
    }

    const refEl = document.getElementById("simRefereeName");
    if (refEl) refEl.innerText = currentReferee.name;
    if ((isLeagueMatch || isCupMatch || isContinentalMatch) && opponentSelect) {
      let opt = opponentSelect.querySelector(
        `option[value="${currentOpponentId}"]`,
      );
      if (opt)
        opt.innerText = `${isLeagueMatch ? "Jogo da Liga" : isCupMatch ? "Jogo da Copa" : "Torneio Continental"}: ${currentOpponent.name}`;
    }
  };
  updateUI();
  loadBadgesLazy();
  loadLeagueLogosLazy();

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
  let homeAssists = [];
  let homeAssistsIds = [];
  let awayAssists = [];
  let homeCards = [];
  let awayCards = [];
  let homeInjuriesList = [];
  let homeFitnessTracker = {};
  let homePlayedIds = new Set(titulares.map((p) => p.id));
  let homeTacklesIds = [];

  // 1. Primeiro pegamos os 11 titulares
  let titularesBase = titulares.map((p) => {
    let fit = p.fitness !== undefined ? p.fitness : 100;
    homeFitnessTracker[p.id] = fit;
    return { ...p, currentStamina: fit, rating: 6.0 };
  });

  let currentFormation =
    (await Storage.getCurrentFormation()) || coachInfo?.specialty || "4-3-3";
  // Importa fielmente os titulares e suas posições da prancheta
  let homeActivePlayers = [...titularesBase];

  let homeBench = squad
    .filter(
      (p) =>
        p.status === "reserva" &&
        p.matchStatus !== "red" &&
        p.matchStatus !== "injury",
    )
    .map((p) => {
      let fit = p.fitness !== undefined ? p.fitness : 100;
      homeFitnessTracker[p.id] = fit;
      return { ...p, currentStamina: fit, substitutedOut: false, rating: 6.0 };
    });

  let awayActivePlayers = currentOpponent.squad.map((p) => ({
    ...p,
    currentStamina: 100,
    rating: 6.0,
  }));
  let awayBench = (currentOpponent.fullSquad || [])
    .filter(
      (p) =>
        p.status === "reserva" &&
        p.matchStatus !== "red" &&
        p.matchStatus !== "injury",
    )
    .map((p) => ({ ...p, currentStamina: 100, rating: 6.0 }));

  let homeRedCards = 0;
  let awayRedCards = 0;
  let homeSubs = 0;
  let awaySubs = 0;

  let isPaused = false;

  let selectedOutIdx = -1;
  let selectedInIdx = -1;
  let simInterval;

  const simFormationSelect = document.getElementById("simFormationSelect");
  if (simFormationSelect) {
    simFormationSelect.value = currentFormation;
    simFormationSelect.onchange = (e) => {
      currentFormation = e.target.value;
      // Re-organiza os jogadores atuais nos novos slots da formação
      homeActivePlayers = smartAssignToSlots(
        homeActivePlayers,
        currentFormation,
      );
      addLog(
        `📋 ALTERAÇÃO TÁTICA: Time mudou para a formação <strong>${currentFormation}</strong>.`,
        "log-neutral",
      );
      renderMiniPitch();
    };
  }

  const renderMiniPitch = () => {
    const pitch = document.getElementById("miniPitchPlayers");
    if (!pitch) return;
    pitch.innerHTML = "";

    const tacticalPos = getTacticalPositions(currentFormation);
    const onPitchPlayers = homeActivePlayers.filter((p) => !p.isExpelled);

    const getRole = (pos) => {
      if (["GL", "GOL", "ZE", "ZD", "LE", "LD"].includes(pos)) return "def";
      if (["VOL", "MC", "MEI", "ME", "MD"].includes(pos)) return "mid";
      if (["CA", "SA", "PE", "PD"].includes(pos)) return "atk";
      return "mid";
    };

    onPitchPlayers.forEach((p, i) => {
      const slot = tacticalPos[i] || { x: 50, y: 50, pos: "MC" };
      const coords = { x: slot.x, y: slot.y };
      const isSelected = i === selectedOutIdx ? "selected" : "";
      const fit = Math.floor(p.currentStamina);
      const fitColor =
        fit > 70
          ? "var(--accent)"
          : fit > 40
            ? "var(--warning)"
            : "var(--danger)";

      // Mapa de tolerância para não marcar como "Fora de Posição" (Improvisado) visualmente
      const fallbackMap = {
        GL: ["GL", "GOL"],
        ZE: ["ZE", "ZD", "VOL"],
        ZD: ["ZD", "ZE", "LD", "VOL"],
        LE: ["LE", "ME", "PE"],
        LD: ["LD", "MD", "PD"],
        VOL: ["VOL", "MC", "ZE", "ZD"],
        MC: ["MC", "VOL", "MEI", "ME", "MD"],
        ME: ["ME", "LE", "PE", "MC"],
        MD: ["MD", "LD", "PD", "MC"],
        MEI: ["MEI", "MC", "SA", "PE", "PD"],
        PE: ["PE", "ME", "SA", "PD"],
        PD: ["PD", "MD", "SA", "PE"],
        SA: ["SA", "CA", "MEI", "PE", "PD"],
        CA: ["CA", "SA", "PE", "PD"],
      };
      const allowedPositions = fallbackMap[slot.pos] || [slot.pos];
      const isOutPos = !(p.aptitude && p.aptitude.some(ap => allowedPositions.includes(ap)));

      const node = document.createElement("div");
      node.className = `mini-player-node ${isSelected}`;
      node.style.position = "absolute";
      node.style.transform = "translate(-50%, -50%)";
      node.style.left = `${coords.x}%`;
      node.style.top = `${coords.y}%`;
      node.style.background = isSelected
        ? "rgba(0, 170, 255, 0.2)"
        : "rgba(10, 10, 10, 0.85)";
      node.style.border = `1px solid ${isSelected ? "#00aaff" : isOutPos ? "#666" : fitColor}`;
      node.style.borderRadius = "8px";
      node.style.padding = "6px";
      node.style.width = "75px";
      node.style.boxShadow = isSelected
        ? `0 0 15px rgba(0, 170, 255, 0.4)`
        : "0 4px 6px rgba(0,0,0,0.6)";
      node.style.zIndex = isSelected ? "10" : "1";
      node.style.cursor = "pointer";
      node.style.backdropFilter = "blur(4px)";
      node.style.display = "flex";
      node.style.flexDirection = "column";
      node.style.alignItems = "center";
      node.style.gap = "4px";
      node.style.transition = "all 0.2s ease";

      const ovr = (p.rating || 5.0).toFixed(1);
      const ovrColor = getRatingColor(p.rating);

      let statusHtml = "";
      const isYellow = homeCards.some(
        (c) => c.id === p.id && c.type === "yellow",
      );
      const isInjured = homeInjuriesList.some((inj) => inj.id === p.id);
      if (isYellow)
        statusHtml += `<div style="position: absolute; top: -6px; right: -6px; width: 14px; height: 18px; background: #ffcc00; border-radius: 3px; border: 1px solid #000;" title="Cartão Amarelo"></div>`;
      if (isInjured)
        statusHtml += `<div style="position: absolute; top: -6px; left: -6px; width: 18px; height: 18px; background: #ff4444; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid #000;" title="Lesionado">✚</div>`;
      if (p.captain)
        statusHtml += `<div style="position: absolute; bottom: -6px; right: -6px; width: 16px; height: 16px; background: var(--warning); color: #000; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid #000;" title="Capitão">C</div>`;

      const lastName = p.name.split(" ").pop();
      const firstNameInit =
        p.name.split(" ").length > 1 ? p.name.charAt(0) + "." : "";

      node.innerHTML = `
        ${statusHtml}
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 2px;">
          <span style="font-size: 0.7rem; font-weight: 900; color: ${isOutPos ? "#888" : "#fff"};">${p.aptitude?.[0] || "?"}</span>
          <span style="background: ${ovrColor}; color: #000; padding: 2px 4px; border-radius: 4px; font-size: 0.65rem; font-weight: 900;">${ovr}</span>
        </div>
        <div style="color: #fff; font-size: 0.75rem; font-weight: bold; white-space: nowrap; text-shadow: 1px 1px 2px #000; overflow: hidden; text-overflow: ellipsis; width: 100%; text-align: center;">${firstNameInit} ${lastName}</div>
        <div style="width: 100%; height: 5px; background: #333; border-radius: 3px; margin-top: 2px; overflow: hidden;">
           <div style="width: ${fit}%; height: 100%; background: ${fitColor}; transition: 1s;"></div>
        </div>
      `;
      node.title = `${p.name} (OVR ${ovr}) - Estamina: ${fit}% ${isOutPos ? "(Improvisado)" : ""}`;

      node.onclick = () => {
        if (selectedInIdx !== -1) {
          selectedInIdx = -1;
          renderSubLists();
        }

        if (selectedOutIdx === -1) {
          selectedOutIdx = i;
        } else {
          if (selectedOutIdx === i) {
            selectedOutIdx = -1;
          } else {
            const player1 = homeActivePlayers[selectedOutIdx];
            const player2 = homeActivePlayers[i];

            homeActivePlayers[selectedOutIdx] = player2;
            homeActivePlayers[i] = player1;

            // Removido log de troca de posição a pedido do usuário
            selectedOutIdx = -1;
          }
        }
        renderMiniPitch();
        checkSubButton();
      };

      pitch.appendChild(node);
    });
  };

  const checkSubButton = () => {
    if (confirmSubBtn) {
      const hasAvailableSubs = homeBench.some((p) => !p.substitutedOut);
      if (
        isPaused &&
        selectedOutIdx !== -1 &&
        selectedInIdx !== -1 &&
        homeSubs < 5 &&
        hasAvailableSubs
      ) {
        confirmSubBtn.disabled = false;
        confirmSubBtn.style.opacity = "1";
      } else {
        confirmSubBtn.disabled = true;
        confirmSubBtn.style.opacity = "0.5";
      }
    }
  };

  if (subOutList) {
    subOutList.onclick = (e) => {
      const hasAvailableSubs = homeBench.some((p) => !p.substitutedOut);
      if (isPaused && homeSubs < 5 && hasAvailableSubs) {
        const item = e.target.closest(".sub-list-item");
        if (item && !item.classList.contains("expelled-player")) {
          selectedOutIdx = parseInt(item.dataset.idx, 10);
          renderSubLists();
        }
      }
    };
  }

  if (subInList) {
    subInList.onclick = (e) => {
      const hasAvailableSubs = homeBench.some((p) => !p.substitutedOut);
      if (isPaused && homeSubs < 5 && hasAvailableSubs) {
        const item = e.target.closest(".sub-list-item");
        if (item && !item.classList.contains("disabled-sub")) {
          selectedInIdx = parseInt(item.dataset.idx, 10);
          renderSubLists();
        }
      }
    };
  }

  const renderSubLists = () => {
    if (!subInList) return;

    const activePosBtn = document.querySelector("#simBenchPosFilters .filter-btn.active");
    const activeSortBtn = document.querySelector("#simBenchSortFilters .sort-btn.active");
    
    const posFilter = activePosBtn ? activePosBtn.dataset.pos : "";
    const sortBy = activeSortBtn ? activeSortBtn.dataset.sort : "rating";

    let filteredBench = homeBench.map((p, originalIdx) => ({ ...p, originalIdx }));

    // Filtrar
    if (posFilter) {
      filteredBench = filteredBench.filter(p => {
        const primaryPos = p.aptitude?.[0] || "";
        if (posFilter === "GL") return ["GL", "GOL"].includes(primaryPos);
        if (posFilter === "DEF") return ["ZE", "ZD", "LE", "LD"].includes(primaryPos);
        if (posFilter === "MEI") return ["VOL", "MC", "MEI", "MD", "ME"].includes(primaryPos);
        if (posFilter === "ATA") return ["PE", "PD", "SA", "CA"].includes(primaryPos);
        return primaryPos === posFilter;
      });
    }

    // Ordenar
    filteredBench.sort((a, b) => {
      // Prioridade: Quem já saiu (SubbedOut) vai pro fim
      if (a.substitutedOut !== b.substitutedOut) return a.substitutedOut ? 1 : -1;
      
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "fitness") return (b.currentStamina || 0) - (a.currentStamina || 0);
      if (sortBy === "pos") {
        return (ALL_POSITIONS.indexOf(a.aptitude?.[0]) ?? 99) - (ALL_POSITIONS.indexOf(b.aptitude?.[0]) ?? 99);
      }
      return 0;
    });

    subInList.innerHTML = filteredBench
      .map((p) => {
        const i = p.originalIdx;
        const fit = Math.floor(p.currentStamina);
        const fitColor =
          fit > 70
            ? "var(--accent)"
            : fit > 40
              ? "var(--warning)"
              : "var(--danger)";
        const isSelected = i === selectedInIdx ? "selected" : "";
        const isSubbedOut = p.substitutedOut;
        const disabledClass = isSubbedOut ? "disabled-sub" : "";
        const opacity = isSubbedOut ? "0.4" : "1";
        const cursor = isSubbedOut ? "not-allowed" : "pointer";
        const ovr = (p.rating || 5.0).toFixed(1);
        const ovrColor = getRatingColor(p.rating);

        return `<div class="sub-list-item ${isSelected} ${disabledClass}" data-idx="${i}" style="opacity: ${opacity}; cursor: ${cursor};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="sub-name" title="${p.name}">${isSubbedOut ? "❌ " : ""}${p.name}</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.65rem; font-weight: bold; color: #aaa;">${p.aptitude?.[0] || "?"}</span>
                <span style="font-size: 0.8rem; font-weight: 900; color: ${ovrColor}; background: ${ovrColor}22; padding: 1px 5px; border-radius: 4px;">${ovr}</span>
              </div>
          </div>
          <div class="sub-stamina-bar">
              <div class="sub-stamina-fill" style="width: ${fit}%; background: ${fitColor};"></div>
          </div>
      </div>`;
      })
      .join("");

    if (document.getElementById("simSubsLeft")) {
      document.getElementById("simSubsLeft").innerText = 5 - homeSubs;
    }

    checkSubButton();
  };

  const populateSubSelects = () => {
    // Listeners para botões de filtro de posição
    const posBtns = document.querySelectorAll("#simBenchPosFilters .filter-btn");
    posBtns.forEach(btn => {
      if (!btn.dataset.listener) {
        btn.onclick = () => {
          posBtns.forEach(b => {
            b.classList.remove("active");
            b.style.color = "#aaa";
          });
          btn.classList.add("active");
          btn.style.color = "#fff";
          renderSubLists();
        };
        btn.dataset.listener = "true";
      }
    });

    // Listeners para botões de ordenação
    const sortBtns = document.querySelectorAll("#simBenchSortFilters .sort-btn");
    sortBtns.forEach(btn => {
      if (!btn.dataset.listener) {
        btn.onclick = () => {
          sortBtns.forEach(b => {
            b.classList.remove("active");
            b.style.color = "#aaa";
          });
          btn.classList.add("active");
          btn.style.color = "#fff";
          renderSubLists();
        };
        btn.dataset.listener = "true";
      }
    });

    renderSubLists();
  };
  populateSubSelects();

    const updateStatsUI = () => {
      if (!homeScorersDiv || !awayScorersDiv) return;

      const formatScorers = (scorersArr, cardsArr) => {
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

      homeScorersDiv.innerHTML = formatScorers(homeScorers, homeCards);
      awayScorersDiv.innerHTML = formatScorers(awayScorers, awayCards);

      const renderStatRow = (id, label, homeVal, awayVal, isPercentage = false) => {
        const container = document.getElementById(id);
        if (!container) return;

        const total = (homeVal + awayVal) || 1;
        const homePct = (homeVal / total) * 100;
        const awayPct = (awayVal / total) * 100;

        container.innerHTML = `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #888; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">
              <span>${homeVal}${isPercentage ? "%" : ""}</span>
              <span>${label}</span>
              <span>${awayVal}${isPercentage ? "%" : ""}</span>
            </div>
            <div style="height: 6px; background: #222; border-radius: 3px; display: flex; overflow: hidden; border: 1px solid #333;">
              <div style="width: ${homePct}%; background: var(--accent); transition: width 0.5s ease-out; border-right: 1px solid #000;"></div>
              <div style="width: ${awayPct}%; background: #555; transition: width 0.5s ease-out;"></div>
            </div>
          </div>
        `;
      };

      renderStatRow("statPossession", "Posse de Bola", homePossession, 100 - homePossession, true);
      renderStatRow("statShots", "Finalizações", homeShots, awayShots);
      renderStatRow("statShotsOnTarget", "No Alvo", homeShotsOnTarget, awayShotsOnTarget);
      renderStatRow("statXG", "xG (Expectativa)", parseFloat(homeXG.toFixed(2)), parseFloat(awayXG.toFixed(2)));
      renderStatRow("statPasses", "Passes", homePasses, awayPasses);
      renderStatRow("statTackles", "Desarmes", homeTackles, awayTackles);
      renderStatRow("statSaves", "Defesas", homeSaves, awaySaves);
      renderStatRow("statFouls", "Faltas", homeFouls, awayFouls);
      renderStatRow("statCorners", "Escanteios", homeCorners, awayCorners);
      renderStatRow("statOffsides", "Impedimentos", homeOffsides, awayOffsides);
      renderStatRow("statCards", "Cartões", homeCards.length, awayCards.length);

      const setElText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
      };

      setElText("simAwayXG", awayXG.toFixed(2));
      
      const hPassAcc = homePasses > 0 ? Math.round((homePassesCompleted / homePasses) * 100) : 0;
      const aPassAcc = awayPasses > 0 ? Math.round((awayPassesCompleted / awayPasses) * 100) : 0;
      setElText("simHomePassAcc", hPassAcc);
      setElText("simAwayPassAcc", aPassAcc);

      setElText("simHomeDribbles", homeDribbles);
      setElText("simAwayDribbles", awayDribbles);
      setElText("simHomeInterceptions", homeInterceptions);
      setElText("simAwayInterceptions", awayInterceptions);
    };

  const togglePause = () => {
    if (isPaused) {
      isPaused = false;
      pauseSimBtn.innerText = "⏸ Pausar";
      pauseSimBtn.style.background = "var(--warning)";
      pauseSimBtn.style.color = "#000";

      selectedOutIdx = -1;
      selectedInIdx = -1;
      renderSubLists();

      clearInterval(simInterval);
      simInterval = setInterval(runMinute, 1200);
    } else {
      isPaused = true;
      clearInterval(simInterval);
      pauseSimBtn.innerText = "▶ Retomar";
      pauseSimBtn.style.background = "var(--accent)";
      pauseSimBtn.style.color = "#000";
      checkSubButton();
    }
  };

  pauseSimBtn.onclick = togglePause;

  const updateSubListsStamina = () => {
    if (!subOutList) return;
    const outItems = subOutList.querySelectorAll(".sub-list-item");
    homeActivePlayers.forEach((p, i) => {
      if (outItems[i]) {
        const fit = Math.floor(p.currentStamina);
        const fitColor =
          fit > 70
            ? "var(--accent)"
            : fit > 40
              ? "var(--warning)"
              : "var(--danger)";
        const fill = outItems[i].querySelector(".sub-stamina-fill");
        const text = outItems[i].querySelector(".sub-stamina-percent");
        if (fill) {
          fill.style.width = `${fit}%`;
          fill.style.background = fitColor;
        }
        if (text) {
          text.innerText = `${fit}%`;
          text.style.color = fitColor;
        }
      }
    });
  };

  const handleAISubstitutions = () => {
    if (awaySubs < 5 && awayBench.length > 0) {
      const exhaustedIndex = awayActivePlayers.findIndex(
        (p) =>
          p.currentStamina < 40 &&
          p.aptitude?.[0] !== "GL" &&
          p.aptitude?.[0] !== "GOL",
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

  if (confirmSubBtn) {
    confirmSubBtn.onclick = () => {
      if (!isPaused || homeSubs >= 5) return;
      const outIdx = selectedOutIdx;
      const inIdx = selectedInIdx;
      if (outIdx !== -1 && inIdx !== -1) {
        const outPlayer = homeActivePlayers[outIdx];
        const inPlayer = homeBench[inIdx]; // Espreita o jogador sem tirar do banco ainda

        // Validação Tática: Mínimo 1 Goleiro e 3 Defensores
        const previewActive = [...homeActivePlayers];
        previewActive.splice(outIdx, 1, inPlayer);

        const gks = previewActive.filter(
          (p) => p.aptitude?.includes("GOL") || p.aptitude?.includes("GL"),
        ).length;
        const defenders = previewActive.filter((p) =>
          ["ZE", "ZD", "LE", "LD"].some((pos) => p.aptitude?.includes(pos)),
        ).length;

        if (gks < 1) {
          showCustomModal(
            "<strong>REGRA TÁTICA:</strong> Você não pode retirar seu único goleiro sem colocar outro no lugar!",
            "alert",
            "btn-danger",
          );
          return;
        }
        if (defenders < 3) {
          showCustomModal(
            "<strong>ESTRUTURA INVÁLIDA:</strong> A equipe precisa manter no mínimo 3 defensores (Zagueiros ou Laterais) para garantir a integridade da linha defensiva!",
            "alert",
            "btn-danger",
          );
          return;
        }

        // Se passou, executa a troca de fato
        homeBench.splice(inIdx, 1);
        const wasCaptain = outPlayer.captain;
        outPlayer.substitutedOut = true;
        homeBench.push(outPlayer);

        homeActivePlayers.splice(outIdx, 1, inPlayer);

        homeFitnessTracker[outPlayer.id] = outPlayer.currentStamina;
        homeFitnessTracker[inPlayer.id] = inPlayer.currentStamina;
        homePlayedIds.add(inPlayer.id);
        homeSubs++;
        addLog(
          `🔄 ALTERAÇÃO NA EQUIPE: Sai ${outPlayer.name}, entra ${inPlayer.name} com gás total!`,
          "log-neutral",
        );
        selectedOutIdx = -1;
        selectedInIdx = -1;
        populateSubSelects();
        renderMiniPitch(); // Re-render prancheta
        if (wasCaptain) {
          const newCap = ensureCaptain(homeActivePlayers);
          if (newCap)
            addLog(
              `©️ A braçadeira de capitão é repassada para ${newCap.name}.`,
              "log-neutral",
            );
        }
        const hasAvailableSubs = homeBench.some((p) => !p.substitutedOut);
        if (homeSubs >= 5 || !hasAvailableSubs) {
          confirmSubBtn.disabled = true;
          confirmSubBtn.style.opacity = "0.5";
        }
      }
    };
  }

  const addLog = (text, type = "log-neutral") => {
    const el = document.createElement("div");
    el.className = `log-entry ${type}`;
    el.innerHTML = `<strong style="font-size:0.9rem;">${minute}'</strong> &nbsp; ${text}`;
    logContainer.appendChild(el);

    setTimeout(() => {
      logContainer.scrollTo({
        top: logContainer.scrollHeight,
        behavior: "smooth",
      });
    }, 10);

    // Atualiza logos reais no log
    loadBadgesLazy();
  };

  const closeSimulationView = () => {
    isSimulationActive = false;
    clearInterval(simInterval);
    switchMainView("dashboard");
    setTableView(false);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const setSimControlsDisabled = (disabled) => {
    if (pauseSimBtn) {
      pauseSimBtn.disabled = disabled;
      pauseSimBtn.style.opacity = disabled ? "0.5" : "1";
      pauseSimBtn.style.cursor = disabled ? "not-allowed" : "pointer";
    }
    if (disabled) {
      selectedOutIdx = -1;
      selectedInIdx = -1;
      if (subOutList) renderSubLists();
      if (confirmSubBtn) {
        confirmSubBtn.disabled = true;
        confirmSubBtn.style.opacity = "0.5";
      }
    } else {
      const hasAvailableSubs = homeBench.some((p) => !p.substitutedOut);
      if (isPaused && homeSubs < 5 && hasAvailableSubs) {
        checkSubButton();
      }
    }
  };

  const registerHomeGoal = (jogador) => {
    homeScore++;
    homeScorers.push(jogador.name);
    homeScorersIds.push(jogador.id);
    if (Math.random() < 0.7 && homeActivePlayers.length > 1) {
      // 70% de chance do gol ter sido de uma Assistência
      let possibleAssisters = homeActivePlayers.filter(
        (p) => p.id !== jogador.id,
      );
      if (possibleAssisters.length > 0) {
        let assister =
          possibleAssisters[
            Math.floor(Math.random() * possibleAssisters.length)
          ];
        homeAssists.push(assister.name);
        homeAssistsIds.push(assister.id);
        assister.rating = Math.min(10.0, (assister.rating || 6.0) + 0.8);
      }
    }
    scoreEl.innerText = `${homeScore} x ${awayScore}`;
    jogador.rating = Math.min(10.0, (jogador.rating || 6.0) + 1.5);
    updateStatsUI();
  };

  const registerAwayGoal = (oppAttackerName) => {
    awayScore++;
    awayScorers.push(oppAttackerName);
    if (Math.random() < 0.7 && awayActivePlayers.length > 1) {
      let possibleAssisters = awayActivePlayers.filter(
        (p) => p.name !== oppAttackerName,
      );
      if (possibleAssisters.length > 0) {
        let assister =
          possibleAssisters[
            Math.floor(Math.random() * possibleAssisters.length)
          ];
        awayAssists.push(assister.name);
      }
    }
    scoreEl.innerText = `${homeScore} x ${awayScore}`;
    updateStatsUI();
  };

  const runMinute = async () => {
    minute += Math.floor(Math.random() * 3) + 2;

    const powers = calculateMatchPowers(
      homeActivePlayers,
      currentFormation,
      currentPlaystyle,
    );

    homePasses += Math.floor((homePossession / 100) * (Math.random() * 15 + 5));
    awayPasses += Math.floor(
      ((100 - homePossession) / 100) * (Math.random() * 15 + 5),
    );

    if (Math.random() < 0.4) homeLongBalls += Math.floor(Math.random() * 3);
    if (Math.random() < 0.4) awayLongBalls += Math.floor(Math.random() * 3);

    if (Math.random() < 0.5) homeCrosses += Math.floor(Math.random() * 3);
    if (Math.random() < 0.5) awayCrosses += Math.floor(Math.random() * 3);

    if (Math.random() < 0.3) homeOffsides += Math.floor(Math.random() * 2);
    if (Math.random() < 0.3) awayOffsides += Math.floor(Math.random() * 2);

    if (Math.random() < 0.6) {
      const tacklesAmount = Math.floor(Math.random() * 3);
      homeTackles += tacklesAmount;
      homeInterceptions += Math.floor(Math.random() * 2);
      for (let i = 0; i < tacklesAmount; i++) {
        const defenders = homeActivePlayers.filter((p) =>
          ["ZE", "ZD", "LE", "LD", "VOL", "MC"].includes(p.aptitude?.[0]),
        );
        if (defenders.length > 0) {
          homeTacklesIds.push(
            defenders[Math.floor(Math.random() * defenders.length)].id,
          );
        } else if (homeActivePlayers.length > 0) {
          homeTacklesIds.push(homeActivePlayers[0].id);
        }
      }
    }
    if (Math.random() < 0.6) {
      awayTackles += Math.floor(Math.random() * 3);
      awayInterceptions += Math.floor(Math.random() * 2);
    }

    // Passes e Dribbles aleatórios por minuto
    const hPass = Math.floor(Math.random() * 8) + 5;
    const aPass = Math.floor(Math.random() * 8) + 5;
    homePasses += hPass;
    awayPasses += aPass;
    homePassesCompleted += Math.floor(hPass * (0.7 + Math.random() * 0.25));
    awayPassesCompleted += Math.floor(aPass * (0.65 + Math.random() * 0.25));

    if (Math.random() < 0.4) homeDribbles += Math.floor(Math.random() * 2);
    if (Math.random() < 0.4) awayDribbles += Math.floor(Math.random() * 2);

    // Sistemas Físicos e Táticos Baseados no Tempo
    let staminaDrainFactor = 1.0;

    // Aplicação dos Estilos de Jogo
    if (currentPlaystyle === "possession") {
      homePossession = Math.min(65, homePossession + Math.random() * 2);
      staminaDrainFactor = 1.0;
    } else if (currentPlaystyle === "contra ataque") {
      homePossession = Math.max(35, homePossession - Math.random() * 2);
      staminaDrainFactor = 0.8;
    } else if (currentPlaystyle === "ataque total") {
      homePossession = Math.min(70, homePossession + Math.random() * 3);
      staminaDrainFactor = 1.5; // Cansa MUITO
    } else if (currentPlaystyle === "retranca") {
      homePossession = Math.max(25, homePossession - Math.random() * 4);
      staminaDrainFactor = 0.6; // Economiza energia total
    }

    degradeStamina(
      homeActivePlayers,
      true,
      homeFitnessTracker,
      staminaDrainFactor,
    );
    degradeStamina(awayActivePlayers, false, homeFitnessTracker);

    // Atualização leve de notas baseada no tempo e eventos genéricos
    homeActivePlayers.forEach(p => {
      if (p.isExpelled) return;
      // Flutuação aleatória pequena (-0.1 a +0.1)
      p.rating = Math.max(3.0, Math.min(10.0, (p.rating || 6.0) + (Math.random() * 0.2 - 0.1)));
    });

    updateSubListsStamina();
    handleAISubstitutions();

    if (minute >= 45 && !isHalfTime) {
      minute = 45;
      isHalfTime = true;
      timeEl.innerText = "45'";
      clearInterval(simInterval);
      playSound(soundWhistle);
      addLog(
        "Apita o árbitro! Fim do primeiro tempo. Os técnicos preparam suas broncas no vestiário!",
        "log-neutral",
      );
      startBtn.innerText = "Rolar a Bola (2º Tempo)";
      startBtn.style.display = "block";
      pauseSimBtn.style.display = "none";
      setSimControlsDisabled(false);
      return;
    }

    if (minute >= 90) {
      minute = 90;
      timeEl.innerText = "90'";
      clearInterval(simInterval);
      playSound(soundWhistle);
      setTimeout(() => playSound(soundWhistle), 600);
      addLog(
        "Fim de Papo! Aponta para o centro do gramado o juizão, termina o espetáculo! O placar reflete a emoção do jogo.",
        "log-neutral",
      );

      const showFinalizeButton = () => {
        startBtn.innerText = "Finalizar e Salvar Resultados";
        startBtn.style.display = "block";
        pauseSimBtn.style.display = "none";
        if (opponentSelect && !isLeagueMatch) opponentSelect.disabled = false;
        startBtn.onclick = async () => {
          await handleMatchPostGame({
            homeScore,
            awayScore,
            matchInfo,
            currentOpponent,
            homePlayedIds,
            homeScorersIds,
            homeCards,
            homeScorers,
            awayScorers,
            homeAssists,
            awayAssists,
            leagueData,
            currentMatchDate,
            homeInjuriesList,
            homeFitnessTracker,
            homeAssistsIds,
            homeTacklesIds,
            isLeagueMatch,
            isCupMatch,
            leagueMatch,
            cupMatch,
            continentalMatch,
            isHomeInLeague,
            isHomeInCup,
            isHomeInContinental,
            isContinentalMatch,
            awayActivePlayers,
            closeSimulationView,
            squad,
            applyMatchResults,
            registerMatchResult,
          });
        };
      };

      let needsPenalties = false;
      if (homeScore === awayScore && !isLeagueMatch) {
        needsPenalties = true;

        if (isCupMatch) {
          const phaseIdx = leagueData.cup.currentPhaseIndex;
          const isFinal = phaseIdx === 8;
          const isIda = phaseIdx % 2 === 0 && !isFinal;
          const isVolta = phaseIdx % 2 === 1 && !isFinal;

          if (isIda) {
            needsPenalties = false;
          } else if (isVolta) {
            const idaMatch = leagueData.cup.phases[phaseIdx - 1].find(
              (m) =>
                (m.home === cupMatch.home && m.away === cupMatch.away) ||
                (m.home === cupMatch.away && m.away === cupMatch.home),
            );
            if (idaMatch) {
              const prevHomeGoals = isHomeInCup
                ? idaMatch.awayScore
                : idaMatch.homeScore;
              const prevAwayGoals = isHomeInCup
                ? idaMatch.homeScore
                : idaMatch.awayScore;
              if (homeScore + prevHomeGoals !== awayScore + prevAwayGoals) {
                needsPenalties = false;
              }
            }
          }
        } else if (isContinentalMatch) {
          const phaseIdx = leagueData.continentalCup.currentPhaseIndex;
          if (phaseIdx < 3) {
            needsPenalties = false;
          } else {
            const knockoutIdx = phaseIdx - 3;
            const isFinal = phaseIdx === 9;
            const isIda = knockoutIdx % 2 === 0 && !isFinal;
            const isVolta = knockoutIdx % 2 === 1 && !isFinal;

            if (isIda) {
              needsPenalties = false;
            } else if (isVolta) {
              const idaMatch = leagueData.continentalCup.phases[
                knockoutIdx - 1
              ].find(
                (m) =>
                  (m.home === continentalMatch.home &&
                    m.away === continentalMatch.away) ||
                  (m.home === continentalMatch.away &&
                    m.away === continentalMatch.home),
              );
              if (idaMatch) {
                const prevHomeGoals = isHomeInContinental
                  ? idaMatch.awayScore
                  : idaMatch.homeScore;
                const prevAwayGoals = isHomeInContinental
                  ? idaMatch.homeScore
                  : idaMatch.awayScore;
                if (homeScore + prevHomeGoals !== awayScore + prevAwayGoals) {
                  needsPenalties = false;
                }
              }
            }
          }
        }
      }

      if (needsPenalties && penaltiesBtn) {
        penaltiesBtn.style.display = "block";
        pauseSimBtn.style.display = "none";

        penaltiesBtn.onclick = async () => {
          penaltiesBtn.style.display = "none";
          startPenaltyShootout({
            homeActivePlayers,
            awayActivePlayers,
            matchInfo,
            currentOpponentName: currentOpponent.name,
            homeScore,
            awayScore,
            isSimulationActive,
            addLog,
            delay,
            playSound,
            soundGoal,
            soundMiss,
            soundWhistle,
            scoreEl,
            showFinalizeButton,
          });
        };
      } else {
        showFinalizeButton();
      }

      return;
    }

    const currentHomeAtk = powers.atk;
    const currentHomeDef = powers.def;
    const currentAwayAtk = getTeamAtk(awayActivePlayers);
    const currentAwayDef = getTeamDef(awayActivePlayers);

    // Posse baseada no controle de meio-campo tático
    let targetPossession =
      (powers.control /
        (powers.control + (currentAwayAtk + currentAwayDef) / 20)) *
      100;
    homePossession = Math.round(
      homePossession * 0.7 + targetPossession * 0.3 + (Math.random() * 10 - 5),
    );
    homePossession = Math.max(20, Math.min(80, homePossession));

    updateStatsUI();

    timeEl.innerText = minute + "'";
    const rand = Math.random() * 100;

    const homeChanceMod = powers.chanceMod;
    const awayChanceMod = powers.awayChanceMod;

    if (
      rand <
      (currentHomeAtk / (currentHomeAtk + currentAwayDef)) * 15 * homeChanceMod
    ) {
      if (homeActivePlayers.length === 0) return;

      let jogador;
      const onPitch = homeActivePlayers.filter((p) => !p.isExpelled);
      if (onPitch.length === 0) return;

      const randPos = Math.random();
      const attackers = onPitch.filter((p) =>
        ["CA", "SA", "PE", "PD", "MEI"].includes(p.aptitude?.[0]),
      );
      const midfielders = onPitch.filter((p) =>
        ["MC", "ME", "MD", "VOL"].includes(p.aptitude?.[0]),
      );
      const defenders = onPitch.filter((p) =>
        ["ZE", "ZD", "LE", "LD"].includes(p.aptitude?.[0]),
      );

      if (randPos < 0.7 && attackers.length > 0) {
        jogador = attackers[Math.floor(Math.random() * attackers.length)];
      } else if (randPos < 0.9 && midfielders.length > 0) {
        jogador = midfielders[Math.floor(Math.random() * midfielders.length)];
      } else if (defenders.length > 0) {
        jogador = defenders[Math.floor(Math.random() * defenders.length)];
      } else {
        jogador = onPitch[Math.floor(Math.random() * onPitch.length)];
      }
      homeShots++;
      homeXG += 0.05 + Math.random() * 0.15;
      if (
        Math.random() * 100 <
        (jogador.stats?.fin || jogador.stats?.sho || 50)
      ) {
        homeShotsOnTarget++;
        playSound(soundGoal);
        addLog(
          getHomeGoalPhrase(jogador.name, homeRedCards, awayRedCards),
          "log-goal",
        );
        if (Math.random() < currentReferee.varChance) {
          clearInterval(simInterval);
          setSimControlsDisabled(true);

          await delay(2000);
          if (!isSimulationActive) return;
          addLog(
            "📺 O árbitro coloca a mão no ponto eletrônico... O VAR está revisando o lance!",
            "log-neutral",
          );

          await delay(3000);
          if (!isSimulationActive) return;
          if (Math.random() < currentReferee.goalCancelRate) {
            playSound(soundMiss);
            addLog(
              `❌ GOL ANULADO! O VAR pegou uma irregularidade na finalização de ${jogador.name}. O placar não muda.`,
              "log-foul",
            );
          } else {
            playSound(soundGoal);
            registerHomeGoal(jogador);
            addLog(
              "✅ GOL CONFIRMADO! Tudo legal na jogada, pode comemorar!",
              "log-goal",
            );
          }

          setSimControlsDisabled(false);
          if (!isPaused && isSimulationActive) {
            clearInterval(simInterval);
            simInterval = setInterval(runMinute, 1200);
          }
        } else {
          registerHomeGoal(jogador);
        }
      } else {
        if (Math.random() < 0.5) {
          homeShotsOnTarget++;
          awaySaves++;
          playSound(soundMiss);
          const awayKeeper = awayActivePlayers.find(
            (p) => p.aptitude?.[0] === "GL" || p.aptitude?.[0] === "GOL",
          ) || { name: "o goleiro adversário" };
          addLog(getOppSavePhrase(jogador.name, awayKeeper.name), "log-chance");
          // Bônus para o goleiro adversário? No momento focamos no jogador do user, 
          // mas se quisermos notas pro rival: awayKeeper.rating += 0.5;
          if (Math.random() < 0.6) {
            homeCorners++;
            addLog("Escanteio para o nosso time!", "log-neutral");

            clearInterval(simInterval);
            setSimControlsDisabled(true);
            await delay(1500);
            if (!isSimulationActive) return;

            const onPitch = homeActivePlayers.filter((p) => !p.isExpelled);
            if (Math.random() < 0.15 && onPitch.length > 0) {
              homeShots++;
              homeXG += 0.12;
              homeShotsOnTarget++;
              const fieldPlayers = onPitch.filter(
                (p) => p.aptitude?.[0] !== "GL" && p.aptitude?.[0] !== "GOL",
              );
              const headerPlayer =
                fieldPlayers.length > 0
                  ? fieldPlayers[
                      Math.floor(Math.random() * fieldPlayers.length)
                    ]
                  : onPitch[0];
              playSound(soundGoal);
              addLog(
                `⚽ GOOOOOOOOOOOOOOOOOOOL! Na cobrança de escanteio, ${headerPlayer.name} sobe no terceiro andar e testa pro fundo das redes!`,
                "log-goal",
              );
              registerHomeGoal(headerPlayer);
            } else {
              const cornerOutcomes = [
                "Cobrança na área... A zaga adversária sobe mais alto e afasta o perigo!",
                "Cruzamento fechado, mas o goleiro sai de soco e resolve a situação.",
                "A bola viaja na área, passa por todo mundo e sai em tiro de meta.",
                "Desvio de cabeça na primeira trave, mas a bola vai por cima do gol! Tiro de meta.",
              ];
              addLog(
                cornerOutcomes[
                  Math.floor(Math.random() * cornerOutcomes.length)
                ],
                "log-neutral",
              );
            }
            setSimControlsDisabled(false);
            if (!isPaused && isSimulationActive) {
              simInterval = setInterval(runMinute, 1200);
            }
          }
        } else {
          playSound(soundMiss);
          addLog(getMissPhrase(jogador.name), "log-chance");
        }
      }
      updateStatsUI();
    } else if (
      rand >
      100 -
        (currentAwayAtk / (currentAwayAtk + currentHomeDef)) *
          15 *
          awayChanceMod
    ) {
      const onPitchHome = homeActivePlayers.filter((p) => !p.isExpelled);
      const onPitchAway = awayActivePlayers.filter((p) => !p.isExpelled);

      const goleiros = onPitchHome.filter(
        (p) => p.aptitude?.[0] === "GL" || p.aptitude?.[0] === "GOL",
      );
      const goleiro =
        goleiros.length > 0
          ? goleiros[0]
          : onPitchHome.length > 0
            ? onPitchHome[0]
            : titulares[0]; // Fallback de segurança
      let oppAttacker = null;
      if (onPitchAway.length > 0) {
        const randPos = Math.random();
        const attackers = onPitchAway.filter((p) =>
          ["CA", "SA", "PE", "PD", "MEI"].includes(p.aptitude?.[0]),
        );
        const midfielders = onPitchAway.filter((p) =>
          ["MC", "ME", "MD", "VOL"].includes(p.aptitude?.[0]),
        );
        const defenders = onPitchAway.filter((p) =>
          ["ZE", "ZD", "LE", "LD"].includes(p.aptitude?.[0]),
        );

        if (randPos < 0.7 && attackers.length > 0) {
          oppAttacker = attackers[Math.floor(Math.random() * attackers.length)];
        } else if (randPos < 0.9 && midfielders.length > 0) {
          oppAttacker =
            midfielders[Math.floor(Math.random() * midfielders.length)];
        } else if (defenders.length > 0) {
          oppAttacker = defenders[Math.floor(Math.random() * defenders.length)];
        } else {
          oppAttacker =
            onPitchAway[Math.floor(Math.random() * onPitchAway.length)];
        }
      }

      const oppAttackerName = oppAttacker?.name || "O atacante adversário";
      const oppFinishing =
        oppAttacker?.stats?.fin || oppAttacker?.stats?.sho || 50;
      const homeKeeperReflex = goleiro?.stats?.ref || 50;

      // Duelo: Atacante vs Goleiro. A chance base é o chute do atacante, reduzida pela defesa do goleiro.
      const goalChance = oppFinishing - homeKeeperReflex * 0.75;

      awayShots++;
      awayXG += 0.05 + Math.random() * 0.15;

      if (Math.random() * 100 < goalChance) {
        awayShotsOnTarget++;
        playSound(soundMiss);
        goleiro.rating = Math.max(3.0, (goleiro.rating || 6.0) - 0.3); // Pequena penalidade por sofrer gol
        addLog(
          getAwayGoalPhrase(
            currentOpponent.name,
            oppAttackerName,
            awayRedCards,
            homeRedCards,
          ),
          "log-foul",
        );
        if (Math.random() < currentReferee.varChance) {
          clearInterval(simInterval);
          setSimControlsDisabled(true);

          await delay(2000);
          if (!isSimulationActive) return;
          addLog(
            `📺 VAR EM AÇÃO! Revisão de possível irregularidade no gol de ${oppAttackerName}...`,
            "log-neutral",
          );

          await delay(3000);
          if (!isSimulationActive) return;
          if (Math.random() < currentReferee.goalCancelRate) {
            playSound(soundGoal);
            addLog(
              `❌ UFA! GOL ANULADO! O VAR salva nossa equipe e o placar segue inalterado.`,
              "log-goal",
            );
          } else {
            playSound(soundMiss);
            registerAwayGoal(oppAttackerName);
            addLog(
              `✅ GOL CONFIRMADO PELO VAR para o ${currentOpponent.name}. Que banho de água fria.`,
              "log-foul",
            );
          }

          setSimControlsDisabled(false);
          if (!isPaused && isSimulationActive) {
            clearInterval(simInterval);
            simInterval = setInterval(runMinute, 1200);
          }
        } else {
          registerAwayGoal(oppAttackerName);
        }
      } else {
        awayShotsOnTarget++;
        homeSaves++;
        playSound(soundGoal);
        goleiro.rating = Math.min(10.0, (goleiro.rating || 6.0) + 0.4);
        addLog(getSavePhrase(goleiro.name, oppAttackerName), "log-chance");
        if (Math.random() < 0.4) {
          awayCorners++;
          addLog(
            `O goleiro ${goleiro.name} espalma pela linha de fundo! Escanteio para o ${currentOpponent.name}.`,
            "log-neutral",
          );

          clearInterval(simInterval);
          setSimControlsDisabled(true);
          await delay(1500);
          if (!isSimulationActive) return;

          if (Math.random() < 0.15 && awayActivePlayers.length > 0) {
            awayShots++;
            awayXG += 0.12;
            awayShotsOnTarget++;
            const fieldPlayers = awayActivePlayers.filter(
              (p) => p.aptitude?.[0] !== "GL" && p.aptitude?.[0] !== "GOL",
            );
            const headerPlayer =
              fieldPlayers.length > 0
                ? fieldPlayers[Math.floor(Math.random() * fieldPlayers.length)]
                : awayActivePlayers[0];
            playSound(soundMiss);
            addLog(
              `⚽ GOOOOOOOL! O ${currentOpponent.name} cobra o escanteio na medida e ${headerPlayer.name} sobe livre para marcar!`,
              "log-foul",
            );
            registerAwayGoal(headerPlayer.name);
          } else {
            const cornerOutcomes = [
              "Cobrança perigosa... Nossa zaga afasta de cabeça!",
              "Cruzamento na área, mas o goleiro sobe firme e segura a bola.",
              "A bola cruza toda a extensão da grande área e se perde pela linha de fundo.",
              "Cabeçada do ataque adversário, mas a bola vai sem perigo por cima da meta.",
            ];
            addLog(
              cornerOutcomes[Math.floor(Math.random() * cornerOutcomes.length)],
              "log-neutral",
            );
          }
          setSimControlsDisabled(false);
          if (!isPaused && isSimulationActive) {
            simInterval = setInterval(runMinute, 1200);
          }
        }
      }
      updateStatsUI();
    } else if (rand > 45 && rand < 52) {
      // Eventos Dinâmicos: Cartões e Lesões (Acontecem esporadicamente)
      if (Math.random() > 0.4) {
        const isHome = Math.random() > 0.5;
        const onPitch = isHome
          ? homeActivePlayers.filter((px) => !px.isExpelled)
          : awayActivePlayers.filter((px) => !px.isExpelled);
        if (onPitch.length > 0) {
          let idx = Math.floor(Math.random() * onPitch.length);
          let p = onPitch[idx];
          if (isHome) homeFouls++;
          else awayFouls++;
          const cardRand = Math.random();
          if (cardRand < 0.1) {
            playSound(soundMiss);
            addLog(
              `🟥 RUA! CARTÃO VERMELHO PARA ${p.name}! Entrada dura e o árbitro expulsa o nosso jogador!`,
              "log-card-red",
            );
            if (Math.random() < currentReferee.varChance) {
              clearInterval(simInterval);
              setSimControlsDisabled(true);

              await delay(2000);
              if (!isSimulationActive) return;
              addLog(
                `📺 VAR CHAMOU! O árbitro vai à cabine revisar a expulsão de ${p.name}...`,
                "log-neutral",
              );

              await delay(3000);
              if (!isSimulationActive) return;
              if (Math.random() < currentReferee.cardCancelRate) {
                addLog(
                  `🟨 EXPULSÃO ANULADA! O árbitro retira o vermelho e aplica apenas o amarelo para ${p.name}! Ele segue em campo!`,
                  "log-card-yellow",
                );
                p.rating = Math.max(3.0, (p.rating || 6.0) - 0.5);
                homeCards.push({ id: p.id, name: p.name, type: "yellow" });
              } else {
                addLog(
                  `🟥 EXPULSÃO CONFIRMADA PELO VAR! O time fica com um a menos!`,
                  "log-card-red",
                );
                p.rating = Math.max(2.0, (p.rating || 6.0) - 1.5);
                const wasCaptain = p.captain;
                homeActivePlayers.splice(idx, 1);
                homeRedCards++;
                homeCards.push({ id: p.id, name: p.name, type: "red" });
                if (wasCaptain) {
                  const newCap = ensureCaptain(homeActivePlayers);
                  if (newCap)
                    addLog(
                      `©️ ${p.name} era o capitão. A braçadeira agora fica com ${newCap.name}.`,
                      "log-neutral",
                    );
                }
              }

              setSimControlsDisabled(false);
              if (!isPaused && isSimulationActive) {
                clearInterval(simInterval);
                simInterval = setInterval(runMinute, 1200);
              }
            } else {
              addLog(`O time fica com um a menos!`, "log-card-red");
              p.rating = Math.max(2.0, (p.rating || 6.0) - 1.5);
              const wasCaptain = p.captain;
              p.isExpelled = true;
              homeRedCards++;
              homeCards.push({ id: p.id, name: p.name, type: "red" });
              if (wasCaptain) {
                const onPitch = homeActivePlayers.filter(
                  (px) => !px.isExpelled,
                );
                const newCap = ensureCaptain(onPitch);
                if (newCap)
                  addLog(
                    `©️ ${p.name} era o capitão. A braçadeira é repassada para ${newCap.name}.`,
                    "log-neutral",
                  );
              }
              renderSubLists(); // Atualiza UI
            }
          } else if (cardRand < 0.35) {
            p.rating = Math.max(3.0, (p.rating || 6.0) - 0.5);
            homeCards.push({ id: p.id, name: p.name, type: "yellow" });
            addLog(
              `🟨 CARTÃO AMARELO! ${p.name} chega atrasado na marcação e é advertido pelo juiz.`,
              "log-card-yellow",
            );
          } else {
            addLog(
              `Apita o árbitro! Falta de ${p.name}. Infração parando o jogo, mas sem necessidade de cartão.`,
              "log-foul",
            );
          }
          updateStatsUI();
        } else if (!isHome && awayActivePlayers.length > 0) {
          let idx = Math.floor(Math.random() * awayActivePlayers.length);
          let p = awayActivePlayers[idx];
          awayFouls++;
          const cardRand = Math.random();
          if (cardRand < 0.1) {
            playSound(soundGoal);
            addLog(
              `🟥 EXPULSO! ${p.name} do ${currentOpponent.name} faz falta violenta e leva o vermelho direto!`,
              "log-card-red",
            );
            if (Math.random() < currentReferee.varChance) {
              clearInterval(simInterval);
              setSimControlsDisabled(true);

              await delay(2000);
              if (!isSimulationActive) return;
              addLog(
                `📺 VAR CHAMOU! O árbitro revisa o cartão vermelho de ${p.name}...`,
                "log-neutral",
              );

              await delay(3000);
              if (!isSimulationActive) return;
              if (Math.random() < currentReferee.cardCancelRate) {
                addLog(
                  `🟨 CARTÃO CANCELADO! O árbitro retira o vermelho e aplica só o amarelo para ${p.name}. Ele continua na partida!`,
                  "log-card-yellow",
                );
                awayCards.push({ id: p.id, name: p.name, type: "yellow" });
              } else {
                addLog(
                  `🟥 DECISÃO MANTIDA PELO VAR! ${p.name} vai para o chuveiro mais cedo! Estão com um a menos!`,
                  "log-card-red",
                );
                p.isExpelled = true;
                awayRedCards++;
                awayCards.push({ id: p.id, name: p.name, type: "red" });
              }

              setSimControlsDisabled(false);
              if (!isPaused && isSimulationActive) {
                clearInterval(simInterval);
                simInterval = setInterval(runMinute, 1200);
              }
            } else {
              addLog(`Estão com um a menos!`, "log-card-red");
              awayActivePlayers.splice(idx, 1);
              awayRedCards++;
              awayCards.push({ id: p.id, name: p.name, type: "red" });
            }
          } else if (cardRand < 0.35) {
            awayCards.push({ id: p.id, name: p.name, type: "yellow" });
            addLog(
              `🟨 Falta tática de ${p.name} do ${currentOpponent.name}, que recebe o cartão amarelo.`,
              "log-card-yellow",
            );
          } else {
            addLog(
              `Falta marcada para o nosso time! ${p.name} do ${currentOpponent.name} comete a infração, apenas advertência verbal.`,
              "log-foul",
            );
          }
          updateStatsUI();
        }
      } else {
        let isHome = Math.random() > 0.5;
        let targetPlayers = isHome ? homeActivePlayers : awayActivePlayers;
        if (targetPlayers.length > 0) {
          let sortedPlayers = [...targetPlayers].sort(
            (a, b) => a.currentStamina - b.currentStamina,
          );
          let p =
            sortedPlayers[
              Math.floor(Math.random() * Math.min(3, sortedPlayers.length))
            ];

          let riskFactor = 1;
          if (p.currentStamina < 50) riskFactor = 2;
          if (p.currentStamina < 30) riskFactor = 4;
          if (p.currentStamina < 15) riskFactor = 6;

          if (Math.random() * 10 < riskFactor) {
            const isGK = p.aptitude && (p.aptitude[0] === "GL" || p.aptitude[0] === "GOL");
            if (isGK) return; // Goleiros não sofrem lesão por cansaço de corrida

            p.currentStamina -= 10; // Lesão por cansaço (Reduzido de 30 para 10)
            if (isHome) {
              homeInjuriesList.push({ id: p.id, name: p.name });
              homeFitnessTracker[p.id] = p.currentStamina;
              addLog(
                `🚑 LESÃO MUSCULAR! O esforço pesou. ${p.name} sente uma fisgada e desaba no gramado!`,
                "log-injury",
              );
            } else {
              addLog(
                `🚑 Jogo parado! ${p.name} do ${currentOpponent.name} sentiu uma lesão muscular por desgaste.`,
                "log-injury",
              );
            }
          } else {
            const isGK = p.aptitude && (p.aptitude[0] === "GL" || p.aptitude[0] === "GOL");
            const lossAmount = isGK ? 1 : 5; // Goleiro perde 1, jogador de linha perde 5 (era 15)

            p.currentStamina -= lossAmount; // Perde fôlego suavizado
            if (isHome) homeFitnessTracker[p.id] = p.currentStamina;
            addLog(
              `😰 ${p.name} parece exausto em campo, respirando ofegante após uma sequência intensa.`,
              "log-chance",
            );
          }
        }
      }
    } else if (rand > 60 && rand < 65) {
      if (Math.random() > 0.5) {
        const statComments = [
          `O jogo está muito disputado no meio-campo. A posse de bola no momento é de ${homePossession}% para nós e ${100 - homePossession}% para o adversário.`,
          `As defesas estão levando a melhor até aqui. Já temos um total de ${homeTackles + awayTackles} desarmes na partida.`,
          `O toque de bola dita o ritmo! Nosso time já trocou ${homePasses} passes, enquanto o adversário acertou ${awayPasses}.`,
          `Partida muito pegada! Já tivemos ${homeFouls + awayFouls} faltas assinaladas pelo árbitro ${currentReferee.name}.`,
          `Pouca emoção nas áreas nestes últimos minutos... Vale lembrar que temos ${homeShots} finalizações do nosso lado contra ${awayShots} deles.`,
          `Muitas bolas alçadas na área! Já tivemos ${homeCrosses + awayCrosses} cruzamentos na partida.`,
          `As linhas defensivas estão altas, com ${homeOffsides + awayOffsides} impedimentos assinalados até agora.`,
          `Nenhum dos times consegue criar grandes chances no momento. Jogo muito estudado taticamente pelas duas equipes.`,
        ];
        addLog(
          `🎙️ Narrador: "${statComments[Math.floor(Math.random() * statComments.length)]}"`,
          "log-neutral",
        );
      }
    }
    renderMiniPitch();
  };

  startBtn.onclick = () => {
    if (opponentSelect) opponentSelect.disabled = true;
    startBtn.style.display = "none";
    pauseSimBtn.style.display = "block";
    setSimControlsDisabled(false);
    playSound(soundWhistle);
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
    clearInterval(simInterval);
    simInterval = setInterval(runMinute, 1200);
  };
  document.getElementById("closeSimBtn").onclick = async () => {
    clearInterval(simInterval);
    if (minute > 0 && minute < 90) {
      const proceed = await showCustomModal(
        `O jogo está rolando aos ${minute}' minutos com o placar de ${homeScore} x ${awayScore}. Se você sair agora, todo o progresso, gols e estatísticas desta partida serão perdidos. Deseja realmente abandonar o jogo?`,
        "confirm",
        "btn-danger",
      );
      if (!proceed) {
        if (!isPaused && isSimulationActive) {
          clearInterval(simInterval);
          simInterval = setInterval(runMinute, 1200);
        }
        return;
      }
    }
    closeSimulationView();
  };

  // Inicialização Visual
  renderMiniPitch();
  updateStatsUI();
}

export async function openFIFAMatchSimulation(fifaEvent, coachInfo) {
  const isTournament = fifaEvent.type === "tournament";
  const userNationalTeam = coachInfo.nationalTeam || null; // ex: "Brasil"
  
  // Criar overlay principal
  const overlay = document.createElement("div");
  overlay.id = "fifaSimOverlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.98);
    backdrop-filter: blur(12px);
    z-index: 11000;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow-y: auto;
    color: #fff;
    font-family: 'Outfit', sans-serif;
    padding: 30px;
    box-sizing: border-box;
  `;
  
  // Inicializa dados das rodadas/torneio
  const matchesData = generateFIFAMatches(fifaEvent.type);
  let currentRoundIdx = 0; // Para datas curtas (0 e 1)
  let currentPhaseIdx = 0; // Para torneios (0: Oitavas, 1: Quartas, 2: Semi, 3: Final)
  
  // Lista de resultados simulados acumulados para exibir no final
  const simulationHistory = [];

  const container = document.createElement("div");
  container.style.cssText = `
    width: 100%;
    max-width: 850px;
    background: #0f0f0f;
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    gap: 20px;
  `;
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Função para simular partida única
  function simulateSingleMatch(home, away) {
    const potencies = {
      "Brasil": 88, "França": 88, "Argentina": 87, "Inglaterra": 86,
      "Alemanha": 85, "Espanha": 86, "Portugal": 85, "Itália": 83,
      "Holanda": 84, "Bélgica": 83, "Uruguai": 83, "Colômbia": 82,
      "Croácia": 81, "Marrocos": 81, "Senegal": 80, "Japão": 80
    };
    const powerHome = potencies[home] || 78;
    const powerAway = potencies[away] || 78;
    const diff = powerHome - powerAway;
    const lambdaHome = Math.max(0.5, 1.4 + diff * 0.05 + Math.random() * 0.4);
    const lambdaAway = Math.max(0.5, 1.2 - diff * 0.05 + Math.random() * 0.4);
    
    let homeScore = Math.floor(Math.random() * (lambdaHome + 1.3));
    let awayScore = Math.floor(Math.random() * (lambdaAway + 1.3));
    
    let penalties = null;
    if (isTournament && homeScore === awayScore) {
      const homePen = Math.floor(Math.random() * 3) + 3;
      let awayPen = Math.floor(Math.random() * 3) + 3;
      while (awayPen === homePen) {
        awayPen = Math.floor(Math.random() * 3) + 3;
      }
      penalties = { home: homePen, away: awayPen };
    }
    
    const getGoalEvents = (team, score) => {
      const teamSquad = {
        "Brasil": ['Vinicius Jr', 'Rodrygo', 'Neymar', 'Raphinha', 'Endrick', 'Bruno Guimarães'],
        "Argentina": ['Messi', 'Lautaro Martínez', 'Julián Álvarez', 'De Paul', 'Mac Allister'],
        "França": ['Mbappé', 'Griezmann', 'Giroud', 'Dembélé', 'Tchouaméni'],
        "Inglaterra": ['Kane', 'Saka', 'Bellingham', 'Foden', 'Palmer'],
        "Alemanha": ['Musiala', 'Wirtz', 'Havertz', 'Füllkrug', 'Gündogan'],
        "Espanha": ['Morata', 'Dani Olmo', 'Yamal', 'Nico Williams', 'Pedri'],
        "Portugal": ['Cristiano Ronaldo', 'Bruno Fernandes', 'Bernardo Silva', 'João Félix', 'Rafael Leão'],
        "Itália": ['Chiesa', 'Retegui', 'Barella', 'Pellegrini', 'Scamacca'],
        "Holanda": ['Depay', 'Gakpo', 'Xavi Simons', 'De Jong', 'Malen'],
        "Bélgica": ['Lukaku', 'De Bruyne', 'Doku', 'Trossard', 'Tielemans'],
        "Uruguai": ['Darwin Núñez', 'Suárez', 'Valverde', 'De la Cruz', 'Pellistri'],
        "Colômbia": ['Luis Díaz', 'James Rodríguez', 'Borré', 'Arias', 'Lerma'],
        "Croácia": ['Modric', 'Kramaric', 'Perisic', 'Kovacic', 'Pasalic'],
        "Marrocos": ['En-Nesyri', 'Ziyech', 'Hakimi', 'Ounahi', 'Amrabat'],
        "Senegal": ['Mané', 'Jackson', 'Sarr', 'Gueye', 'Mendy'],
        "Japão": ['Mitoma', 'Minamino', 'Kubo', 'Endo', 'Doan']
      };
      const players = teamSquad[team] || ['Atleta ' + team];
      const list = [];
      for (let i = 0; i < score; i++) {
        const scorer = players[Math.floor(Math.random() * players.length)];
        const min = Math.floor(Math.random() * 90) + 1;
        list.push({ scorer, min });
      }
      list.sort((a, b) => a.min - b.min);
      return list;
    };
    
    return {
      homeScore,
      awayScore,
      homeGoals: getGoalEvents(home, homeScore),
      awayGoals: getGoalEvents(away, awayScore),
      penalties
    };
  }

  // Renderiza o cabeçalho
  function renderHeader() {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid rgba(245, 158, 11, 0.2); padding-bottom: 15px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 50px; height: 50px; background: rgba(245,158,11,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--accent); color: var(--accent);">
            <i data-lucide="globe" style="width: 28px; height: 28px;"></i>
          </div>
          <div>
            <h2 style="margin: 0; font-size: 1.6rem; color: #fff; font-weight: 800; letter-spacing: 0.5px;">DATA FIFA &bull; SELEÇÕES</h2>
            <div style="font-size: 0.85rem; color: var(--accent); margin-top: 3px; font-weight: bold; text-transform: uppercase;">
              ${fifaEvent.name}
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: #888;">TEMPORADA ATUAL</div>
          <div style="font-size: 1.1rem; font-weight: bold; color: #fff;">${coachInfo.currentDate.split("-")[0]}</div>
        </div>
      </div>
      <p style="color: #bbb; font-size: 0.9rem; line-height: 1.5; margin: 0;">
        ${fifaEvent.desc}
      </p>
    `;
  }

  // Desenha a visualização de simulação geral por rodadas
  async function showSpectatorSimulation() {
    renderHeader();
    
    const activeRoundName = isTournament 
      ? matchesData[currentPhaseIdx].name 
      : `Rodada ${currentRoundIdx + 1} de 2`;
      
    const activeMatches = isTournament 
      ? matchesData[currentPhaseIdx].matches 
      : matchesData[currentRoundIdx];

    const roundTitle = document.createElement("h3");
    roundTitle.style.cssText = "color: var(--accent); margin: 15px 0 5px 0; font-size: 1.1rem; text-transform: uppercase; font-weight: 800;";
    roundTitle.innerText = activeRoundName;
    container.appendChild(roundTitle);

    const matchesList = document.createElement("div");
    matchesList.style.cssText = "display: flex; flex-direction: column; gap: 10px; max-height: 380px; overflow-y: auto; padding-right: 5px;";
    container.appendChild(matchesList);

    // Desenhar cards vazios dos jogos da rodada
    activeMatches.forEach((m, idx) => {
      const matchEl = document.createElement("div");
      matchEl.id = `spectator-match-${idx}`;
      matchEl.style.cssText = `
        background: #151515;
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 8px;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.3s ease;
      `;
      matchEl.innerHTML = `
        <div style="flex: 1; text-align: right; font-weight: bold; font-size: 0.95rem;">${m.home}</div>
        <div id="score-${idx}" style="margin: 0 25px; color: var(--accent); font-weight: 900; font-size: 1.1rem; min-width: 70px; text-align: center;">VS</div>
        <div style="flex: 1; text-align: left; font-weight: bold; font-size: 0.95rem;">${m.away}</div>
      `;
      matchesList.appendChild(matchEl);
    });

    const actionArea = document.createElement("div");
    actionArea.style.cssText = "display: flex; justify-content: flex-end; margin-top: 15px;";
    
    const simBtn = document.createElement("button");
    simBtn.className = "btn-warning";
    simBtn.style.cssText = "padding: 14px 28px; font-weight: bold; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;";
    simBtn.innerText = "Simular Confrontos ➔";
    actionArea.appendChild(simBtn);
    container.appendChild(actionArea);

    if (window.lucide) window.lucide.createIcons();

    simBtn.onclick = async () => {
      simBtn.disabled = true;
      simBtn.innerText = "Simulando Rodada...";
      
      // Simulação progressiva animada de minutos
      const stepScores = activeMatches.map(m => simulateSingleMatch(m.home, m.away));
      
      for (let min = 10; min <= 90; min += 20) {
        activeMatches.forEach((m, idx) => {
          const score = stepScores[idx];
          const scoreEl = document.getElementById(`score-${idx}`);
          const currentHomeScore = score.homeGoals.filter(g => g.min <= min).length;
          const currentAwayScore = score.awayGoals.filter(g => g.min <= min).length;
          
          scoreEl.innerHTML = `<span style="color:#aaa; font-size:0.8rem; font-weight:normal; margin-right:5px;">${min}'</span> <strong>${currentHomeScore}</strong> - <strong>${currentAwayScore}</strong>`;
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Mostra o resultado final definitivo com detalhes e goleadores
      activeMatches.forEach((m, idx) => {
        const score = stepScores[idx];
        m.played = true;
        m.score = score;
        
        const scoreEl = document.getElementById(`score-${idx}`);
        const cardEl = document.getElementById(`spectator-match-${idx}`);
        cardEl.style.borderColor = "rgba(245, 158, 11, 0.4)";
        
        let scoreStr = `<strong>${score.homeScore}</strong> - <strong>${score.awayScore}</strong>`;
        if (score.penalties) {
          scoreStr = `<strong>${score.homeScore}</strong> (${score.penalties.home}) - (${score.penalties.away}) <strong>${score.awayScore}</strong>`;
          m.winner = score.penalties.home > score.penalties.away ? m.home : m.away;
        } else {
          m.winner = score.homeScore > score.awayScore ? m.home : (score.awayScore > score.homeScore ? m.away : null);
        }

        scoreEl.innerHTML = scoreStr;
        
        const details = document.createElement("div");
        details.style.cssText = "width: 100%; display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 5px;";
        
        const homeScorersText = score.homeGoals.map(g => `${g.scorer} ${g.min}'`).join(", ") || "-";
        const awayScorersText = score.awayGoals.map(g => `${g.scorer} ${g.min}'`).join(", ") || "-";
        
        details.innerHTML = `
          <div style="flex: 1; text-align: right; padding-right: 10px;">${homeScorersText}</div>
          <div style="width: 70px;"></div>
          <div style="flex: 1; text-align: left; padding-left: 10px;">${awayScorersText}</div>
        `;
        cardEl.style.flexDirection = "column";
        const row = document.createElement("div");
        row.style.cssText = "width: 100%; display: flex; justify-content: space-between; align-items: center;";
        row.innerHTML = `
          <div style="flex: 1; text-align: right; font-weight: bold;">${m.home}</div>
          <div style="margin: 0 25px; color: var(--accent); font-weight: 900; font-size: 1.1rem; min-width: 70px; text-align: center;">${scoreStr}</div>
          <div style="flex: 1; text-align: left; font-weight: bold;">${m.away}</div>
        `;
        cardEl.innerHTML = "";
        cardEl.appendChild(row);
        cardEl.appendChild(details);
        
        simulationHistory.push({
          phaseName: activeRoundName,
          home: m.home,
          away: m.away,
          scoreText: `${score.homeScore} x ${score.awayScore}` + (score.penalties ? ` (Pen: ${score.penalties.home}-${score.penalties.away})` : "")
        });
      });

      simBtn.style.display = "none";
      const nextBtn = document.createElement("button");
      nextBtn.className = "btn-primary";
      nextBtn.style.cssText = "padding: 14px 28px; font-weight: bold; border-radius: 8px; cursor: pointer; text-transform: uppercase;";
      
      if (isTournament) {
        if (currentPhaseIdx < 3) {
          nextBtn.innerText = "Avançar de Fase ➔";
          nextBtn.onclick = () => {
            const currentPhase = matchesData[currentPhaseIdx];
            const nextPhase = matchesData[currentPhaseIdx + 1];
            for (let i = 0; i < nextPhase.matches.length; i++) {
              const match1 = currentPhase.matches[i * 2];
              const match2 = currentPhase.matches[i * 2 + 1];
              nextPhase.matches[i].home = match1.winner;
              nextPhase.matches[i].away = match2.winner;
            }
            currentPhaseIdx++;
            showSpectatorSimulation();
          };
        } else {
          nextBtn.innerText = "Concluir Copa de Seleções 🏆";
          nextBtn.onclick = finishFIFADate;
        }
      } else {
        if (currentRoundIdx < 1) {
          nextBtn.innerText = "Ir para a Rodada 2 ➔";
          nextBtn.onclick = () => {
            currentRoundIdx++;
            showSpectatorSimulation();
          };
        } else {
          nextBtn.innerText = "Concluir Data FIFA ➔";
          nextBtn.onclick = finishFIFADate;
        }
      }
      actionArea.appendChild(nextBtn);
    };
  }

  // Desenha a visualização detalhada focada nos comandados do Treinador
  async function showCoachSimulation() {
    renderHeader();
    
    const activeRoundName = isTournament 
      ? matchesData[currentPhaseIdx].name 
      : `Rodada ${currentRoundIdx + 1} de 2`;
      
    const activeMatches = isTournament 
      ? matchesData[currentPhaseIdx].matches 
      : matchesData[currentRoundIdx];

    let userMatchIdx = activeMatches.findIndex(m => m.home === userNationalTeam || m.away === userNationalTeam);
    let userMatch = activeMatches[userMatchIdx];
    
    if (userMatchIdx === -1) {
      const specMsg = document.createElement("div");
      specMsg.style.cssText = "background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3); border-radius: 8px; padding: 12px; text-align: center; color: #ff6666; font-size: 0.85rem; font-weight: bold;";
      specMsg.innerText = `Sua seleção (${userNationalTeam}) não está disputando esta fase (${activeRoundName}). Acompanhe os outros confrontos abaixo!`;
      container.appendChild(specMsg);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSpectatorSimulation();
      return;
    }

    const panelGrid = document.createElement("div");
    panelGrid.style.cssText = "display: grid; grid-template-columns: 3fr 2fr; gap: 20px; margin-top: 10px;";
    container.appendChild(panelGrid);

    const leftPanel = document.createElement("div");
    leftPanel.style.cssText = "background: #111; border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 15px;";
    panelGrid.appendChild(leftPanel);

    leftPanel.innerHTML = `
      <h3 style="color: var(--accent); margin: 0; font-size: 1.1rem; text-transform: uppercase; font-weight: 800; text-align: center; border-bottom: 1px solid #222; padding-bottom: 8px;">
        SEU CONFRONTO &bull; ${activeRoundName}
      </h3>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
        <div style="flex: 1; text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 5px;">🌍</div>
          <div style="font-weight: bold; font-size: 1.1rem; color: ${userMatch.home === userNationalTeam ? 'var(--accent)' : '#fff'};">${userMatch.home}</div>
        </div>
        <div id="coachScoreEl" style="font-size: 1.8rem; font-weight: 900; color: var(--warning); min-width: 100px; text-align: center;">VS</div>
        <div style="flex: 1; text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 5px;">🌍</div>
          <div style="font-weight: bold; font-size: 1.1rem; color: ${userMatch.away === userNationalTeam ? 'var(--accent)' : '#fff'};">${userMatch.away}</div>
        </div>
      </div>
      <div id="coachLogEl" style="background:#090909; border:1px solid #222; border-radius:8px; height:120px; overflow-y:auto; padding:12px; font-size:0.85rem; color:#ccc; display:flex; flex-direction:column; gap:5px; line-height:1.4;">
        <div style="color: #666; text-align: center; margin-top: 35px;">Aguardando início do apito inicial...</div>
      </div>
    `;

    const rightPanel = document.createElement("div");
    rightPanel.style.cssText = "background: #0d0d0d; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 10px;";
    panelGrid.appendChild(rightPanel);

    rightPanel.innerHTML = `<h4 style="margin:0 0 5px 0; color:#888; font-size:0.8rem; text-transform:uppercase; font-weight:bold; border-bottom: 1px solid #222; padding-bottom: 5px;">OUTROS CONFRONTOS</h4>`;
    
    const rightMatchesList = document.createElement("div");
    rightMatchesList.style.cssText = "display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto;";
    rightPanel.appendChild(rightMatchesList);

    activeMatches.forEach((m, idx) => {
      if (idx === userMatchIdx) return;
      const matchEl = document.createElement("div");
      matchEl.style.cssText = "background: #151515; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: bold;";
      matchEl.innerHTML = `
        <span style="flex: 1; text-align: right; padding-right: 5px;">${m.home}</span>
        <span id="aside-score-${idx}" style="color: var(--accent); min-width: 40px; text-align: center;">VS</span>
        <span style="flex: 1; text-align: left; padding-left: 5px;">${m.away}</span>
      `;
      rightMatchesList.appendChild(matchEl);
    });

    const actionArea = document.createElement("div");
    actionArea.style.cssText = "display: flex; justify-content: flex-end; margin-top: 15px;";
    const simBtn = document.createElement("button");
    simBtn.className = "btn-warning";
    simBtn.style.cssText = "padding: 14px 28px; font-weight: bold; border-radius: 8px; cursor: pointer; text-transform: uppercase;";
    simBtn.innerText = "Comandar Seleção na Rodada ➔";
    actionArea.appendChild(simBtn);
    container.appendChild(actionArea);

    simBtn.onclick = async () => {
      simBtn.disabled = true;
      simBtn.innerText = "Simulando Jogos...";
      
      const coachLogEl = document.getElementById("coachLogEl");
      coachLogEl.innerHTML = `<div>⚽ <strong>0' Apita o árbitro! Começa a partida decisiva!</strong></div>`;
      
      const results = activeMatches.map(m => simulateSingleMatch(m.home, m.away));
      const userRes = results[userMatchIdx];

      const events = [];
      userRes.homeGoals.forEach(g => {
        events.push({ min: g.min, text: `⚽ <strong>GOOOL do ${userMatch.home}!</strong> ${g.scorer} balança as redes de forma genial aos ${g.min} minutos!`, type: "goal" });
      });
      userRes.awayGoals.forEach(g => {
        events.push({ min: g.min, text: `⚽ <strong>GOOOL do ${userMatch.away}!</strong> ${g.scorer} desfere um chute indefensável aos ${g.min} minutos!`, type: "goal" });
      });
      
      const randomMinutes = [12, 28, 42, 57, 68, 79, 86].sort(() => 0.5 - Math.random()).slice(0, 3);
      const narratives = [
        "Chute perigoso para fora! A zaga respira aliviada.",
        "Cartão amarelo aplicado após falta dura no meio-campo.",
        "Excelente defesa do goleiro espalmando para escanteio!",
        "Substituição tática: renovando as energias no campo."
      ];
      randomMinutes.forEach((m, i) => {
        events.push({ min: m, text: `⏱️ ${m}' &bull; ${narratives[i % narratives.length]}`, type: "neutral" });
      });

      events.sort((a, b) => a.min - b.min);

      for (let min = 10; min <= 90; min += 10) {
        const activeEvents = events.filter(e => e.min <= min);
        coachLogEl.innerHTML = activeEvents.map(e => `<div>${e.text}</div>`).join("");
        coachLogEl.innerHTML += `<div style="color:var(--accent); font-weight:bold; text-align:center; padding:5px 0;">--- ANDAMENTO: ${min} MINUTOS ---</div>`;
        coachLogEl.scrollTop = coachLogEl.scrollHeight;

        const currentHomeScore = userRes.homeGoals.filter(g => g.min <= min).length;
        const currentAwayScore = userRes.awayGoals.filter(g => g.min <= min).length;
        document.getElementById("coachScoreEl").innerHTML = `<strong>${currentHomeScore}</strong> - <strong>${currentAwayScore}</strong>`;

        activeMatches.forEach((m, idx) => {
          if (idx === userMatchIdx) return;
          const res = results[idx];
          const curH = res.homeGoals.filter(g => g.min <= min).length;
          const curA = res.awayGoals.filter(g => g.min <= min).length;
          document.getElementById(`aside-score-${idx}`).innerText = `${curH} - ${curA}`;
        });

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      coachLogEl.innerHTML += `<div style="color:var(--warning); font-weight:bold; text-align:center; padding:10px 0;">🎉 FIM DE JOGO! Partida finalizada com sucesso!</div>`;
      coachLogEl.scrollTop = coachLogEl.scrollHeight;
      
      let finalScoreText = `<strong>${userRes.homeScore}</strong> - <strong>${userRes.awayScore}</strong>`;
      if (userRes.penalties) {
        finalScoreText = `<strong>${userRes.homeScore}</strong> (${userRes.penalties.home}) - (${userRes.penalties.away}) <strong>${userRes.awayScore}</strong>`;
      }
      document.getElementById("coachScoreEl").innerHTML = finalScoreText;

      activeMatches.forEach((m, idx) => {
        const score = results[idx];
        m.played = true;
        m.score = score;
        
        if (score.penalties) {
          m.winner = score.penalties.home > score.penalties.away ? m.home : m.away;
        } else {
          m.winner = score.homeScore > score.awayScore ? m.home : (score.awayScore > score.homeScore ? m.away : null);
        }

        simulationHistory.push({
          phaseName: activeRoundName,
          home: m.home,
          away: m.away,
          scoreText: `${score.homeScore} x ${score.awayScore}` + (score.penalties ? ` (Pen: ${score.penalties.home}-${score.penalties.away})` : "")
        });
      });

      simBtn.style.display = "none";
      const nextBtn = document.createElement("button");
      nextBtn.className = "btn-primary";
      nextBtn.style.cssText = "padding: 14px 28px; font-weight: bold; border-radius: 8px; cursor: pointer; text-transform: uppercase;";
      
      if (isTournament) {
        if (currentPhaseIdx < 3) {
          nextBtn.innerText = "Avançar de Fase ➔";
          nextBtn.onclick = () => {
            const currentPhase = matchesData[currentPhaseIdx];
            const nextPhase = matchesData[currentPhaseIdx + 1];
            for (let i = 0; i < nextPhase.matches.length; i++) {
              const match1 = currentPhase.matches[i * 2];
              const match2 = currentPhase.matches[i * 2 + 1];
              nextPhase.matches[i].home = match1.winner;
              nextPhase.matches[i].away = match2.winner;
            }
            currentPhaseIdx++;
            showCoachSimulation();
          };
        } else {
          nextBtn.innerText = "Concluir Copa de Seleções 🏆";
          nextBtn.onclick = finishFIFADate;
        }
      } else {
        if (currentRoundIdx < 1) {
          nextBtn.innerText = "Ir para a Rodada 2 ➔";
          nextBtn.onclick = () => {
            currentRoundIdx++;
            showCoachSimulation();
          };
        } else {
          nextBtn.innerText = "Concluir Data FIFA ➔";
          nextBtn.onclick = finishFIFADate;
        }
      }
      actionArea.appendChild(nextBtn);
    };
  }

  // Executa o avanço e fecha o overlay da Data FIFA
  async function finishFIFADate() {
    renderHeader();
    container.innerHTML += `<div style="text-align:center; padding: 20px; color:#888;"><span style="font-size:1.5rem;">⚙️</span><br>Processando resultados finais de seleções e regenerando atletas...</div>`;
    
    const d = new Date(coachInfo.currentDate);
    const advanceDays = isTournament ? 21 : 7;
    d.setDate(d.getDate() + advanceDays);
    coachInfo.currentDate = d.toISOString().split("T")[0];
    
    coachInfo.trainingUsed = false;
    await Storage.saveCoachInfo(coachInfo);
    
    const history = (await Storage.getMatchHistory()) || [];
    simulationHistory.forEach(item => {
      history.push({
        oppTeam: item.away,
        score: item.scoreText,
        result: "FIFA",
        date: coachInfo.currentDate.split("-").reverse().join("/"),
        compType: isTournament ? "continental" : "league",
        timestamp: Date.now() + Math.random()
      });
    });
    await Storage.saveMatchHistory(history.slice(-50));

    overlay.remove();
    
    showCustomModal(
      `<h3>Período de Seleções Finalizado!</h3>Os jogos internacionais foram simulados com sucesso. Seu elenco profissional retornou ao clube em plenas condições de jogo para a sequência da temporada.`,
      "alert",
      "btn-primary"
    );

    const { updateDashboardCoach } = await import("../ui/render.js");
    updateDashboardCoach(coachInfo);
  }

  if (userNationalTeam) {
    showCoachSimulation();
  } else {
    showSpectatorSimulation();
  }
}
