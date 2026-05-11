// Tenta obter as funções do idbKeyval global
const idb = window.idbKeyval || {};
const get = async (...args) => { try { return idb.get ? await idb.get(...args) : null; } catch(e) { return null; } };
const set = async (...args) => { try { if (idb.set) await idb.set(...args); } catch(e) { console.warn('Storage set falhou:', e); } };
const del = async (...args) => { try { if (idb.del) await idb.del(...args); } catch(e) { console.warn('Storage del falhou:', e); } };

export const Storage = {
  async getSquad() {
    return (await get("squad_data")) || null;
  },
  async saveSquad(squad) {
    await set("squad_data", squad);
  },
  async removeSquad() {
    await del("squad_data");
  },

  async getTactics() {
    return (await get("futTactics")) || null;
  },
  async saveTactics(tactics) {
    await set("futTactics", tactics);
  },
  async removeTactics() {
    await del("futTactics");
  },

  async getMatchHistory() {
    return (await get("matchHistory")) || null;
  },
  async saveMatchHistory(history) {
    await set("matchHistory", history);
  },

  async getCurrentTeamFile() {
    return await get("currentTeamFile");
  },
  async setCurrentTeamFile(file) {
    await set("currentTeamFile", file);
  },
  async removeCurrentTeamFile() {
    await del("currentTeamFile");
  },

  async getCurrentFormation() {
    return await get("currentFormation");
  },
  async setCurrentFormation(formation) {
    await set("currentFormation", formation);
  },

  async getLeagueData() {
    return (await get("leagueData")) || null;
  },
  async saveLeagueData(data) {
    await set("leagueData", data);
  },
  async removeLeagueData() {
    await del("leagueData");
  },

  async getSeasonHistory() {
    return (await get("seasonHistory")) || null;
  },
  async saveSeasonHistory(history) {
    await set("seasonHistory", history);
  },
  
  async getCoachInfo() {
    return (await get("coachInfo")) || null;
  },
  async saveCoachInfo(info) {
    if (info === null) { await del("coachInfo"); }
    else { await set("coachInfo", info); }
  },
  async removeCoachInfo() {
    await del("coachInfo");
  }
};
