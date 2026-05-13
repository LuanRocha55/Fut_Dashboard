import { dbgToast } from "./uiUtils.js";
import { highlightZones, clearZones } from "./zones.js";
import { switchMainView, showScreen } from "./views.js";
import { initDragAndDrop } from "./dragDrop.js";
import {
  renderApp,
  render,
  updateDashboardCoach,
} from "./render.js";
import {
  formations,
  initSystem,
  performSwap,
  downloadJSON,
  resetFormationAlignment,
  saveToLocal,
  healSquad,
} from "../core/appCore.js";
import {
  swapTitulares,
  autoFillTeam,
} from "../tactics/pitchTactics.js";
import { openMatchSimulation } from "../simulation/simMain.js";
import { showCustomModal } from "./uiModal.js";
import { normalizeStr } from "../core/appUtils.js";
import { initEditorEvents, openMenu } from "../player/playerEditor.js";
import {
  initTableEvents,
} from "./uiTableView.js";
import { initLeagueEvents, autoInitLeague } from "../league/leagueMain.js";
import { renderLeagueData } from "../league/leagueRenderer.js";
import { Storage } from "../core/appStorage.js";
import { toggleFitFilter } from "./state.js";
import { initTransferMarket } from "../core/transferMarket.js";
import { loadTeams, renderVisualTeams } from "./teams.js";

let isEditorInitialized = false;

export async function setupEventListeners() {
  if (!isEditorInitialized) {
    initEditorEvents();
    isEditorInitialized = true;
  }
  initTableEvents();
  initTransferMarket();

  window.addEventListener("viewChanged", (e) => {
    switchMainView(e.detail);
  });

  // Religando os botões do Menu de Navegação Lateral
  document
    .getElementById("navDashboardBtn")
    ?.addEventListener("click", () => switchMainView("dashboard"));
  document
    .getElementById("navPitchBtn")
    ?.addEventListener("click", () => switchMainView("pitch"));
  document
    .getElementById("navTableBtn")
    ?.addEventListener("click", () => switchMainView("table"));
  document
    .getElementById("navTransferBtn")
    ?.addEventListener("click", () => switchMainView("transfer"));
  document
    .getElementById("headerHomeBtn")
    ?.addEventListener("click", () => showScreen("mainMenuScreen"));

  document
    .getElementById("dashToPitchBtn")
    ?.addEventListener("click", () => switchMainView("pitch"));
  document
    .getElementById("dashToTableBtn")
    ?.addEventListener("click", () => switchMainView("table"));
  document
    .getElementById("dashToTransferBtn")
    ?.addEventListener("click", () => switchMainView("transfer"));

  document.getElementById("dashToLeagueBtn")?.addEventListener("click", () => {
    switchMainView("league");
    renderLeagueData();
  });

  document
    .getElementById("dashToTeamStatsBtn")
    ?.addEventListener("click", () => switchMainView("teamStats"));
  document
    .getElementById("navTeamStatsDashboardBtn")
    ?.addEventListener("click", () => switchMainView("dashboard"));

  document
    .getElementById("navLeagueDashboardBtn")
    ?.addEventListener("click", () => switchMainView("dashboard"));

  document
    .getElementById("navTransferDashboardBtn")
    ?.addEventListener("click", () => switchMainView("dashboard"));

  document
    .getElementById("healSquadBtn")
    ?.addEventListener("click", async () => {
      const proceed = await showCustomModal(
        "Deseja curar todos os jogadores lesionados e limpar as suspensões da equipe?",
        "confirm",
        "btn-primary",
      );
      if (proceed) {
        const healed = healSquad();
        if (healed) {
          renderApp();
          showCustomModal(
            "O Departamento Médico foi esvaziado com sucesso!",
            "alert",
            "btn-primary",
          );
        } else {
          showCustomModal(
            "Nenhum jogador precisava de cuidados médicos.",
            "alert",
            "btn-secondary",
          );
        }
      }
    });

  document
    .getElementById("simulateMatchBtn")
    .addEventListener("click", openMatchSimulation);

  document
    .getElementById("sidebarSimulateMatchBtn")
    ?.addEventListener("click", openMatchSimulation);

  document
    .getElementById("saveTacticBtn")
    .addEventListener("click", async () => {
      const select = document.getElementById("formationSelect");
      const currentFormat = select.value;
      const newName = await showCustomModal(
        "Digite um nome para sua nova Formação (ex: 4-1-3-2 Atacante):",
        "prompt",
        "btn-primary",
      );

      if (newName && newName.trim() !== "") {
        const name = newName.trim();
        if (formations[name]) {
          await showCustomModal(
            "Já existe uma formação com esse nome! Escolha um nome diferente.",
            "alert",
            "btn-danger",
          );
          return;
        }
        formations[name] = JSON.parse(
          JSON.stringify(formations[currentFormat]),
        );
        saveToLocal();

        const opt = document.createElement("option");
        opt.value = opt.innerText = name;
        select.appendChild(opt);
        select.value = name;
        await Storage.setCurrentFormation(name);
      }
    });

  const formationSelect = document.getElementById("formationSelect");
  if (formationSelect) {
    const savedFormation = await Storage.getCurrentFormation();
    if (savedFormation) {
      formationSelect.value = savedFormation;
    } else {
      formationSelect.value = "4-3-3";
      await Storage.setCurrentFormation("4-3-3");
    }

    formationSelect.addEventListener("change", async (e) => {
      await Storage.setCurrentFormation(e.target.value);
      resetFormationAlignment(e.target.value);
      render();
    });
  }

  initLeagueEvents();

  const fitFilterBtn = document.getElementById("toggleFitFilterBtn");
  if (fitFilterBtn) {
    fitFilterBtn.addEventListener("click", () => {
      const isFitOnly = toggleFitFilter();
      if (isFitOnly) {
        fitFilterBtn.style.background = "var(--accent)";
        fitFilterBtn.style.color = "#000";
      } else {
        fitFilterBtn.style.background = "transparent";
        fitFilterBtn.style.color = "var(--text)";
      }
      render();
    });
  }
  document.getElementById("benchSortSelect").onchange = render;
  document.getElementById("autoFillBtn").onclick = () => {
    autoFillTeam();
    render();
  };
  document.getElementById("exportJsonBtn").onclick = downloadJSON;
  document.getElementById("exportImageBtn").onclick = () =>
    html2canvas(document.getElementById("pitch"), {
      backgroundColor: "#112610",
      scale: 2,
    }).then((c) => {
      const l = document.createElement("a");
      l.download = `Tatica_${document.getElementById("formationSelect").value}.png`;
      l.href = c.toDataURL();
      l.click();
    });
  document.getElementById("benchSearchInput").addEventListener("input", (e) => {
    const term = normalizeStr(e.target.value);
    document.querySelectorAll(".reserve-item").forEach((i) => {
      i.style.display = normalizeStr(i.innerText).includes(term)
        ? "flex"
        : "none";
    });
  });
  document.getElementById("benchList").addEventListener("wheel", function (e) {
    if (e.deltaY !== 0) {
      e.preventDefault();
      this.scrollLeft += e.deltaY;
    }
  });
}

export function initCareerEvents(teams) {
  // Menu Principal
  const newGameBtn = document.getElementById("menuNewGameBtn");
  if (newGameBtn)
    newGameBtn.onclick = () => {
      dbgToast("🆕 Indo para criação do treinador...", "#1a3a5c");
      showScreen("coachCreationScreen");
    };

  const loadGameBtn = document.getElementById("menuLoadGameBtn");
  if (loadGameBtn)
    loadGameBtn.onclick = async () => {
      dbgToast("📂 Abrindo gerenciador de saves...", "#333");
      const slots = await Storage.getSlots();
      dbgToast(`💾 Encontrados ${slots.length} slots`, "#333");
      let slotsHtml = `
      <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
        <h3 style="color:#fff; margin-bottom: 20px; text-align: center;">Carregar Carreira</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
    `;

      if (slots.length === 0) {
        slotsHtml += `<p style="color:#666; text-align:center; padding: 20px;">Nenhuma carreira encontrada.</p>`;
      } else {
        slots
          .sort((a, b) => b.lastPlayed - a.lastPlayed)
          .forEach((s) => {
            slotsHtml += `
          <div class="save-slot-card" data-id="${s.id}" style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 15px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;">
            <div style="pointer-events: none;">
              <div style="font-weight: bold; color: var(--accent); font-size: 1.1rem;">${s.name}</div>
              <div style="font-size: 0.85rem; color: #aaa; margin-top: 4px;">${s.teamName} • ${s.date}</div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="select-save-btn" data-id="${s.id}" style="background: var(--accent); color: #000; border: none; padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; cursor: pointer;">JOGAR</button>
              <button class="delete-save-btn" data-id="${s.id}" style="background: #ff444422; color: #ff4444; border: 1px solid #ff444444; padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">Excluir</button>
            </div>
          </div>
        `;
          });
      }

      slotsHtml += `
        </div>
        <button id="modalBackBtn" style="background: transparent; border: 1px solid #333; color: #888; padding: 12px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold; margin-top: 20px;">VOLTAR AO MENU</button>
      </div>`;

      const result = await showCustomModal(slotsHtml, "custom");
      if (result && result.startsWith("delete:")) {
        const slotId = result.split(":")[1];
        const confirmDel = await showCustomModal(
          "Tem certeza que deseja excluir esta carreira? Esta ação não pode ser desfeita.",
          "confirm",
          "btn-danger",
        );
        if (confirmDel) {
          await Storage.deleteSlot(slotId);
        }
        loadGameBtn.click(); // Reabrir o modal
        return;
      }

      if (result && result.startsWith("load:")) {
        const slotId = result.split(":")[1];
        await Storage.setActiveSlot(slotId);

        const updatedSlots = await Storage.getSlots();
        const slotIdx = updatedSlots.findIndex((x) => x.id === slotId);
        if (slotIdx !== -1) {
          updatedSlots[slotIdx].lastPlayed = Date.now();
          await Storage.saveSlotsList(updatedSlots);
        }

        const initResult = await initSystem();
        if (initResult === true) {
          const coachInfo = await Storage.getCoachInfo();
          if (coachInfo) {
            showScreen("mainApp");
            switchMainView("dashboard");
            updateDashboardCoach(coachInfo);
            setupEventListeners();
            render();
          }
        } else {
          alert("Erro ao inicializar save: " + initResult);
        }
      }
    };

  const settingsBtn = document.getElementById("menuSettingsBtn");
  if (settingsBtn) {
    settingsBtn.style.opacity = "1";
    settingsBtn.onclick = async () => {
      dbgToast("⚙️ Abrindo configurações...", "#333");
      const choice = await showCustomModal(
        `
        <div style="text-align:center; min-width: 300px;">
          <h3 style="color:#fff; margin-bottom: 25px; font-size: 1.5rem; letter-spacing: 1px;">CONFIGURAÇÕES</h3>
          
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px;">

            <button id="editSquadsBtn" class="btn-primary" style="width:100%; padding: 15px; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; background: #00aaff15; border: 1px solid #00aaff44; color: #00aaff;">
              <i data-lucide="database"></i> EDITAR ELENCOS / BASE DE DADOS
            </button>

            <button id="resetAllDataBtn" class="btn-danger" style="width:100%; padding: 15px; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; background: #ff444415; border: 1px solid #ff444444; color: #ff4444;">
              <i data-lucide="trash-2"></i> RESETAR TUDO
            </button>
          </div>

          <button id="modalBackBtn" style="background: transparent; border: 1px solid #333; color: #888; padding: 10px 20px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold;">VOLTAR</button>
        </div>
      `,
        "custom",
      );

      if (choice === "confirm_reset") {
        const confirmReset = await showCustomModal(
          `
          <div style="text-align:center; padding: 10px;">
            <div style="color: #ff4444; font-size: 3rem; margin-bottom: 15px;">⚠️</div>
            <h2 style="color: #fff; margin-bottom: 10px;">TEM CERTEZA?</h2>
            <p style="color: #aaa; margin-bottom: 20px; line-height: 1.5;">Esta ação apagará <strong>todos os seus saves</strong>, carreiras e configurações permanentemente. Não há como desfazer.</p>
          </div>
        `,
          "confirm",
          "btn-danger",
        );

        if (confirmReset) {
          dbgToast("🧨 Resetando sistema...", "#8b0000");
          localStorage.clear();
          await Storage.saveSlotsList([]);
          await Storage.setActiveSlot("default");
          window.location.reload();
        } else {
          settingsBtn.click(); // Volta para o menu de configs
        }
      } else if (choice === "edit_squads") {
        if (!isEditorInitialized) {
          initEditorEvents();
          isEditorInitialized = true;
        }
        openMenu();

        // Procura a janela do Editor onde quer que ela esteja e a puxa para a frente
        let attempts = 0;
        const fixEditor = setInterval(() => {
          const knownIds = [
            "mainMenuScreen",
            "coachCreationScreen",
            "teamSelectionScreen",
            "customModal",
            "mainApp",
          ];
          
          document.querySelectorAll("div").forEach((el) => {
            if (el.id && knownIds.includes(el.id)) return; // Ignora as telas estruturais nativas
            
            // Se achar um elemento fixo (como o editor)
            if (window.getComputedStyle(el).position === "fixed") {
              // Se ele foi criado dentro de um contêiner oculto (como mainApp), nós o resgatamos para o body!
              if (el.parentElement && el.parentElement !== document.body) {
                document.body.appendChild(el);
              }
              el.style.zIndex = "10005";
            }
          });
          attempts++;
          if (attempts > 10) clearInterval(fixEditor);
        }, 100);
      }
    };
  }

  const backToMenuBtn = document.getElementById("backToMenuBtn");
  if (backToMenuBtn) backToMenuBtn.onclick = () => showScreen("mainMenuScreen");

  const exitBtn = document.getElementById("menuExitBtn");
  if (exitBtn)
    exitBtn.onclick = () => {
      if (confirm("Deseja realmente sair?")) window.close();
    };
  const nextBtn = document.getElementById("goToTeamSelectBtn");
  if (nextBtn)
    nextBtn.onclick = async () => {
      const name = document.getElementById("setupCoachName").value;
      if (!name) return alert("Por favor, digite o nome do treinador.");
      dbgToast("⚽ Indo para seleção de time...", "#1a3a5c");
      const teams = await loadTeams();
      renderVisualTeams(teams);
      showScreen("teamSelectionScreen");
    };

  const backBtn = document.getElementById("backToCoachBtn");
  if (backBtn) backBtn.onclick = () => showScreen("coachCreationScreen");
}

export async function finalizeCareerSetup(selectedTeam) {
  dbgToast("💾 Criando novo save...", "#1a3a5c");
  try {
    const coachName = document.getElementById("setupCoachName").value;
    const formation = document.getElementById("setupFormationSelect").value;
    const checkedStyle = document.querySelector(
      'input[name="setupPlaystyle"]:checked',
    );
    const playstyle = checkedStyle ? checkedStyle.value : "possession";

    // Criar o slot primeiro
    const slotId = await Storage.createSlot(
      `Carreira: ${coachName}`,
      selectedTeam.file,
      selectedTeam.name,
    );

    const coachData = {
      name: coachName,
      teamFile: selectedTeam.file,
      teamName: selectedTeam.name,
      specialty: formation,
      playstyle: playstyle,
      startDate: new Date().toLocaleDateString("pt-BR"),
    };

    await Storage.saveCoachInfo(coachData);
    await Storage.setCurrentTeamFile(selectedTeam.file);
    await Storage.setCurrentFormation(formation);

    // Inicialização AUTOMÁTICA da liga baseada no time escolhido
    await autoInitLeague();

    dbgToast("🔄 Iniciando jornada...", "#333");
    document.body.style.opacity = "0";
    setTimeout(() => window.location.reload(), 800);
  } catch (e) {
    dbgToast("❌ Erro ao salvar carreira: " + e.message, "#8b0000", 20000);
    console.error("Erro no finalizeCareerSetup:", e);
  }
}
