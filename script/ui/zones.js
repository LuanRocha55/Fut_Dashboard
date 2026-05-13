import { dbgToast } from "./uiUtils.js";
import { switchMainView, showScreen } from "./views.js";
import { handleSubstitution, initDragAndDrop } from "./dragDrop.js";
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

export function highlightZones(player) {
  const pitch = document.getElementById("pitch");
  pitch.classList.add("active-selection");
  document.querySelectorAll(".grid-cell").forEach((cell) => {
    cell.classList.remove("highlight", "primary", "secondary");
    cell.style.boxShadow = "";
  });
  if (player.aptitude) {
    player.aptitude.forEach((pos, index) => {
      const cell = document.querySelector(`[data-pos="${pos}"]`);
      if (cell) {
        cell.classList.add("highlight");
        if (index === 0) cell.style.boxShadow = "inset 0 0 20px var(--accent)";
      }
    });
  }
}

export function clearZones() {
  const pitch = document.getElementById("pitch");
  if (pitch) {
    pitch.classList.remove("active-selection");
    pitch.classList.remove("drag-over");
  }
}
