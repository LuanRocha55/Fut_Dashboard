import { dbgToast } from "./uiUtils.js";
import { showScreen } from "./views.js";
import { initCareerEvents } from "./uiEvents.js";
import { loadTeams } from "./teams.js";
import { Storage } from "../core/appStorage.js";

let _mainCalled = false;

export async function main() {
  if (_mainCalled) {
    console.warn("main() chamado mais de uma vez — ignorado.");
    return;
  }
  _mainCalled = true;
  dbgToast("⚙️ Iniciando sistema...", "#333");
  try {
    // 0. Inicialização de Slots (MIGRAÇÃO)
    const activeSlot = await Storage.getActiveSlot();
    const slots = await Storage.getSlots();
    if (slots.length === 0) {
      const coach = await Storage.getCoachInfo();
      if (coach) {
        await Storage.saveSlotsList([
          {
            id: "default",
            name: "Carreira Principal",
            teamFile: coach.teamFile,
            teamName: coach.teamName,
            date: coach.startDate || new Date().toLocaleDateString("pt-BR"),
            lastPlayed: Date.now(),
          },
        ]);
      }
    }

    // 1. Carrega os times
    let teams = [];
    try {
      dbgToast("📋 Carregando lista de times...", "#333");
      teams = await loadTeams();
      dbgToast(`✅ ${teams.length} times carregados`, "#1a5c2a");
    } catch (e) {
      dbgToast("⚠️ Erro ao carregar times: " + e.message, "#8b4000");
    }

    // 2. Inicializa os eventos do menu
    initCareerEvents(teams);

    // 4. Inicializa o menu principal
    showScreen("mainMenuScreen");
    dbgToast("🆕 Menu pronto!", "#1a5c2a");
  } catch (error) {
    dbgToast("❌ ERRO CRÍTICO: " + error.message, "#8b0000", 30000);
    console.error("❌ Erro crítico no Main:", error);
  }
}
