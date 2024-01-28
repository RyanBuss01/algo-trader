import torch.nn as nn

class StockPricePredictor(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(StockPricePredictor, self).__init__()
        self.hidden_size = hidden_size

        # LSTM layer
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)

        # GRU layer
        self.gru = nn.GRU(hidden_size, hidden_size, batch_first=True)

        # Fully connected layer
        self.fc = nn.Linear(hidden_size, output_size)

        # Sigmoid activation function for binary classification
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # Pass input through LSTM layer
        lstm_out, _ = self.lstm(x)

        # Pass the output of LSTM as input to GRU layer
        gru_out, _ = self.gru(lstm_out)

        # Get the output of the last time step
        last_output = gru_out[:, -1, :]

        # Pass through the fully connected layer and apply sigmoid
        output = self.fc(last_output)
        output = self.sigmoid(output)

        return output
