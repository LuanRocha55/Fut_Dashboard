let _dbgContainer = null;

export function dbgToast(msg, bg = "#222", duration = 4000) {
  // Logs desativados na interface a pedido do usuário
  // Mantendo apenas no console para depuração via F12
  console.log("[DBG]", msg);
}
