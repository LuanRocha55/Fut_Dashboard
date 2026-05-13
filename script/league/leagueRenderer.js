import { Storage } from "../core/appStorage.js";
import { getMatchDate, formatMatchDate, updateMonthUI } from "./leagueMain.js";
import {
  getTeamLogoHTML,
  normalizeTeamName,
  getCompetitionLogoHTML,
} from "../ui/uiGraphics.js";

export let fixtureViewMode = "month";
export let selectedRoundIndex = 0;
export let selectedMonth = 0;
export let currentViewDivision = 0;

export function updateLeagueState(updates) {
  if (updates.fixtureViewMode !== undefined)
    fixtureViewMode = updates.fixtureViewMode;
  if (updates.selectedRoundIndex !== undefined)
    selectedRoundIndex = updates.selectedRoundIndex;
  if (updates.selectedMonth !== undefined)
    selectedMonth = updates.selectedMonth;
  if (updates.currentViewDivision !== undefined)
    currentViewDivision = updates.currentViewDivision;
}

export async function renderLeagueData() {
  const data = await Storage.getLeagueData();
  const tbody = document.getElementById("leagueTableBody");
  const currentRoundEl = document.getElementById("leagueCurrentRound");
  const totalRoundsEl = document.getElementById("leagueTotalRounds");

  if (!data) {
    tbody.innerHTML = `<tr><td colspan="10" style="padding: 30px; color: #888;">Nenhuma competição ativa nesta carreira. Clique em "GERAR CAMPEONATO" para começar!</td></tr>`;
    const fixturesContainer = document.getElementById("leagueMatchesList");
    if (fixturesContainer) {
      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Crie uma nova liga para ver o calendário.</div>`;
    }
    return;
  }

  if (!data.divisions && data.table) {
    data.divisions = [
      { level: 1, name: "1ª Divisão", table: data.table, rounds: data.rounds },
    ];
  }

  const divSelect = document.getElementById("leagueDivisionSelect");
  if (divSelect) {
    if (data.divisions.length > 1) {
      divSelect.style.display = "block";
      divSelect.innerHTML = data.divisions
        .map(
          (d, i) =>
            `<option value="${i}" ${i === currentViewDivision ? "selected" : ""}>${d.name}</option>`,
        )
        .join("");
    } else {
      divSelect.style.display = "none";
    }
  }

  const currentDiv = data.divisions[currentViewDivision] || data.divisions[0];
  const totalRounds = currentDiv.rounds.length;

  const nextSeasonBtn = document.getElementById("nextSeasonBtn");
  if (nextSeasonBtn) {
    if (
      data.currentRound >
        Math.max(...data.divisions.map((d) => d.rounds.length)) &&
      (!data.cup || data.cup.finished)
    )
      nextSeasonBtn.style.display = "block";
    else nextSeasonBtn.style.display = "none";
  }

  currentRoundEl.innerText = data.currentRound;
  if (totalRoundsEl) {
    totalRoundsEl.innerText = totalRounds;
  }

  const leagueTitleEl = document.getElementById("leagueTitleDisplay");
  if (leagueTitleEl) {
    const compLogo = getCompetitionLogoHTML(currentDiv.name);
    leagueTitleEl.innerHTML = `${compLogo} ${normalizeTeamName(currentDiv.name)} - Temporada ${data.seasonName || "2026"}`;
  }

  currentDiv.table.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.w !== a.w) return b.w - a.w;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  tbody.innerHTML = "";
  const frag = document.createDocumentFragment();
  currentDiv.table.forEach((t, i) => {
    const tr = document.createElement("tr");
    if (t.isUser) tr.style.background = "rgba(0, 255, 136, 0.1)";
    tr.innerHTML = `
            <td style="font-weight: bold; color: ${i < 4 ? "var(--rating-top)" : i > 15 ? "var(--danger)" : "#aaa"};">${i + 1}º</td>
            <td style="text-align: left;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: ${t.isUser ? "bold" : "normal"}; color: ${t.isUser ? "var(--accent)" : "#fff"};">
                    ${getTeamLogoHTML(t.name)}
                    <span>${normalizeTeamName(t.name)}</span>
                </div>
            </td>
            <td style="font-weight: 900; color: var(--warning);">${t.pts}</td>
            <td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td>
            <td style="font-weight: bold;">${t.gd > 0 ? "+" + t.gd : t.gd}</td>
        `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  await renderFixtures(true);
  if (window.lucide) window.lucide.createIcons();
}

export async function renderFixtures(forceUpdateParams = false) {
  const data = await Storage.getLeagueData();
  updateMonthUI();
  const fixturesContainer = document.getElementById("leagueMatchesList");
  const monthSelect = document.getElementById("fixtureMonthSelect");
  const currentRoundDisplay = document.getElementById("currentRoundDisplay");

  if (!data || !data.divisions) {
    if (fixturesContainer) {
      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhuma liga ativa. Crie uma nova liga para ver o calendário.</div>`;
    }
    return;
  }

  const currentDiv = data.divisions[currentViewDivision] || data.divisions[0];

  const totalRounds = currentDiv.rounds.length;
  const currentRoundIdx = Math.min(data.currentRound - 1, totalRounds - 1);

  if (forceUpdateParams || typeof selectedRoundIndex === "undefined") {
    updateLeagueState({
      selectedRoundIndex: currentRoundIdx,
      selectedMonth: Math.floor((currentRoundIdx * 10) / totalRounds),
    });
    if (monthSelect) monthSelect.value = selectedMonth;
  }

  fixturesContainer.innerHTML = "";

  const teamData = currentDiv.table.reduce((acc, team) => {
    acc[team.id] = team;
    return acc;
  }, {});

  let matchesFound = false;

  if (fixtureViewMode === "month") {
    const userTeamId = currentDiv.table.find((t) => t.isUser)?.id;
    const schedule = [];

    currentDiv.rounds.forEach((round, rIndex) => {
      const roundMonth = Math.floor((rIndex * 10) / totalRounds);
      if (roundMonth === selectedMonth) {
        const userMatch = round.find(
          (m) => m.home === userTeamId || m.away === userTeamId,
        );
        if (userMatch) {
          schedule.push({
            type: "league",
            index: rIndex,
            match: userMatch,
            title: `Rodada ${rIndex + 1}`,
          });
        }
      }
    });

    if (data.cup && !data.cup.finished) {
      for (let phaseIdx = 0; phaseIdx < data.cup.phases.length; phaseIdx++) {
        const dateNum = getMatchDate("cup", phaseIdx, totalRounds);
        const matchMonth = Math.floor(dateNum / 30);
        if (matchMonth === selectedMonth) {
          const phaseMatches = data.cup.phases[phaseIdx];
          const userMatch = phaseMatches.find(
            (m) => m.home === userTeamId || m.away === userTeamId,
          );
          if (userMatch) {
            schedule.push({
              type: "cup",
              index: phaseIdx,
              match: userMatch,
              title: `Copa - ${data.cup.phaseNames[phaseIdx]}`,
            });
          }
        }
      }
    }

    if (data.continentalCup && !data.continentalCup.finished) {
      // 3.1 Fase de Grupos
      if (data.continentalCup.currentPhaseIndex < 3) {
        data.continentalCup.groups.forEach((group) => {
          group.matches.forEach((m) => {
            if (m.home === userTeamId || m.away === userTeamId) {
              const dateNum = getMatchDate(
                "continental",
                m.round - 1,
                totalRounds,
              );
              const matchMonth = Math.floor(dateNum / 30);
              if (matchMonth === selectedMonth) {
                schedule.push({
                  type: "continental",
                  index: m.round - 1,
                  match: m,
                  title: `${data.continentalCup.name} - Rodada ${m.round}`,
                });
              }
            }
          });
        });
      }

      // 3.2 Mata-mata
      for (
        let knockoutIdx = 0;
        knockoutIdx < data.continentalCup.phases.length;
        knockoutIdx++
      ) {
        const phaseIdx = knockoutIdx + 3; // Oitavas é index 3 no getMatchDate
        const dateNum = getMatchDate("continental", phaseIdx, totalRounds);
        const matchMonth = Math.floor(dateNum / 30);
        if (matchMonth === selectedMonth) {
          const phaseMatches = data.continentalCup.phases[knockoutIdx];
          const userMatch = phaseMatches.find(
            (m) => m.home === userTeamId || m.away === userTeamId,
          );
          if (userMatch) {
            schedule.push({
              type: "continental",
              index: phaseIdx,
              match: userMatch,
              title: `${data.continentalCup.name} - ${data.continentalCup.phaseNames[knockoutIdx + 1]}`,
            });
          }
        }
      }
    }

    schedule.forEach((item) => {
      item.dateNum = getMatchDate(item.type, item.index, totalRounds);
    });
    schedule.sort((a, b) => a.dateNum - b.dateNum);

    if (schedule.length > 0) {
      const frag = document.createDocumentFragment();
      matchesFound = true;
      schedule.forEach((item) => {
        const match = item.match;
        let statusLabel = "";

        if (item.type === "league") {
          if (data.currentRound - 1 === item.index) {
            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
          } else if (data.currentRound - 1 > item.index) {
            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
          }
        } else if (item.type === "cup") {
          if (data.cup.currentPhaseIndex === item.index && !match.played) {
            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
          } else if (match.played) {
            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
          }
        } else if (item.type === "continental") {
          if (
            data.continentalCup.currentPhaseIndex === item.index &&
            !match.played
          ) {
            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
          } else if (match.played) {
            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
          }
        }

        const roundHeader = document.createElement("div");
        roundHeader.style.cssText =
          "margin-top: 15px; margin-bottom: 5px; color: var(--accent); font-weight: bold; font-size: 0.85rem; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; display: flex; justify-content: space-between;";
        const dateStr = formatMatchDate(
          item.dateNum,
          data.startMonth || 0,
          data.baseYear || 2026,
        );
        roundHeader.innerHTML = `<span>📅 ${dateStr} - ${item.title}</span> ${statusLabel}`;

        const getTeamNameInfo = (id) => {
          let t = teamData[id];
          if (t) return normalizeTeamName(t.name);
          if (data.continentalCup && data.continentalCup.teams) {
            let c = data.continentalCup.teams.find((x) => x.id === id);
            if (c) return normalizeTeamName(c.name);
          }
          if (data.cup && data.cup.teams) {
            let ct = data.cup.teams.find((x) => x.id === id);
            if (ct) return normalizeTeamName(ct.name);
          }
          return "Desconhecido";
        };

        const homeTeamName = getTeamNameInfo(match.home);
        const awayTeamName = getTeamNameInfo(match.away);

        const matchEl = document.createElement("div");
        matchEl.className = "fixture-item user-match";
        if (item.type === "cup") matchEl.style.borderColor = "var(--warning)";
        if (item.type === "continental") matchEl.style.borderColor = "#00aaff";

        let scoreHtml = match.played
          ? `<strong>${match.homeScore}</strong> - <strong>${match.awayScore}</strong>`
          : "VS";
        if (
          match.played &&
          match.homePen !== null &&
          match.homePen !== undefined
        ) {
          scoreHtml = `<strong>${match.homeScore}</strong> (${match.homePen}) - (${match.awayPen}) <strong>${match.awayScore}</strong>`;
        }

        matchEl.innerHTML = `
                      <div class="fixture-team home" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                          <span>${homeTeamName}</span>
                          ${getTeamLogoHTML(homeTeamName)}
                      </div>
                      <div class="fixture-score">
                          ${scoreHtml}
                      </div>
                      <div class="fixture-team away" style="display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
                          ${getTeamLogoHTML(awayTeamName)}
                          <span>${awayTeamName}</span>
                      </div>
                  `;
        frag.appendChild(roundHeader);
        frag.appendChild(matchEl);
      });
      fixturesContainer.appendChild(frag);
    }

    if (!matchesFound) {
      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhum jogo do seu time programado para este mês.</div>`;
    }
  } else {
    if (currentRoundDisplay)
      currentRoundDisplay.innerText = `Rodada ${selectedRoundIndex + 1}`;

    const round = currentDiv.rounds[selectedRoundIndex];
    if (round) {
      matchesFound = true;
      const frag = document.createDocumentFragment();

      let statusLabel = "";
      if (data.currentRound - 1 === selectedRoundIndex) {
        statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.85rem; font-weight: bold;">RODADA ATUAL</span>`;
      } else if (data.currentRound - 1 > selectedRoundIndex) {
        statusLabel = `<span style="float: right; color: #888; font-size: 0.85rem; font-weight: bold;">FINALIZADA</span>`;
      }

      const header = document.createElement("div");
      header.style.cssText =
        "margin-top: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
      header.innerHTML = `<span></span>${statusLabel}`;
      if (statusLabel) frag.appendChild(header);

      round.forEach((match) => {
        const homeTeam = teamData[match.home] || { name: "Time Desconhecido" };
        const awayTeam = teamData[match.away] || { name: "Time Desconhecido" };

        const matchEl = document.createElement("div");
        matchEl.className = "fixture-item";
        if (homeTeam.isUser || awayTeam.isUser) {
          matchEl.classList.add("user-match");
        }

        matchEl.innerHTML = `
                    <div class="fixture-team home" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                        <span>${normalizeTeamName(homeTeam.name)}</span>
                        ${getTeamLogoHTML(homeTeam.name)}
                    </div>
                    <div class="fixture-score">
                        ${match.played ? `<strong>${match.homeScore}</strong> - <strong>${match.awayScore}</strong>` : "VS"}
                    </div>
                    <div class="fixture-team away" style="display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
                        ${getTeamLogoHTML(awayTeam.name)}
                        <span>${normalizeTeamName(awayTeam.name)}</span>
                    </div>
                `;
        frag.appendChild(matchEl);
      });
      fixturesContainer.appendChild(frag);
    }

    if (!matchesFound) {
      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Rodada não encontrada.</div>`;
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

export async function renderContinental() {
  const data = await Storage.getLeagueData();
  const container = document.getElementById("continentalBracket");
  const title = document.getElementById("continentalTitle");
  if (!data || !data.continentalCup) {
    container.innerHTML =
      "<div style='text-align:center; color:#888; padding:20px;'>Crie uma nova Liga para gerar a Copa Continental!</div>";
    return;
  }
  if (title)
    title.innerHTML = `${getCompetitionLogoHTML(data.continentalCup.name)} ${normalizeTeamName(data.continentalCup.name)}`;
  container.innerHTML = "";

  const getTeamName = (id) => {
    let t = data.continentalCup.teams.find((x) => x.id === id);
    if (t) return t.name;
    const flat = data.divisions ? data.divisions.flatMap((d) => d.table) : [];
    t = flat.find((x) => x.id === id);
    return t ? t.name : "Desconhecido";
  };

  if (data.continentalCup.finished) {
    const winnerName = getTeamName(data.continentalCup.winner);
    container.innerHTML = `<h3 style='color:var(--warning); text-align:center; margin-bottom:20px;'>🏆 O ${normalizeTeamName(winnerName)} é o Campeão da ${normalizeTeamName(data.continentalCup.name)}!</h3>`;
  }

  // FASE DE GRUPOS
  if (
    data.continentalCup.currentPhaseIndex < 3 ||
    (data.continentalCup.phases.length === 0 && !data.continentalCup.finished)
  ) {
    const groupsDiv = document.createElement("div");
    groupsDiv.style.display = "grid";
    groupsDiv.style.gridTemplateColumns =
      "repeat(auto-fit, minmax(300px, 1fr))";
    groupsDiv.style.gap = "20px";

    data.continentalCup.groups.forEach((g) => {
      const gBox = document.createElement("div");
      gBox.className = "league-card";
      gBox.style.padding = "10px";

      let rows = g.teams
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd)
        .map(
          (t, idx) => `
        <tr style="${idx < 2 ? "background: rgba(0, 170, 255, 0.05);" : ""}">
          <td style="padding: 5px; color: ${idx < 2 ? "var(--accent)" : "#888"}; font-weight: bold;">${idx + 1}º</td>
          <td style="padding: 5px; display: flex; align-items: center; gap: 5px;">${getTeamLogoHTML(t.name)} <span style="font-size: 0.85rem;">${normalizeTeamName(t.name)}</span></td>
          <td style="padding: 5px; text-align: center; font-weight: bold; color: var(--accent);">${t.pts}</td>
          <td style="padding: 5px; text-align: center; font-size: 0.75rem; color: #aaa;">${t.p}</td>
          <td style="padding: 5px; text-align: center; font-size: 0.75rem; color: #aaa;">${t.gd}</td>
        </tr>
      `,
        )
        .join("");

      gBox.innerHTML = `
        <h4 style="color: var(--warning); margin-bottom: 10px; text-align: center; border-bottom: 1px solid #333; padding-bottom: 5px;">Grupo ${g.name}</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="font-size: 0.7rem; color: #888; text-transform: uppercase;">
              <th style="text-align: left; padding: 5px;">Pos</th>
              <th style="text-align: left; padding: 5px;">Time</th>
              <th style="padding: 5px;">Pts</th>
              <th style="padding: 5px;">J</th>
              <th style="padding: 5px;">SG</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
      groupsDiv.appendChild(gBox);
    });
    container.appendChild(groupsDiv);
  }

  // MATA-MATA (Sempre mostra o progresso do mata-mata se já começou ou terminou)
  if (data.continentalCup.phases.length > 0) {
    const knockoutContainer = document.createElement("div");
    knockoutContainer.style.marginTop = "30px";

    for (let i = data.continentalCup.phases.length - 1; i >= 0; i--) {
      const phaseMatches = data.continentalCup.phases[i];
      const phaseName = data.continentalCup.phaseNames[i + 1]; // +1 porque index 0 é "Fase de Grupos"

      const phaseDiv = document.createElement("div");
      phaseDiv.style.marginBottom = "15px";
      phaseDiv.innerHTML = `<h4 style="color:#00aaff; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">${phaseName}</h4>`;

      phaseMatches.forEach((m) => {
        const hName = getTeamName(m.home);
        const aName = getTeamName(m.away);
        let scoreText = "VS";
        if (m.played) {
          if (m.homePen !== null && m.homePen !== undefined)
            scoreText = `<strong>${m.homeScore}</strong> (${m.homePen}) - (${m.awayPen}) <strong>${m.awayScore}</strong>`;
          else
            scoreText = `<strong>${m.homeScore}</strong> - <strong>${m.awayScore}</strong>`;
        }
        const isUserMatch =
          m.home ===
            (data.table ? data.table.find((t) => t.isUser)?.id : "meu_time") ||
          m.away ===
            (data.table ? data.table.find((t) => t.isUser)?.id : "meu_time");
        const bg = isUserMatch ? "rgba(0, 255, 136, 0.1)" : "#1a1a1a";
        const border = isUserMatch ? "#00aaff" : "#333";

        phaseDiv.innerHTML += `
              <div style="display:flex; justify-content:space-between; align-items:center; background:${bg}; border: 1px solid ${border}; padding: 10px; border-radius: 8px; margin-bottom: 5px;">
                  <div style="flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                      <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "#00aaff" : "#fff"}">${normalizeTeamName(hName)}</span>
                      ${getTeamLogoHTML(hName)}
                  </div>
                  <div style="margin: 0 20px; color:var(--warning); font-size:1rem; min-width: 90px; text-align:center;">${scoreText}</div>
                  <div style="flex:1; text-align:left; display:flex; align-items:center; justify-content:flex-start; gap:8px;">
                      ${getTeamLogoHTML(aName)}
                      <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "#00aaff" : "#fff"}">${normalizeTeamName(aName)}</span>
                  </div>
              </div>`;
      });
      knockoutContainer.appendChild(phaseDiv);
    }
    container.appendChild(knockoutContainer);
  }
}

/**
 * Função Genérica para renderizar tabelas de estatísticas (Artilharia, Assistência, Notas)
 */
async function renderGenericStatTable({
  tbodyId,
  dataKey,
  valueKey,
  valueLabel,
  valueColor,
  emptyMessage,
  formatValue = (v) => v,
  isRating = false,
  sortOrder = "desc",
}) {
  const data = await Storage.getLeagueData();
  const tbody = document.getElementById(tbodyId);

  if (!tbody) return;

  if (!data || !data.divisions) {
    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; color: #888;">Crie uma liga para ver as estatísticas.</td></tr>`;
    return;
  }

  const currentDiv = data.divisions[currentViewDivision];
  if (!data[dataKey] || Object.keys(data[dataKey]).length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; color: #888;">${emptyMessage}</td></tr>`;
    return;
  }

  let statsArray = Object.values(data[dataKey]);

  if (isRating) {
    statsArray = statsArray
      .filter((r) => r.matches > 0)
      .map((r) => ({ ...r, avgRating: r.sumRatings / r.matches }));
  }

  statsArray.sort((a, b) => {
    return sortOrder === "desc"
      ? b[valueKey] - a[valueKey]
      : a[valueKey] - b[valueKey];
  });

  const topStats = statsArray.slice(0, 20);
  const userTeamName = currentDiv?.table.find((t) => t.isUser)?.name;

  tbody.innerHTML = "";
  topStats.forEach((player, index) => {
    const isUserPlayer = player.team === userTeamName;
    const highlightStyle = isUserPlayer
      ? "background: rgba(0, 255, 136, 0.1);"
      : "";

    let displayColor = valueColor;
    if (isRating) {
      const val = player[valueKey];
      displayColor =
        val >= 8.5
          ? "var(--rating-top)"
          : val >= 7.5
            ? "var(--rating-high)"
            : val >= 6.0
              ? "var(--rating-mid)"
              : val >= 5.0
                ? "var(--rating-low)"
                : "var(--rating-bad)";
    }

    const tr = document.createElement("tr");
    tr.style.cssText = highlightStyle;
    tr.innerHTML = `
            <td style="font-weight: bold; color: ${index < 3 ? "var(--warning)" : "#aaa"};">${index + 1}º</td>
            <td style="text-align: left; font-weight: bold; color: ${isUserPlayer ? "var(--accent)" : "#fff"};">
                ${player.name}
                <div style="font-size: 0.65rem; color: #888; font-weight: normal; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                    ${getTeamLogoHTML(player.team)}
                    <span>${player.team}</span>
                </div>
            </td>
            <td style="font-weight: 900; color: ${displayColor}; font-size: 1.1rem;">${formatValue(player[valueKey])}</td>
        `;
    tbody.appendChild(tr);
  });

  if (window.lucide) window.lucide.createIcons();
}

export async function renderSeasonHistory() {
  const historyList = document.getElementById("seasonHistoryList");
  if (!historyList) return;
  const history = (await Storage.getSeasonHistory()) || [];
  if (history.length === 0) {
    historyList.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhuma temporada finalizada ainda. Avance de temporada para gerar o histórico.</div>`;
    return;
  }
  historyList.innerHTML = "";
  const reversed = [...history].reverse();
  reversed.forEach((season) => {
    const item = document.createElement("div");
    item.style.cssText =
      "background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;";
    item.innerHTML = `
            <div>
                <h4 style="color: var(--accent); margin: 0 0 10px 0;">Temporada ${season.season}</h4>
                <div style="font-size: 0.85rem; color: #ccc;">
                    <div><strong style="color: var(--warning);">Campeão da Liga:</strong> ${season.leagueWinner}</div>
                    <div style="margin-top: 5px;"><strong style="color: var(--warning);">Campeão da Copa:</strong> ${season.cupWinner}</div>
                </div>
            </div>
            <div style="text-align: right; font-size: 0.85rem; color: #ccc;">
                <div style="color: #00aaff; margin-bottom: 5px;"><strong>Artilheiro:</strong></div>
                <div style="font-weight: bold; font-size: 1.1rem;">${season.topScorer}</div>
            </div>
        `;
    historyList.appendChild(item);
  });
}

export async function renderCup() {
  const data = await Storage.getLeagueData();
  const container = document.getElementById("cupBracket");
  if (!data || !data.cup) {
    container.innerHTML =
      "<div style='text-align:center; color:#888; padding:20px;'>Crie uma nova Liga para gerar a Copa Nacional!</div>";
    return;
  }
  container.innerHTML = "";
  if (data.cup.finished) {
    const flatTeams = data.divisions.flatMap((d) => d.table);
    const winnerTeam = flatTeams.find((t) => t.id === data.cup.winner);
    container.innerHTML = `<h3 style='color:var(--warning); text-align:center; margin-bottom:20px;'>🏆 O ${winnerTeam?.name} é o Campeão da Copa!</h3>`;
  }
  for (let i = data.cup.phases.length - 1; i >= 0; i--) {
    const phaseMatches = data.cup.phases[i];
    const phaseName = data.cup.phaseNames[i];
    const flatTeams = data.divisions.flatMap((d) => d.table);

    const getTeamName = (id) => {
      let t = flatTeams.find((x) => x.id === id);
      if (t) return t.name;
      if (data.cup.teams) {
        let ct = data.cup.teams.find((x) => x.id === id);
        if (ct) return ct.name;
      }
      return "Desconhecido";
    };

    const phaseDiv = document.createElement("div");
    phaseDiv.style.marginBottom = "15px";
    phaseDiv.innerHTML = `<h4 style="color:var(--accent); margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">${getCompetitionLogoHTML("Copa")} ${phaseName}</h4>`;

    phaseMatches.forEach((m) => {
      const hName = getTeamName(m.home);
      const aName = getTeamName(m.away);
      let scoreText = "VS";
      if (m.played) {
        if (m.homePen !== null && m.homePen !== undefined)
          scoreText = `<strong>${m.homeScore}</strong> (${m.homePen}) - (${m.awayPen}) <strong>${m.awayScore}</strong>`;
        else
          scoreText = `<strong>${m.homeScore}</strong> - <strong>${m.awayScore}</strong>`;
      }

      const isUserMatch =
        m.home ===
          (data.table ? data.table.find((t) => t.isUser)?.id : "meu_time") ||
        m.away ===
          (data.table ? data.table.find((t) => t.isUser)?.id : "meu_time");
      const bg = isUserMatch ? "rgba(0, 255, 136, 0.1)" : "#1a1a1a";
      const border = isUserMatch ? "var(--accent)" : "#333";

      phaseDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:${bg}; border: 1px solid ${border}; padding: 10px; border-radius: 8px; margin-bottom: 5px;">
                <div style="flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                    <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "var(--accent)" : "#fff"}">${normalizeTeamName(hName)}</span>
                    ${getTeamLogoHTML(hName)}
                </div>
                <div style="margin: 0 20px; color:var(--warning); font-size:1rem; min-width: 90px; text-align:center;">${scoreText}</div>
                <div style="flex:1; text-align:left; display:flex; align-items:center; justify-content:flex-start; gap:8px;">
                    ${getTeamLogoHTML(aName)}
                    <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "var(--accent)" : "#fff"}">${normalizeTeamName(aName)}</span>
                </div>
            </div>`;
    });
    container.appendChild(phaseDiv);
  }
}

export async function renderLeagueScorers() {
  const filter = document.getElementById("statsCompFilter")?.value || "total";
  const squadData = await Storage.getSquad();

  const renderTable = (tbodyId, type) => {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = "";

    let players = [...squadData];
    let stats = [];

    players.forEach((p) => {
      let val = 0;
      if (type === "total") {
        if (tbodyId === "leagueScorersBody") val = p.goals || 0;
        else if (tbodyId === "leagueAssistsBody") val = p.assists || 0;
        else if (tbodyId === "leagueRatingsBody") val = p.avgRating || 0;
      } else if (p.compStats && p.compStats[type]) {
        if (tbodyId === "leagueScorersBody") val = p.compStats[type].goals || 0;
        else if (tbodyId === "leagueAssistsBody")
          val = p.compStats[type].assists || 0;
        else if (tbodyId === "leagueRatingsBody")
          val = p.compStats[type].sumRatings / p.compStats[type].matches || 0;
      }
      if (val > 0) stats.push({ name: p.name, value: val });
    });

    stats.sort((a, b) => b.value - a.value);
    if (stats.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="padding: 20px; color: #666;">Sem dados para este filtro.</td></tr>`;
      return;
    }

    stats.forEach((s, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="text-align: center;">${i + 1}</td>
        <td style="text-align: left;">${s.name}</td>
        <td style="font-weight: bold; color: ${tbodyId === "leagueRatingsBody" ? "var(--warning)" : "var(--accent)"};">
            ${tbodyId === "leagueRatingsBody" ? s.value.toFixed(1) : s.value}
        </td>
      `;
      tbody.appendChild(row);
    });
  };

  renderTable("leagueScorersBody", filter);
  renderTable("leagueAssistsBody", filter);
  renderTable("leagueRatingsBody", filter);
}
