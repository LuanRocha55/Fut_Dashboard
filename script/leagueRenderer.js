--- /dev/null
+++ b/c:\Users\luan_\Documents\GitHub\Fut_Dashboard\script\leagueRenderer.js
@@ -0,0 +1,507 @@
+import { Storage } from "./storage.js";
+import { getMatchDate, formatMatchDate } from "./league.js";
+
+export let fixtureViewMode = "month";
+export let selectedRoundIndex = 0;
+export let selectedMonth = 0;
+export let currentViewDivision = 0;
+
+export function updateLeagueState(updates) {
+  if (updates.fixtureViewMode !== undefined) fixtureViewMode = updates.fixtureViewMode;
+  if (updates.selectedRoundIndex !== undefined) selectedRoundIndex = updates.selectedRoundIndex;
+  if (updates.selectedMonth !== undefined) selectedMonth = updates.selectedMonth;
+  if (updates.currentViewDivision !== undefined) currentViewDivision = updates.currentViewDivision;
+}
+
+export function getTeamLogoHTML(teamName) {
+  const normalized = teamName
+    .toLowerCase()
+    .normalize("NFD")
+    .replace(/[\u0300-\u036f]/g, "")
+    .trim();
+
+  const teamColors = {
+    cruzeiro: { c: "#003aa6", b: "#005ce6" },
+    internacional: { c: "#cc0000", b: "#ff3333" },
+    gremio: { c: "#0d80bf", b: "#1a9cf0" },
+    "atletico mineiro": { c: "#111111", b: "#444444" },
+    flamengo: { c: "#c62828", b: "#ff5252" },
+    fluminense: { c: "#8a1538", b: "#b81c4a" },
+    botafogo: { c: "#111111", b: "#444444" },
+    "athletico-pr": { c: "#c8102e", b: "#f01438" },
+    fortaleza: { c: "#002868", b: "#003c9c" },
+    bahia: { c: "#004c97", b: "#0066cc" },
+    vitoria: { c: "#cc0000", b: "#ff3333" },
+    coritiba: { c: "#005f31", b: "#008c48" },
+    goias: { c: "#006e33", b: "#009947" },
+    criciuma: { c: "#d1ab00", b: "#ffdb29" },
+    "sport recife": { c: "#cc0000", b: "#ff3333" },
+    ceara: { c: "#111111", b: "#444444" },
+    juventude: { c: "#006437", b: "#009954" },
+    bragantino: { c: "#111111", b: "#444444" },
+    santos: { c: "#111111", b: "#444444" },
+    "ponte preta": { c: "#111111", b: "#444444" },
+    "vasco da gama": { c: "#111111", b: "#444444" },
+    palmeiras: { c: "#006437", b: "#009954" },
+    "sao paulo": { c: "#c62828", b: "#ff5252" },
+    corinthians: { c: "#111111", b: "#444444" },
+    "real madrid": { c: "#00529f", b: "#0073e0" },
+    barcelona: { c: "#004d98", b: "#a50044" },
+    "manchester city": { c: "#6cabdd", b: "#98cbf5" },
+    "bayern de munique": { c: "#dc052d", b: "#ff1c47" },
+    psg: { c: "#004170", b: "#005a9c" },
+    arsenal: { c: "#ef0107", b: "#ff3338" },
+    liverpool: { c: "#c8102e", b: "#f01438" },
+    chelsea: { c: "#034694", b: "#0563d1" },
+    tottenham: { c: "#132257", b: "#1d3485" },
+    juventus: { c: "#111111", b: "#444444" },
+    "inter milan": { c: "#00519e", b: "#0072de" },
+    "ac milan": { c: "#c8102e", b: "#f01438" },
+    "bayer leverkusen": { c: "#e32221", b: "#ff4746" },
+    "borussia dortmund": { c: "#e6c600", b: "#ffe233" },
+    "rb leipzig": { c: "#dd013f", b: "#ff1c5d" },
+    "aston villa": { c: "#670e36", b: "#94144e" },
+    newcastle: { c: "#111111", b: "#444444" },
+    "west ham": { c: "#7a263a", b: "#a83550" },
+    brighton: { c: "#0057b8", b: "#007bff" },
+    napoli: { c: "#00a9e0", b: "#33c4ff" },
+    roma: { c: "#8e1f2f", b: "#bc293e" },
+    atalanta: { c: "#2651a8", b: "#3b73e6" },
+    lazio: { c: "#87ceeb", b: "#b5e5ff" },
+    fiorentina: { c: "#482e92", b: "#6a45cf" },
+  };
+
+  let color, borderCol;
+  if (teamColors[normalized]) {
+    color = teamColors[normalized].c;
+    borderCol = teamColors[normalized].b;
+  } else {
+    let hash = 0;
+    for (let i = 0; i < teamName.length; i++) {
+      hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
+    }
+    const hue = Math.abs(hash) % 360;
+    color = `hsl(${hue}, 60%, 40%)`;
+    borderCol = `hsl(, 70%, 60%)`;
+  }
+
+  const words = teamName.trim().split(/\s+/);
+  const initials = (
+    words.length > 1
+      ? words[0][0] + words[words.length - 1][0]
+      : teamName.substring(0, 2)
+  ).toUpperCase();
+
+  return `<div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, , #111); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 900; border: 1px solid ; box-shadow: 0 2px 4px rgba(0,0,0,0.5); flex-shrink: 0;" title=""></div>`;
+}
+
+export async function renderLeagueData() {
+  const data = await Storage.getLeagueData();
+  const tbody = document.getElementById("leagueTableBody");
+  const currentRoundEl = document.getElementById("leagueCurrentRound");
+  const totalRoundsEl = document.getElementById("leagueTotalRounds");
+
+  if (!data) {
+    tbody.innerHTML = `<tr><td colspan="10" style="padding: 30px; color: #888;">Nenhuma liga ativa. Clique em "Reiniciar / Nova Liga" para começar!</td></tr>`;
+    const fixturesContainer = document.getElementById("leagueMatchesList");
+    if (fixturesContainer) {
+      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Crie uma nova liga para ver o calendário.</div>`;
+    }
+    return;
+  }
+  
+  if (!data.divisions && data.table) {
+      data.divisions = [{ level: 1, name: "1ª Divisão", table: data.table, rounds: data.rounds }];
+  }
+
+  const divSelect = document.getElementById("leagueDivisionSelect");
+  if (divSelect) {
+      if (data.divisions.length > 1) {
+          divSelect.style.display = "block";
+          divSelect.innerHTML = data.divisions.map((d, i) => `<option value="" ${i === currentViewDivision ? "selected" : ""}>${d.name}</option>`).join("");
+      } else {
+          divSelect.style.display = "none";
+      }
+  }
+
+  const currentDiv = data.divisions[currentViewDivision] || data.divisions[0];
+  const totalRounds = currentDiv.rounds.length;
+
+  const nextSeasonBtn = document.getElementById("nextSeasonBtn");
+  if (nextSeasonBtn) {
+    if (data.currentRound > Math.max(...data.divisions.map(d => d.rounds.length)) && (!data.cup || data.cup.finished))
+      nextSeasonBtn.style.display = "block";
+    else nextSeasonBtn.style.display = "none";
+  }
+
+  currentRoundEl.innerText = data.currentRound;
+  if (totalRoundsEl) {
+    totalRoundsEl.innerText = totalRounds;
+  }
+
+  currentDiv.table.sort((a, b) => {
+    if (b.pts !== a.pts) return b.pts - a.pts;
+    if (b.w !== a.w) return b.w - a.w;
+    if (b.gd !== a.gd) return b.gd - a.gd;
+    return b.gf - a.gf;
+  });
+
+  tbody.innerHTML = "";
+  const frag = document.createDocumentFragment();
+  currentDiv.table.forEach((t, i) => {
+    const tr = document.createElement("tr");
+    if (t.isUser) tr.style.background = "rgba(0, 255, 136, 0.1)";
+    tr.innerHTML = `
+            <td style="font-weight: bold; color: ${i < 4 ? "var(--rating-top)" : i > 15 ? "var(--danger)" : "#aaa"};">${i + 1}º</td>
+            <td style="text-align: left;">
+                <div style="display: flex; align-items: center; gap: 8px; font-weight: ${t.isUser ? "bold" : "normal"}; color: ${t.isUser ? "var(--accent)" : "#fff"};">
+                    ${getTeamLogoHTML(t.name)}
+                    <span>${t.name}</span>
+                </div>
+            </td>
+            <td style="font-weight: 900; color: var(--warning);">${t.pts}</td>
+            <td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td>
+            <td style="font-weight: bold;">${t.gd > 0 ? "+" + t.gd : t.gd}</td>
+        `;
+    frag.appendChild(tr);
+  });
+  tbody.appendChild(frag);
+
+  await renderFixtures(true);
+}
+
+export async function renderFixtures(forceUpdateParams = false) {
+  const data = await Storage.getLeagueData();
+  const fixturesContainer = document.getElementById("leagueMatchesList");
+  const monthSelect = document.getElementById("fixtureMonthSelect");
+  const currentRoundDisplay = document.getElementById("currentRoundDisplay");
+  const currentDiv = data.divisions[currentViewDivision] || data.divisions[0];
+
+  if (!data || !currentDiv.rounds || currentDiv.rounds.length === 0) {
+    fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhuma rodada encontrada. Crie uma nova liga para gerar o calendário.</div>`;
+    return;
+  }
+
+  const totalRounds = currentDiv.rounds.length;
+  const currentRoundIdx = Math.min(data.currentRound - 1, totalRounds - 1);
+
+  if (forceUpdateParams || typeof selectedRoundIndex === "undefined") {
+    updateLeagueState({
+        selectedRoundIndex: currentRoundIdx,
+        selectedMonth: Math.floor((currentRoundIdx * 12) / totalRounds)
+    });
+    if (monthSelect) monthSelect.value = selectedMonth;
+  }
+
+  fixturesContainer.innerHTML = "";
+
+  const teamData = currentDiv.table.reduce((acc, team) => {
+    acc[team.id] = team;
+    return acc;
+  }, {});
+
+  let matchesFound = false;
+
+  if (fixtureViewMode === "month") {
+    const userTeamId = currentDiv.table.find((t) => t.isUser)?.id;
+    const schedule = [];
+
+    currentDiv.rounds.forEach((round, rIndex) => {
+      const roundMonth = Math.floor((rIndex * 12) / totalRounds);
+      if (roundMonth === selectedMonth) {
+        const userMatch = round.find(
+          (m) => m.home === userTeamId || m.away === userTeamId,
+        );
+        if (userMatch) {
+          schedule.push({
+            type: "league",
+            index: rIndex,
+            match: userMatch,
+            title: `Rodada ${rIndex + 1}`,
+          });
+        }
+      }
+    });
+
+    const cupPhaseMap = { 0: 3, 1: 6, 2: 9, 3: 11 };
+    if (data.cup && !data.cup.finished) {
+      for (let phaseIdx = 0; phaseIdx < data.cup.phases.length; phaseIdx++) {
+        if (cupPhaseMap[phaseIdx] === selectedMonth) {
+          const phaseMatches = data.cup.phases[phaseIdx];
+          const userMatch = phaseMatches.find(
+            (m) => m.home === userTeamId || m.away === userTeamId,
+          );
+          if (userMatch) {
+            schedule.push({
+              type: "cup",
+              index: phaseIdx,
+              match: userMatch,
+              title: `Copa - ${data.cup.phaseNames[phaseIdx]}`,
+            });
+          }
+        }
+      }
+    }
+    
+    const contPhaseMap = { 0: 2, 1: 5, 2: 8, 3: 10 };
+    if (data.continentalCup && !data.continentalCup.finished) {
+      for (let phaseIdx = 0; phaseIdx < data.continentalCup.phases.length; phaseIdx++) {
+        if (contPhaseMap[phaseIdx] === selectedMonth) {
+          const phaseMatches = data.continentalCup.phases[phaseIdx];
+          const userMatch = phaseMatches.find((m) => m.home === userTeamId || m.away === userTeamId);
+          if (userMatch) {
+            schedule.push({ type: "continental", index: phaseIdx, match: userMatch, title: `${data.continentalCup.name} - ${data.continentalCup.phaseNames[phaseIdx]}` });
+          }
+        }
+      }
+    }
+
+    schedule.forEach((item) => {
+      item.dateNum = getMatchDate(item.type, item.index, totalRounds);
+    });
+    schedule.sort((a, b) => a.dateNum - b.dateNum);
+
+    if (schedule.length > 0) {
+      const frag = document.createDocumentFragment();
+      matchesFound = true;
+      schedule.forEach((item) => {
+        const match = item.match;
+        let statusLabel = "";
+
+        if (item.type === "league") {
+          if (data.currentRound - 1 === item.index) {
+            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
+          } else if (data.currentRound - 1 > item.index) {
+            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
+          }
+        } else {
+          if (data.cup.currentPhaseIndex === item.index && !match.played) {
+            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
+          } else if (match.played) {
+            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
+          }
+        } else if (item.type === "continental") {
+          if (data.continentalCup.currentPhaseIndex === item.index && !match.played) {
+            statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.7rem;">PRÓXIMO JOGO</span>`;
+          } else if (match.played) {
+            statusLabel = `<span style="float: right; color: #888; font-size: 0.7rem;">FINALIZADA</span>`;
+          }
+        }
+
+        const roundHeader = document.createElement("div");
+        roundHeader.style.cssText =
+          "margin-top: 15px; margin-bottom: 5px; color: var(--accent); font-weight: bold; font-size: 0.85rem; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; display: flex; justify-content: space-between;";
+        const dateStr = formatMatchDate(item.dateNum);
+        roundHeader.innerHTML = `<span>📅  - ${item.title}</span> `;
+        
+        const getTeamNameInfo = (id) => {
+            let t = teamData[id];
+            if (t) return t.name;
+            if (data.continentalCup && data.continentalCup.teams) {
+                let c = data.continentalCup.teams.find(x => x.id === id);
+                if (c) return c.name;
+            }
+            return "Desconhecido";
+        };
+
+        const homeTeamName = getTeamNameInfo(match.home);
+        const awayTeamName = getTeamNameInfo(match.away);
+
+        const matchEl = document.createElement("div");
+        matchEl.className = "fixture-item user-match";
+        if (item.type === "cup") matchEl.style.borderColor = "var(--warning)";
+        if (item.type === "continental") matchEl.style.borderColor = "#00aaff";
+
+        let scoreHtml = match.played
+          ? `<strong>${match.homeScore}</strong> - <strong>${match.awayScore}</strong>`
+          : "VS";
+        if (
+          match.played &&
+          match.homePen !== null &&
+          match.homePen !== undefined
+        ) {
+          scoreHtml = `<strong>${match.homeScore}</strong> (${match.homePen}) - (${match.awayPen}) <strong>${match.awayScore}</strong>`;
+        }
+
+        matchEl.innerHTML = `
+                      <div class="fixture-team home" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
+                          <span></span>
+                          ${getTeamLogoHTML(homeTeamName)}
+                      </div>
+                      <div class="fixture-score">
+                          
+                      </div>
+                      <div class="fixture-team away" style="display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
+                          ${getTeamLogoHTML(awayTeamName)}
+                          <span></span>
+                      </div>
+                  `;
+        frag.appendChild(roundHeader);
+        frag.appendChild(matchEl);
+      });
+      fixturesContainer.appendChild(frag);
+    }
+
+    if (!matchesFound) {
+      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhum jogo do seu time programado para este mês.</div>`;
+    }
+  } else {
+    if (currentRoundDisplay)
+      currentRoundDisplay.innerText = `Rodada ${selectedRoundIndex + 1}`;
+
+    const round = currentDiv.rounds[selectedRoundIndex];
+    if (round) {
+      matchesFound = true;
+      const frag = document.createDocumentFragment();
+
+      let statusLabel = "";
+      if (data.currentRound - 1 === selectedRoundIndex) {
+        statusLabel = `<span style="float: right; color: var(--warning); font-size: 0.85rem; font-weight: bold;">RODADA ATUAL</span>`;
+      } else if (data.currentRound - 1 > selectedRoundIndex) {
+        statusLabel = `<span style="float: right; color: #888; font-size: 0.85rem; font-weight: bold;">FINALIZADA</span>`;
+      }
+
+      const header = document.createElement("div");
+      header.style.cssText =
+        "margin-top: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
      header.innerHTML = `<span></span>${statusLabel}`;
+      if (statusLabel) frag.appendChild(header);
+
+      round.forEach((match) => {
+        const homeTeam = teamData[match.home] || { name: "Time Desconhecido" };
+        const awayTeam = teamData[match.away] || { name: "Time Desconhecido" };
+
+        const matchEl = document.createElement("div");
+        matchEl.className = "fixture-item";
+        if (homeTeam.isUser || awayTeam.isUser) {
+          matchEl.classList.add("user-match");
+        }
+
+        matchEl.innerHTML = `
+                    <div class="fixture-team home" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
+                        <span>${homeTeam.name}</span>
+                        ${getTeamLogoHTML(homeTeam.name)}
+                    </div>
+                    <div class="fixture-score">
+                        ${match.played ? `<strong>${match.homeScore}</strong> - <strong>${match.awayScore}</strong>` : "VS"}
+                    </div>
+                    <div class="fixture-team away" style="display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
+                        ${getTeamLogoHTML(awayTeam.name)}
+                        <span>${awayTeam.name}</span>
+                    </div>
+                `;
+        frag.appendChild(matchEl);
+      });
+      fixturesContainer.appendChild(frag);
+    }
+
+    if (!matchesFound) {
+      fixturesContainer.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Rodada não encontrada.</div>`;
+    }
+  }
+}
+
+export async function renderContinental() {
+  const data = await Storage.getLeagueData();
+  const container = document.getElementById("continentalBracket");
+  const title = document.getElementById("continentalTitle");
+  if (!data || !data.continentalCup) {
+    container.innerHTML = "<div style='text-align:center; color:#888; padding:20px;'>Crie uma nova Liga para gerar a Copa Continental!</div>";
+    return;
+  }
+  if (title) title.innerText = `🌍 ${data.continentalCup.name}`;
+  container.innerHTML = "";
+  
+  const getTeamName = (id) => {
+    let t = data.continentalCup.teams.find(x => x.id === id);
+    if (t) return t.name;
+    const flat = data.divisions ? data.divisions.flatMap(d => d.table) : [];
+    t = flat.find(x => x.id === id);
+    return t ? t.name : "Desconhecido";
+  };
+
+  if (data.continentalCup.finished) {
+    const winnerName = getTeamName(data.continentalCup.winner);
+    container.innerHTML = `<h3 style='color:var(--warning); text-align:center; margin-bottom:20px;'>🏆 O  é o Campeão da ${data.continentalCup.name}!</h3>`;
+  }
+
+  for (let i = data.continentalCup.phases.length - 1; i >= 0; i--) {
+    const phaseMatches = data.continentalCup.phases[i];
+    const phaseName = data.continentalCup.phaseNames[i];
+
+    const phaseDiv = document.createElement("div");
+    phaseDiv.style.marginBottom = "15px";
+    phaseDiv.innerHTML = `<h4 style="color:#00aaff; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;"></h4>`;
+
+    phaseMatches.forEach((m) => {
+      const hName = getTeamName(m.home);
+      const aName = getTeamName(m.away);
+      let scoreText = "VS";
+      if (m.played) {
+        if (m.homePen !== null && m.homePen !== undefined) scoreText = `<strong>${m.homeScore}</strong> (${m.homePen}) - (${m.awayPen}) <strong>${m.awayScore}</strong>`;
+        else scoreText = `<strong>${m.homeScore}</strong> - <strong>${m.awayScore}</strong>`;
+      }
+      const isUserMatch = (m.home === (data.table ? data.table.find(t=>t.isUser)?.id : "meu_time")) || (m.away === (data.table ? data.table.find(t=>t.isUser)?.id : "meu_time"));
+      const bg = isUserMatch ? "rgba(0, 255, 136, 0.1)" : "#1a1a1a";
+      const border = isUserMatch ? "#00aaff" : "#333";
+
+      phaseDiv.innerHTML += `
+            <div style="display:flex; justify-content:space-between; align-items:center; background:; border: 1px solid ; padding: 10px; border-radius: 8px; margin-bottom: 5px;">
+                <div style="flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
+                    <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "#00aaff" : "#fff"}"></span>
+                    ${getTeamLogoHTML(hName)}
+                </div>
+                <div style="margin: 0 20px; color:var(--warning); font-size:1rem; min-width: 90px; text-align:center;"></div>
+                <div style="flex:1; text-align:left; display:flex; align-items:center; justify-content:flex-start; gap:8px;">
+                    ${getTeamLogoHTML(aName)}
+                    <span style="font-weight:${isUserMatch ? "bold" : "normal"}; color:${isUserMatch ? "#00aaff" : "#fff"}"></span>
+                </div>
+            </div>`;
+    });
+    container.appendChild(phaseDiv);
+  }
+}
+
+export async function renderLeagueScorers() {
+  const data = await Storage.getLeagueData();
+  const tbody = document.getElementById("leagueScorersBody");
+  const currentDiv = data.divisions ? data.divisions[currentViewDivision] : null;
+
+  if (!data || !data.scorers || Object.keys(data.scorers).length === 0) {
+    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; color: #888;">Nenhum gol marcado nesta liga ainda.</td></tr>`;
+    return;
+  }
+
+  const scorersArray = Object.values(data.scorers).sort((a, b) => b.goals - a.goals);
+  const topScorers = scorersArray.slice(0, 20); 
+
+  const userTeam = currentDiv ? currentDiv.table.find((t) => t.isUser) : null;
+  const userTeamName = userTeam ? userTeam.name : null;
+
+  tbody.innerHTML = "";
+  topScorers.forEach((scorer, index) => {
+    const isUserScorer = scorer.team === userTeamName;
+    const highlightStyle = isUserScorer ? "background: rgba(0, 255, 136, 0.1);" : "";
+    const tr = document.createElement("tr");
+    tr.style.cssText = highlightStyle;
+    tr.innerHTML = `
+            <td style="font-weight: bold; color: ${index < 3 ? "var(--warning)" : "#aaa"};">${index + 1}º</td>
+            <td style="text-align: left; font-weight: bold; color: ${isUserScorer ? "var(--accent)" : "#fff"};">
+                ${scorer.name}
+                <div style="font-size: 0.65rem; color: #888; font-weight: normal; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
+                    ${getTeamLogoHTML(scorer.team)}
+                    <span>${scorer.team}</span>
+                </div>
+            </td>
+            <td style="font-weight: 900; color: var(--accent); font-size: 1.1rem;">${scorer.goals}</td>
+        `;
+    tbody.appendChild(tr);
+  });
+}
+
+export async function renderSeasonHistory() {
+  const historyList = document.getElementById("seasonHistoryList");
+  if (!historyList) return;
+  const history = (await Storage.getSeasonHistory()) || [];
+  if (history.length === 0) {
+    historyList.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Nenhuma temporada finalizada ainda. Avance de temporada para gerar o histórico.</div>`;
+    return;
+  }
+  historyList.innerHTML = "";
+  const reversed = [...history].reverse();
+  reversed.forEach((season) => {
+    const item = document.createElement("div");
+    item.style.cssText = "background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;";
+    item.innerHTML = `
+            <div>
+                <h4 style="color: var(--accent); margin: 0 0 10px 0;">Temporada ${season.season}</h4>
+                <div style="font-size: 0.85rem; color: #ccc;">
+                    <div><strong style="color: var(--warning);">Campeão da Liga:</strong> ${season.leagueWinner}</div>
+                    <div style="margin-top: 5px;"><strong style="color: var(--warning);">Campeão da Copa:</strong> ${season.cupWinner}</div>
+                </div>
+            </div>
+            <div style="text-align: right; font-size: 0.85rem; color: #ccc;">
+                <div style="color: #00aaff; margin-bottom: 5px;"><strong>Artilheiro:</strong></div>
+                <div style="font-weight: bold; font-size: 1.1rem;">${season.topScorer}</div>
+            </div>
+        `;
+    historyList.appendChild(item);
+  });
+}
+
+export async function renderCup() {
+  const data = await Storage.getLeagueData();
+  const container = document.getElementById("cupBracket");
+  if (!data || !data.cup) {
+    container.innerHTML = "<div style='text-align:center; color:#888; padding:20px;'>Crie uma nova Liga para gerar a Copa Nacional!</div>";
+    return;
+  }
+  container.innerHTML = "";
+  if (data.cup.finished) {
+    const flatTeams = data.divisions.flatMap(d => d.table);
+    const winnerTeam = flatTeams.find((t) => t.id === data.cup.winner);
+    container.innerHTML = `<h3 style='color:var(--warning); text-align:center; margin-bottom:20px;'>🏆 O ${winnerTeam?.name} é o Campeão da Copa!</h3>`;
+  }
+  for (let i = data.cup.phases.length - 1; i >= 0; i--) {
+    const phaseMatches = data.cup.phases[i];
+    const phaseName = data.cup.phaseNames[i];
+    const flatTeams = data.divisions.flatMap(d => d.table);
+    const phaseDiv = document.createElement("div");
+    phaseDiv.style.marginBottom = "15px";
    phaseDiv.innerHTML = `<h4 style="color:var(--accent); margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">${phaseName}</h4>`;
+    phaseMatches.forEach((m) => {
+      const hTeam = flatTeams.find((t) => t.id === m.home) || { name: "???" };
+      const aTeam = flatTeams.find((t) => t.id === m.away) || { name: "???" };
+      let scoreText = "VS";
+      if (m.played) {
+        if (m.homePen !== null && m.homePen !== undefined)
+          scoreText = `<strong>${m.homeScore}</strong> (${m.homePen}) - (${m.awayPen}) <strong>${m.awayScore}</strong>`;
+        else scoreText = `<strong>${m.homeScore}</strong> - <strong>${m.awayScore}</strong>`;
+      }
+      const isUserMatch = hTeam.isUser || aTeam.isUser;
+      const bg = isUserMatch ? "rgba(0, 255, 136, 0.1)" : "#1a1a1a";
+      const border = isUserMatch ? "var(--accent)" : "#333";
+      phaseDiv.innerHTML += `
+            <div style="display:flex; justify-content:space-between; align-items:center; background:; border: 1px solid ; padding: 10px; border-radius: 8px; margin-bottom: 5px;">
+                <div style="flex:1; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
+                    <span style="font-weight:${hTeam.isUser ? "bold" : "normal"}; color:${hTeam.isUser ? "var(--accent)" : "#fff"}">${hTeam.name}</span>
+                    ${getTeamLogoHTML(hTeam.name)}
+                </div>
+                <div style="margin: 0 20px; color:var(--warning); font-size:1rem; min-width: 90px; text-align:center;"></div>
+                <div style="flex:1; text-align:left; display:flex; align-items:center; justify-content:flex-start; gap:8px;">
+                    ${getTeamLogoHTML(aTeam.name)}
+                    <span style="font-weight:${aTeam.isUser ? "bold" : "normal"}; color:${aTeam.isUser ? "var(--accent)" : "#fff"}">${aTeam.name}</span>
+                </div>
+            </div>`;
+    });
+    container.appendChild(phaseDiv);
+  }
+}
+
+export async function renderLeagueAssists() {
+  const data = await Storage.getLeagueData();
+  const tbody = document.getElementById("leagueAssistsBody");
+  const currentDiv = data.divisions ? data.divisions[currentViewDivision] : null;
+  if (!data || !data.assists || Object.keys(data.assists).length === 0) {
+    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; color: #888;">Nenhuma assistência registrada nesta liga ainda.</td></tr>`;
+    return;
+  }
+  const assistsArray = Object.values(data.assists).sort((a, b) => b.assists - a.assists);
+  const topAssists = assistsArray.slice(0, 20);
+  const userTeam = currentDiv ? currentDiv.table.find((t) => t.isUser) : null;
+  const userTeamName = userTeam ? userTeam.name : null;
+  tbody.innerHTML = "";
+  topAssists.forEach((assister, index) => {
+    const isUserAssister = assister.team === userTeamName;
+    const highlightStyle = isUserAssister ? "background: rgba(0, 255, 136, 0.1);" : "";
+    const tr = document.createElement("tr");
+    tr.style.cssText = highlightStyle;
+    tr.innerHTML = `
+            <td style="font-weight: bold; color: ${index < 3 ? "var(--warning)" : "#aaa"};">${index + 1}º</td>
+            <td style="text-align: left; font-weight: bold; color: ${isUserAssister ? "var(--accent)" : "#fff"};">
+                ${assister.name}
+                <div style="font-size: 0.65rem; color: #888; font-weight: normal; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
+                    ${getTeamLogoHTML(assister.team)}
+                    <span>${assister.team}</span>
+                </div>
+            </td>
+            <td style="font-weight: 900; color: #00aaff; font-size: 1.1rem;">${assister.assists}</td>
+        `;
+    tbody.appendChild(tr);
+  });
+}
+
+export async function renderLeagueRatings() {
+  const data = await Storage.getLeagueData();
+  const tbody = document.getElementById("leagueRatingsBody");
+  const currentDiv = data.divisions ? data.divisions[currentViewDivision] : null;
+  if (!data || !data.ratings || Object.keys(data.ratings).length === 0) {
+    tbody.innerHTML = `<tr><td colspan="3" style="padding: 30px; color: #888;">Nenhuma nota registrada nesta liga ainda.</td></tr>`;
+    return;
+  }
+  const ratingsArray = Object.values(data.ratings)
+    .filter((r) => r.matches > 0)
+    .map((r) => ({ ...r, avgRating: r.sumRatings / r.matches }))
+    .sort((a, b) => b.avgRating - a.avgRating);
+  const topRatings = ratingsArray.slice(0, 20);
+  const userTeam = currentDiv ? currentDiv.table.find((t) => t.isUser) : null;
+  const userTeamName = userTeam ? userTeam.name : null;
+  tbody.innerHTML = "";
+  topRatings.forEach((player, index) => {
+    const isUserPlayer = player.team === userTeamName;
+    const highlightStyle = isUserPlayer ? "background: rgba(0, 255, 136, 0.1);" : "";
+    const rColor = player.avgRating >= 8.5 ? "var(--rating-top)" : player.avgRating >= 7.5 ? "var(--rating-high)" : player.avgRating >= 6.0 ? "var(--rating-mid)" : player.avgRating >= 5.0 ? "var(--rating-low)" : "var(--rating-bad)";
+    const tr = document.createElement("tr");
+    tr.style.cssText = highlightStyle;
+    tr.innerHTML = `
+            <td style="font-weight: bold; color: ${index < 3 ? "var(--warning)" : "#aaa"};">${index + 1}º</td>
+            <td style="text-align: left; font-weight: bold; color: ${isUserPlayer ? "var(--accent)" : "#fff"};">
+                ${player.name}
+                <div style="font-size: 0.65rem; color: #888; font-weight: normal; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
+                    ${getTeamLogoHTML(player.team)}
+                    <span>${player.team}</span>
+                </div>
+            </td>
+            <td style="font-weight: 900; color: ; font-size: 1.1rem;">${player.avgRating.toFixed(1)}</td>
+        `;
+    tbody.appendChild(tr);
+  });
+}
