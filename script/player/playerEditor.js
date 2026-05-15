import {
  squad,
  activePlayerId,
  setActivePlayerId,
  removePlayer,
  updatePlayerData,
} from "../core/appCore.js";
import { showCustomModal } from "../ui/uiModal.js";
import { renderApp } from "../ui/uiMain.js";
import { formatMoney } from "../core/appUtils.js";
import { Storage } from "../core/appStorage.js";

export async function openMenu(id) {
  setActivePlayerId(id);
  const { switchMainView } = await import("../ui/views.js");
  const { renderPlayerDetail } = await import("../ui/render.js");

  switchMainView("playerDetail");
  renderPlayerDetail(id);
}

export async function sellPlayer(id) {
  const coach = await Storage.getCoachInfo();
  const { isTransferWindowOpen } = await import("../core/appUtils.js");

  if (!isTransferWindowOpen(coach.currentDate)) {
    showCustomModal(
      "<strong>Janela Fechada!</strong><br><br>Vendas só são permitidas durante os períodos de transferência (Jan, Jul, Ago).",
      "alert",
      "btn-danger",
    );
    return;
  }

  const p = squad.find((x) => x.id === id);
  const sellValue = p ? Math.round((p.marketValue || 0) * 0.8) : 0;

  const proceed = await showCustomModal(
    `Deseja vender <strong>${p ? p.name : "este jogador"}</strong>?<br><br>Retorno financeiro: <strong>${formatMoney(sellValue)}</strong>.`,
    "confirm",
    "btn-danger",
  );

  if (proceed) {
    coach.budget += sellValue;
    await Storage.saveCoachInfo(coach);
    removePlayer(id);
    const { switchMainView } = await import("../ui/views.js");
    switchMainView("dashboard");
    renderApp();
    showCustomModal(`Venda realizada! ${formatMoney(sellValue)} adicionados ao orçamento.`, "alert", "btn-primary");
  }
}

export async function releasePlayer(id) {
  const p = squad.find((x) => x.id === id);
  const proceed = await showCustomModal(
    `Deseja rescindir o contrato de <strong>${p ? p.name : "este jogador"}</strong>?<br><br><span style="color:var(--danger); font-weight:bold;">Atenção:</span> O clube não receberá nenhum valor por esta ação.`,
    "confirm",
    "btn-danger",
  );

  if (proceed) {
    removePlayer(id);
    const { switchMainView } = await import("../ui/views.js");
    switchMainView("dashboard");
    renderApp();
    showCustomModal(`Contrato de <strong>${p ? p.name : "Atleta"}</strong> rescindido.`, "alert", "btn-secondary");
  }
}

// Funções legadas mantidas para compatibilidade se necessário, mas simplificadas
export function setEditMode() { }
export function initEditorEvents() { }
export function closeMenu() {
  import("../ui/views.js").then(m => m.switchMainView("dashboard"));
}
