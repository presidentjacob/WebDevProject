const createListForm = document.querySelector("#create-list-form");
const listTitleInput = document.querySelector("#list-title");
const listDescriptionInput = document.querySelector("#list-description");
const listGrid = document.querySelector("#list-grid");
const emptyListState = document.querySelector("#empty-list-state");
const newListShortcut = document.querySelector("#new-list-shortcut");
const sessionLabel = document.querySelector("#session-label");
const logoutButton = document.querySelector("#logout-button");

function createCardMarkup(list) {
	return `
		<article class="list-card">
			<h2>${list.title}</h2>
			<p>${list.description || "No description yet."}</p>
			<button type="button" onclick="window.location.href='collections.html?id=${encodeURIComponent(list.id)}'">View List</button>
		</article>
	`;
}

function renderLists(lists) {
	if (!listGrid || !emptyListState) {
		return;
	}

	emptyListState.style.display = lists.length === 0 ? "block" : "none";
	listGrid.innerHTML = lists.map(createCardMarkup).join("");
}

async function loadSessionAndLists() {
	if (!requireSignedIn()) {
		return;
	}

	try {
		const meResult = await apiFetch("/api/auth/me");
		if (sessionLabel) {
			sessionLabel.textContent = `Signed in as ${meResult.user.username}`;
		}

		const listsResult = await apiFetch("/api/lists");
		renderLists(listsResult.lists || []);
	} catch (error) {
		console.error("Failed to load session or lists:", error);
		clearToken();
		window.location.href = "index.html";
	}
}

if (createListForm && listTitleInput && listDescriptionInput) {
	loadSessionAndLists();

	createListForm.addEventListener("submit", async (event) => {
		event.preventDefault();

		const title = listTitleInput.value.trim();
		const description = listDescriptionInput.value.trim();
		if (!title) {
			listTitleInput.focus();
			return;
		}

		try {
			await apiFetch("/api/lists", {
				method: "POST",
				body: JSON.stringify({ title, description })
			});

			const listsResult = await apiFetch("/api/lists");
			renderLists(listsResult.lists || []);
			createListForm.reset();
			listTitleInput.focus();
		} catch (error) {
			console.error("Failed to create list:", error);
			alert(error.message);
		}
	});
}

if (newListShortcut && listTitleInput) {
	newListShortcut.addEventListener("click", () => {
		listTitleInput.focus();
	});
}

if (logoutButton) {
	logoutButton.addEventListener("click", () => {
		clearToken();
		window.location.href = "index.html";
	});
}
