import {
  squad,
  activePlayerId,
  ALL_POSITIONS,
  setActivePlayerId,
  calculateOVR,
  addNewPlayer,
  removePlayer,
  updatePlayerData,
} from "../core/appCore.js";
import {
  getRatingColor,
  getFlag,
  getFormArrowConfig,
  getFormHTML,
  getMatchStatusHTML,
  getMatchStatusLabel,
  drawRadar,
  renderStatsNumbers,
} from "../ui/uiGraphics.js";
import { showCustomModal } from "../ui/uiModal.js";
import { highlightZones, clearZones, renderApp } from "../ui/uiMain.js";

export let isEditMode = false;

export const PLAYSTYLES = {
  GOL: ["Goleiro Defensivo", "Goleiro Ofensivo"],
  ZE: [
    "Defensor Criativo",
    "Zagueiro Destruidor",
    "Zagueiro Rebatedor",
    "Atacante Extra",
  ],
  ZD: [
    "Defensor Criativo",
    "Zagueiro Destruidor",
    "Zagueiro Rebatedor",
    "Atacante Extra",
  ],
  LE: [
    "Lateral Ofensivo",
    "Lateral Defensivo",
    "Especialista Cruzamento",
    "Lateral Invertido",
  ],
  LD: [
    "Lateral Ofensivo",
    "Lateral Defensivo",
    "Especialista Cruzamento",
    "Lateral Invertido",
  ],
  VOL: ["Primeiro Volante", "Cão de Guarda", "Orquestrador", "Motorzinho"],
  MC: ["Orquestrador", "Infiltrador", "Meia Versátil", "Motorzinho"],
  ME: ["Ala Veloz", "Especialista Cruzamento", "Meia de Ligação", "Falso Ala"],
  MD: ["Ala Veloz", "Especialista Cruzamento", "Meia de Ligação", "Falso Ala"],
  MEI: [
    "Armador Criativo",
    "Clássico Nº 10",
    "Infiltrador",
    "Jogador de Buraco",
  ],
  PE: [
    "Ponta Prolífico",
    "Ala Veloz",
    "Atacante de Infiltração",
    "Armador Criativo",
  ],
  PD: [
    "Ponta Prolífico",
    "Ala Veloz",
    "Atacante de Infiltração",
    "Armador Criativo",
  ],
  SA: ["Atacante de Infiltração", "Falso 9", "Armador Criativo", "Engodo"],
  CA: ["Artilheiro", "Homem de Referência", "Caçador de Gols", "Falso 9"],
};

export function updatePlaystyleOptions(primaryPos, currentPlaystyle) {
  const select = document.getElementById("editPlaystyleInput");
  if (!select) return;
  select.innerHTML = "";
  const options = PLAYSTYLES[primaryPos] || ["Sem Estilo"];
  if (currentPlaystyle && !options.includes(currentPlaystyle))
    options.unshift(currentPlaystyle);
  options.forEach((opt) => {
    const optionEl = document.createElement("option");
    optionEl.value = optionEl.innerText = opt;
    select.appendChild(optionEl);
  });
  select.value = currentPlaystyle || options[0];
}

export function setEditMode(enable) {
  isEditMode = enable;
  const playerView = document.getElementById("playerView");
  const toggleBtn = document.getElementById("toggleEditBtn");
  playerView.className = enable ? "edit-mode player-view-container" : "view-mode player-view-container";
  toggleBtn.className = enable
    ? "badge-btn badge-btn-danger"
    : "badge-btn badge-btn-dark";
  toggleBtn.innerText = enable ? "CANCELAR EDIÇÃO" : "EDITAR";
  document.getElementById("editPositions").style.pointerEvents = enable
    ? "auto"
    : "none";
  document.getElementById("editPositions").style.opacity = enable ? "1" : "0.5";
}

export async function openMenu(id) {
  if (isEditMode && id !== activePlayerId) {
    const proceed = await showCustomModal(
      "Você tem edições em andamento. Deseja descartar e abrir outro jogador?",
      "confirm",
      "btn-primary",
    );
    if (!proceed) return;
  }
  setActivePlayerId(id);
  const p = squad.find((x) => x.id === id);
  if (!p) return;

  highlightZones(p);
  document.getElementById("teamView").style.display = "none";
  document.getElementById("playerView").style.display = "flex";
  document.getElementById("editNameInput").value = p.name;
  document.getElementById("editRatingInput").value = p.rating;
  document.getElementById("editNumberInput").value = p.number || 99;
  document.getElementById("editAgeInput").value = p.age || 25;
  document.getElementById("editFootInput").value = p.foot || "Destro";
  document.getElementById("editCaptainInput").checked = !!p.captain;
  document.getElementById("editNationInput").value = p.nationality || "BR";

  document.getElementById("viewName").innerText = p.name;
  document.getElementById("viewRating").innerText = (p.rating || 5.0).toFixed(1);
  document.getElementById("viewRating").style.color = getRatingColor(p.rating);
  document.getElementById("viewNumber").innerText = p.number || 99;
  document.getElementById("viewAge").innerText = p.age || 25;
  document.getElementById("viewFoot").innerText = p.foot || "Destro";
  const nat = p.nationality || "BR";
  document.getElementById("viewNation").innerHTML = `${getFlag(nat)}${nat}`;
  document.getElementById("viewNation").style.display = "flex";
  document.getElementById("viewNation").style.alignItems = "center";
  document.getElementById("viewPlaystyle").innerText = p.playstyle || "--";
  document.getElementById("viewCaptain").innerHTML = p.captain
    ? `<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="var(--warning)" style="vertical-align: sub; margin-right: 4px;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> CAPITÃO DA EQUIPE`
    : "";

  document.getElementById("viewGoals").innerText = p.goals || 0;
  document.getElementById("viewAssists").innerText = p.assists || 0;
  document.getElementById("viewYellows").innerText = p.yellowCards || 0;

  const mainPos = p.aptitude && p.aptitude.length > 0 ? p.aptitude[0] : "CA";
  updatePlaystyleOptions(mainPos, p.playstyle);

  const mStatus = p.matchStatus || "normal";
  document.getElementById("viewMatchStatus").innerHTML =
    `${getMatchStatusHTML(mStatus)} ${getMatchStatusLabel(mStatus)}`;
  document.getElementById("editMatchStatusInput").value = mStatus;
  document.getElementById("viewForm").innerHTML =
    getFormHTML(p.form) +
    " <span style='font-size:0.8rem; color:#888;'>" +
    getFormArrowConfig(p.form).text +
    "</span>";
  document.getElementById("editFormInput").value =
    p.form !== undefined ? p.form : "0";

  const isGK = p.aptitude && p.aptitude[0] === "GOL";
  const pStats = p.stats || {
    vel: 50,
    fin: 50,
    pas: 50,
    dri: 50,
    def: 50,
    fis: 50,
    sta: 75,
  };

  const sliderContainer = document.getElementById("editSlidersContainer");
  if (sliderContainer) {
    sliderContainer.innerHTML = "";
    const statKeys = isGK
      ? [
          { key: "alc", label: "SAL" },
          { key: "seg", label: "SEG" },
          { key: "esp", label: "ESP" },
          { key: "ref", label: "REF" },
          { key: "vel", label: "VEL" },
          { key: "pos", label: "POS" },
          { key: "sta", label: "FÔL" },
        ]
      : [
          { key: "vel", label: "VEL" },
          { key: "fin", label: "FIN" },
          { key: "pas", label: "PAS" },
          { key: "dri", label: "DRI" },
          { key: "def", label: "DEF" },
          { key: "fis", label: "FÍS" },
          { key: "sta", label: "FÔL" },
        ];

    const getFallback = (key) => {
      if (pStats[key] !== undefined) return pStats[key];
      if (isGK) {
        const fb = {
          sal: pStats.div || pStats.def || 75,
          man: pStats.han || pStats.def || 75,
          rep: pStats.kic || pStats.pas || 60,
          ref: pStats.ref || pStats.def || 75,
          vel: pStats.spd || pStats.pac || 40,
          pos: pStats.pos || pStats.def || 75,
          sta: pStats.sta || pStats.stm || 50,
        };
        return fb[key] !== undefined ? fb[key] : 50;
      }
      const fb = {
        vel: pStats.pac || pStats.spd || 50,
        fin: pStats.sho || pStats.atk || 50,
        pas: pStats.pas || 50,
        dri: pStats.dri || pStats.atk || 50,
        def: pStats.def || 50,
        fis: pStats.phy || pStats.str || 50,
        sta: pStats.sta || pStats.stm || 75,
      };
      return fb[key] !== undefined ? fb[key] : 50;
    };

    statKeys.forEach((s) => {
      const val = getFallback(s.key);
      sliderContainer.innerHTML += `<div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 0.7rem; font-weight: bold; width: 30px; color: #888;">${s.label}</span><input type="range" id="slider_${s.key}" min="1" max="99" value="${val}" style="flex: 1;"><span id="val_${s.key}" style="font-size: 0.8rem; font-weight: bold; width: 25px; text-align: center; color: var(--accent);">${val}</span></div>`;
    });

    const updateLiveOVR = () => {
      const newStats = {};
      statKeys.forEach(
        (s) =>
          (newStats[s.key] = parseInt(
            document.getElementById(`slider_${s.key}`).value,
            10,
          )),
      );
      const compId = document.getElementById("compareSelect").value;
      const p2 = compId
        ? squad.find((x) => x.id === parseInt(compId, 10))
        : null;
      const s2 = p2 ? p2.stats || {} : null;
      drawRadar("radarChart", newStats, s2, isGK);
      renderStatsNumbers(newStats, s2, isGK);
      const formVal = parseInt(
        document.getElementById("editFormInput").value,
        10,
      );
      const newOvr = calculateOVR(newStats, formVal, isGK);
      document.getElementById("viewRating").innerText = (newOvr || 5.0).toFixed(1);
      document.getElementById("viewRating").style.color =
        getRatingColor(newOvr);
      document.getElementById("editRatingInput").value = (newOvr || 5.0).toFixed(1);
    };
    statKeys.forEach((s) => {
      document.getElementById(`slider_${s.key}`).oninput = (e) => {
        document.getElementById(`val_${s.key}`).innerText = e.target.value;
        updateLiveOVR();
      };
    });
    document.getElementById("editFormInput").onchange = updateLiveOVR;
  }

  setEditMode(false);

  const compareSelect = document.getElementById("compareSelect");
  compareSelect.innerHTML =
    '<option value="">-- Nenhum (Apenas Visualizar) --</option>';
  squad
    .filter((x) => x.id !== id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((pObj) => {
      const opt = document.createElement("option");
      opt.value = pObj.id;
      opt.innerText = pObj.name;
      compareSelect.appendChild(opt);
    });
  compareSelect.value = "";
  drawRadar("radarChart", pStats, null, isGK);
  renderStatsNumbers(pStats, null, isGK);

  const posContainer = document.getElementById("editPositions");
  posContainer.innerHTML = "";
  ALL_POSITIONS.forEach((pos) => {
    const chip = document.createElement("div");
    chip.className = "pos-chip";
    chip.innerText = pos;
    if (p.aptitude && p.aptitude.includes(pos)) chip.classList.add("primary");
    chip.onclick = () => {
      if (!isEditMode) return;
      if (!p.aptitude) p.aptitude = [];
      const existingIdx = p.aptitude.indexOf(pos);
      if (existingIdx > -1) {
        p.aptitude.splice(existingIdx, 1);
        chip.classList.remove("primary");
      } else {
        p.aptitude.push(pos);
        chip.classList.add("primary");
      }
      const newMainPos =
        p.aptitude && p.aptitude.length > 0 ? p.aptitude[0] : "CA";
      updatePlaystyleOptions(
        newMainPos,
        document.getElementById("editPlaystyleInput").value,
      );
    };
    posContainer.appendChild(chip);
  });
}

export async function closeMenu() {
  if (isEditMode) {
    const proceed = await showCustomModal(
      "Você tem edições em andamento. Deseja sair sem salvar?",
      "confirm",
      "btn-primary",
    );
    if (!proceed) return;
  }
  document.getElementById("playerView").style.display = "none";
  document.getElementById("teamView").style.display = "flex";
  clearZones();
  setActivePlayerId(null);
}

export function initEditorEvents() {
  document
    .getElementById("addPlayerBtn")
    .addEventListener("click", async () => {
      if (isEditMode) {
        const proceed = await showCustomModal(
          "Você tem edições em andamento. Deseja descartar e criar um novo jogador?",
          "confirm",
          "btn-primary",
        );
        if (!proceed) return;
        isEditMode = false;
      }
      const newId = addNewPlayer();
      window.dispatchEvent(new CustomEvent("viewChanged", { detail: "pitch" }));
      renderApp();
      openMenu(newId);
      setEditMode(true);
    });
  document
    .getElementById("deletePlayerBtn")
    .addEventListener("click", async () => {
      const proceed = await showCustomModal(
        "Tem certeza que deseja dispensar este jogador permanentemente do clube?",
        "confirm",
        "btn-danger",
      );
      if (proceed) {
        removePlayer(activePlayerId);
        isEditMode = false;
        closeMenu();
        renderApp();
      }
    });
  document.getElementById("closeMenuBtn").onclick = closeMenu;
  document.getElementById("toggleEditBtn").onclick = async () => {
    if (isEditMode) {
      const proceed = await showCustomModal(
        "Cancelar a edição? As alterações não salvas serão perdidas.",
        "confirm",
        "btn-danger",
      );
      if (proceed) openMenu(activePlayerId);
    } else {
      setEditMode(true);
    }
  };
  document.getElementById("saveBtn").onclick = () => {
    const p = squad.find((x) => x.id === activePlayerId);
    if (p) {
      const isGK = p.aptitude && p.aptitude[0] === "GOL";
      const statKeys = isGK
        ? ["alc", "seg", "esp", "ref", "vel", "pos", "sta"]
        : ["vel", "fin", "pas", "dri", "def", "fis", "sta"];
      const newStats = {};
      statKeys.forEach((k) => {
        const el = document.getElementById(`slider_${k}`);
        newStats[k] = el ? parseInt(el.value, 10) : 50;
      });
      const formVal = parseInt(
        document.getElementById("editFormInput").value,
        10,
      );
      let newPlayerStatus = p.status;
      const newMatchStatus = document.getElementById(
        "editMatchStatusInput",
      ).value;
      if (
        newPlayerStatus === "titular" &&
        (newMatchStatus === "red" || newMatchStatus === "injury")
      ) {
        newPlayerStatus = "reserva";
        showCustomModal(
          "O jogador foi removido do time titular por estar indisponível.",
          "alert",
          "btn-warning",
        );
      }
      updatePlayerData(activePlayerId, {
        name: document.getElementById("editNameInput").value,
        stats: newStats,
        rating: calculateOVR(newStats, formVal, isGK),
        form: formVal,
        matchStatus: newMatchStatus,
        status: newPlayerStatus,
        age: parseInt(document.getElementById("editAgeInput").value, 10) || 25,
        number:
          parseInt(document.getElementById("editNumberInput").value, 10) || 99,
        foot: document.getElementById("editFootInput").value,
        nationality: document.getElementById("editNationInput").value,
        playstyle: document.getElementById("editPlaystyleInput").value,
        captain: document.getElementById("editCaptainInput").checked,
        aptitude: [...p.aptitude],
      });
      isEditMode = false;
      closeMenu();
      renderApp();
    }
  };
  document.getElementById("compareSelect").onchange = (e) => {
    const p1 = squad.find((x) => x.id === activePlayerId);
    if (!p1) return;
    const isGK = p1.aptitude && p1.aptitude[0] === "GL";
    const statKeys = isGK
      ? ["alc", "seg", "esp", "ref", "vel", "pos", "sta"]
      : ["vel", "fin", "pas", "dri", "def", "fis", "sta"];
    let s1;
    if (document.getElementById(`slider_${statKeys[0]}`)) {
      s1 = {};
      statKeys.forEach(
        (k) =>
          (s1[k] = parseInt(document.getElementById(`slider_${k}`).value, 10)),
      );
    } else {
      s1 = p1.stats || {};
    }
    const p2 = squad.find((x) => x.id === parseInt(e.target.value, 10));
    const s2 = p2 ? p2.stats || {} : null;
    drawRadar("radarChart", s1, s2, isGK);
    renderStatsNumbers(s1, s2, isGK);
  };
  document.addEventListener("click", (e) => {
    if (
      document.getElementById("playerView").style.display === "flex" &&
      !document.getElementById("sidebar").contains(e.target) &&
      !e.target.closest(".player") &&
      !e.target.closest(".reserve-item")
    )
      if (!isEditMode) closeMenu();
  });
}
