import {
  squad, formations, ALL_POSITIONS, initSystem, ensureCaptain
} from "./core.js";

import { initTableEvents, isTableView, renderTable } from "./tableView.js";
import { initLeagueEvents, autoInitLeague } from "./league.js";
import { Storage } from "./storage.js";

// Módulos UI refatorados
import { switchMainView } from "./ui/navigation.js";
import { renderPitchPlayers, renderBench, highlightZones, clearZones } from "./ui/squad.js";
import { renderTeamStats, updateTeamStatsUI } from "./ui/stats.js";
import { finalizeCareerSetup, renderTeamSelectionGrid, openLoadGameMenu, openSettingsMenu } from "./ui/career.js";

// Exportar para uso global (legado/eventos inline)
window.render = render;
window.switchMainView = switchMainView;

/**
 * Função principal de renderização do dashboard.
 */
export async function render() {
  const data = await Storage.getLeagueData();
  if (!squad || squad.length === 0) return;

  ensureCaptain();

  const formatName = document.getElementById("formationSelect")?.value || "4-3-3";
  const format = formations[formatName] || formations["4-3-3"];

  const titulares = squad.slice(0, 11);
  const reservas = squad.slice(11);
  const benchSortValue = document.getElementById("benchSortSelect")?.value || "position";

  // 1. Limpa e reconstrói o campo
  initPitchGrid();

  // 2. Renderiza Titulares e coleta estatísticas
  const teamStats = renderPitchPlayers(titulares, format, squad);

  // 3. Atualiza UI de Estatísticas
  updateTeamStatsUI(teamStats, titulares.length);

  // 4. Renderiza o Banco de Reservas
  renderBench(reservas, benchSortValue, false);

  if (isTableView) renderTable();
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Inicializa a grade do campo tático.
 */
function initPitchGrid() {
  const pitch = document.getElementById("pitch");
  if (!pitch) return;

  // Lógica simplificada de grid que estava no ui.js
  pitch.innerHTML = `
    <div class="pitch-grid"></div>
    <div class="pitch-lines">
        <div class="half-way-line"></div>
        <div class="center-circle"></div>
        <div class="penalty-box left"><div class="goal-box"></div></div>
        <div class="penalty-box right"><div class="goal-box"></div></div>
    </div>
    <svg id="chemistryLines" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;"></svg>
  `;
}

/**
 * Ponto de entrada da aplicação.
 */
async function main() {
  await initSystem();
  await render();
  initTableEvents();
  initLeagueEvents();

  // Eventos de Navegação do Dashboard
  document.getElementById("navDashboardBtn")?.addEventListener("click", () => switchMainView("dashboard"));
  document.getElementById("navPitchBtn")?.addEventListener("click", () => switchMainView("pitch"));
  document.getElementById("navTableBtn")?.addEventListener("click", () => switchMainView("table"));
  document.getElementById("navLeagueBtn")?.addEventListener("click", () => switchMainView("league"));
  document.getElementById("navStatsBtn")?.addEventListener("click", () => switchMainView("teamStats"));

  // Eventos do Menu Inicial
  document.getElementById("menuNewGameBtn")?.addEventListener("click", () => {
    document.getElementById("mainMenuScreen").style.display = "none";
    document.getElementById("coachCreationScreen").style.display = "flex";
  });

  document.getElementById("startCareerBtn")?.addEventListener("click", async () => {
    const currentTeam = await Storage.getCoachInfo();
    finalizeCareerSetup(currentTeam);
  });

  // Novos botões de fluxo de carreira
  document.getElementById("goToTeamSelectBtn")?.addEventListener("click", () => {
    document.getElementById("coachCreationScreen").style.display = "none";
    document.getElementById("teamSelectionScreen").style.display = "flex";
    renderTeamSelectionGrid();
  });

  document.getElementById("backToMenuBtn")?.addEventListener("click", () => {
    document.getElementById("coachCreationScreen").style.display = "none";
    document.getElementById("mainMenuScreen").style.display = "flex";
  });

  document.getElementById("backToCoachBtn")?.addEventListener("click", () => {
    document.getElementById("teamSelectionScreen").style.display = "none";
    document.getElementById("coachCreationScreen").style.display = "flex";
  });

  document.getElementById("menuLoadGameBtn")?.addEventListener("click", () => {
    openLoadGameMenu();
  });

  document.getElementById("menuSettingsBtn")?.addEventListener("click", () => {
    openSettingsMenu();
  });
}

main();
