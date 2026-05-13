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

export const Storage = {
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
};
