// get collection id from the URL
const params = new URLSearchParams(window.location.search);
const collectionId = params.get("id");

const title = document.getElementById("collection-title");
const container = document.getElementById("items-container");

async function loadCollection(){

    try{

        // TEST DATA - remove when backend is ready
        title.textContent = "Test Collection";
        const items = [
            { id: 1, name: "Item One", description: "A test description", value: 5 },
            { id: 2, name: "Item Two", description: "Another description", value: 12 },
        ];

        container.innerHTML = "";

        items.forEach(item => {

            const card = document.createElement("div");
            card.classList.add("item-card");

            card.innerHTML = `
                <div class="item-image-wrapper">
                    <img
                        src="/items/${item.id}/image"
                        alt="${item.name}"
                        class="item-image"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    />
                    <div class="item-image-placeholder" style="display:none;">No Image</div>
                </div>
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <p>Value: ${item.value}</p>
            `;

            container.appendChild(card);

        });

    }catch(error){
        console.error("Error loading collection:", error);
        container.innerHTML = "<p>Failed to load collection.</p>";
    }

}

loadCollection();