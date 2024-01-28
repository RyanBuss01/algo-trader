const socket = io(window.parent.serverPath);
const searchBar = document.getElementById('indexSearch');
const resultsContainer = document.getElementById('indexSearchResults');
const selctedStockDiv = document.getElementById('selectedStock');
let currentDisplayedItem = null;
let selectedStock = null

let searchResultClick = (ticker) => {
    searchBar.value = '';
    resultsContainer.innerHTML = '';
    selectedStock = ticker

    document.getElementById('contentFrame').src = 'stock.html?ticker=' + encodeURIComponent(selectedStock.toUpperCase());
}



searchBar.addEventListener('input', () => {

    const query = searchBar.value;
    if (query === '') {
        resultsContainer.innerHTML = ''; 
        return;
    }

    socket.emit('searchTicker', query);
});

socket.on('searchResults', (results) => {
    resultsContainer.innerHTML = ''; // Clear previous results
    results.forEach(result => {
        if (result !== currentDisplayedItem) { // Check if result is not the current displayed item
            const resultItem = document.createElement('div');
            resultItem.textContent = result;
            resultItem.classList.add('clickable-result');
            resultItem.addEventListener('click', () => searchResultClick(result));
            resultsContainer.appendChild(resultItem);
        }
    });
});