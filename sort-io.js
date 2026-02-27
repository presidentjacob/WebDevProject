const logItemButton = document.querySelector(".new-item");
const itemFormPanel = document.querySelector("#item-form-panel");

if (logItemButton && itemFormPanel) {
	logItemButton.addEventListener("click", () => {
		const isOpen = itemFormPanel.classList.toggle("is-open");
		itemFormPanel.setAttribute("aria-hidden", String(!isOpen));
	});
}

