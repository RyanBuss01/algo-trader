import torch
from model import StockPricePredictor
from dataHandler import DataHandler

# Input parameters
numDays = 7  # Number of days in the future to predict
ticker_input = 'SPY'  # Ticker symbol
closePrices = DataHandler.getClosePrice(ticker_input)

def predict(model, test_data):
    model.eval()
    with torch.no_grad():
        outputs = model(test_data)
        return outputs

# Prepare the test data with the dynamic target price as a feature
dynamic_target_price = 470  # Dynamic target price for prediction
test_data = []

for i in range(-numDays, 0, 1):
    features = [closePrices[i], dynamic_target_price]
    test_data.append(features)

# Convert to tensor
test_data_tensor = torch.tensor(test_data).float().unsqueeze(0)  # Shape: [1, numDays, num_features]

# Initialize the model with the correct parameters
input_size = 2  # number of features (stock price, target price)
hidden_size = 64  # Same as used in training
output_size = 2014

model = StockPricePredictor(input_size, hidden_size, output_size)
model.load_state_dict(torch.load('models/model.pth'))  # Load the trained model weights

predictions = predict(model, test_data_tensor)

# Extract the relevant prediction
last_prediction = predictions[0, -1].item()
print(f'Probability of hitting target price of {dynamic_target_price} in the next {numDays} days is: {last_prediction}')
