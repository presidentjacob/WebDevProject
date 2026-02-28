const logItemButton = document.querySelector(".new-item");
const itemFormPanel = document.querySelector("#item-form-panel");
const closeFormButton = document.querySelector(".close-form");

function setFormOpenState(isOpen) {
	if (!itemFormPanel) {
		return;
	}

	itemFormPanel.classList.toggle("is-open", isOpen);
	itemFormPanel.setAttribute("aria-hidden", String(!isOpen));
}

if (logItemButton && itemFormPanel) {
	logItemButton.addEventListener("click", () => {
		setFormOpenState(true);
	});

	itemFormPanel.addEventListener("click", (event) => {
		if (event.target === itemFormPanel) {
			setFormOpenState(false);
		}
	});
}

if (closeFormButton) {
	closeFormButton.addEventListener("click", () => {
		setFormOpenState(false);
	});
}

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
		setFormOpenState(false);
	}
});

