import { get, set, del } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

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
};
