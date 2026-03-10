const STORAGE_KEY = "sortio-lists";

const createListForm = document.querySelector("#create-list-form");
const listTitleInput = document.querySelector("#list-title");
const listDescriptionInput = document.querySelector("#list-description");
const listGrid = document.querySelector("#list-grid");
const emptyListState = document.querySelector("#empty-list-state");
const newListShortcut = document.querySelector("#new-list-shortcut");

function readLists() {
	const storedLists = localStorage.getItem(STORAGE_KEY);
	if (!storedLists) {
		return [];
	}

	try {
		const parsed = JSON.parse(storedLists);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveLists(lists) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

function createCardMarkup(list) {
	return `
		<article class="list-card">
			<h2>${list.title}</h2>
			<p>${list.description || "No description yet."}</p>
			<button type="button">View List</button>
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

if (createListForm && listTitleInput && listDescriptionInput) {
	let lists = readLists();
	renderLists(lists);

	createListForm.addEventListener("submit", (event) => {
		event.preventDefault();

		const title = listTitleInput.value.trim();
		const description = listDescriptionInput.value.trim();
		if (!title) {
			listTitleInput.focus();
			return;
		}

		const newList = {
			title,
			description,
			id: `${Date.now()}-${Math.random().toString(16).slice(2)}`
		};

		lists = [...lists, newList];
		saveLists(lists);
		renderLists(lists);
		createListForm.reset();
		listTitleInput.focus();
	});
}

if (newListShortcut && listTitleInput) {
	newListShortcut.addEventListener("click", () => {
		listTitleInput.focus();
	});
}
