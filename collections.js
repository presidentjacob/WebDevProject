// get collection id from the URL
const params = new URLSearchParams(window.location.search);
const collectionId = params.get("id");

const title = document.getElementById("collection-title");
const container = document.getElementById("items-container");

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
        container.innerHTML = "<p>No items in this list yet.</p>";

    }catch(error){
        console.error("Error loading collection:", error);
        container.innerHTML = "<p>Failed to load collection.</p>";
    }

}

loadCollection();