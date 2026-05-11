export function showCustomModal(
  message,
  type = "confirm",
  confirmClass = "btn-primary",
) {
  return new Promise((resolve) => {
    const modal = document.getElementById("customModal");
    const msgEl = document.getElementById("customModalMessage");
    const inputEl = document.getElementById("customModalInput");
    const btnOk = document.getElementById("customModalOk");
    const btnCancel = document.getElementById("customModalCancel");

    msgEl.innerHTML = message;
    btnOk.className = confirmClass;
    inputEl.value = "";

    if (type === "prompt") {
      inputEl.style.display = "block";
      btnCancel.style.display = "block";
      setTimeout(() => inputEl.focus(), 100);
    } else if (type === "alert") {
      inputEl.style.display = "none";
      btnCancel.style.display = "none";
    } else {
      inputEl.style.display = "none";
      btnCancel.style.display = "block";
    }

    const cleanup = () => {
      modal.classList.remove("show");
      btnOk.onclick = null;
      btnCancel.onclick = null;
    };

    btnOk.onclick = () => {
      cleanup();
      resolve(type === "prompt" ? inputEl.value : true);
    };
    btnCancel.onclick = () => {
      cleanup();
      resolve(type === "prompt" ? null : false);
    };
    modal.classList.add("show");
  });
}
