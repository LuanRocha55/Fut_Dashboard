// Tenta obter as funções do idbKeyval global
const idb = window.idbKeyval || {};
const get = async (...args) => {
  try {
    return idb.get ? await idb.get(...args) : null;
  } catch (e) {
    return null;
  }
};
const set = async (...args) => {
  try {
    if (idb.set) await idb.set(...args);
  } catch (e) {
    console.warn("Storage set falhou:", e);
  }
};
const del = async (...args) => {
  try {
    if (idb.del) await idb.del(...args);
  } catch (e) {
    console.warn("Storage del falhou:", e);
  }
};

let _activeSlot = null;
let _teamsListCache = null;

export const Storage = {
  async getTeamsList() {
    if (_teamsListCache) return _teamsListCache;
    try {
      const res = await fetch("data/teamsList.json", { cache: "no-store" });
      if (res.ok) {
        _teamsListCache = await res.json();
        return _teamsListCache;
      }
    } catch (e) {
      console.error("Falha ao carregar lista de times:", e);
    }
    return [];
  },

  async getActiveSlot() {
    if (_activeSlot) return _activeSlot;
    _activeSlot = (await get("activeSaveSlot")) || "default";
    return _activeSlot;
  },

  async setActiveSlot(id) {
    _activeSlot = id;
    await set("activeSaveSlot", id);
  },

  async getSlots() {
    return (await get("saveSlotsList")) || [];
  },

  async saveSlotsList(list) {
    await set("saveSlotsList", list);
  },

  async createSlot(name, teamFile, teamName) {
    const slots = await this.getSlots();
    const id = "save_" + Date.now();
    const newSlot = {
      id,
      name: name || "Nova Carreira",
      teamFile: teamFile || "desconhecido",
      teamName: teamName || "Sem Time",
      date: new Date().toLocaleDateString("pt-BR"),
      lastPlayed: Date.now(),
    };
    slots.push(newSlot);
    await this.saveSlotsList(slots);
    await this.setActiveSlot(id);
    return id;
  },

  async deleteSlot(id) {
    const slots = await this.getSlots();
    const filtered = slots.filter((s) => s.id !== id);
    await this.saveSlotsList(filtered);

    // Deletar todos os dados do slot
    const keys = [
      "squad_data",
      "futTactics",
      "matchHistory",
      "currentTeamFile",
      "currentFormation",
      "leagueData",
      "seasonHistory",
      "coachInfo",
    ];
    for (const key of keys) {
      const fullKey = id === "default" ? key : `${id}_${key}`;
      await del(fullKey);
    }

    if (_activeSlot === id) {
      _activeSlot = "default";
      await set("activeSaveSlot", "default");
    }
  },

  // Helper para prefixar chaves
  async k(key) {
    const slot = await this.getActiveSlot();
    return slot === "default" ? key : `${slot}_${key}`;
  },

  async getSquad() {
    return (await get(await this.k("squad_data"))) || null;
  },
  async saveSquad(squad) {
    await set(await this.k("squad_data"), squad);
  },
  async removeSquad() {
    await del(await this.k("squad_data"));
  },

  async getTactics() {
    return (await get(await this.k("futTactics"))) || null;
  },
  async saveTactics(tactics) {
    await set(await this.k("futTactics"), tactics);
  },
  async removeTactics() {
    await del(await this.k("futTactics"));
  },

  async getMatchHistory() {
    return (await get(await this.k("matchHistory"))) || null;
  },
  async saveMatchHistory(history) {
    await set(await this.k("matchHistory"), history);
  },

  async getCurrentTeamFile() {
    return await get(await this.k("currentTeamFile"));
  },
  async setCurrentTeamFile(file) {
    await set(await this.k("currentTeamFile"), file);
  },
  async removeCurrentTeamFile() {
    await del(await this.k("currentTeamFile"));
  },

  async getCurrentFormation() {
    return await get(await this.k("currentFormation"));
  },
  async setCurrentFormation(formation) {
    await set(await this.k("currentFormation"), formation);
  },

  async getLeagueData() {
    return (await get(await this.k("leagueData"))) || null;
  },
  async saveLeagueData(data) {
    await set(await this.k("leagueData"), data);
  },
  async removeLeagueData() {
    await del(await this.k("leagueData"));
  },

  async getSeasonHistory() {
    return (await get(await this.k("seasonHistory"))) || null;
  },
  async saveSeasonHistory(history) {
    await set(await this.k("seasonHistory"), history);
  },

  async getCoachInfo() {
    return (await get(await this.k("coachInfo"))) || null;
  },
  async saveCoachInfo(info) {
    if (info === null) {
      await del(await this.k("coachInfo"));
    } else {
      await set(await this.k("coachInfo"), info);
    }
  },
  async removeCoachInfo() {
    await del(await this.k("coachInfo"));
  },

  async getInbox() {
    return (await get(await this.k("inboxMessages"))) || [];
  },
  async saveInbox(messages) {
    await set(await this.k("inboxMessages"), messages);
  },
  async appendInboxMessage(msg) {
    const inbox = await this.getInbox();
    // Evita duplicatas pelo mesmo id no mesmo dia
    const today = new Date().toISOString().split("T")[0];
    const alreadyExists = inbox.some(m => m.id === msg.id && m.savedDate === today);
    if (alreadyExists) return;
    inbox.push({ ...msg, savedDate: today, timestamp: Date.now(), archived: false });
    // Mantém no máximo 100 mensagens
    if (inbox.length > 100) inbox.splice(0, inbox.length - 100);
    await this.saveInbox(inbox);
  },

  // --- CACHE DE ESCUDOS (BADGES) ---
  async getBadgeFromCache(name) {
    const cache = (await get("fut_badge_cache")) || {};
    return cache[name] || null;
  },

  async saveBadgeToCache(name, url) {
    const cache = (await get("fut_badge_cache")) || {};
    cache[name] = url;
    
    // Limpeza básica se o cache ficar muito grande (>1000 itens)
    const keys = Object.keys(cache);
    if (keys.length > 1000) {
      delete cache[keys[0]];
    }
    
    await set("fut_badge_cache", cache);
  },
};
