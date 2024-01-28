import json

# Load the data from JSON files
file_path = 'json/bars.json'
file_path2 = 'json/bars2.json'

def load_data(file_path):
        with open(file_path, 'r') as file:
            return json.load(file)

def get_bars_for_ticker(data, ticker):
    for item in data:
        if item["ticker"] == ticker:
            return item["bars"]

class DataHandler:
    def getClosePrice(ticker_input):
        bars = get_bars_for_ticker(load_data(file_path), ticker_input) or get_bars_for_ticker(load_data(file_path2), ticker_input)
        closePrices = [b['ClosePrice'] for b in bars] # Your array of close prices 
        return closePrices
    