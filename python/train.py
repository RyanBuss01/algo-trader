import torch
import torch.nn as nn
import torch.optim as optim
from model import StockPricePredictor
from dataHandler import DataHandler

# Input parameters
targetPrice = 490  # The target price you want to predict hitting
numDays = 7  # Number of days in the future to predict
num_epochs = 1000 # Number of epochs to train the model
ticker_input = 'SPY'  # Replace with your input ticker

closePrices = DataHandler.getClosePrice(ticker_input)


def train_model(train_data, train_labels, num_epochs):
    input_size = train_data.shape[2]
    output_size = train_labels.shape[1]
    hidden_size = 64
    model = StockPricePredictor(input_size, hidden_size, output_size)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    for epoch in range(num_epochs):
        model.train()
        optimizer.zero_grad()

        outputs = model(train_data)

        loss = criterion(outputs, train_labels)
        loss.backward()
        optimizer.step()

        if (epoch+1) % 10 == 0:
            print(f'Epoch: {epoch+1}/{num_epochs}, Loss: {loss.item()}', end='\r')
        if epoch == num_epochs - 1:
            torch.save(model.state_dict(), 'models/model.pth')  # Save the model on the final epoch
            print(f"Model saved with loss: {loss.item()}")



train_data = []
train_labels = []

for i in range(len(closePrices) - numDays):
    # Include the target price as a feature
    features = [closePrices[i], targetPrice]  # You can add more features here
    train_data.append(features)

    # Label creation
    label = 1 if any(p > targetPrice for p in closePrices[i+1:i+1+numDays]) else 0
    train_labels.append(label)

# Convert to tensors and reshape
train_data_tensor = torch.tensor(train_data).float()
train_data_tensor = train_data_tensor.unsqueeze(0)  # Shape: [1, sequence_length, num_features]

train_labels_tensor = torch.tensor(train_labels).float()
train_labels_tensor = train_labels_tensor.unsqueeze(0)  # Shape: [1, sequence_length]

# If you have a batch size of 1, you don't need to squeeze train_labels_tensor


train_model(train_data_tensor, train_labels_tensor, num_epochs)


