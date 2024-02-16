const barHandler = require('../functions/barHandler');
let indicatorsJson = require('../json/indicators.json')
let indicators = require('../methods/indicators')
let barStatJson = require('../json/barStats.json')
const proccessors = require('../functions/dataProcessors');
const tools = require('../public/tools/tools');

const path = require('path');
const fs = require('fs');
let fullBars = require('../json/bars.json');
const fullBars2 = require('../json/bars2.json');
fullBars.push(...fullBars2)

const indicatorsFilePath = path.join(__dirname, '../methods/indicators.js');
const indicatorsJSONFilePath = path.join(__dirname, '../json/indicators.json');
const barStatFilePath = path.join(__dirname, '../json/barStats.json');

var socketMethods = {
    search: (socket, query) => socket.emit('searchResults', searchItems(query, indicatorsJson)),
    addFilter: (socket, query) => socket.emit('addFilter', addBasicParams(JSON.parse(JSON.stringify(indicatorsJson.filter(j=>j.name==query.name)[0])))),
    getBarStats: (socket) => socket.emit('getBarStats', JSON.stringify(barStatJson)),
    setBarStats: (socket)=> socket.emit('getBarStats', setStats()),
    searchTicker: (socket, query) => socket.emit('searchResults', searchTickers(query, fullBars.map(t=>t.ticker))),
    getBars: async (socket, type) => runBarHandler(barHandler.getMasterList().map(t=>t.ticker), type, socket).then(()=> socket ? socket.emit('getBarsComplete'):null),
        
    createIndicator: function (socket, code) {
        let name = code.name
        let label = code.label
        let params = code.params
        let isBarOption = code.allowBars
        let description = code.description
        let isDataOption = code.isDataOption
        let isSet = code.isSet
        code = code.code

        // let allParams = [barConstant].concat(params);

        if(name in indicators) {
            socket.emit('createIndicator', {res: false, error: 'Function already exists'})
            return
        }

         // Update the in-memory indicators object
        indicators[name] = new Function(['bars', 'data', 'vars'], code);

        // Start building the file content
        let fileContent = `const tools = require('../public/tools/tools');\n\n`
        fileContent += `let indicators = {\n`;

        for (let key in indicators) {
            fileContent += `    ${key}: ${indicators[key].toString()},\n`;
        }

        fileContent += "};\n\nmodule.exports = indicators;";

        // Write the updated indicators object back to the file
        fs.writeFile(indicatorsFilePath, fileContent, err => {
            if (err) {
                console.error('Error writing to indicators.js:', err);
            } else {
                console.log('Indicators updated successfully');
            }
        });

        let paramArray = []

        if(params && params.length>0)
        for(p of params) {
            paramArray.push({
                "name": p.name,
                "label": p.label,
                "type": p.type,
                "default": p.default,
                "options": p.options,
            })
        }

        let json = {
            "name": name,
            "label": label,
            "barOption" : isBarOption,
            "isDataOption": isDataOption,
            "isSet" : isSet,
            "description" : description,
            "parameters": paramArray
        }


        indicatorsJson.push(json)
        let dataToWrite = JSON.stringify(indicatorsJson, null, 4);
        fs.writeFile(indicatorsJSONFilePath, dataToWrite, err => {
            if (err) {
                console.error('Error writing to indicators.js:', err);
            } else {
                console.log('Indicators updated successfully');
            }
        });
        
        socket.emit('createIndicator', {res: true})
    },

    scan: function (socket, scanner) {
        let resList=[]
        let filters = []
        let varList = []
        
        for(let i=0; i<scanner.length; i++) {
            let f = scanner[i]
            filters.push(indicators[f.name])
            var vars = {}
            if(scanner[i].parameters && scanner[i].parameters.length>0) for(let p of scanner[i].parameters) vars[p.name]= p.value != undefined || p.value != null ? p.value : p.default 
            if(scanner[i].isSet) vars['isSet'] = scanner[i].isSet
            else vars['isSet'] = false
            varList.push(vars)
        }

        for(let sym=0; sym<fullBars.length; sym++) {
            let bars = fullBars[sym].bars, filterResList = []
            for(let i=0; i<filters.length; i++) {
                let setBars = bars, data = bars.map(b=>b.ClosePrice)
                let isSet = varList[i].isSet
                if(varList[i].bars =='ha') setBars = proccessors.getHa(bars)
                if(varList[i].data== "close")  data = bars.map(b=>b.ClosePrice)
                if(varList[i].data== "open")  data = bars.map(b=>b.OpenPrice)
                if(varList[i].data == 'low')  data = bars.map(b=>b.LowPrice)
                if(varList[i].data == 'high')  data = bars.map(b=>b.HighPrice)
                let res = {
                    bullBuy: true,
                    bearBuy: true,
                    bullSell: false,
                    bearSell: false,
                    set: true
                }
                if(varList[i].offsetType == "set") {
                    let filter = filters[i](varList[i].offset>0 ? setBars.slice(0, -varList[i].offset) : setBars, data, varList[i])
                    if (!filter.bullBuy) res.bullBuy = false;
                    if (!filter.bearBuy) res.bearBuy = false;
                    if(filter.bullSell) res.bullSell = true
                    if(filter.bearSell) res.bearSell = true
                    if(isSet) res.set = filter.set
                }
                else if(varList[i].offsetType == "any") {
                    res = {
                        bullBuy: false,
                        bearBuy: false,
                        bullSell: false,
                        bearSell: false,
                        set: false
                    };
                    let index = 0;
                    let filter;
                    do {
                        filter = filters[i](index > 0 ? setBars.slice(0, -index) : setBars, data, varList[i]);
                        if (filter.bullBuy) res.bullBuy = true;
                        if (filter.bearBuy) res.bearBuy = true;
                        if (filter.bullSell) res.bullSell = true;
                        if (filter.bearSell) res.bearSell = true;
                        if (filter.set) res.set = true;
                        index++;
                    } while (index <= varList[i].offset);

                }
                else { // varList[i].offsetType == "all"
                    let index=0
                    do {
                        let filter = filters[i](index>0 ? setBars.slice(0, -index) : setBars, data, varList[i])
                        console.log(filter, varList[i])
                        if (!filter.bullBuy) res.bullBuy = false;
                        if (!filter.bearBuy) res.bearBuy = false;
                        if(filter.bullSell) res.bullSell = true
                        if(filter.bearSell) res.bearSell = true
                        if (!filter.set) res.set = false;
                        index++
                    }
                    while(index<=varList[i].offset)
                }
                filterResList.push(res)
            }
            
            let result = {
                bullBuy: filterResList.every((f, index) => varList[index].isSet ?  f.set : (!varList[index].bullBuy || f.bullBuy)),
                bearBuy: filterResList.every((f, index) => varList[index].isSet ?  f.set :  (!varList[index].bearBuy || f.bearBuy)),
                bullSell: filterResList.some((f, index) => varList[index].bullSell && f.bullSell),
                bearSell: filterResList.some((f, index) => varList[index].bearSell && f.bearSell),
            };
            let alert = []
            

            if(result.bullBuy) alert.push('bullBuy')
            if(result.bearBuy) alert.push('bearBuy')
            if(result.bullSell) alert.push('bullSell')
            if(result.bearSell) alert.push('bearSell')


            resList.push({sym: fullBars[sym].ticker, alert:alert})

            if(sym % 100 && sym!=1) socket.emit('scanLoading', [sym, fullBars.length])
        }
        socket.emit('scan', resList)

    },

    backtest: function (socket, scanner) {
        let success=0, total=0, diffArray=[]
        let filters = []
        let varList = []
        let backtestPeriod = scanner.backtestPeriod
        let sellPeriod = scanner.sellPeriod;
        let sellType = scanner.sellType
        let sellVar = scanner.sellVar
        let sellStop = -2
        scanner = scanner.data
        
        for(let i=0; i<scanner.length; i++) {
            let f = scanner[i]
            filters.push(indicators[f.name])
            var vars = {}
            if(scanner[i].parameters && scanner[i].parameters.length>0) for(let p of scanner[i].parameters) vars[p.name]= p.value != undefined || p.value != null ? p.value : p.default 
            varList.push(vars)
        }

        
        for(let j=sellPeriod; j<backtestPeriod; j++) {
        for(let sym=0; sym<fullBars.length; sym++) {
            let bars = fullBars[sym].bars, filterResList = []
            bars = bars.slice(0, -j)


            if(bars && bars.length>200) {
            for(let i=0; i<filters.length; i++) {
                let isSet = false
                let setBars = bars, data = bars.map(b=>b.ClosePrice)
                if(varList[i].bars =='ha') setBars = proccessors.getHa(bars)
                if(varList[i].data== "close")  data = bars.map(b=>b.ClosePrice)
                if(varList[i].data== "open")  data = bars.map(b=>b.OpenPrice)
                if(varList[i].data == 'low')  data = bars.map(b=>b.LowPrice)
                if(varList[i].data == 'high')  data = bars.map(b=>b.HighPrice)
                if(varList[i].isSet) isSet = true
                let res = {
                    bullBuy: true,
                    bearBuy: true,
                    bullSell: false,
                    bearSell: false,
                }
                let index=0
                do {
                    let filter = filters[i](index>0 ? setBars.slice(0, -index) : setBars, data, varList[i])
                    if (!filter.bullBuy) res.bullBuy = false;
                    if (!filter.bearBuy) res.bearBuy = false;
                    if(filter.bullSell) res.bullSell = true
                    if(filter.bearSell) res.bearSell = true
                    if(isSet && !filter.set) res.set = false
                    index++
                }
                while(index<=varList[i].offset)
                filterResList.push(res)
            }}
            
            let result = {
                bullBuy: filterResList.every((f, index) => !varList[index].bullBuy || f.bullBuy),
                bearBuy: filterResList.every((f, index) => !varList[index].bearBuy || f.bearBuy),
                bullSell: filterResList.some((f, index) => varList[index].bullSell && f.bullSell),
                bearSell: filterResList.some((f, index) => varList[index].bearSell && f.bearSell)
            };
            let alert = []
            
            if(result.bullBuy) alert.push('bullBuy')
            if(result.bearBuy) alert.push('bearBuy')
            if(result.bullSell) alert.push('bullSell')
            if(result.bearSell) alert.push('bearSell')

            let isSucc = false, sell=false, successBar
            if(result.bullBuy || result.bearBuy) {
                total++
                for(let k=0; k<sellPeriod; k++) {
                    let barSet = fullBars[sym].bars.slice(0, -(j-k))
                    if(barSet.length<200) continue
                    if(sellType=='alert') {
                        for(let l=0; l<filters.length; l++) {
                            let barCheck = barSet
                            if(varList[l].bars =='ha') barCheck = proccessors.getHa(barSet)
                            const filter = filters[l](barCheck, varList[l])
                            if(result.bullBuy && filter.bullSell) {sell = filter.bullSell}
                            if(result.bearBuy && filter.bearSell) {sell = filter.bearSell}
                            if(sell && !isSucc) {
                                successBar=barSet[barSet.length-1];
                                if((result.bullBuy && successBar.ClosePrice>bars[bars.length-1].ClosePrice) || (result.bearBuy && successBar.ClosePrice<bars[bars.length-1].ClosePrice)){
                                    success++; 
                                }
                                    isSucc=true; 
                                }
                            if(!sell && !isSucc) successBar=barSet[barSet.length-1]
                            if(!sell && !isSucc && tools.pDiff(bars[bars.length-1].ClosePrice, successBar.ClosePrice)<sellStop) sell=true
                        }
                    }
                    if(sellType=="precent") {
                        for(let l=0; l<filters.length; l++) {
                            let barCheck = barSet
                            let diff = tools.pDiff(bars[bars.length-1].ClosePrice, barSet[barSet.length-1].ClosePrice)
                            if(varList[l].bars =='ha') barCheck = proccessors.getHa(barSet)
                            // const filter = filters[l](barCheck, varList[l])
                            if(result.bullBuy && diff>sellVar) {sell = true}
                            if(result.bearBuy && diff<(-1*sellVar)) {sell = true}
                            if(sell && !isSucc) {
                                successBar=barSet[barSet.length-1];
                                if((result.bullBuy && successBar.ClosePrice>bars[bars.length-1].ClosePrice) || (result.bearBuy && successBar.ClosePrice<bars[bars.length-1].ClosePrice)){
                                    success++; 
                                }
                                    isSucc=true; 
                                }
                            if(!sell && !isSucc) successBar=barSet[barSet.length-1]
                            if(!sell && !isSucc && result.bullBuy && diff<sellStop) sell=true
                            if(!sell && !isSucc && result.bearBuy && diff>(-1*sellStop)) sell=true
                        }
                    }
                }
            }
            if(successBar) diffArray.push(tools.pDiff(bars[bars.length-1].ClosePrice, successBar.ClosePrice))

            process.stdout.write("\r\x1b[K")
            process.stdout.write(`SuccessRate: ${100*success/total}, total: ${total} Sum Return: ${tools.sumArray(diffArray)}, avg return: ${tools.meanArray(diffArray)}`)
            
            // resList.push({sym: fullBars[sym].ticker, alert:alert})
            // if(sym % 100 && sym!=1) socket.emit('scanLoading', [sym, fullBars.length])
        }
    }

    },

    getProbStockData: function (socket, ticker) {
        let bars = fullBars.filter(b=>b.ticker==ticker)[0].bars 
        let close = bars[bars.length-1].ClosePrice
        let haBars = proccessors.getHa(bars)
        let haBar = haBars[haBars.length-1]
        let bBands = tools.getBollingerBands(bars.map(b=>b.ClosePrice), 20, 2)
        let highBand = bBands.upper[bBands.upper.length-1]
        let lowBand = bBands.lower[bBands.lower.length-1]
        let atr = tools.getATR(bars, 14).atr

        let res = {
            close: close,
            haBar: haBar,
            highBand: highBand,
            lowBand: lowBand,
            atr: atr
        }

        socket.emit('getProbStockData', res)
    },

    getProbability: function (socket, data) {
        let ticker = data.stock
        let bars = fullBars.filter(b=>b.ticker==ticker)[0].bars
        let close = bars[bars.length-1].ClosePrice
        let probType = data.probType
        let period = data.period

        if(probType=='price') {
        let guess = data.data[0], hits = 0, hitsExp=0, hitsHL=0, total = 0
        let diff = tools.pDiff(close, guess, true)
        let isPositive = guess>close


        for (let i = 0; i <= bars.length - period; i++) {
            total++;
            let hit = false, hitHL=false;
            for (let j = 1; j < period; j++) {
                const priceGoal = isPositive ? bars[i].ClosePrice * (1 + diff) : bars[i].ClosePrice * diff; // Adjusted for both directions
                if((isPositive && priceGoal < bars[i + j].ClosePrice) || (!isPositive && priceGoal > bars[i + j].ClosePrice)) {
                    if(j == period - 1) hitsExp++;
                    if(hit) continue;
                    hits++;
                    hit = true;
                } else if((isPositive && priceGoal < bars[i + j].HighPrice) || (!isPositive && priceGoal > bars[i + j].LowPrice)) {
                    if(hitHL) continue;
                    hitsHL++;
                    hitHL = true;

                }
            }
        }

        let prob =100*hits/total
        let probExp=100*hitsExp/total
        let probHL=100*hitsHL/total
        res = {
            probability: prob.toFixed(2), 
            probabilityExp: probExp.toFixed(2),
            probabilityHL: probHL.toFixed(2),
            diff: isPositive ? (diff*100).toFixed(3) : (diff*100-100).toFixed(3), 
            probType: probType,
        }

        socket.emit('getProbability', res)
        }


        // Ensure the period is not longer than the array
        if(probType == "outsideRange" || probType == "range") {
            let low = Math.min(data.data[0], data.data[1]), high = Math.max(data.data[0], data.data[1])
            let closePrices = bars.map(b=>b.ClosePrice), upperDiff = tools.pDiff(close, high, true), lowerDiff = tools.pDiff(close, low, true)
            // Count how many times the price is outside the range
            let count = 0;
            // Count how many times the price is outside the range
            closePrices.forEach((price, index) => {
                let counted = false
                for(let i=0; i<period; i++) {
                    if(counted) continue;
                    if(index+i>=closePrices.length) break;
                    if(probType == "outsideRange"  && closePrices[index+i] > price*(1+upperDiff)) {count++, counted=true}
                    if(probType == "outsideRange"  && closePrices[index+i] < price*lowerDiff) {count++, counted=true}
                    if(probType == "range"  && closePrices[index+i] < price*(1+upperDiff)) {count++, counted=true}
                    if(!counted && probType == "range"  && closePrices[index+i] > price*lowerDiff) {count++, counted=true}
                    
                }
            });
             // Calculate the probability
             let probabilityPrice = (count / closePrices.length) * 100;


             // calculate probability at expiration
             let countExp = 0;
    
             for (let index = 0; index <= closePrices.length - period; index++) {
                let price = closePrices[index], closeExp = closePrices[index+(period-1)];
                 if (probType=='outsideRange' && (closeExp > price*(1+upperDiff) || closeExp < price*lowerDiff)) countExp++;
                 else if(probType=='range' && (closeExp < price*(1+upperDiff) || closeExp > price*lowerDiff)) countExp++;
             }
         
             let validPeriods = closePrices.length - period + 1;
             let probabilityExp = (countExp / validPeriods) * 100;

            let res = {
                upperDiff: tools.pDiff(close, high),
                lowerDiff: tools.pDiff(close, low),
                probability: probabilityPrice.toFixed(2),
                probabilityExp: probabilityExp.toFixed(2),
                probType: probType,
            }
            socket.emit('getProbability', res)
        }

    },

    predictOption: function (socket, data) {},

    getStockAiData: function (socket, ticker) {
        
    }
}

let searchTickers = (query, items) => items.filter(item => hasAllLettersInSequence(query.toLowerCase(), item.toLowerCase()));
let getAbbreviation = (words) => words.split(' ').map(word => word[0]).join('');
let searchItems = (query, items) => items.filter(item => hasAllLettersInSequence(query.toLowerCase(), item.label.toLowerCase()) ? true :  getAbbreviation(item.label.toLowerCase()).startsWith(query.toLowerCase()) ? true : false)

function hasAllLettersInSequence(letters, word) {
    let index = 0;
    for (let letter of letters) {
        index = word.indexOf(letter, index);
        if (index === -1) {
            return false;
        }
        index++;
    }
    return true;
}

let runBarHandler = async (list, type, socket) => {
    if(type=='full') await barHandler.getMultiBars(list, {socket:socket})
    if(type=='refresh') await barHandler.getMultiBarsRefresh(list, fullBars, {socket:socket})
    if(type=='default') await barHandler.getMultiBars(barHandler.getDefaultList(), fullBars, {socket:socket})
}

function addBasicParams(item) {
    barParam = {
        "name" : "bars",
        "label" : "Bar type",
        "type": "dropdown",
        "default" : "standard",
        "options" : [
            {
                "name" : "standard",
                "label" : "Standard Candles"
            },
            {
                "name" : "ha",
                "label" : "Heikin Ashi Candles"
            }
            ]
    },

    dataInputParam = {
        "name" : "data",
        "label" : "Price Input",
        "type": "dropdown",
        "default" : "close",
        "options" : [
            {
                "name" : "close",
                "label" : "Close"
            },
            {
                "name" : "open",
                "label" : "Open"
            },
            {
                "name" : "low",
                "label" : "Low"
            },
            {
                "name" : "high",
                "label" : "High"
            }
            ]
    } 

    bullBuyParam = {
        "name": "bullBuy",
        "label" : "Bullish Buy Alert",
        "type": "bool",
        "default" : true,
    }

    bearBuyParam = {
        "name": "bearBuy",
        "label" : "Bearish Buy Alert",
        "type": "bool",
        "default" : true,
    }

    bullSellParam = {
        "name": "bullSell",
        "label" : "Bullish Sell Alert",
        "type": "bool",
        "default" : false,
    }

    bearSellParam = {
        "name": "bearSell",
        "label" : "Bearish Sell Alert",
        "type": "bool",
        "default" : false,
    }

    offsetParam = {
        "name" : "offset",
        "label" : "Offset",
        "type" : "number",
        "default" : 0
    }

    offsetType = {
        "name" : "setOffset",
        "label" : "Set Offset",
        "type" : "dropdown",
        "default" : "any",
        "options" : [
            {
                "name" : "any",
                "label" : "Any"
            },
            {
                "name" : "all",
                "label" : "All"
            },
            {
                "name" : "set",
                "label" : "Set"
            },
        ]
    }

    if(item.barOption) item.parameters.push(barParam)
    if(item.barOption) item.parameters.push(dataInputParam)
    if(!item.isSet) {
        item.parameters.push(bullBuyParam)
        item.parameters.push(bearBuyParam)
        item.parameters.push(bullSellParam)
        item.parameters.push(bearSellParam)
    }
    item.parameters.push(offsetParam)
    item.parameters.push(offsetType)

    return item
}

function setStats() {
    let now = new Date();
    let timestamp = now.getFullYear() + '-' +
    ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
    ('0' + now.getDate()).slice(-2) + ' ' +
    ('0' + now.getHours()).slice(-2) + ':' +
    ('0' + now.getMinutes()).slice(-2) + ':' +
    ('0' + now.getSeconds()).slice(-2);

    let content = `{
        "Last_Update": "${timestamp}",
        "length": ${fullBars.length}
    }`
    fs.writeFile(barStatFilePath, content, err => {
        if(err) console.log(err)
    })

    return content

}

    
function calculateFutureOptionPrice(S, K, daysT, daysUntilPrediction, sigma, predictionPrice) {
    // S = Current stock price
    // K = Strike price
    // T = Time to expiration in years
    // sigma = Volatility of the stock

    // Convert days to years
    var T = daysT / 365;
    var T_pred = (daysT - daysUntilPrediction) / 365;

    // Calculate option price for current and predicted scenarios
    var currentOptionPrice = blackScholes(S, K, T, sigma);
    var predictedOptionPrice = blackScholes(predictionPrice, K, T_pred, r, sigma);

    return {
        currentOptionPrice: currentOptionPrice,
        predictedOptionPrice: predictedOptionPrice
    };
}

function blackScholes(S, K, T,sigma) {
    let r = 0.015
    var d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
    var d2 = d1 - sigma * Math.sqrt(T);

    var optionPrice = S * norm_cdf(d1) - K * Math.exp(-r * T) * norm_cdf(d2);
    return optionPrice;
}



// Normal cumulative distribution function
function norm_cdf(value) {
    return (1.0 + erf(value / Math.sqrt(2.0))) / 2.0;
}

// Error function needed for NCD
function erf(x) {
    // constants
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var p  =  0.3275911;

    // Save the sign of x
    var sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    // A&S formula 7.1.26
    var t = 1.0 / (1.0 + p * x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}


module.exports=socketMethods