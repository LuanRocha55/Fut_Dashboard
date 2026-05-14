import { squad, ALL_POSITIONS, calculateOVR } from "../core/appCore.js";
import {
  getRatingColor,
  getFlag,
  getMatchStatusHTML,
  getFormHTML,
} from "./uiGraphics.js";
import { openMenu, setEditMode } from "../player/playerEditor.js";
import { normalizeStr, formatMoney } from "../core/appUtils.js";

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
    { key: "sta", fallback: "stm", label: "Motor (FÔL)" },
  ];

  statsConfig.forEach((stat) => {
    let topPlayer = null;
    let maxVal = -1;

    squad.forEach((p) => {
      const val = p.stats
        ? p.stats[stat.key] || p.stats[stat.fallback] || 50
        : 50;
      if (val > maxVal) {
        maxVal = val;
        topPlayer = p;
      }
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
        window.dispatchEvent(
          new CustomEvent("viewChanged", { detail: "pitch" }),
        );
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

  const searchTerm = normalizeStr(
    document.getElementById("tableSearchInput")?.value,
  );
  const posFilter = document.getElementById("tablePosFilter")?.value || "";

  let filteredPlayers = squad.filter((p) => {
    const matchName = normalizeStr(p.name).includes(searchTerm);
    const matchPos = posFilter
      ? p.aptitude && p.aptitude.includes(posFilter)
      : true;
    return matchName && matchPos;
  });

  filteredPlayers.sort((a, b) => {
    let valA, valB;
    switch (tableSortCol) {
      case "name":
        valA = a.name;
        valB = b.name;
        break;
      case "rating":
        valA = a.rating;
        valB = b.rating;
        break;
      case "goals":
        valA = a.goals || 0;
        valB = b.goals || 0;
        break;
      case "assists":
        valA = a.assists || 0;
        valB = b.assists || 0;
        break;
      case "avgRating":
        valA = a.avgRating || 0;
        valB = b.avgRating || 0;
        break;
      case "fitness":
        valA = a.fitness !== undefined ? a.fitness : 100;
        valB = b.fitness !== undefined ? b.fitness : 100;
        break;
      case "age":
        valA = a.age || 0;
        valB = b.age || 0;
        break;
      case "foot":
        valA = a.foot || "";
        valB = b.foot || "";
        break;
      case "nationality":
        valA = a.nationality || "";
        valB = b.nationality || "";
        break;
      case "playstyle":
        valA = a.playstyle || "";
        valB = b.playstyle || "";
        break;
      case "form":
        valA = a.form || 0;
        valB = b.form || 0;
        break;
      case "status":
        valA = a.status;
        valB = b.status;
        break;
      case "marketValue":
        valA = a.marketValue || 0;
        valB = b.marketValue || 0;
        break;
      case "pos":
        valA = ALL_POSITIONS.indexOf(a.aptitude?.[0]);
        if (valA === -1) valA = 99;
        valB = ALL_POSITIONS.indexOf(b.aptitude?.[0]);
        if (valB === -1) valB = 99;
        break;
      default:
        valA = a.ovr || a.rating || 0;
        valB = b.ovr || b.rating || 0;
        break;
    }
    if (typeof valA === "string")
      return tableSortDesc
        ? valB.localeCompare(valA)
        : valA.localeCompare(valB);
    else return tableSortDesc ? valB - valA : valA - valB;
  });

  const frag = document.createDocumentFragment();
  filteredPlayers.forEach((p) => {
    const tr = document.createElement("tr");
    const mainPos = p.aptitude && p.aptitude.length > 0 ? p.aptitude[0] : "--";
    const isGK = p.aptitude && (p.aptitude[0] === "GL" || p.aptitude[0] === "GOL");
    const pRating = p.ovr || p.rating || calculateOVR(p.stats, p.form, isGK, mainPos);
    const ratingColor = getRatingColor(pRating);
    const nat = p.nationality || "--";
    const flagHtml = getFlag(nat);
    const mStatusHtml = getMatchStatusHTML(p.matchStatus);
    const fitLevel = p.fitness !== undefined ? p.fitness : 100;
    const fitColor =
      fitLevel > 70
        ? "var(--accent)"
        : fitLevel > 40
          ? "var(--warning)"
          : "var(--danger)";
    const fitColumnHtml = `<div style="display: flex; align-items: center; gap: 6px;" title="Energia: ${Math.floor(fitLevel)}%"><div style="flex: 1; height: 8px; background: rgba(0,0,0,0.8); border: 1px solid #000; border-radius: 4px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);"><div style="height: 100%; width: ${fitLevel}%; background: ${fitColor}; border-radius: 3px; transition: width 0.3s ease;"></div></div><span style="font-size: 0.7rem; color: ${fitColor}; font-weight: bold; width: 30px;">${Math.floor(fitLevel)}%</span></div>`;

    tr.innerHTML = `
      <td><span class="pos-badge-table">${mainPos}</span></td>
      <td><div style="position:relative; display:inline-block; margin-right: 15px;">${mStatusHtml}</div><strong style="font-size: 0.95rem; color: #fff;">${p.name}</strong> ${p.captain ? '<span style="color: var(--warning); font-size: 0.7rem; font-weight: bold; margin-left: 5px;">(C)</span>' : ""}</td>
      <td style="min-width: 80px;">${fitColumnHtml}</td>
      <td style="text-align: center;">${getFormHTML(p.form)}</td>
      <td><span style="background: ${ratingColor}; color: #000; padding: 4px 8px; border-radius: 4px; font-weight: 900;">${pRating.toFixed(1)}</span></td>
      <td style="text-align: center; font-weight: bold; color: var(--accent);">${p.goals || 0}</td>
      <td style="text-align: center; font-weight: bold; color: #00aaff;">${p.assists || 0}</td>
      <td style="text-align: center; font-weight: bold; color: var(--warning);">${p.avgRating ? p.avgRating.toFixed(1) : "--"}</td>
      <td>${p.age || "--"}</td>
      <td>${p.foot || "--"}</td>
      <td><span style="font-size: 0.7rem; border: 1px solid #444; padding: 2px 4px; border-radius: 4px; display: inline-flex; align-items: center;">${flagHtml}${nat}</span></td>
      <td style="color: var(--accent); font-size: 0.75rem; font-weight: bold;">${p.playstyle || "--"}</td>
      <td>
        <span style="font-size: 0.65rem; padding: 4px 8px; border-radius: 4px; font-weight: 800; border: 1px solid ${p.status === "titular" ? "var(--accent)" : "#555"}; color: ${p.status === "titular" ? "var(--accent)" : "#888"};">
          ${p.status.toUpperCase()}
        </span>
      </td>
      <td style="text-align: center; color: var(--accent); font-weight: 800; font-size: 0.85rem;">
        ${formatMoney(p.marketValue || 0)}
      </td>
    `;
    tr.onclick = (e) => {
      openMenu(p.id);
      if (e.target.closest(".edit-btn-table")) {
        setEditMode(true);
      }
    };
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

export function initTableEvents() {
  document
    .getElementById("tableSearchInput")
    ?.addEventListener("input", renderTable);
  document
    .getElementById("tablePosFilter")
    ?.addEventListener("change", renderTable);
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
