import { Storage } from "./storage.js";
import { getMatchDate, formatMatchDate } from "./league.js";
import { getTeamLogoHTML } from "./graphics.js";

export let fixtureViewMode = "month";
export let selectedRoundIndex = 0;
export let selectedMonth = 0;
export let currentViewDivision = 0;

export function updateLeagueState(updates) {
  if (updates.fixtureViewMode !== undefined) fixtureViewMode = updates.fixtureViewMode;
  if (updates.selectedRoundIndex !== undefined) selectedRoundIndex = updates.selectedRoundIndex;
  if (updates.selectedMonth !== undefined) selectedMonth = updates.selectedMonth;
  if (updates.currentViewDivision !== undefined) currentViewDivision = updates.currentViewDivision;
}


export async function renderLeagueData() {
  const data = await Storage.getLeagueData();
  const tbody = document.getElementById("leagueTableBody");
  const currentRoundEl = document.getElementById("leagueCurrentRound");
  const totalRoundsEl = document.getElementById("leagueTotalRounds");

  if (!data) {
    tbody.innerHTML = `<tr><td colspan="10" style="padding: 30px; color: #888;">Nenhuma liga ativa. Clique em "Reiniciar / Nova Liga" para começar!</td></tr>`;
    const fixturesContainer = document.getElementById("leagueMatchesList");
    if (fixturesContainer) {
      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Crie uma nova liga para ver o calendário.</div>`;
    }
    return;
  }
  
  if (!data.divisions && data.table) {
      data.divisions = [{ level: 1, name: "1ª Divisão", table: data.table, rounds: data.rounds }];
  }

  const divSelect = document.getElementById("leagueDivisionSelect");
  if (divSelect) {
      if (data.divisions.length > 1) {
          divSelect.style.display = "block";
          divSelect.innerHTML = data.divisions.map((d, i) => `<option value="${i}" ${i === currentViewDivision ? "selected" : ""}>${d.name}</option>`).join("");
      } else {
          divSelect.style.display = "none";
      }
  }

  const currentDiv = data.divisions[currentViewDivision] || data.divisions[0];
  const totalRounds = currentDiv.rounds.length;

  const nextSeasonBtn = document.getElementById("nextSeasonBtn");
  if (nextSeasonBtn) {
    if (data.currentRound > Math.max(...data.divisions.map(d => d.rounds.length)) && (!data.cup || data.cup.finished))
      nextSeasonBtn.style.display = "block";
    else nextSeasonBtn.style.display = "none";
  }

  currentRoundEl.innerText = data.currentRound;
  if (totalRoundsEl) {
    totalRoundsEl.innerText = totalRounds;
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
                    <span>${t.name}</span>
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
        selectedMonth: Math.floor((currentRoundIdx * 12) / totalRounds)
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
      const roundMonth = Math.floor((rIndex * 12) / totalRounds);
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

    const cupPhaseMap = { 0: 3, 1: 6, 2: 9, 3: 11 };
    if (data.cup && !data.cup.finished) {
      for (let phaseIdx = 0; phaseIdx < data.cup.phases.length; phaseIdx++) {
        if (cupPhaseMap[phaseIdx] === selectedMonth) {
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
    
    const contPhaseMap = { 0: 2, 1: 5, 2: 8, 3: 10 };
    if (data.continentalCup && !data.continentalCup.finished) {
      for (let phaseIdx = 0; phaseIdx < data.continentalCup.phases.length; phaseIdx++) {
        if (contPhaseMap[phaseIdx] === selectedMonth) {
          const phaseMatches = data.continentalCup.phases[phaseIdx];
          const userMatch = phaseMatches.find((m) => m.home === userTeamId || m.away === userTeamId);
          if (userMatch) {
            schedule.push({ type: "continental", index: phaseIdx, match: userMatch, title: `${data.continentalCup.name} - ${data.continentalCup.phaseNames[phaseIdx]}` });
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
          if (data.continentalCup.currentPhaseIndex === item.index && !match.played) {
            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
          } else if (match.played) {
            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
          }
        }

        const roundHeader = document.createElement("div");
        roundHeader.style.cssText =
          "margin-top: 15px; margin-bottom: 5px; color: var(--accent); font-weight: bold; font-size: 0.85rem; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; display: flex; justify-content: space-between;";
        const dateStr = formatMatchDate(item.dateNum);
        roundHeader.innerHTML = `<span>📅 ${dateStr} - ${item.title}</span> ${statusLabel}`;
        
        const getTeamNameInfo = (id) => {
            let t = teamData[id];
            if (t) return t.name;
            if (data.continentalCup && data.continentalCup.teams) {
                let c = data.continentalCup.teams.find(x => x.id === id);
                if (c) return c.name;
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
                        <span>${homeTeam.name}</span>
                        ${getTeamLogoHTML(homeTeam.name)}
                    </div>
                    <div class="fixture-score">
                        ${match.played ? `<strong>${match.homeScore}</strong> - <strong>${match.awayScore}</strong>` : "VS"}
                    </div>
                    <div class="fixture-team away" style="display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
                        ${getTeamLogoHTML(awayTeam.name)}
                        <span>${awayTeam.name}</span>
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
    container.innerHTML = "<div style='text-align:center; color:#888; padding:20px;'>Crie uma nova Liga para gerar a Copa Continental!</div>";
    return;
  }
  if (title) title.innerText = `🌍 ${data.continentalCup.name}`;
  container.innerHTML = "";
  
  const getTeamName = (id) => {
    let t = data.continentalCup.teams.find(x => x.id === id);
    if (t) return t.name;
    const flat = data.divisions ? data.divisions.flatMap(d => d.table) : [];
    t = flat.find(x => x.id === id);
    return t ? t.name : "Desconhecido";
  };

  if (data.continentalCup.finished) {
    const winnerName = getTeamName(data.continentalCup.winner);
    container.innerHTML = `<h3 style='color:var(--warning); text-align:center; margin-bottom:20px;'>🏆 O ${winnerName} é o Campeão da ${data.continentalCup.name}!</h3>`;
  }

  for (let i = data.continentalCup.phases.length - 1; i >= 0; i--) {
    const phaseMatches = data.continentalCup.phases[i];
    const phaseName = data.continentalCup.phaseNames[i];

    const phaseDiv = document.createElement("div");
    phaseDiv.style.marginBottom = "15px";
    phaseDiv.innerHTML = `<h4 style="color:#00aaff; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">${phaseName}</h4>`;

    phaseMatches.forEach((m) => {
      const hName = getTeamName(m.home);
      const aName = getTeamName(m.away);
      let scoreText = "VS";
      if (m.played) {
        if (m.homePen !== null && m.homePen !== undefined) scoreText = `<strong>${m.homeScore}</strong> (${m.homePen}) - (${m.awayPen}) <strong>${m.awayScore}</strong>`;
        else scoreText = `<strong>${m.homeScore}</strong> - <strong>${m.awayScore}</strong>`;
      }
      const isUserMatch = (m.home === (data.table ? data.table.find(t=>t.isUser)?.id : "meu_time")) || (m.away === (data.table ? data.table.find(t=>t.isUser)?.id : "meu_time"));
      const bg = isUserMatch ? "rgba(0, 255, 136, 0.1)" : "#1a1a1a";
      const border = isUserMatch ? "#00aaff" : "#333";

      phaseDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:${bg}; border: 1px solid ${border}; padding: 10px; border-radius: 8px; margin-bottom: 5px;">
                <div style="flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                    <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "#00aaff" : "#fff"}">${hName}</span>
                    ${getTeamLogoHTML(hName)}
                </div>
                <div style="margin: 0 20px; color:var(--warning); font-size:1rem; min-width: 90px; text-align:center;">${scoreText}</div>
                <div style="flex:1; text-align:left; display:flex; align-items:center; justify-content:flex-start; gap:8px;">
                    ${getTeamLogoHTML(aName)}
                    <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "#00aaff" : "#fff"}">${aName}</span>
                </div>
            </div>`;
    });
    container.appendChild(phaseDiv);
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
  sortOrder = "desc"
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
    return sortOrder === "desc" ? b[valueKey] - a[valueKey] : a[valueKey] - b[valueKey];
  });

  const topStats = statsArray.slice(0, 20);
  const userTeamName = currentDiv?.table.find((t) => t.isUser)?.name;

  tbody.innerHTML = "";
  topStats.forEach((player, index) => {
    const isUserPlayer = player.team === userTeamName;
    const highlightStyle = isUserPlayer ? "background: rgba(0, 255, 136, 0.1);" : "";
    
    let displayColor = valueColor;
    if (isRating) {
      const val = player[valueKey];
      displayColor = val >= 8.5 ? "var(--rating-top)" : val >= 7.5 ? "var(--rating-high)" : val >= 6.0 ? "var(--rating-mid)" : val >= 5.0 ? "var(--rating-low)" : "var(--rating-bad)";
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
    item.style.cssText = "background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;";
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
    container.innerHTML = "<div style='text-align:center; color:#888; padding:20px;'>Crie uma nova Liga para gerar a Copa Nacional!</div>";
    return;
  }
  container.innerHTML = "";
  if (data.cup.finished) {
    const flatTeams = data.divisions.flatMap(d => d.table);
    const winnerTeam = flatTeams.find((t) => t.id === data.cup.winner);
    container.innerHTML = `<h3 style='color:var(--warning); text-align:center; margin-bottom:20px;'>🏆 O ${winnerTeam?.name} é o Campeão da Copa!</h3>`;
  }
  for (let i = data.cup.phases.length - 1; i >= 0; i--) {
    const phaseMatches = data.cup.phases[i];
    const phaseName = data.cup.phaseNames[i];
    const flatTeams = data.divisions.flatMap(d => d.table);
    const phaseDiv = document.createElement("div");
    phaseDiv.style.marginBottom = "15px";
    phaseDiv.innerHTML = `<h4 style="color:var(--accent); margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">${phaseName}</h4>`;
    phaseMatches.forEach((m) => {
      const hTeam = flatTeams.find((t) => t.id === m.home) || { name: "???" };
      const aTeam = flatTeams.find((t) => t.id === m.away) || { name: "???" };
      let scoreText = "VS";
      if (m.played) {
        if (m.homePen !== null && m.homePen !== undefined)
          scoreText = `<strong>${m.homeScore}</strong> (${m.homePen}) - (${m.awayPen}) <strong>${m.awayScore}</strong>`;
        else scoreText = `<strong>${m.homeScore}</strong> - <strong>${m.awayScore}</strong>`;
      }
      const isUserMatch = hTeam.isUser || aTeam.isUser;
      const bg = isUserMatch ? "rgba(0, 255, 136, 0.1)" : "#1a1a1a";
      const border = isUserMatch ? "var(--accent)" : "#333";
      phaseDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:${bg}; border: 1px solid ${border}; padding: 10px; border-radius: 8px; margin-bottom: 5px;">
                <div style="flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
                    <span style="font-weight:${hTeam.isUser ? "bold" : "normal"}; color:${hTeam.isUser ? "var(--accent)" : "#fff"}">${hTeam.name}</span>
                    ${getTeamLogoHTML(hTeam.name)}
                </div>
                <div style="margin: 0 20px; color:var(--warning); font-size:1rem; min-width: 90px; text-align:center;">${scoreText}</div>
                <div style="flex:1; text-align:left; display:flex; align-items:center; justify-content:flex-start; gap:8px;">
                    ${getTeamLogoHTML(aTeam.name)}
                    <span style="font-weight:${aTeam.isUser ? "bold" : "normal"}; color:${aTeam.isUser ? "var(--accent)" : "#fff"}">${aTeam.name}</span>
                </div>
            </div>`;
    });
    container.appendChild(phaseDiv);
  }
}

export async function renderLeagueScorers() {
  await renderGenericStatTable({
    tbodyId: "leagueScorersBody",
    dataKey: "scorers",
    valueKey: "goals",
    valueLabel: "Gols",
    valueColor: "var(--accent)",
    emptyMessage: "Nenhum gol marcado nesta liga ainda."
  });
}

export async function renderLeagueAssists() {
  await renderGenericStatTable({
    tbodyId: "leagueAssistsBody",
    dataKey: "assists",
    valueKey: "assists",
    valueLabel: "Assis.",
    valueColor: "#00aaff",
    emptyMessage: "Nenhuma assistência registrada nesta liga ainda."
  });
}

export async function renderLeagueRatings() {
  await renderGenericStatTable({
    tbodyId: "leagueRatingsBody",
    dataKey: "ratings",
    valueKey: "avgRating",
    valueLabel: "Nota",
    valueColor: "var(--warning)",
    emptyMessage: "Nenhuma nota registrada nesta liga ainda.",
    isRating: true,
    formatValue: (val) => val.toFixed(1)
  });
}
