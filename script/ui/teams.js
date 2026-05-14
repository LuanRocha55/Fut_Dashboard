import { dbgToast } from "./uiUtils.js";
import { highlightZones, clearZones } from "./zones.js";
import { switchMainView, showScreen } from "./views.js";
import { handleSubstitution, initDragAndDrop } from "./dragDrop.js";
import {
  renderApp,
  render,
  renderBench,
  renderMatchHistory,
  renderTeamStats,
  renderPitchPlayers,
  updateTeamStatsUI,
  renderTeamChemistry,
  updateDashboardCoach,
} from "./render.js";

import {
  squad,
  formations,
  ALL_POSITIONS,
  initSystem,
  performSwap,
  downloadJSON,
  resetFormationAlignment,
  calculateOVR,
  saveToLocal,
  healSquad,
  matchHistory,
  matchInfo,
  ensureCaptain,
} from "../core/appCore.js";
import {
  getEfootballPosition,
  checkPositionFit,
  swapTitulares,
  handlePlayerMove,
  autoFillTeam,
} from "../tactics/pitchTactics.js";
import { openMatchSimulation } from "../simulation/simMain.js";
import {
  getRatingColor,
  getStarsHTML,
  getFormHTML,
  getMatchStatusHTML,
  drawRadar,
  normalizeTeamName,
} from "./uiGraphics.js";
import { showCustomModal } from "./uiModal.js";
import { normalizeStr } from "../core/appUtils.js";
import { initEditorEvents, openMenu } from "../player/playerEditor.js";
import {
  initTableEvents,
  isTableView,
  renderTable,
  setTableView,
} from "./uiTableView.js";
import { initLeagueEvents, autoInitLeague } from "../league/leagueMain.js";
import { renderLeagueData } from "../league/leagueRenderer.js";
import { Storage } from "../core/appStorage.js";
import { getTeamBadge, getCompetitionBadge } from "../core/badgeService.js";

let _badgeCache = JSON.parse(localStorage.getItem("fut_badge_cache") || "{}");
let _leagueBadgeMap = JSON.parse(
  localStorage.getItem("fut_league_logo_cache") || "{}",
);
if (Object.keys(_leagueBadgeMap).length === 0) _leagueBadgeMap = null;
let _pendingLeagueFetch = null;

const LEAGUE_COLORS = {
  "Premier League": "#3d195b",
  "English Premier League": "#3d195b",
  "Barclays WSL": "#3d195b",
  "LaLiga EA Sports": "#ee2e31",
  "Spanish La Liga": "#ee2e31",
  "Liga F": "#ee2e31",
  Bundesliga: "#d90429",
  "German Bundesliga": "#d90429",
  GPFBL: "#d90429",
  "Serie A TIM": "#02c39a",
  "Italian Serie A": "#02c39a",
  "Ligue 1 Uber Eats": "#f9c200",
  "French Ligue 1": "#f9c200",
  "Arkema PL": "#f9c200",
  "Brasileirão Série A": "#009c3b",
  "Brazilian Serie A": "#009c3b",
  "Brasileirão Série B": "#fdd835",
  NWSL: "#0077c8",
  "Copa Libertadores": "#ffb703",
  "Copa Sudamericana": "#fb8500",
  "UEFA Champions League": "#003399",
};

const LEAGUE_EMOJIS = {
  "Premier League": "🦁",
  "LaLiga EA Sports": "🏆",
  Bundesliga: "🛡️",
  "Serie A TIM": "⭐",
  "Ligue 1 Uber Eats": "💎",
  "Brasileirão Série A": "🇧🇷",
};

export async function loadTeams() {
  try {
    const response = await fetch("data/teamsList.json");
    if (!response.ok) throw new Error("Falha ao carregar lista de times.");
    const teams = await response.json();

    const teamSelect = document.getElementById("teamSelect");
    const simOpponentSelect = document.getElementById("simOpponentSelect");

    if (teamSelect) {
      teamSelect.innerHTML = "";
      teams
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((t) => {
          const opt = document.createElement("option");
          opt.value = t.file;
          opt.innerText = t.name;
          teamSelect.appendChild(opt);
        });
      teamSelect.value = (await Storage.getCurrentTeamFile()) || "vasco.json";
    }

    if (simOpponentSelect) {
      simOpponentSelect.innerHTML =
        '<option value="generic">Adversário Genérico (OVR 65)</option>';
      const sortedTeams = teams.sort((a, b) => a.name.localeCompare(b.name));
      sortedTeams.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.file;
        opt.innerText = `${t.name} (${t.league || "Extra"})`;
        simOpponentSelect.appendChild(opt);
      });

      const setupTeamSelect = document.getElementById("setupTeamSelect");
      if (setupTeamSelect) {
        setupTeamSelect.innerHTML =
          '<option value="">-- Selecione um Clube --</option>';

        // Agrupar times por liga
        const leagues = {};
        sortedTeams.forEach((t) => {
          const leagueName = t.league || "Outros";
          if (!leagues[leagueName]) leagues[leagueName] = [];
          leagues[leagueName].push(t);
        });

        // Criar optgroups
        Object.keys(leagues)
          .sort()
          .forEach((league) => {
            const group = document.createElement("optgroup");
            group.label = league.toUpperCase();
            leagues[league].forEach((t) => {
              const opt = document.createElement("option");
              opt.value = t.file;
              opt.innerText = t.name;
              group.appendChild(opt);
            });
            setupTeamSelect.appendChild(group);
          });
      }
    }
    return teams;
  } catch (error) {
    console.error("Erro ao carregar lista de times:", error);
    return [];
  }
}

export async function fetchTeamBadge(teamName, leagueName = "") {
  return await getTeamBadge(teamName, leagueName);
}

export async function getLeagueBadgeMap() {
  // Agora o badgeService lida com isso individualmente ou via cache central
  return {};
}

export function loadBadgesLazy() {
  const imgs = document.querySelectorAll(".team-badge-img[data-name]");
  let delay = 0;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const name = img.dataset.name;
        const league = img.dataset.league || ""; 
        if (img.dataset.loaded) return;
        img.dataset.loaded = "1";
        observer.unobserve(img);
        
        setTimeout(async () => {
          const url = await fetchTeamBadge(name, league);
          if (url && img.isConnected) {
            img.src = url;
          }
        }, delay);
        delay = Math.min(delay + 100, 3000);
      });
    },
    { rootMargin: "150px" },
  );
  imgs.forEach((img) => observer.observe(img));
}

export function loadLeagueLogosLazy() {
  const imgs = document.querySelectorAll(".league-logo-img[data-league]");
  imgs.forEach(async (img) => {
    if (img.dataset.loaded) return;
    img.dataset.loaded = "1";
    const name = img.dataset.league;
    const url = await getCompetitionBadge(name);
    if (url && img.isConnected) {
      img.src = url;
    }
  });
}

export function renderVisualTeams(teams) {
  const container = document.getElementById("teamSelectionScreen");
  if (!container) return;

  if (!teams || teams.length === 0) {
    dbgToast("⚠️ Lista de times está vazia ou falhou ao carregar.", "#8b4000");
    console.error("renderVisualTeams: teams list is empty");
    return;
  }

  // Agrupar por liga
  const leagues = {};
  teams.forEach((t) => {
    const l = t.league || "Outros";
    if (!leagues[l]) leagues[l] = [];
    leagues[l].push(t);
  });
  const leagueNames = Object.keys(leagues);
  dbgToast(`📂 ${leagueNames.length} ligas identificadas`, "#333");

  // ── TELA 0: Seleção de Gênero ──────────────────────────────────────────
  function showGenderSelection() {
    container.innerHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#050505;gap:40px;padding:20px;">
        <div style="text-align:center;margin-bottom:20px;">
          <h1 style="color:#fff;margin:0;font-size:3rem;font-weight:900;letter-spacing:-1px;">SELECIONE A <span style="color:var(--accent);">MODALIDADE</span></h1>
          <p style="color:#666;margin-top:10px;font-size:1.1rem;">Escolha o universo do futebol que deseja gerenciar</p>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:30px;max-width:800px;width:100%;">
          <div id="selectMaleBtn" style="cursor:pointer;background:#0f0f0f;border:1px solid #222;border-radius:24px;padding:40px;text-align:center;transition:all 0.3s;display:flex;flex-direction:column;align-items:center;gap:20px;">
            <div style="width:80px;height:80px;background:var(--accent)18;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid var(--accent)44;">
              <i data-lucide="users" style="width:40px;height:40px;color:var(--accent);"></i>
            </div>
            <div>
              <h2 style="color:#fff;margin:0;font-size:1.8rem;">MASCULINO</h2>
              <p style="color:#555;margin-top:5px;font-size:0.9rem;">Ligas tradicionais, Champions e Brasileirão</p>
            </div>
          </div>
          
          <div id="selectFemaleBtn" style="cursor:pointer;background:#0f0f0f;border:1px solid #222;border-radius:24px;padding:40px;text-align:center;transition:all 0.3s;display:flex;flex-direction:column;align-items:center;gap:20px;">
            <div style="width:80px;height:80px;background:#ff006618;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #ff006644;">
              <i data-lucide="star" style="width:40px;height:40px;color:#ff0066;"></i>
            </div>
            <div>
              <h2 style="color:#fff;margin:0;font-size:1.8rem;">FEMININO</h2>
              <p style="color:#555;margin-top:5px;font-size:0.9rem;">NWSL, WSL, Liga F e craques mundiais</p>
            </div>
          </div>
        </div>
        
        <button id="backToCoachBtnSelect" style="background:transparent;border:1px solid #333;color:#666;padding:12px 24px;border-radius:12px;cursor:pointer;font-size:0.9rem;margin-top:20px;">← VOLTAR AO PERFIL</button>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("backToCoachBtnSelect").onclick = () =>
      showScreen("coachCreationScreen");

    const maleBtn = document.getElementById("selectMaleBtn");
    maleBtn.onmouseenter = () => {
      maleBtn.style.borderColor = "var(--accent)";
      maleBtn.style.background = "var(--accent)0a";
      maleBtn.style.transform = "translateY(-10px)";
      maleBtn.style.boxShadow = "0 20px 40px var(--accent)18";
    };
    maleBtn.onmouseleave = () => {
      maleBtn.style.borderColor = "#222";
      maleBtn.style.background = "#0f0f0f";
      maleBtn.style.transform = "";
      maleBtn.style.boxShadow = "";
    };
    maleBtn.onclick = () => {
      dbgToast("⚡ Abrindo Universo Masculino...", "var(--accent)");
      showLeagueGrid("male");
    };

    const femaleBtn = document.getElementById("selectFemaleBtn");
    femaleBtn.onmouseenter = () => {
      femaleBtn.style.borderColor = "#ff0066";
      femaleBtn.style.background = "#ff00660a";
      femaleBtn.style.transform = "translateY(-10px)";
      femaleBtn.style.boxShadow = "0 20px 40px #ff006618";
    };
    femaleBtn.onmouseleave = () => {
      femaleBtn.style.borderColor = "#222";
      femaleBtn.style.background = "#0f0f0f";
      femaleBtn.style.transform = "";
      femaleBtn.style.boxShadow = "";
    };
    femaleBtn.onclick = () => {
      dbgToast("💖 Abrindo Universo Feminino...", "#ff0066");
      showLeagueGrid("female");
    };
  }

  // ── TELA 1: Seleção de Campeonato ─────────────────────────────────────
  function showLeagueGrid(gender = "male") {
    container.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#050505;">
                <div style="padding:30px 40px 20px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <h1 style="color:#fff;margin:0;font-size:2.2rem;font-weight:900;">ESCOLHA O <span style="color:${gender === "female" ? "#ff0066" : "var(--accent)"};">CAMPEONATO</span></h1>
                        <p style="color:#555;margin-top:5px;font-size:0.85rem;">Selecione uma liga para ver os times disponíveis</p>
                    </div>
                    <button id="backToGenderBtn" style="background:transparent;border:1px solid #333;color:#666;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:0.85rem;">← MODALIDADE</button>
                </div>

                <input type="text" id="leagueSearchInput" placeholder="🔍 Buscar campeonato..."
                    style="margin:0 40px 15px;padding:10px 16px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;font-size:0.9rem;outline:none;flex-shrink:0;width:calc(100% - 80px);">

                <div id="leagueGrid" style="flex:1;overflow-y:auto;padding:0 30px 30px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;align-content:start;">
                </div>
            </div>
        `;

    document.getElementById("backToGenderBtn").onclick = () =>
      showGenderSelection();

    const leagueGrid = document.getElementById("leagueGrid");
    const leagueSearch = document.getElementById("leagueSearchInput");

    function renderLeagueCards(filter = "") {
      leagueGrid.innerHTML = "";

      const femLeagueKeywords = [
        "NWSL",
        "Barclays WSL",
        "Liga F",
        "GPFBL",
        "Arkema PL",
        "Nederland Vrouwen Liga",
        "Vrouwen",
        "Fem",
      ];

    const sortedLeagueNames = leagueNames
      .filter((l) => {
        const isFemLeague = femLeagueKeywords.some((fem) => l.includes(fem));
        const matchesGender = gender === "female" ? isFemLeague : !isFemLeague;
        const matchesFilter = l.toLowerCase().includes(filter.toLowerCase());
        return matchesGender && matchesFilter;
      })
      .sort((a, b) => {
        const avgA =
          leagues[a].reduce((s, t) => s + (t.ovr || 75), 0) / leagues[a].length;
        const avgB =
          leagues[b].reduce((s, t) => s + (t.ovr || 75), 0) / leagues[b].length;
        return avgB - avgA;
      });

    if (sortedLeagueNames.length === 0) {
      leagueGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #666;">
          <p>Nenhum campeonato encontrado para esta modalidade.</p>
        </div>
      `;
    }

    sortedLeagueNames.forEach((l) => {
        const count = leagues[l].length;
        const avgOvr = Math.round(
          leagues[l].reduce((s, t) => s + (t.ovr || 75), 0) / count,
        );
        const color =
          LEAGUE_COLORS[l] || (gender === "female" ? "#ff0066" : "#00ff88");
        const initials = l
          .split(" ")
          .map((w) => w[0])
          .filter(Boolean)
          .join("")
          .substring(0, 3)
          .toUpperCase();

        const card = document.createElement("div");
        card.style.cssText = `
          padding: 18px 14px 16px; cursor: pointer; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07); background: #0f0f0f;
          transition: all 0.22s; position: relative; overflow: hidden;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; min-height: 160px;
        `;
        card.innerHTML = `
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${color},${color}66);"></div>
          <div style="width:56px;height:56px;flex-shrink:0;margin-bottom:10px;display:flex;align-items:center;justify-content:center;">
            <img class="league-logo-img" data-league="${l}"
              style="max-width:56px;max-height:56px;object-fit:contain;display:none;"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
              onload="this.style.display='block';this.nextElementSibling.style.display='none';">
            <div class="league-logo-fallback" style="width:52px;height:52px;border-radius:50%;background:${color}22;border:2px solid ${color}55;display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:900;color:${color};">
              ${LEAGUE_EMOJIS[l] || initials}
            </div>
          </div>
          <div style="font-weight:900;color:#fff;font-size:0.88rem;line-height:1.3;word-break:break-word;overflow-wrap:break-word;width:100%;margin-bottom:auto;">${l}</div>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:10px;">
            <span style="font-size:0.65rem;color:#555;background:#1a1a1a;padding:2px 7px;border-radius:5px;">${count} times</span>
            <span style="font-size:0.65rem;color:${color};background:${color}18;padding:2px 7px;border-radius:5px;border:1px solid ${color}33;">OVR ${avgOvr}</span>
          </div>
        `;
        card.addEventListener("mouseenter", () => {
          card.style.borderColor = color;
          card.style.background = `${color}0a`;
          card.style.transform = "translateY(-3px)";
          card.style.boxShadow = `0 8px 25px ${color}18`;
        });
        card.addEventListener("mouseleave", () => {
          card.style.borderColor = "rgba(255,255,255,0.07)";
          card.style.background = "#0f0f0f";
          card.style.transform = "";
          card.style.boxShadow = "";
        });
        card.onclick = () => showTeamsOfLeague(l, leagues[l], gender);
        leagueGrid.appendChild(card);
      });

      loadLeagueLogosLazy();
    }

    renderLeagueCards();
    leagueSearch.addEventListener("input", () =>
      renderLeagueCards(leagueSearch.value),
    );
  }

  // ── TELA 2: Times do Campeonato ────────────────────────────────────────
  function showTeamsOfLeague(leagueName, teamsList, gender) {
    const color =
      LEAGUE_COLORS[leagueName] ||
      (gender === "female" ? "#ff0066" : "#00ff88");
    const palette = [
      "#00ff88",
      "#00aaff",
      "#ff6b35",
      "#a855f7",
      "#f59e0b",
      "#ec4899",
      "#14b8a6",
      "#f43f5e",
      "#84cc16",
      "#6366f1",
    ];
    const getColor = (name) => palette[name.charCodeAt(0) % palette.length];
    const ovrColor = (o) =>
      o >= 85
        ? "#00f2ff"
        : o >= 80
          ? "#00ff88"
          : o >= 74
            ? "#a3e635"
            : o >= 68
              ? "#ffcc00"
              : o >= 62
                ? "#ff8800"
                : "#ff4444";

    container.innerHTML = `
            <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#050505;">
                <div style="padding:20px 40px 15px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #111;">
                    <div style="display:flex;align-items:center;gap:16px;">
                        <button id="backToLeaguesBtn" style="background:transparent;border:1px solid #333;color:#666;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;white-space:nowrap;">← Campeonatos</button>
                        <div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:6px;height:24px;background:${color};border-radius:3px;"></div>
                                <h2 style="color:#fff;margin:0;font-size:1.5rem;font-weight:900;">${leagueName}</h2>
                            </div>
                            <p style="color:#555;margin:3px 0 0 16px;font-size:0.8rem;">${teamsList.length} times • clique para selecionar</p>
                        </div>
                    </div>
                    <input type="text" id="teamSearchInput" placeholder="🔍 Buscar time..."
                        style="width:200px;padding:9px 14px;background:#111;border:1px solid #222;color:#fff;border-radius:8px;font-size:0.85rem;outline:none;">
                </div>
                <div id="teamCardsGrid" style="flex:1;overflow-y:auto;padding:20px 30px 30px;display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;align-content:start;">
                </div>
            </div>
        `;

    document.getElementById("backToLeaguesBtn").onclick = () =>
      showLeagueGrid(gender);

    const grid = document.getElementById("teamCardsGrid");
    const searchEl = document.getElementById("teamSearchInput");

    function renderCards(filter = "") {
      const filtered = teamsList
        .filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
      grid.innerHTML = "";
      filtered.forEach((team) => {
        const tc = getColor(team.name);
        const ovr = team.ovr || 75;
        const initials = team.name
          .split(" ")
          .map((w) => w[0])
          .filter(Boolean)
          .join("")
          .substring(0, 3)
          .toUpperCase();

        const card = document.createElement("div");
        card.style.cssText = `padding:16px 12px;text-align:center;cursor:pointer;border-radius:12px;border:1px solid rgba(255,255,255,0.07);background:#0f0f0f;transition:all 0.2s;position:relative;overflow:hidden;`;
        card.innerHTML = `
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${color};opacity:0.7;"></div>
          <div class="team-badge-wrap" style="width:60px;height:60px;margin:0 auto 10px;position:relative;display:flex;align-items:center;justify-content:center;">
            <img class="team-badge-img"
              data-name="${team.name}"
              src=""
              style="width:60px;height:60px;object-fit:contain;display:none;"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
              onload="this.style.display='block';this.nextElementSibling.style.display='none';">
            <div class="team-badge-fallback" style="width:60px;height:60px;background:${tc}22;border:2px solid ${tc}55;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.95rem;font-weight:900;color:${tc};">${initials}</div>
          </div>
          <div style="font-weight:800;color:#fff;font-size:0.82rem;line-height:1.3;margin-bottom:7px;word-break:break-word;">${team.name}</div>
          <div style="display:inline-block;padding:3px 9px;border-radius:10px;background:${ovrColor(ovr)}18;border:1px solid ${ovrColor(ovr)}44;font-size:0.68rem;font-weight:900;color:${ovrColor(ovr)};">OVR ${ovr}</div>
        `;
        card.addEventListener("mouseenter", () => {
          card.style.borderColor = color;
          card.style.transform = "translateY(-3px)";
          card.style.boxShadow = `0 6px 20px ${color}18`;
        });
        card.addEventListener("mouseleave", () => {
          card.style.borderColor = "rgba(255,255,255,0.07)";
          card.style.transform = "";
          card.style.boxShadow = "";
        });
        card.onclick = () => finalizeCareerSetup(team);
        grid.appendChild(card);
      });

      loadBadgesLazy();
    }

    renderCards();
    searchEl.addEventListener("input", () =>
      renderCards(searchEl.value.trim()),
    );
  }

  // ── Início: mostra a tela de seleção de gênero ────────────────────────
  showGenderSelection();
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
    
    // Em vez de reload, vamos disparar a inicialização manual
    const { initSystem } = await import("../core/appCore.js");
    const { main } = await import("./init.js");
    
    // Limpamos o estado atual e reinicializamos
    document.body.style.opacity = "0";
    setTimeout(async () => {
      // Forçamos o recarregamento dos dados do Storage
      await initSystem();
      // Chamamos o main do init.js para renderizar tudo
      await main();
      
      document.body.style.opacity = "1";
      showScreen("mainApp");
      switchMainView("dashboard");
    }, 500);
  } catch (e) {
    dbgToast("❌ Erro ao salvar carreira: " + e.message, "#8b0000", 20000);
    console.error("Erro no finalizeCareerSetup:", e);
  }
}
