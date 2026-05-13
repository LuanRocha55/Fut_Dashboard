import { dbgToast } from './utils.js';
import { switchMainView, showScreen } from './views.js';
import { handleSubstitution, initDragAndDrop } from './dragDrop.js';
import { setupEventListeners, initCareerEvents, finalizeCareerSetup } from './events.js';
import { loadTeams, fetchTeamBadge, getLeagueBadgeMap, loadBadgesLazy, loadLeagueLogosLazy, renderVisualTeams } from './teams.js';
import { renderApp, render, renderBench, renderMatchHistory, renderTeamStats, renderPitchPlayers, updateTeamStatsUI, renderTeamChemistry, updateDashboardCoach } from './render.js';
import { main } from './init.js';

import { squad, formations, ALL_POSITIONS, initSystem, performSwap, downloadJSON, resetData, resetFormationAlignment, resetSystem, calculateOVR, saveToLocal, healSquad, matchHistory, matchInfo, ensureCaptain } from "../core.js";
import { getEfootballPosition, checkPositionFit, swapTitulares, handlePlayerMove, autoFillTeam } from "../tactics.js";
import { openMatchSimulation } from "../simulation.js";
import { getRatingColor, getStarsHTML, getFormHTML, getMatchStatusHTML, drawRadar, normalizeTeamName } from "../graphics.js";
import { showCustomModal } from "../modal.js";
import { normalizeStr } from "../utils.js";
import { initEditorEvents, openMenu } from "../playerEditor.js";
import { initTableEvents, isTableView, renderTable, setTableView } from "../tableView.js";
import { initLeagueEvents, autoInitLeague } from "../league.js";
import { renderLeagueData } from "../leagueRenderer.js";
import { Storage } from "../storage.js";

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

