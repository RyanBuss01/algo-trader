const socket = io(window.parent.serverPath);


window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tickerValue = urlParams.get('ticker');
    socket.emit('getStockPageData', tickerValue);
};

socket.on('getStockPageData', (data) => {
    const recentPrices = data.slice(-250).map(b=> b.ClosePrice);
    const labels = [];
    let currentDate = new Date(); // Today's date
    for (let i = 249; i >= 0; i--) {
        labels.unshift(currentDate.toLocaleDateString()); // Add formatted date
        currentDate.setDate(currentDate.getDate() - 1);  // Go back one day
    }

    const ctx = document.getElementById('stockChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Closing Price',
                data: recentPrices,
                borderColor: 'blue', // Customize as needed
                borderWidth: 1
            }]
        },
        options: { // Chart styling options here (title, axes, etc.)
            
        }
    });
})
