import { squad, formations, saveToLocal } from "./core.js";

export function getEfootballPosition(top, left) {
  // Fatias de 14.28% (100 / 7 colunas)
  const slice = Math.floor(left / 14.28);

  // Coluna 0: Sempre GOL
  if (slice <= 0) return "GOL";

  // DEFINIÇÃO DAS 4 FAIXAS HORIZONTAIS (0-25 / 25-50 / 50-75 / 75-100)
  if (top < 25 || top > 75) {
    const side = top < 25 ? "E" : "D"; // E para Esquerda, D para Direito
    if (slice <= 2) return "L" + side; // LE ou LD
    if (slice <= 4) return "M" + side; // ME ou MD
    return "P" + side; // PE ou PD
  }

  // CORREDOR CENTRAL (25-75)
  const isLeftCenter = top < 50;
  if (slice === 1) return isLeftCenter ? "ZE" : "ZD";
  if (slice === 2) return "VOL";
  if (slice === 3) return "MC";
  if (slice === 4) return "MEI";
  
  // ZONA DE ATAQUE FINAL (Garante CA em formações com l >= 80)
  if (left >= 80) return "CA";
  if (slice === 5) return "SA";
  return "CA"; 
}

export function checkPositionFit(player, currentZone) {
  if (!currentZone || !player.aptitude) return "fit-perfect";
  const isApt = player.aptitude.includes(currentZone);
  return isApt ? "fit-perfect" : "fit-warning";
}

export function autoFillTeam() {
  const currentFormat = document.getElementById("formationSelect")?.value;
  const format = formations[currentFormat];
  if (!format) return;

  // Mapeia cada slot da formação para a zona e preferência de pé
  const requiredPositions = format.map((pos, index) => {
    const zone = getEfootballPosition(pos.t, pos.l);
    let preferredFoot = null;
    if (["ZE", "LE"].includes(zone)) preferredFoot = "Canhoto";
    if (["ZD", "LD"].includes(zone)) preferredFoot = "Destro";
    
    return { zone, index, preferredFoot };
  });

  // Ordem de prioridade de preenchimento
  const FILL_ORDER = ["GOL", "CA", "SA", "PE", "PD", "MEI", "MC", "VOL", "ME", "MD", "LE", "LD", "ZE", "ZD"];
  const sortedRequired = [...requiredPositions].sort((a, b) => {
    const ai = FILL_ORDER.indexOf(a.zone);
    const bi = FILL_ORDER.indexOf(b.zone);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Coleta TODOS os jogadores aptos (campo e banco)
  const availablePlayers = [...squad]
    .filter((p) => p && p.matchStatus !== "red" && p.matchStatus !== "injury")
    .sort((a, b) => b.rating - a.rating);

  const newTitulares = new Array(11).fill(null);
  const assignedIds = new Set();

  // Passo 1: Melhor jogador para a posição com pé preferencial
  sortedRequired.forEach((req) => {
    let best = availablePlayers.find(p => 
      !assignedIds.has(p.id) && 
      p.aptitude && p.aptitude[0] === req.zone && 
      (!req.preferredFoot || p.foot === req.preferredFoot || p.foot === "Ambidestro")
    );

    // Passo 2: Melhor jogador com aptidão secundária e pé preferencial
    if (!best) {
      best = availablePlayers.find(p => 
        !assignedIds.has(p.id) && 
        p.aptitude && p.aptitude.includes(req.zone) && 
        (!req.preferredFoot || p.foot === req.preferredFoot || p.foot === "Ambidestro")
      );
    }

    // Passo 3: Qualquer jogador com aptidão (independente do pé)
    if (!best) {
      best = availablePlayers.find(p => 
        !assignedIds.has(p.id) && 
        p.aptitude && p.aptitude.includes(req.zone)
      );
    }

    if (best) {
      newTitulares[req.index] = best;
      assignedIds.add(best.id);
    }
  });

  // Passo 4: Vagas restantes com os melhores que sobraram
  newTitulares.forEach((p, i) => {
    if (!p) {
      const next = availablePlayers.find(pl => !assignedIds.has(pl.id));
      if (next) {
        newTitulares[i] = next;
        assignedIds.add(next.id);
      }
    }
  });

  // Passo 3: Reconstrói o squad com exatamente 11 slots iniciais (mesmo se null)
  const finalSquad = new Array(11).fill(null);
  newTitulares.forEach((p, i) => {
    if (p) {
      p.status = "titular";
      finalSquad[i] = p;
    }
  });

  // Adiciona os reservas após o índice 10
  const reserves = squad.filter((p) => p && !assignedIds.has(p.id));
  reserves.forEach((p) => {
    p.status = "reserva";
    finalSquad.push(p);
  });

  squad.length = 0;
  squad.push(...finalSquad);
  saveToLocal();
}

export function swapTitulares(id1, id2) {
  // Troca APENAS as coordenadas da formação.
  // O render() usa o squad em memória em ordem, então mover as coords
  // é suficiente para trocar as posições visuais sem mutar o array.
  const titulares = squad.filter((p) => p.status === "titular");
  const idx1 = titulares.findIndex((p) => p.id === id1);
  const idx2 = titulares.findIndex((p) => p.id === id2);

  if (idx1 === -1 || idx2 === -1) return;

  const currentFormat = document.getElementById("formationSelect")?.value;
  if (currentFormat && formations[currentFormat]) {
    const tmp = formations[currentFormat][idx1];
    formations[currentFormat][idx1] = formations[currentFormat][idx2];
    formations[currentFormat][idx2] = tmp;
    saveToLocal();
  }
}

export function handlePlayerMove(playerId, dropX, dropY) {
  const pitchEl = document.getElementById("pitch");
  const rect = pitchEl.getBoundingClientRect();

  let left = ((dropX - rect.left) / rect.width) * 100;
  let top = ((dropY - rect.top) / rect.height) * 100;

  // Snap para uma grade de 1% (movimentação muito mais leve e precisa)
  left = Math.max(0, Math.min(100, Math.round(left)));
  top = Math.max(0, Math.min(100, Math.round(top)));

  const titulares = squad.filter((p) => p.status === "titular");
  const pIndex = titulares.findIndex((p) => p.id === playerId);

  if (pIndex !== -1) {
    const currentFormat = document.getElementById("formationSelect").value;
    if (formations[currentFormat] && formations[currentFormat][pIndex]) {
      formations[currentFormat][pIndex].l = left;
      formations[currentFormat][pIndex].t = top;
      saveToLocal();
    }
  }
}
