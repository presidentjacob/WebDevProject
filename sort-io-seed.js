(() => {
	const storageKey = "sortio-lists";
	const existingLists = localStorage.getItem(storageKey);

	if (!existingLists) {
		const demoLists = [
			{
				id: "demo-collection-1",
				title: "2025 Top Movies",
				description: "Ranking of Favorite Movies Released in 2025"
			}
		];

		localStorage.setItem(storageKey, JSON.stringify(demoLists));
	}
})();
