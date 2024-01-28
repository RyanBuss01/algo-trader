# Algo_Trader
Using technical analysis and AI learning models to predict stock price movement

## Set Up
Nodejs plugins
```npm install dotenv express fs moment nodemon socket.io```

API install
```npm install @alpacahq/alpaca-trade-api@2```

Set up local directories
```bash
npm run build
```

Run server
```bash
npm run dev
```

## API Integration (optional)
Set up alpaca API before running any bar getter functions


set up alpaca api by creating .env file and adding key-id and secret like so: 
```bash
ALPACA_KEY_ID="xxx"
ALPACA_SECRET_KEY="xxx"
```

### NOTE: 
if you want to use alternate api simply update getMultiBars() and getMultiBarsRefresh() in functions/barHandler.js and map the bars to match setup


