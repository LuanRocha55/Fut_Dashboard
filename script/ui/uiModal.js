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
      btnOk.style.display = "block";
      btnCancel.style.display = "block";
      setTimeout(() => inputEl.focus(), 100);
    } else if (type === "alert") {
      inputEl.style.display = "none";
      btnOk.style.display = "block";
      btnCancel.style.display = "none";
    } else if (type === "custom") {
      inputEl.style.display = "none";
      btnOk.style.display = "none";
      btnCancel.style.display = "none";
      // Setup custom listeners in the next tick
      setTimeout(() => {
        const maleBtn = document.getElementById("modalSelectMale");
        const femaleBtn = document.getElementById("modalSelectFemale");
        if (maleBtn)
          maleBtn.onclick = () => {
            cleanup();
            resolve("male");
          };
        if (femaleBtn)
          femaleBtn.onclick = () => {
            cleanup();
            resolve("female");
          };

        const cards = document.querySelectorAll(".save-slot-card");
        cards.forEach((card) => {
          card.onclick = (e) => {
            if (
              e.target.classList.contains("delete-save-btn") ||
              e.target.classList.contains("select-save-btn")
            )
              return;
            cleanup();
            resolve(`load:${card.dataset.id}`);
          };
        });

        const selectBtns = document.querySelectorAll(".select-save-btn");
        selectBtns.forEach((btn) => {
          btn.onclick = () => {
            cleanup();
            resolve(`load:${btn.dataset.id}`);
          };
        });

        const delBtns = document.querySelectorAll(".delete-save-btn");
        delBtns.forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            cleanup();
            resolve(`delete:${btn.dataset.id}`);
          };
        });

        const resetAllBtn = document.getElementById("resetAllDataBtn");
        if (resetAllBtn) {
          resetAllBtn.onclick = () => {
            cleanup();
            resolve("confirm_reset");
          };
        }

        const editSquadsBtn = document.getElementById("editSquadsBtn");
        if (editSquadsBtn) {
          editSquadsBtn.onclick = () => {
            cleanup();
            resolve("edit_squads");
          };
        }

        const modalBackBtn = document.getElementById("modalBackBtn");
        if (modalBackBtn) {
          modalBackBtn.onclick = () => {
            cleanup();
            resolve("back");
          };
        }
      }, 10);
    } else {
      inputEl.style.display = "none";
      btnOk.style.display = "block";
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
