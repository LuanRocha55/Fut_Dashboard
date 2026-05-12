import { Storage } from "../storage.js";
import { autoInitLeague } from "../league.js";
import { showCustomModal } from "../modal.js";

/**
 * Abre o menu de carregamento de jogos.
 */
export async function openLoadGameMenu() {
  const slots = await Storage.getSlots();
  if (slots.length === 0) {
    showCustomModal("Nenhum jogo salvo encontrado. Inicie uma Nova Carreira!", "alert", "btn-warning");
    return;
  }

  let slotsHtml = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #fff; margin-bottom: 5px;">CARREGAR CARREIRA</h2>
      <p style="color: #888; font-size: 0.8rem;">Selecione um arquivo de save para continuar</p>
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 10px;">
  `;

  slots.forEach(slot => {
    slotsHtml += `
      <div class="save-slot-card" data-id="${slot.id}" style="background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 15px; border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
        <div>
          <div style="color: var(--accent); font-weight: bold; font-size: 1rem;">${slot.name}</div>
          <div style="color: #666; font-size: 0.75rem; margin-top: 2px;">${slot.teamName} • ${slot.date}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="delete-save-btn" data-id="${slot.id}" style="background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.2); color: #ff4444; padding: 6px 10px; border-radius: 6px; font-size: 0.7rem; cursor: pointer;">DELETAR</button>
          <button class="select-save-btn" data-id="${slot.id}" style="background: var(--accent); border: none; color: #000; padding: 6px 12px; border-radius: 6px; font-size: 0.7rem; font-weight: bold; cursor: pointer;">ABRIR</button>
        </div>
      </div>
    `;
  });

  slotsHtml += `</div>
    <button id="modalBackBtn" class="btn-secondary" style="width: 100%; margin-top: 20px;">VOLTAR</button>
  `;

  const result = await showCustomModal(slotsHtml, "custom");
  
  if (result === "back") return;
  
  if (result && result.startsWith("load:")) {
    const slotId = result.split(":")[1];
    await Storage.setActiveSlot(slotId);
    document.body.style.opacity = "0";
    setTimeout(() => window.location.reload(), 500);
  } else if (result && result.startsWith("delete:")) {
    const slotId = result.split(":")[1];
    const confirm = await showCustomModal("Tem certeza que deseja DELETAR este save permanentemente?", "confirm", "btn-danger");
    if (confirm) {
      await Storage.deleteSlot(slotId);
      openLoadGameMenu(); // Recarregar lista
    } else {
      openLoadGameMenu(); // Voltar para a lista
    }
  }
}

/**
 * Abre o menu de configurações.
 */
export async function openSettingsMenu() {
  const settingsHtml = `
    <div style="text-align: center; margin-bottom: 25px;">
      <h2 style="color: #fff; margin-bottom: 5px;">CONFIGURAÇÕES</h2>
      <p style="color: #888; font-size: 0.8rem;">Ajustes globais do sistema</p>
    </div>
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <button id="editSquadsBtn" class="btn-secondary" style="width: 100%; padding: 15px; text-align: left; display: flex; align-items: center; gap: 12px;">
        <i data-lucide="edit-3" style="width: 1.2rem; height: 1.2rem; color: var(--accent);"></i>
        <div>
          <div style="font-weight: bold;">Editor de Banco de Dados</div>
          <div style="font-size: 0.7rem; color: #666;">Modificar times base (requer reinício)</div>
        </div>
      </button>
      
      <button id="resetAllDataBtn" class="btn-danger" style="width: 100%; padding: 15px; text-align: left; display: flex; align-items: center; gap: 12px; background: rgba(255,0,0,0.05);">
        <i data-lucide="trash-2" style="width: 1.2rem; height: 1.2rem;"></i>
        <div>
          <div style="font-weight: bold;">Resetar Todo o App</div>
          <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">Limpa todos os saves e caches do IDB</div>
        </div>
      </button>
      
      <button id="modalBackBtn" class="btn-secondary" style="width: 100%; margin-top: 10px;">VOLTAR AO MENU</button>
    </div>
  `;

  const result = await showCustomModal(settingsHtml, "custom");

  if (result === "confirm_reset") {
    const confirm = await showCustomModal("ISSO IRÁ APAGAR TUDO! Tem certeza absoluta?", "confirm", "btn-danger");
    if (confirm) {
      localStorage.clear();
      if (window.indexedDB) {
        const databases = await window.indexedDB.databases();
        databases.forEach(db => window.indexedDB.deleteDatabase(db.name));
      }
      window.location.reload();
    }
  } else if (result === "edit_squads") {
    showCustomModal("O Editor de Elencos base está em desenvolvimento para a versão modular.", "alert", "btn-primary");
  }
}

/**
 * Renderiza a lista de times para escolha do usuário.
 */
export async function renderTeamSelectionGrid() {
  const grid = document.getElementById("visualTeamGrid");
  if (!grid) return;
  grid.innerHTML = "<p style='color: white;'>Carregando clubes...</p>";

  // Lista de alguns times populares para mostrar inicialmente (baseado nos arquivos do diretório)
  const popularTeams = [
    { name: "Vasco da Gama", file: "vasco.json", color: "#000" },
    { name: "Real Madrid", file: "realmadrid.json", color: "#f1f1f1" },
    { name: "Barcelona", file: "fcbarcelona.json", color: "#a50044" },
    { name: "Manchester City", file: "manchestercity.json", color: "#6caddf" },
    { name: "Bayern München", file: "fcbayernmnchen.json", color: "#dc052d" },
    { name: "Borussia Dortmund", file: "borussiadortmund.json", color: "#fde100" },
    { name: "Liverpool", file: "liverpool.json", color: "#c8102e" },
    { name: "PSG", file: "parissg.json", color: "#004170" },
    { name: "Ajax", file: "ajax.json", color: "#d2122e" },
    { name: "Inter Miami", file: "intermiamicf.json", color: "#f4b5cd" }
  ];

  grid.innerHTML = "";
  popularTeams.forEach(team => {
    const card = document.createElement("div");
    card.style.cssText = `
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    card.innerHTML = `
      <div style="width: 60px; height: 60px; background: ${team.color}; margin: 0 auto 15px; border-radius: 50%; box-shadow: 0 5px 15px rgba(0,0,0,0.5);"></div>
      <h3 style="color: white; margin: 0; font-size: 1rem;">${team.name}</h3>
    `;
    
    card.onmouseover = () => card.style.borderColor = "var(--accent)";
    card.onmouseout = () => card.style.borderColor = "#333";
    
    card.onclick = () => {
      finalizeCareerSetup(team);
    };
    grid.appendChild(card);
  });
}

/**
 * Finaliza a configuração de uma nova carreira e cria o save inicial.
 */
export async function finalizeCareerSetup(selectedTeam) {
  try {
    const coachName = document.getElementById("setupCoachName").value;
    const formation = document.getElementById("setupFormationSelect").value;
    const checkedStyle = document.querySelector('input[name="setupPlaystyle"]:checked');
    const playstyle = checkedStyle ? checkedStyle.value : "possession";

    const slotId = await Storage.createSlot(
      `Carreira: ${coachName}`,
      selectedTeam.file,
      selectedTeam.name
    );

    const coachData = {
      name: coachName,
      teamFile: selectedTeam.file,
      teamName: selectedTeam.name,
      specialty: formation,
      playstyle: playstyle,
      startDate: new Date().toLocaleDateString('pt-BR')
    };

    await Storage.saveCoachInfo(coachData);
    await Storage.setCurrentTeamFile(selectedTeam.file);
    await Storage.setCurrentFormation(formation);

    await autoInitLeague();

    document.body.style.opacity = "0";
    setTimeout(() => window.location.reload(), 800);
  } catch (e) {
    console.error("Erro no finalizeCareerSetup:", e);
  }
}
