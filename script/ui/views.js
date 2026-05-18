import {
  renderApp,
  renderTeamStats,
  renderTraining,
  renderFinances,
} from "./render.js";
import {
  setTableView,
} from "./uiTableView.js";

export function switchMainView(viewName) {
  window.switchMainView = switchMainView; // Garantir global para handlers inline
  setTableView(viewName === "table");

  const pitch = document.getElementById("pitch");
  const table = document.getElementById("tableView");
  const sim = document.getElementById("simulationView");
  const dashboard = document.getElementById("dashboardView");
  const league = document.getElementById("leagueView");
  const teamStats = document.getElementById("teamStatsView");
  const transfer = document.getElementById("transferView");
  const inbox = document.getElementById("inboxView");
  const playerDetail = document.getElementById("playerDetailView");
  const negotiation = document.getElementById("negotiationView");
  const training = document.getElementById("trainingView");
  const finance = document.getElementById("financeView");
  const bench = document.querySelector(".bottom-bench");
  const sidebar = document.getElementById("sidebar");
  const globalHeader = document.querySelector(".main-wrapper header");
  const mainContent = document.querySelector(".main-content");
  const navDashboard = document.getElementById("navDashboardBtn");

  if (pitch) pitch.style.display = "none";
  if (table) table.style.display = "none";
  if (sim) sim.style.display = "none";
  if (dashboard) dashboard.style.display = "none";
  if (league) league.style.display = "none";
  if (teamStats) teamStats.style.display = "none";
  if (transfer) transfer.style.display = "none";
  if (inbox) inbox.style.display = "none";
  if (playerDetail) playerDetail.style.display = "none";
  if (negotiation) negotiation.style.display = "none";
  if (training) training.style.display = "none";
  if (finance) finance.style.display = "none";
  if (globalHeader) globalHeader.style.display = "flex";
  if (mainContent) {
    mainContent.style.overflowY = "auto";
    mainContent.style.padding = "25px";
  }

  const navDash = document.getElementById("navDashboardBtn");
  const navPitch = document.getElementById("navPitchBtn");
  const navTable = document.getElementById("navTableBtn");
  const navTransfer = document.getElementById("navTransferBtn");
  const navTraining = document.getElementById("navTrainingBtn");

  if (navPitch) navPitch.className = "btn-secondary";
  if (navTable) navTable.className = "btn-secondary";
  if (navTransfer) navTransfer.className = "btn-secondary";
  if (navTraining) navTraining.className = "btn-secondary";

  if (viewName === "simulation") {
    if (sidebar) sidebar.style.display = "none";
    if (sim) sim.style.display = "block";
    if (bench) bench.style.display = "none";
    if (globalHeader) globalHeader.style.display = "none";
    if (mainContent) {
      mainContent.style.overflowY = "hidden";
      mainContent.style.padding = "0";
    }
  } else if (viewName === "table") {
    if (sidebar) sidebar.style.display = "flex";
    if (table) table.style.display = "block";
    if (bench) bench.style.display = "none";
    if (navTable) navTable.className = "btn-primary";
    renderApp();
  } else if (viewName === "pitch") {
    if (sidebar) sidebar.style.display = "flex";
    if (pitch) pitch.style.display = "block";
    if (bench) bench.style.display = "flex";
    if (navPitch) navPitch.className = "btn-primary";
    renderApp();
  } else if (viewName === "training") {
    if (sidebar) sidebar.style.display = "flex";
    if (training) training.style.display = "block";
    if (bench) bench.style.display = "none";
    if (navTraining) navTraining.className = "btn-primary";
    renderTraining();
  } else if (viewName === "league") {
    if (sidebar) sidebar.style.display = "none";
    if (league) league.style.display = "block";
    if (bench) bench.style.display = "none";
    renderApp();
  } else if (viewName === "teamStats") {
    if (sidebar) sidebar.style.display = "none";
    if (teamStats) teamStats.style.display = "block";
    if (bench) bench.style.display = "none";
    renderTeamStats();
  } else if (viewName === "transfer") {
    if (sidebar) sidebar.style.display = "flex";
    if (transfer) transfer.style.display = "block";
    if (bench) bench.style.display = "none";
    if (navTransfer) navTransfer.className = "btn-primary";
    
    // Resetar abas do Mercado para Comprar por padrão
    const buySec = document.getElementById("marketBuySection");
    const sellSec = document.getElementById("marketSellSection");
    if (buySec) buySec.style.display = "grid";
    if (sellSec) sellSec.style.display = "none";
    const buyBtn = document.getElementById("transferTabBuyBtn");
    const sellBtn = document.getElementById("transferTabSellBtn");
    if (buyBtn) buyBtn.className = "btn-primary";
    if (sellBtn) sellBtn.className = "btn-secondary";

    // Inicializar Mercado (Ligas e Times)
    import("../core/transferMarket.js").then(m => m.initTransferMarket());
  } else if (viewName === "negotiation") {
    if (sidebar) sidebar.style.display = "none";
    if (negotiation) negotiation.style.display = "block";
    if (bench) bench.style.display = "none";
  } else if (viewName === "inbox") {
    if (sidebar) sidebar.style.display = "none";
    if (inbox) inbox.style.display = "block";
    if (bench) bench.style.display = "none";
    
    import("./render.js").then(m => m.renderInbox());
  } else if (viewName === "playerDetail") {
    if (sidebar) sidebar.style.display = "none";
    if (playerDetail) playerDetail.style.display = "block";
    if (bench) bench.style.display = "none";
    if (globalHeader) globalHeader.style.display = "none";
    if (mainContent) {
      mainContent.style.overflowY = "auto";
      mainContent.style.padding = "0";
    }
  } else if (viewName === "finance") {
    if (sidebar) sidebar.style.display = "none";
    if (finance) finance.style.display = "block";
    if (bench) bench.style.display = "none";
    renderFinances();
  } else {
    // dashboard
    if (sidebar) sidebar.style.display = "none";
    if (dashboard) dashboard.style.display = "block";
    if (bench) bench.style.display = "none";
    renderApp();
  }
  if (window.lucide) window.lucide.createIcons();
}

export function showScreen(screenId) {
  const screens = [
    "mainMenuScreen",
    "coachCreationScreen",
    "teamSelectionScreen",
    "mainApp",
  ];
  screens.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      // mainApp e teamSelectionScreen precisam de flex para o layout funcionar
      el.style.display =
        id === "mainApp" || id === "teamSelectionScreen" ? "flex" : "flex";
    } else {
      el.style.display = "none";
    }
  });
  if (window.lucide) window.lucide.createIcons();
}
