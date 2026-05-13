export let showOnlyFitPlayers = false;

export function toggleFitFilter() {
  showOnlyFitPlayers = !showOnlyFitPlayers;
  return showOnlyFitPlayers;
}
