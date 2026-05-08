export let squad = [];
export let formations = {};
export let defaultFormations = {};
export let matchInfo = {};
export let activePlayerId = null;

export const ALL_POSITIONS = [
  "GL", "ZE", "ZD", "LE", "LD", "ME", "MD",
  "VOL", "MC", "MEI", "PE", "PD", "SA", "CA",
];

export function setActivePlayerId(id) {
  activePlayerId = id;
}

export function calculateOVR(stats, form = 0, isGK = false) {
  if (!stats) return 5.0; // Média mínima padrão
  
  let avg;
  if (isGK) {
    const div = stats.div || stats.def || 75; // Salto (Herda defesa se for legado)
    const han = stats.han || stats.def || 75; // Manejo
    const kic = stats.kic || stats.pas || 60; // Reposição
    const ref = stats.ref || stats.def || 75; // Reflexo
    const spd = stats.spd || stats.pac || 40; // Velocidade
    const pos = stats.pos || stats.def || 75; // Posicionamento
    avg = (div + han + kic + ref + spd + pos) / 6;
  } else {
    const pac = stats.pac || stats.spd || 50;
    const sho = stats.sho || stats.atk || 50;
    const pas = stats.pas || 50;
    const dri = stats.dri || stats.atk || 50;
    const def = stats.def || 50;
    const phy = stats.phy || stats.str || 50;
    avg = (pac + sho + pas + dri + def + phy) / 6;
  }
  
  const baseOVR = avg / 10;
  const formModifier = form * 0.5; // (Excelente = 2 -> +1.0) | (Boa = 1 -> +0.5) | (Ruim = -1 -> -0.5)
  
  let finalOVR = baseOVR + formModifier;
  if (finalOVR > 10) finalOVR = 10.0; // Teto Máximo
  if (finalOVR < 1) finalOVR = 1.0;   // Piso Mínimo
  
  return parseFloat(finalOVR.toFixed(1)); 
}

export function saveToLocal() {
  localStorage.setItem("squad_data", JSON.stringify(squad));
  localStorage.setItem("futTactics", JSON.stringify(formations));
}

export function resetData() {
  localStorage.removeItem("squad_data");
  localStorage.removeItem("futTactics");
  location.reload();
}

export function updatePlayerData(id, data) {
  const pIndex = squad.findIndex((x) => x.id === id);
  if (pIndex > -1) {
    // Se o jogador atualizado for o novo capitão, desmarca os outros
    if (data.captain) {
      squad.forEach((player) => {
        if (player.id !== id) player.captain = false;
      });
    }
    // Atualiza os dados do jogador
    squad[pIndex] = { ...squad[pIndex], ...data };
    saveToLocal();
  }
}

export function performSwap(titularId, reserveId) {
  const tIndex = squad.findIndex((p) => p.id === titularId);
  const rIndex = squad.findIndex((p) => p.id === reserveId);

  if (tIndex !== -1 && rIndex !== -1) {
    squad[tIndex].status = "reserva";
    squad[rIndex].status = "titular";

    // Troca a posição física deles no array para manter a ordem tática
    const temp = squad[tIndex];
    squad[tIndex] = squad[rIndex];
    squad[rIndex] = temp;

    saveToLocal();
  }
}

export function downloadJSON() {
  const dataToSave = {
    matchInfo: matchInfo,
    squad: squad,
    tactics: formations,
  };
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(dataToSave, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "data.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function addNewPlayer() {
  const newId = squad.length > 0 ? Math.max(...squad.map(p => p.id)) + 1 : 1;
  const newPlayer = {
    id: newId,
    name: "Novo Jogador",
    number: 99,
    status: "reserva",
    aptitude: ["MC"],
    age: 20,
    foot: "Destro",
    nationality: "BR",
    playstyle: "Meia Versátil",
    form: 0,
    matchStatus: "normal",
    stats: { pac: 50, sho: 50, pas: 50, dri: 50, def: 50, phy: 50 },
    rating: 5.0,
    captain: false
  };
  squad.push(newPlayer);
  saveToLocal();
  return newId;
}

export function removePlayer(id) {
  const index = squad.findIndex(p => p.id === id);
  if (index !== -1) { squad.splice(index, 1); saveToLocal(); }
}

// =========================================================
// INTEGRAÇÃO API (Modo Live Strategy e Scouting)
// =========================================================
export const API_KEY = 'SUA_CHAVE_AQUI'; // Substitua quando criar a conta na RapidAPI

export async function syncRealData() {
  try {
    console.log("Iniciando varredura da API...");
    // const response = await fetch('https://v3.football.api-sports.io/fixtures?team=131&next=1', {
    //     headers: { 'x-rapidapi-key': API_KEY }
    // });
    // const data = await response.json(); return data.response;
    return { status: "Aguardando Chave API" };
  } catch (error) {
    console.error("Erro ao sincronizar dados da API:", error);
  }
}

export async function initSystem() {
  try {
    const savedSquad = localStorage.getItem("squad_data");
    const savedTactics = localStorage.getItem("futTactics");

    // O "?t=..." impede que o navegador grave o data.json e fique te mostrando a versão velha
    const response = await fetch("data/vasco.json?t=" + new Date().getTime());
    const remoteData = await response.json();
    
    // O 'Object.assign' permite que as variáveis exportadas sejam modificadas
    Object.assign(matchInfo, remoteData.matchInfo || {});
    
    // Fallback de segurança: Se o arquivo JSON não tiver a chave "tactics" (ex: um json focado só no elenco)
    const fallbackTactics = {
      "4-2-3-1": [
        { "t": 50, "l": 5 }, { "t": 20, "l": 20 }, { "t": 80, "l": 20 }, { "t": 35, "l": 20 }, { "t": 65, "l": 20 },
        { "t": 35, "l": 40 }, { "t": 65, "l": 40 }, { "t": 20, "l": 65 }, { "t": 80, "l": 65 }, { "t": 50, "l": 65 }, { "t": 50, "l": 85 }
      ],
      "4-3-3": [
        { "t": 50, "l": 5 }, { "t": 20, "l": 20 }, { "t": 80, "l": 20 }, { "t": 35, "l": 20 }, { "t": 65, "l": 20 },
        { "t": 50, "l": 40 }, { "t": 25, "l": 50 }, { "t": 75, "l": 50 }, { "t": 20, "l": 80 }, { "t": 80, "l": 80 }, { "t": 50, "l": 85 }
      ]
    };
    
    const tacticsData = remoteData.tactics || fallbackTactics;

    Object.assign(defaultFormations, JSON.parse(JSON.stringify(tacticsData)));
    const loadedFormations = savedTactics ? JSON.parse(savedTactics) : tacticsData;
    Object.assign(formations, loadedFormations);

    if (savedTactics) {
      let updated = false;
      for (let f in remoteData.tactics) {
        if (!formations[f]) { formations[f] = remoteData.tactics[f]; updated = true; }
      }
      if (updated) saveToLocal();
    }

    if (savedSquad) {
      const localSquad = JSON.parse(savedSquad);
      // Trava de segurança: Se o cache for antigo ou algum jogador estiver sem nota (undefined)
      if ((localSquad.length > 0 && localSquad[0].positions) || localSquad.length !== remoteData.squad.length || localSquad[0].rating === undefined) {
        console.log("Atualização de Arquitetura ou Elenco Detectada. Migrando...");
        remoteData.squad.forEach(p => {
          if (!p.aptitude) p.aptitude = p.positions || ["CA"];
          p.rating = calculateOVR(p.stats, p.form, p.aptitude[0] === "GL");
        });
        squad.push(...remoteData.squad);
        saveToLocal();
      } else {
        console.log("Dados carregados do cache local.");
        localSquad.forEach(p => {
          if (!p.aptitude) p.aptitude = p.positions || ["CA"];
          p.rating = calculateOVR(p.stats, p.form, p.aptitude[0] === "GL");
        });
        squad.push(...localSquad);
      }
    } else {
      remoteData.squad.forEach(p => {
        if (!p.aptitude) p.aptitude = p.positions || ["CA"];
        p.rating = calculateOVR(p.stats, p.form, p.aptitude[0] === "GL");
      });
      squad.push(...remoteData.squad);
      saveToLocal();
    }
    return true; // Sucesso
  } catch (error) {
    console.error("Erro ao carregar o sistema tático:", error);
    return false; // Falha
  }
}

export function resetFormationAlignment(formationName) {
  if (defaultFormations[formationName]) {
    formations[formationName] = JSON.parse(JSON.stringify(defaultFormations[formationName]));
    saveToLocal();
  }
}