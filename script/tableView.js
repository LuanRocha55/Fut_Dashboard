import { squad, ALL_POSITIONS, calculateOVR } from "./core.js";
import { getRatingColor, getFlag, getMatchStatusHTML, getFormHTML } from "./graphics.js";
import { openMenu, setEditMode } from "./playerEditor.js";
import { normalizeStr } from "./utils.js";

export let isTableView = false;
export let tableSortCol = "rating";
export let tableSortDesc = true;

export function setTableView(val) {
  isTableView = val;
}

export function renderHighlights() {
  const container = document.getElementById("squadHighlights");
  if (!container) return;
  container.innerHTML = "";

  const statsConfig = [
    { key: "vel", fallback: "pac", label: "Mais Rápido (VEL)" },
    { key: "fin", fallback: "sho", label: "Artilheiro (FIN)" },
    { key: "pas", fallback: "pas", label: "Garçom (PAS)" },
    { key: "dri", fallback: "dri", label: "Liso (DRI)" },
    { key: "def", fallback: "def", label: "Xerife (DEF)" },
    { key: "fis", fallback: "phy", label: "Trator (FÍS)" },
  ];

  statsConfig.forEach((stat) => {
    let topPlayer = null;
    let maxVal = -1;

    squad.forEach((p) => {
      const val = p.stats ? p.stats[stat.key] || p.stats[stat.fallback] || 50 : 50;
      if (val > maxVal) { maxVal = val; topPlayer = p; }
    });

    if (topPlayer) {
      const card = document.createElement("div");
      card.className = "highlight-card";
      card.innerHTML = `
        <span class="highlight-card-title">${stat.label}</span>
        <strong class="highlight-card-name">${topPlayer.name}</strong>
        <span class="highlight-card-val">${maxVal}</span>
      `;
      card.onclick = () => {
        window.dispatchEvent(new CustomEvent('viewChanged', { detail: 'pitch' }));
        openMenu(topPlayer.id);
      };
      container.appendChild(card);
    }
  });
}

export function renderTable() {
  const tbody = document.getElementById("rosterTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  renderHighlights();

  document.querySelectorAll(".sortable").forEach((th) => {
    th.classList.remove("asc", "desc");
    if (th.dataset.sort === tableSortCol) {
      th.classList.add(tableSortDesc ? "desc" : "asc");
    }
  });

  const searchTerm = normalizeStr(document.getElementById("tableSearchInput")?.value);
  const posFilter = document.getElementById("tablePosFilter")?.value || "";

  let filteredPlayers = squad.filter((p) => {
    const matchName = normalizeStr(p.name).includes(searchTerm);
    const matchPos = posFilter ? p.aptitude && p.aptitude.includes(posFilter) : true;
    return matchName && matchPos;
  });

  filteredPlayers.sort((a, b) => {
    let valA, valB;
    switch (tableSortCol) {
      case "name": valA = a.name; valB = b.name; break;
      case "rating": valA = a.rating; valB = b.rating; break;
      case "age": valA = a.age || 0; valB = b.age || 0; break;
      case "foot": valA = a.foot || ""; valB = b.foot || ""; break;
      case "nationality": valA = a.nationality || ""; valB = b.nationality || ""; break;
      case "playstyle": valA = a.playstyle || ""; valB = b.playstyle || ""; break;
      case "form": valA = a.form || 0; valB = b.form || 0; break;
      case "status": valA = a.status; valB = b.status; break;
      case "pos":
        valA = ALL_POSITIONS.indexOf(a.aptitude?.[0]); if (valA === -1) valA = 99;
        valB = ALL_POSITIONS.indexOf(b.aptitude?.[0]); if (valB === -1) valB = 99;
        break;
      default: valA = a.rating; valB = b.rating; break;
    }
    if (typeof valA === "string") return tableSortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    else return tableSortDesc ? valB - valA : valA - valB;
  });

  filteredPlayers.forEach((p) => {
    const tr = document.createElement("tr");
    const mainPos = p.aptitude && p.aptitude.length > 0 ? p.aptitude[0] : "--";
    const isGK = p.aptitude && p.aptitude[0] === "GL";
    const pRating = p.rating ?? calculateOVR(p.stats, p.form, isGK);
    const ratingColor = getRatingColor(pRating);
    const nat = p.nationality || "--";
    const flagHtml = getFlag(nat);
    const mStatusHtml = getMatchStatusHTML(p.matchStatus);

    tr.innerHTML = `
      <td><span class="pos-badge-table">${mainPos}</span></td>
      <td><div style="position:relative; display:inline-block; margin-right: 15px;">${mStatusHtml}</div><strong style="font-size: 0.95rem; color: #fff;">${p.name}</strong> ${p.captain ? '<span style="color: var(--warning); font-size: 0.7rem; font-weight: bold; margin-left: 5px;">(C)</span>' : ""}</td>
      <td style="text-align: center;">${getFormHTML(p.form)}</td>
      <td><span style="background: ${ratingColor}; color: #000; padding: 4px 8px; border-radius: 4px; font-weight: 900;">${pRating.toFixed(1)}</span></td>
      <td>${p.age || "--"}</td>
      <td>${p.foot || "--"}</td>
      <td><span style="font-size: 0.7rem; border: 1px solid #444; padding: 2px 4px; border-radius: 4px; display: inline-flex; align-items: center;">${flagHtml}${nat}</span></td>
      <td style="color: var(--accent); font-size: 0.75rem; font-weight: bold;">${p.playstyle || "--"}</td>
      <td>
        <span style="font-size: 0.65rem; padding: 4px 8px; border-radius: 4px; font-weight: 800; border: 1px solid ${p.status === "titular" ? "var(--accent)" : "#555"}; color: ${p.status === "titular" ? "var(--accent)" : "#888"};">
          ${p.status.toUpperCase()}
        </span>
      </td>
      <td style="text-align: center;">
        <button class="edit-btn-table" style="background: transparent; border: none; color: var(--accent); cursor: pointer; font-size: 1.1rem; margin: 0; padding: 0; transition: transform 0.2s;" title="Editar Jogador">✏️</button>
      </td>
    `;
    tr.onclick = (e) => {
      openMenu(p.id);
      if(e.target.closest('.edit-btn-table')) {
        setEditMode(true);
      }
    };
    tbody.appendChild(tr);
  });
}

export function initTableEvents() {
  document.getElementById("tableSearchInput")?.addEventListener("input", renderTable);
  document.getElementById("tablePosFilter")?.addEventListener("change", renderTable);
  document.querySelectorAll(".sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (tableSortCol === col) {
        tableSortDesc = !tableSortDesc;
      } else {
        tableSortCol = col;
        tableSortDesc = col === "rating" || col === "age";
      }
      renderTable();
    });
  });
}