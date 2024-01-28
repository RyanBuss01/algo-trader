const socket = io(window.parent.serverPath);
var options = []

var optionsListDiv = document.getElementById('optionsList')
var addOptionButton = document.getElementById('addOption')
var runPredictionButton = document.getElementById('runPrediction')


addOptionButton.addEventListener('click', function () {
    let i = options.length;
    options.push({});

    let option = document.createElement('div')

    let strikeLabel = document.createElement('label')
    strikeLabel.innerHTML = 'Strike'
    let strikeInput = document.createElement('input')
    strikeInput.setAttribute('type', 'number')

    let currentPriceLabel = document.createElement('label')
    currentPriceLabel.innerHTML = 'Current Price'
    let currentPriceInput = document.createElement('input')
    currentPriceInput.setAttribute('type', 'number')

    let expiryLabel = document.createElement('label')
    expiryLabel.innerHTML = 'Expiry'
    let expiryInput = document.createElement('input')
    expiryInput.setAttribute('type', 'date')
    expiryInput.addEventListener('change', () => options[i].expiry = expiryInput.value)

    let predictionLabel = document.createElement('label')
    predictionLabel.innerHTML = 'Prediction Price'
    let predictionInput = document.createElement('input')
    predictionInput.setAttribute('type', 'number')

    let predictionDateLabel = document.createElement('label')
    predictionDateLabel.innerHTML = 'Prediction Date'
    let predictionDateInput = document.createElement('input')
    predictionDateInput.setAttribute('type', 'date')

    (function(index) {
        strikeInput.addEventListener('change', () => options[index].strike = strikeInput.value);
        currentPriceInput.addEventListener('change', () => options[index].currentPrice = currentPriceInput.value);
        expiryInput.addEventListener('change', () => options[index].expiry = expiryInput.value);
        predictionInput.addEventListener('change', () => options[index].prediction = predictionInput.value);
        predictionDateInput.addEventListener('change', () => options[index].predictionDate = predictionDateInput.value);
    })(i);

    option.appendChild(strikeLabel)
    option.appendChild(strikeInput)
    option.appendChild(expiryLabel)
    option.appendChild(expiryInput)
    option.appendChild(currentPriceLabel)
    option.appendChild(currentPriceInput)
    option.appendChild(predictionLabel)
    option.appendChild(predictionInput)
    option.appendChild(predictionDateLabel)
    option.appendChild(predictionDateInput)

    optionsListDiv.appendChild(option)

})

runPredictionButton.addEventListener('click', function () {
    socket.emit('runPrediction', options)
})