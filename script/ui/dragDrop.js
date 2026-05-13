import { dbgToast } from "./uiUtils.js";
import { highlightZones, clearZones } from "./zones.js";
import { switchMainView, showScreen } from "./views.js";
import {
  setupEventListeners,
  initCareerEvents,
  finalizeCareerSetup,
} from "./uiEvents.js";
import {
  loadTeams,
  fetchTeamBadge,
  getLeagueBadgeMap,
  loadBadgesLazy,
  loadLeagueLogosLazy,
  renderVisualTeams,
} from "./teams.js";
import {
  renderApp,
  render,
  renderBench,
  renderMatchHistory,
  renderTeamStats,
  renderPitchPlayers,
  updateTeamStatsUI,
  renderTeamChemistry,
  updateDashboardCoach,
} from "./render.js";
import { main } from "./init.js";

import {
  squad,
  formations,
  ALL_POSITIONS,
  initSystem,
  performSwap,
  downloadJSON,
  resetFormationAlignment,
  calculateOVR,
  saveToLocal,
  healSquad,
  matchHistory,
  matchInfo,
  ensureCaptain,
} from "../core/appCore.js";
import {
  getEfootballPosition,
  checkPositionFit,
  swapTitulares,
  handlePlayerMove,
  autoFillTeam,
} from "../tactics/pitchTactics.js";
import { openMatchSimulation } from "../simulation/simMain.js";
import {
  getRatingColor,
  getStarsHTML,
  getFormHTML,
  getMatchStatusHTML,
  drawRadar,
  normalizeTeamName,
} from "./uiGraphics.js";
import { showCustomModal } from "./uiModal.js";
import { normalizeStr } from "../core/appUtils.js";
import { initEditorEvents, openMenu } from "../player/playerEditor.js";
import {
  initTableEvents,
  isTableView,
  renderTable,
  setTableView,
} from "./uiTableView.js";
import { initLeagueEvents, autoInitLeague } from "../league/leagueMain.js";
import { renderLeagueData } from "../league/leagueRenderer.js";
import { Storage } from "../core/appStorage.js";

export function handleSubstitution(reserveId, dropX, dropY) {
  let closestTitularId = null,
    minDistance = Infinity;
  document.querySelectorAll(".player").forEach((playerEl) => {
    const rect = playerEl.getBoundingClientRect();
    const distance = Math.hypot(
      rect.left + rect.width / 2 - dropX,
      rect.top + rect.height / 2 - dropY,
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestTitularId = parseInt(playerEl.dataset.id, 10);
    }
  });

  if (closestTitularId && minDistance < 75) {
    performSwap(closestTitularId, reserveId);
    render();
  } else {
    // Drop em área vazia: Tenta encontrar o primeiro slot null nos titulares (0-10)
    let firstEmptySlot = -1;
    for (let i = 0; i < 11; i++) {
      if (squad[i] === null) {
        firstEmptySlot = i;
        break;
      }
    }

    if (firstEmptySlot !== -1) {
      const resIndex = squad.findIndex((x) => x && x.id === reserveId);
      if (resIndex !== -1) {
        const p = squad[resIndex];
        p.status = "titular";
        squad[firstEmptySlot] = p;
        if (resIndex >= 11) {
          squad.splice(resIndex, 1);
        } else {
          squad[resIndex] = null;
        }
        saveToLocal();
        render();
      }
    } else if (closestTitularId) {
      // Se estiver cheio, troca com o mais próximo independente da distância (melhor UX)
      performSwap(closestTitularId, reserveId);
      render();
    }
  }
}

export function initDragAndDrop() {
  document.querySelectorAll(".reserve-item").forEach((res) => {
    res.draggable = true;
    res.ondragstart = (e) => {
      e.dataTransfer.setData("reserveId", res.dataset.id);
      const p = squad.find((x) => x.id === parseInt(res.dataset.id, 10));
      if (p) highlightZones(p);
    };
    res.ondragend = clearZones;
    res.ondragover = (e) => {
      e.preventDefault();
      res.style.borderColor = "var(--accent)";
    };
    res.ondragleave = () => (res.style.borderColor = "");
    res.ondrop = (e) => {
      e.preventDefault();
      res.style.borderColor = "";
      clearZones(); // Limpa as zonas do campo ao dropar no banco
      const pId = e.dataTransfer.getData("playerId");
      if (pId) {
        const resPlayer = squad.find(
          (x) => x.id === parseInt(res.dataset.id, 10),
        );
        if (
          resPlayer &&
          (resPlayer.matchStatus === "red" ||
            resPlayer.matchStatus === "injury")
        ) {
          showCustomModal(
            "Jogadores suspensos ou machucados não podem ser escalados.",
            "alert",
            "btn-danger",
          );
          return;
        }
        performSwap(parseInt(pId, 10), parseInt(res.dataset.id, 10));
        render();
      }
    };
  });
  const pitch = document.getElementById("pitch");
  pitch.ondragover = (e) => {
    e.preventDefault();
    pitch.classList.add("drag-over");
  };
  pitch.ondragleave = () => pitch.classList.remove("drag-over");
  pitch.ondrop = (e) => {
    e.preventDefault();
    clearZones();
    const reserveId = e.dataTransfer.getData("reserveId");
    if (reserveId) {
      const resPlayer = squad.find((x) => x.id === parseInt(reserveId, 10));
      if (
        resPlayer &&
        (resPlayer.matchStatus === "red" || resPlayer.matchStatus === "injury")
      ) {
        showCustomModal(
          "Jogadores suspensos ou machucados não podem ser escalados.",
          "alert",
          "btn-danger",
        );
        return;
      }
      return handleSubstitution(parseInt(reserveId, 10), e.clientX, e.clientY);
    }
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId) {
      handlePlayerMove(parseInt(playerId, 10), e.clientX, e.clientY);
      render();
    }
  };

  const benchList = document.getElementById("benchList");
  if (benchList) {
    benchList.ondragover = (e) => e.preventDefault();
    benchList.ondrop = (e) => {
      e.preventDefault();
      const pId = e.dataTransfer.getData("playerId");
      if (pId) {
        const pIdx = squad.findIndex((x) => x && x.id === parseInt(pId, 10));
        if (pIdx !== -1 && pIdx < 11) {
          const p = squad[pIdx];
          p.status = "reserva";
          squad[pIdx] = null; // Libera o slot no campo
          squad.push(p); // Adiciona ao final do banco
          saveToLocal();
          render();
        }
      }
    };
  }
}
