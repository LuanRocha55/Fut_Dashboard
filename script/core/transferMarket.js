import { squad, saveToLocal, calculateOVR } from "../core/appCore.js";
import { showCustomModal } from "../ui/uiModal.js";
import { getRatingColor, getFlag } from "../ui/uiGraphics.js";
import { renderApp } from "../ui/render.js";
import { Storage } from "../core/appStorage.js";
import {
  formatMoney,
  calculateMarketValue,
  isTransferWindowOpen,
} from "../core/appUtils.js";
import { normalizeStr } from "../core/appUtils.js";

let teamsListCache = [];

let _marketInitialized = false;
export async function initTransferMarket() {
  if (_marketInitialized) return;
  _marketInitialized = true;
  const leagueSelect = document.getElementById("transferLeagueSelect");
  const teamSelect = document.getElementById("transferTeamSelect");
  const searchBtn = document.getElementById("transferSearchBtn");
  const resultsList = document.getElementById("transferResultsList");

  if (!leagueSelect || !teamSelect || !searchBtn || !resultsList) return;

  teamsListCache = await Storage.getTeamsList();
  if (!teamsListCache.length) return;

  const leagues = [
    ...new Set(teamsListCache.map((t) => t.league || "Outros")),
  ].sort();
  leagueSelect.innerHTML = '<option value="">-- Selecione uma Liga --</option>';
  leagues.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = opt.innerText = l;
    leagueSelect.appendChild(opt);
  });

  leagueSelect.onchange = () => {
    const lg = leagueSelect.value;
    if (!lg) {
      teamSelect.innerHTML =
        '<option value="">Selecione a Liga primeiro</option>';
      teamSelect.disabled = true;
      searchBtn.disabled = true;
      return;
    }
    const teamsInLeague = teamsListCache
      .filter((t) => t.league === lg)
      .sort((a, b) => a.name.localeCompare(b.name));
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

    const searchTerm = normalizeStr(
      document.getElementById("transferSearchInput")?.value,
    );
    const posFilter = document.getElementById("transferPosFilter")?.value;
    const minOvr =
      parseInt(document.getElementById("transferMinOvr")?.value) || 0;

    searchBtn.disabled = true;
    searchBtn.innerText = "Buscando...";
    resultsList.innerHTML =
      "<div style='text-align:center; padding: 20px;'><span style='color:var(--accent);'>Analisando rede de olheiros...</span></div>";

    try {
      const res = await fetch("data/teams/" + file, { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar time");
      const teamData = await res.json();
      const oppSquad = teamData.fullSquad || teamData.squad || [];

      resultsList.innerHTML = "";

      // Mapear os jogadores primeiro para evitar recálculos constantes de OVR e Preço
      const processedSquad = oppSquad.map((p) => {
        const isGK = p.aptitude?.[0] === "GOL" || p.aptitude?.[0] === "GL";
        const calcOvr =
          p.ovr || p.rating || calculateOVR(p.stats, 0, isGK, p.aptitude?.[0]);
        return {
          ...p,
          computedOvr: calcOvr,
          computedMarketValue:
            p.marketValue || calculateMarketValue(calcOvr, p.age || 25),
        };
      });

      // Aplicar Filtros e Ordenação Otimizada
      const filtered = processedSquad.filter((p) => {
        const matchName = searchTerm
          ? normalizeStr(p.name).includes(searchTerm)
          : true;
        const matchOvr = p.computedOvr >= minOvr;

        let matchPos = true;
        if (posFilter) {
          const pPos = p.aptitude?.[0] || "";
          if (posFilter === "GL") matchPos = pPos === "GL" || pPos === "GOL";
          else if (posFilter === "ZE")
            matchPos = ["ZE", "ZD", "LE", "LD"].includes(pPos);
          else if (posFilter === "VOL")
            matchPos = ["VOL", "MC", "MEI", "ME", "MD"].includes(pPos);
          else if (posFilter === "CA")
            matchPos = ["CA", "SA", "PE", "PD"].includes(pPos);
        }

        return matchName && matchOvr && matchPos;
      });

      if (filtered.length === 0) {
        resultsList.innerHTML =
          "<div style='text-align:center; color:#888; padding:20px;'>Nenhum jogador corresponde aos filtros.</div>";
        return;
      }

      filtered
        .sort((a, b) => b.computedOvr - a.computedOvr)
        .forEach((p) => {
          const ovr = p.computedOvr;
          const ovrColor = getRatingColor(ovr);
          const marketValue = p.computedMarketValue;
          p.marketValue = marketValue; // Salva o valor real no objeto para negociação

          const card = document.createElement("div");
          card.style.cssText =
            "background: #151515; border: 1px solid #222; border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; margin-bottom: 5px;";

          card.onmouseover = () => {
            card.style.borderColor = "var(--accent)";
            card.style.background = "#1a1a1a";
          };
          card.onmouseout = () => {
            card.style.borderColor = "#222";
            card.style.background = "#151515";
          };

          card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="position: relative;">
              <div style="background: ${ovrColor}; color: #000; padding: 10px; border-radius: 10px; font-weight: 900; font-size: 1.3rem; min-width: 50px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">${(ovr || 0).toFixed(0)}</div>
              <div style="position: absolute; bottom: -5px; right: -5px; background: #000; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 1px solid #333;">${p.aptitude?.[0] || "?"}</div>
            </div>
            <div>
              <div style="font-weight: bold; color: #fff; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">${getFlag(p.nationality)} ${p.name}</div>
              <div style="font-size: 0.85rem; color: #666; margin-top: 4px; display: flex; gap: 10px;">
                <span>Idade: <b style="color:#aaa;">${p.age || 25}</b></span>
                <span>Pé: <b style="color:#aaa;">${p.foot || "?"}</b></span>
                <span style="color:var(--accent); font-weight:bold;">${formatMoney(marketValue)}</span>
              </div>
            </div>
          </div>
          <button class="buy-btn btn-primary" style="width: auto; padding: 10px 20px; border-radius: 8px; font-weight: bold;" data-player='${JSON.stringify(p).replace(/'/g, "&#39;")}'>CONTRATAR</button>
        `;
          resultsList.appendChild(card);
        });

      document.querySelectorAll(".buy-btn").forEach((btn) => {
        btn.onclick = async (e) => {
          const pData = JSON.parse(
            e.currentTarget.dataset.player.replace(/&#39;/g, "'"),
          );
          const coach = await Storage.getCoachInfo();

          if (!isTransferWindowOpen(coach.currentDate)) {
            showCustomModal(
              "<strong>Janela de Transferências Fechada!</strong><br><br>As negociações só são permitidas em Janeiro, Julho e Agosto.",
              "alert",
              "btn-danger",
            );
            return;
          }

          // Abrir tela de negociação
          import("../ui/render.js").then((m) => {
            m.renderNegotiation(pData.id, null, true, pData);
          });
        };
      });
    } catch (e) {
      resultsList.innerHTML =
        "<div style='text-align:center; color:#ff4444; padding:20px;'>Erro ao carregar jogadores deste clube.</div>";
    } finally {
      searchBtn.disabled = false;
      searchBtn.innerText = "Buscar Jogadores";
    }
  };
}

export async function renderMyTransferMarketHub() {
  const list = document.getElementById("myTransferListedPlayers");
  if (!list) return;

  const listedPlayers = squad.filter(
    (p) => p.transferStatus && p.transferStatus !== "none",
  );

  if (listedPlayers.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: #444; padding: 40px; border: 1px dashed #222; border-radius: 10px;">
            <i data-lucide="info" style="width: 2rem; height: 2rem; margin-bottom: 10px; opacity: 0.2;"></i>
            <p>Nenhum atleta do seu elenco está listado para venda.</p>
            <small>Use a lista de elenco para colocar jogadores no mercado.</small>
        </div>`;
  } else {
    list.innerHTML = "";
    listedPlayers.forEach((p) => {
      const card = document.createElement("div");
      card.style.cssText =
        "background: #1a1a1a; border: 1px solid #333; padding: 15px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;";

      const statusLabel =
        p.transferStatus === "transfer" ? "À VENDA" : "EMPRÉSTIMO";
      const statusColor =
        p.transferStatus === "transfer" ? "var(--accent)" : "#00aaff";
      const ovr = p.ovr || p.rating || 75;

      card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: ${getRatingColor(ovr)}; color: #000; width: 35px; height: 35px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900;">${ovr.toFixed(0)}</div>
                    <div>
                        <div style="color: #fff; font-weight: bold; font-size: 0.9rem;">${p.name}</div>
                        <div style="font-size: 0.65rem; color: ${statusColor}; font-weight: 800; text-transform: uppercase;">${statusLabel}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #fff; font-weight: 800; font-size: 0.85rem;">${formatMoney(p.marketValue || 0)}</div>
                    <button class="delist-btn btn-secondary" style="font-size: 0.6rem; padding: 4px 8px; margin-top: 5px; width: auto;" data-id="${p.id}">REMOVER DA LISTA</button>
                </div>
            `;
      list.appendChild(card);
    });

    list.querySelectorAll(".delist-btn").forEach((btn) => {
      btn.onclick = () => {
        const id = parseInt(btn.dataset.id);
        const player = squad.find((x) => x.id === id);
        if (player) {
          player.transferStatus = "none";
          saveToLocal();
          renderApp();
          renderMyTransferMarketHub();
        }
      };
    });
  }

  const info = await Storage.getCoachInfo();
  const { renderProposals } = await import("../ui/render.js");
  await renderProposals(info, "marketProposalsList", null, null);

  if (window.lucide) window.lucide.createIcons();
}
