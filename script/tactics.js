import { squad, formations, saveToLocal } from './core.js';

export function getEfootballPosition(top, left) {
  // Goleiro
  if (left <= 14) return "GL";

  // Laterais / Meias / Pontas (Flancos)
  if (top <= 22) {
    if (left <= 42) return "LE";
    if (left <= 71) return "ME";
    return "PE";
  }
  if (top >= 78) {
    if (left <= 42) return "LD";
    if (left <= 71) return "MD";
    return "PD";
  }

  // Corredor Central Enfileirado (22 < top < 78)
  if (left > 14 && left <= 28) return top < 50 ? "ZE" : "ZD";
  if (left > 28 && left <= 42) return "VOL";
  if (left > 42 && left <= 57) return "MC";
  if (left > 57 && left <= 71) return "MEI";
  if (left > 71 && left <= 85) return "SA";
  return "CA";
}

export function checkPositionFit(player, currentZone) {
  if (!currentZone || !player.aptitude) return "fit-perfect";
  const isApt = player.aptitude.includes(currentZone);
  return isApt ? "fit-perfect" : "fit-warning";
}

export function autoFillTeam() {
  const currentFormat = document.getElementById("formationSelect").value;
  const format = formations[currentFormat];
  if (!format) return;

  const requiredPositions = format.map((pos, index) => ({
    pos: getEfootballPosition(pos.t, pos.l),
    index: index,
  }));

  const availablePlayers = [...squad].sort((a, b) => b.rating - a.rating);
  const newTitulares = new Array(11).fill(null);
  const assignedPlayerIds = new Set();

  // Passo 1: Preencher com a melhor aptidão e nota
  requiredPositions.forEach((req) => {
    const bestFitIndex = availablePlayers.findIndex(
      (p) => p.aptitude && p.aptitude.includes(req.pos) && !assignedPlayerIds.has(p.id)
    );
    if (bestFitIndex !== -1) {
      const player = availablePlayers[bestFitIndex];
      newTitulares[req.index] = player;
      assignedPlayerIds.add(player.id);
    }
  });

  // Passo 2: Preencher vagas restantes com as maiores notas
  newTitulares.forEach((p, i) => {
    if (!p) {
      const nextBestPlayer = availablePlayers.find(player => !assignedPlayerIds.has(player.id));
      if (nextBestPlayer) {
        newTitulares[i] = nextBestPlayer;
        assignedPlayerIds.add(nextBestPlayer.id);
      }
    }
  });

  // Passo 3: Remontar o array 'squad' original, alterando o status
  const finalSquad = [];
  newTitulares.forEach(p => { if (p) { p.status = "titular"; finalSquad.push(p); } });
  const reserves = squad.filter(p => !assignedPlayerIds.has(p.id));
  reserves.forEach(p => { p.status = "reserva"; finalSquad.push(p); });

  // Muta o array original para refletir as mudanças
  squad.length = 0;
  squad.push(...finalSquad);

  saveToLocal();
}

export function swapTitulares(id1, id2) {
  const titulares = squad.filter((p) => p.status === "titular");
  const idx1 = titulares.findIndex((p) => p.id === id1);
  const idx2 = titulares.findIndex((p) => p.id === id2);

  if (idx1 !== -1 && idx2 !== -1) {
    const currentFormat = document.getElementById("formationSelect").value;
    if (formations[currentFormat]) {
      // Troca as coordenadas t e l no template da formação
      [formations[currentFormat][idx1], formations[currentFormat][idx2]] = 
      [formations[currentFormat][idx2], formations[currentFormat][idx1]];
      saveToLocal();
    }
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