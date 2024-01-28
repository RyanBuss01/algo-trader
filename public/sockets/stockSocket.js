window.onload = function() {
    // Function to get query parameters
    function getQueryParam(param) {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Retrieve the ticker from the query parameters
    var ticker = getQueryParam('ticker');

    if (ticker) {
        // Run your script with the ticker
        // For example, display it in stockDetailsContainer
        document.getElementById('stockDetailsContainer').textContent = 'Details for stock: ' + ticker;

        // Here, you can add more logic or call other functions based on the ticker
    }
};
