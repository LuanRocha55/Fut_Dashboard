import { squad } from "../core.js";
import { getRatingColor, drawRadar } from "../graphics.js";

/**
 * Renderiza a tela de estatísticas da equipe.
 */
export function renderTeamStats() {
  const goalsBody = document.getElementById("teamStatsGoalsBody");
  if (!goalsBody) return;

  const playersWithStats = squad.filter(
    (p) =>
      p.matchesPlayed > 0 ||
      p.goals > 0 ||
      p.assists > 0 ||
      p.yellowCards > 0 ||
      p.tackles > 0,
  );

  const renderList = (container, list, valueKey, valueLabel, valueColor, formatValue = null, isRating = false) => {
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    list.slice(0, 15).forEach((p, i) => {
      const val = formatValue ? formatValue(p[valueKey]) : p[valueKey];
      if (val == 0 || val == "0.0") return;

      let displayColor = valueColor;
      if (isRating && p[valueKey]) {
        displayColor = getRatingColor(p[valueKey]);
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: bold; color: ${i < 3 ? "var(--warning)" : "#aaa"}; width: 40px;">${i + 1}º</td>
        <td style="text-align: left; font-weight: bold; color: #fff;">
            ${p.name}
            <span style="font-size: 0.65rem; color: #888; margin-left: 5px; font-weight: normal;">${p.aptitude?.[0] || "?"}</span>
        </td>
        <td style="font-weight: 900; color: ${displayColor}; font-size: 1.1rem; width: 60px;">${val}</td>
      `;
      frag.appendChild(tr);
    });
    if (frag.childNodes.length === 0) {
      container.innerHTML = `<tr><td colspan="3" style="padding: 20px; color: #888; text-align: center;">Nenhum registro.</td></tr>`;
    } else {
      container.appendChild(frag);
    }
  };

  renderList(goalsBody, [...playersWithStats].sort((a, b) => b.goals - a.goals), "goals", "Gols", "var(--accent)");
  renderList(document.getElementById("teamStatsAssistsBody"), [...playersWithStats].sort((a, b) => b.assists - a.assists), "assists", "Assist.", "var(--accent)");
  renderList(document.getElementById("teamStatsMatchesBody"), [...playersWithStats].sort((a, b) => b.matchesPlayed - a.matchesPlayed), "matchesPlayed", "Part.", "#aaa");
  renderList(document.getElementById("teamStatsRatingBody"), [...playersWithStats].sort((a, b) => b.rating - a.rating), "rating", "Nota", "var(--warning)", (v) => v ? v.toFixed(1) : "0.0", true);
  renderList(document.getElementById("teamStatsCardsBody"), [...playersWithStats].sort((a, b) => b.yellowCards - a.yellowCards), "yellowCards", "Cartões", "var(--warning)");
  renderList(document.getElementById("teamStatsTacklesBody"), [...playersWithStats].sort((a, b) => b.tackles - a.tackles), "tackles", "Desarmes", "var(--accent)");
}

/**
 * Atualiza o resumo de estatísticas e o radar do time.
 */
export function updateTeamStatsUI(stats, titularesCount) {
  if (titularesCount < 11) return;

  const avgRating = stats.totalRating / 11;
  const avgAge = stats.totalAge / 11;

  const elRating = document.getElementById("teamRatingValue");
  if (elRating) {
    elRating.innerText = avgRating.toFixed(1);
    elRating.style.color = getRatingColor(avgRating);
  }

  const elAge = document.getElementById("teamAgeValue");
  if (elAge) elAge.innerText = avgAge.toFixed(1) + " anos";

  const elFit = document.getElementById("teamFitValue");
  if (elFit) elFit.innerText = `${stats.fitCount}/11`;

  const elFoot = document.getElementById("teamFootValue");
  if (elFoot) elFoot.innerText = `${stats.destrosCount}D / ${stats.canhotosCount}E / ${stats.ambiCount}A`;

  const elEstrangeiros = document.getElementById("teamForeignValue");
  if (elEstrangeiros) elEstrangeiros.innerText = stats.estrangeirosCount;

  // Radar do Time
  const radarData = [
    (stats.totalVel / stats.outfieldCount) || 0,
    (stats.totalFin / stats.outfieldCount) || 0,
    (stats.totalPas / stats.outfieldCount) || 0,
    (stats.totalDri / stats.outfieldCount) || 0,
    (stats.totalDef / stats.outfieldCount) || 0,
    (stats.totalFis / stats.outfieldCount) || 0,
  ];
  drawRadar("teamRadarCanvas", radarData);
}
