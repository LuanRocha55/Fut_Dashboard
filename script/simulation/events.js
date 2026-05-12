import { switchMainView } from "../ui.js";
import { setTableView } from "../tableView.js";
import { handleMatchPostGame } from "../matchPostGame.js";
import { startPenaltyShootout } from "../penalties.js";
import { showCustomModal } from "../modal.js";

/**
 * Gerencia o encerramento da simulação e retorno ao dashboard.
 */
export const closeSimulationView = (simInterval, isSimulationActiveRef) => {
  isSimulationActiveRef.value = false;
  clearInterval(simInterval);
  switchMainView("dashboard");
  setTableView(false);
};

/**
 * Habilita ou desabilita os controles de simulação durante pausas ou eventos.
 */
export const setSimControlsDisabled = (disabled, refs) => {
  const { pauseSimBtn, confirmSubBtn, subOutList, renderSubListsCallback, checkSubButtonCallback } = refs;

  if (pauseSimBtn) {
    pauseSimBtn.disabled = disabled;
    pauseSimBtn.style.opacity = disabled ? "0.5" : "1";
    pauseSimBtn.style.cursor = disabled ? "not-allowed" : "pointer";
  }

  if (disabled) {
    refs.selectedOutIdx.value = -1;
    refs.selectedInIdx.value = -1;
    if (subOutList) renderSubListsCallback();
    if (confirmSubBtn) {
      confirmSubBtn.disabled = true;
      confirmSubBtn.style.opacity = "0.5";
    }
  } else {
    // Se estiver pausado, pode ser que precisemos reativar o botão de confirmar
    if (refs.isPaused.value) {
      checkSubButtonCallback();
    }
  }
};

/**
 * Lógica para finalizar a partida e salvar os resultados.
 */
export const handleFinalizeMatch = async (params) => {
  await handleMatchPostGame(params);
};
