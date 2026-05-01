// get collection id from the URL
const params = new URLSearchParams(window.location.search);
const collectionId = params.get("id");

const title = document.getElementById("collection-title");
const container = document.getElementById("items-container");
const logItemButton = document.querySelector(".new-item");
const itemFormPanel = document.getElementById("item-form-panel");
const itemForm = document.getElementById("item-form");
const closeItemFormButton = document.getElementById("close-item-form");
const listSelect = document.getElementById("log-list-select");
const itemNameInput = document.getElementById("item-name");
const itemPhotoInput = document.getElementById("item-photo");
const itemRatingInput = document.getElementById("item-rating");
const itemPriceInput = document.getElementById("item-price");
const itemQuantityInput = document.getElementById("item-quantity");
const itemNotesInput = document.getElementById("item-notes");
const itemSortSelect = document.getElementById("item-sort-select");
const formFeedback = document.getElementById("item-form-feedback");
const formHeading = itemForm?.querySelector("h2");
const itemSubmitButton = itemForm?.querySelector('button[type="submit"]');

let allItems = [];
let renderedItems = [];
let editingItem = null;

function formatPrice(price) {
    if (price === null || price === undefined || Number.isNaN(Number(price))) {
        return "No price";
    }
    return `$${Number(price).toFixed(2)}`;
}

function createItemMarkup(item) {
    const imageMarkup = item.photo_data_url
        ? `<img src="${item.photo_data_url}" alt="${item.name}" class="item-image">`
        : `<div class="item-image-placeholder">No Image</div>`;

    return `
        <article class="item-card">
            <div class="item-image-wrapper">${imageMarkup}</div>
            <h3>${item.name}</h3>
            <p>Rating: ${item.rating ?? "N/A"}</p>
            <p>Price: ${formatPrice(item.price)}</p>
            <p>Quantity: ${item.quantity}</p>
            <p>${item.notes || "No notes."}</p>
            <div class="item-actions">
                <button type="button" class="edit-item-button" data-item-id="${item.id}">Edit</button>
                <button type="button" class="delete-item-button" data-item-id="${item.id}">Delete</button>
            </div>
        </article>
    `;
}

function renderItems(items) {
    if (!container) {
        return;
    }

    renderedItems = items;

    if (!items.length) {
        container.innerHTML = "<p>No items in this list yet.</p>";
        return;
    }

    container.innerHTML = items.map(createItemMarkup).join("");
}

function toSortableNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function sortItems(items, sortValue) {
    const sorted = [...items];

    if (sortValue === "newest") {
        return sorted;
    }

    const [field, direction] = String(sortValue || "").split("-");
    if (!field || !direction) {
        return sorted;
    }

    const directionMultiplier = direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
        const aValue = toSortableNumber(a[field]);
        const bValue = toSortableNumber(b[field]);

        if (aValue === null && bValue === null) {
            return 0;
        }
        if (aValue === null) {
            return 1;
        }
        if (bValue === null) {
            return -1;
        }

        return (aValue - bValue) * directionMultiplier;
    });

    return sorted;
}

function applyCurrentSort() {
    const sortValue = itemSortSelect?.value || "newest";
    renderItems(sortItems(allItems, sortValue));
}

function setFormMode(isEditing) {
    if (formHeading) {
        formHeading.textContent = isEditing ? "Edit Item" : "Log Item";
    }

    if (itemSubmitButton) {
        itemSubmitButton.textContent = isEditing ? "Update Item" : "Save Item";
    }
}

function resetFormToCreateMode() {
    editingItem = null;
    setFormMode(false);

    if (listSelect) {
        listSelect.disabled = false;
        listSelect.value = collectionId || listSelect.value;
    }

    if (itemForm) {
        itemForm.reset();
    }

    if (itemQuantityInput) {
        itemQuantityInput.value = "1";
    }
}

function startEditingItem(itemId) {
    const target = renderedItems.find((item) => String(item.id) === String(itemId));
    if (!target) {
        return;
    }

    editingItem = target;
    setFormMode(true);

    if (listSelect) {
        listSelect.value = String(collectionId);
        listSelect.disabled = true;
    }

    if (itemNameInput) {
        itemNameInput.value = target.name || "";
    }

    if (itemRatingInput) {
        itemRatingInput.value = target.rating ?? "";
    }

    if (itemPriceInput) {
        itemPriceInput.value = target.price ?? "";
    }

    if (itemQuantityInput) {
        itemQuantityInput.value = target.quantity ?? "1";
    }

    if (itemNotesInput) {
        itemNotesInput.value = target.notes || "";
    }

    if (itemPhotoInput) {
        itemPhotoInput.value = "";
    }

    if (formFeedback) {
        formFeedback.textContent = "";
    }

    openItemForm();
}

async function deleteItem(itemId) {
    const confirmed = window.confirm("Delete this item from the list?");
    if (!confirmed) {
        return;
    }

    await apiFetch(`/api/lists/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE"
    });

    await loadItems(collectionId);
}

async function loadListsIntoSelect(selectedListId) {
    if (!listSelect) {
        return;
    }

    const listsResult = await apiFetch("/api/lists");
    const lists = listsResult.lists || [];

    listSelect.innerHTML = lists
        .map((list) => {
            const selected = String(list.id) === String(selectedListId) ? " selected" : "";
            return `<option value="${list.id}"${selected}>${list.title}</option>`;
        })
        .join("");
}

async function loadItems(listId) {
    const itemsResult = await apiFetch(`/api/lists/${encodeURIComponent(listId)}/items`);
    allItems = itemsResult.items || [];
    applyCurrentSort();
}

function openItemForm() {
    if (!itemFormPanel) {
        return;
    }
    itemFormPanel.classList.add("is-open");
    itemFormPanel.setAttribute("aria-hidden", "false");
    if (formFeedback) {
        formFeedback.textContent = "";
    }
    if (itemNameInput) {
        itemNameInput.focus();
    }
}

function closeItemForm() {
    if (!itemFormPanel) {
        return;
    }
    itemFormPanel.classList.remove("is-open");
    itemFormPanel.setAttribute("aria-hidden", "true");
    resetFormToCreateMode();
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read photo."));
        reader.readAsDataURL(file);
    });
}

async function loadCollection(){
    try{
        if (!requireSignedIn()) {
            return;
        }

        if (!collectionId) {
            title.textContent = "Collection";
            container.innerHTML = "<p>Missing collection ID.</p>";
            return;
        }

        const result = await apiFetch(`/api/lists/${encodeURIComponent(collectionId)}`);
        const selectedList = result.list;

        title.textContent = selectedList?.title || "Collection";
        await loadListsIntoSelect(collectionId);
        await loadItems(collectionId);

    }catch(error){
        console.error("Error loading collection:", error);
        container.innerHTML = "<p>Failed to load collection.</p>";
    }

}

if (logItemButton) {
    logItemButton.addEventListener("click", () => {
        openItemForm();
    });
}

if (closeItemFormButton) {
    closeItemFormButton.addEventListener("click", closeItemForm);
}

if (itemFormPanel) {
    itemFormPanel.addEventListener("click", (event) => {
        if (event.target === itemFormPanel) {
            closeItemForm();
        }
    });
}

if (container) {
    container.addEventListener("click", async (event) => {
        const editButton = event.target.closest(".edit-item-button");
        if (editButton) {
            startEditingItem(editButton.dataset.itemId);
            return;
        }

        const deleteButton = event.target.closest(".delete-item-button");
        if (!deleteButton) {
            return;
        }

        try {
            await deleteItem(deleteButton.dataset.itemId);
        } catch (error) {
            alert(error.message || "Failed to delete item.");
        }
    });
}

if (itemSortSelect) {
    itemSortSelect.addEventListener("change", () => {
        applyCurrentSort();
    });
}

if (itemForm) {
    itemForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!collectionId) {
            return;
        }

        const listId = listSelect?.value || collectionId;
        const name = itemNameInput?.value.trim() || "";
        const rating = itemRatingInput?.value || "";
        const price = itemPriceInput?.value || "";
        const quantity = itemQuantityInput?.value || "1";
        const notes = itemNotesInput?.value.trim() || "";

        if (!name) {
            if (formFeedback) {
                formFeedback.textContent = "Item name is required.";
            }
            return;
        }

        try {
            let photoDataUrl = null;
            const file = itemPhotoInput?.files?.[0];
            if (file) {
                photoDataUrl = await readFileAsDataUrl(file);
            }

            const method = editingItem ? "PUT" : "POST";
            const endpoint = editingItem
                ? `/api/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(editingItem.id)}`
                : `/api/lists/${encodeURIComponent(listId)}/items`;

            await apiFetch(endpoint, {
                method,
                body: JSON.stringify({
                    name,
                    photoDataUrl: photoDataUrl ?? editingItem?.photo_data_url ?? null,
                    rating,
                    price,
                    quantity,
                    notes
                })
            });

            if (formFeedback) {
                formFeedback.textContent = editingItem ? "Item updated." : "Item saved.";
            }

            if (String(listId) === String(collectionId)) {
                await loadItems(collectionId);
            }

            closeItemForm();
        } catch (error) {
            if (formFeedback) {
                formFeedback.textContent = error.message || "Failed to save item.";
            }
        }
    });
}

resetFormToCreateMode();
loadCollection();