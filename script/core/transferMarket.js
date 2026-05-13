import { squad, saveToLocal, calculateOVR } from "../core/appCore.js";
import { showCustomModal } from "../ui/uiModal.js";
import { getRatingColor, getFlag } from "../ui/uiGraphics.js";
import { renderApp } from "../ui/render.js";

let teamsListCache = [];

export async function initTransferMarket() {
  const leagueSelect = document.getElementById("transferLeagueSelect");
  const teamSelect = document.getElementById("transferTeamSelect");
  const searchBtn = document.getElementById("transferSearchBtn");
  const resultsList = document.getElementById("transferResultsList");

  if (!leagueSelect || !teamSelect || !searchBtn || !resultsList) return;

  try {
    const res = await fetch("data/teamsList.json", { cache: "no-store" });
    if (res.ok) {
      teamsListCache = await res.json();
    }
  } catch (e) {
    console.error("Erro ao carregar lista de times para o mercado", e);
    return;
  }

  const leagues = [...new Set(teamsListCache.map((t) => t.league || "Outros"))].sort();
  leagueSelect.innerHTML = '<option value="">-- Selecione uma Liga --</option>';
  leagues.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = opt.innerText = l;
    leagueSelect.appendChild(opt);
  });

  leagueSelect.onchange = () => {
    const lg = leagueSelect.value;
    if (!lg) {
      teamSelect.innerHTML = '<option value="">Selecione a Liga primeiro</option>';
      teamSelect.disabled = true;
      searchBtn.disabled = true;
      return;
    }
    const teamsInLeague = teamsListCache.filter((t) => t.league === lg).sort((a, b) => a.name.localeCompare(b.name));
    teamSelect.innerHTML = '<option value="">-- Selecione o Clube --</option>';
    teamsInLeague.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.file;
      opt.innerText = t.name;
      teamSelect.appendChild(opt);
    });
    teamSelect.disabled = false;
    searchBtn.disabled = true;
  };

  teamSelect.onchange = () => {
    searchBtn.disabled = !teamSelect.value;
  };

  searchBtn.onclick = async () => {
    const file = teamSelect.value;
    if (!file) return;
    searchBtn.disabled = true;
    searchBtn.innerText = "Buscando...";
    resultsList.innerHTML = "<div style='text-align:center; padding: 20px;'><span style='color:var(--accent);'>Analisando elenco alvo...</span></div>";

    try {
      const res = await fetch("data/teams/" + file, { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar time");
      const teamData = await res.json();
      const oppSquad = teamData.fullSquad || teamData.squad || [];

      resultsList.innerHTML = "";
      if (oppSquad.length === 0) {
        resultsList.innerHTML = "<div style='text-align:center; color:#888; padding:20px;'>Nenhum jogador encontrado.</div>";
        return;
      }

      oppSquad.sort((a, b) => {
        const ovrA = a.rating || calculateOVR(a.stats, 0, a.aptitude?.[0] === "GOL" || a.aptitude?.[0] === "GL", a.aptitude?.[0]);
        const ovrB = b.rating || calculateOVR(b.stats, 0, b.aptitude?.[0] === "GOL" || b.aptitude?.[0] === "GL", b.aptitude?.[0]);
        return ovrB - ovrA;
      }).forEach((p) => {
        const ovr = p.rating || calculateOVR(p.stats, 0, p.aptitude?.[0] === "GOL" || p.aptitude?.[0] === "GL", p.aptitude?.[0]);
        const ovrColor = getRatingColor(ovr);
        const card = document.createElement("div");
        card.style.cssText = "background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;";
        
        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="background: ${ovrColor}22; border: 1px solid ${ovrColor}; color: ${ovrColor}; padding: 8px 12px; border-radius: 8px; font-weight: 900; font-size: 1.2rem;">${(ovr || 0).toFixed(0)}</div>
            <div>
              <div style="font-weight: bold; color: #fff; font-size: 1.1rem; display: flex; align-items: center; gap: 5px;">${getFlag(p.nationality)} ${p.name}</div>
              <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">Idade: <span style="color:#ccc;">${p.age || 25}</span> | Pos: <span style="color:#ccc; font-weight:bold;">${p.aptitude?.[0] || "?"}</span> | Pé: <span style="color:#ccc;">${p.foot || "?"}</span></div>
            </div>
          </div>
          <button class="btn-primary buy-btn" style="width: auto; padding: 8px 15px; margin: 0; font-size: 0.85rem;" data-player='${JSON.stringify(p).replace(/'/g, "&#39;")}'>Contratar</button>
        `;
        resultsList.appendChild(card);
      });

      document.querySelectorAll(".buy-btn").forEach((btn) => {
        btn.onclick = async (e) => {
          const pData = JSON.parse(e.target.dataset.player.replace(/&#39;/g, "'"));
          const confirm = await showCustomModal(`Deseja contratar o jogador <strong>${pData.name}</strong> para a sua equipe?`, "confirm", "btn-primary");
          if (confirm) {
            if (squad.some((s) => s.name === pData.name && s.age === pData.age && s.nationality === pData.nationality)) {
              showCustomModal(`<strong>${pData.name}</strong> já faz parte do seu elenco atual!`, "alert", "btn-warning");
              return;
            }
            const newId = squad.length > 0 ? Math.max(...squad.map((x) => x.id)) + 1 : 1;
            const newPlayer = { ...pData, id: newId, status: "reserva", matchStatus: "normal", captain: false };
            squad.push(newPlayer);
            saveToLocal();
            renderApp();
            showCustomModal(`<strong>${pData.name}</strong> é o novo reforço do seu time! Ele já está disponível no banco de reservas.`, "alert", "btn-primary");
          }
        };
      });

    } catch (e) {
      resultsList.innerHTML = "<div style='text-align:center; color:#ff4444; padding:20px;'>Erro ao carregar jogadores deste clube.</div>";
    } finally {
      searchBtn.disabled = false;
      searchBtn.innerText = "Buscar Jogadores";
    }
  };
}