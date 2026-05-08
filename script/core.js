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
    const sal = stats.sal || stats.div || stats.def || 75; // Salto
    const man = stats.man || stats.han || stats.def || 75; // Manejo
    const rep = stats.rep || stats.kic || stats.pas || 60; // Reposição
    const ref = stats.ref || stats.def || 75; // Reflexo
    const vel = stats.vel || stats.spd || stats.pac || 40; // Velocidade
    const pos = stats.pos || stats.def || 75; // Posicionamento
    avg = (sal + man + rep + ref + vel + pos) / 6;
  } else {
    const vel = stats.vel || stats.pac || stats.spd || 50;
    const fin = stats.fin || stats.sho || stats.atk || 50;
    const pas = stats.pas || 50;
    const dri = stats.dri || stats.atk || 50;
    const def = stats.def || 50;
    const fis = stats.fis || stats.phy || stats.str || 50;
    avg = (vel + fin + pas + dri + def + fis) / 6;
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
    stats: { vel: 50, fin: 50, pas: 50, dri: 50, def: 50, fis: 50 },
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

    let remoteData = { squad: null, tactics: null, matchInfo: null };
    let fetchSuccess = false;

    try {
      // O "?t=..." impede que o navegador grave o data.json e fique te mostrando a versão velha
      const response = await fetch("data/vasco.json?t=" + new Date().getTime());
      if (response.ok) {
        remoteData = await response.json();
        fetchSuccess = true;
        Object.assign(matchInfo, remoteData.matchInfo || {});
      }
    } catch (e) {
      console.warn("Aviso: Falha ao baixar JSON (Provavelmente rodando sem Live Server). Tentando recuperar pelo cache...");
    }

    // Fallback de segurança garantida
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

    if (savedTactics && fetchSuccess && remoteData.tactics) {
      let updated = false;
      for (let f in remoteData.tactics) {
        if (!formations[f]) { formations[f] = remoteData.tactics[f]; updated = true; }
      }
      if (updated) saveToLocal();
    }

    if (savedSquad) {
      const localSquad = JSON.parse(savedSquad);
      // Trava de segurança: Verifica se precisa migrar baseado no JSON apenas se a leitura do JSON foi um sucesso
      if (fetchSuccess && remoteData.squad && ((localSquad.length > 0 && localSquad[0].positions) || localSquad.length !== remoteData.squad.length || localSquad[0].rating === undefined)) {
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
    } else if (fetchSuccess && remoteData.squad) {
      remoteData.squad.forEach(p => {
        if (!p.aptitude) p.aptitude = p.positions || ["CA"];
        p.rating = calculateOVR(p.stats, p.form, p.aptitude[0] === "GL");
      });
      squad.push(...remoteData.squad);
      saveToLocal();
    } else {
      console.error("Nenhum dado local salvo e falha ao ler arquivo. A prancheta ficará vazia.");
      return false; // Força a exibição do modal de erro crítico do Live Server
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