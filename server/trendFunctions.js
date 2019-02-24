module.exports = {
  processTicker: function (ticker, results, io, db, log) {
    //Process data for trendRoutes.
    /*
    Sample results from API (organized in rev chrono order - newest first):
    
    {
      "Meta Data": {
        "1. Information": "Daily Prices (open, high, low, close) and Volumes",
        "2. Symbol": "msft",
        "3. Last Refreshed": "2018-08-08",
        "4. Output Size": "Full size",
        "5. Time Zone": "US/Eastern"
      },
      "Time Series (Daily)": {
        "2018-08-08": {
          "1. open": "109.3300",
          "2. high": "109.7500",
          "3. low": "108.7599",
          "4. close": "109.4900",
          "5. volume": "15460182"
        }
      }
      
      Creates and stores results in the form:
      
      {
        startDate: new Date object (ms),
        endDate: new Date object (ms),
        ticker: SYMBOL,
        closing: [{apiDate: "2004-01-29", date: 1075334400000, price: "10.7390"}]
      }
    }
    */
    
    log.info('Processing data from ' + ticker + ' data obtained on ' + Date());

    results = results["Time Series (Daily)"];
    
    let keys = Object.keys(results), //Provides an array of dates
        stock = {};
    
    stock.ticker = ticker.toUpperCase();
    stock.closing = [];
    stock.lastUpdate = new Date().getTime();
    
    for (let i = 0; i < keys.length; i++){ 
      if(i==0){
        stock.endDate = new Date(keys[i]).valueOf();    //Sets the date of the LATEST entry
      }
      
      if (i == (keys.length - 1)){
        stock.startDate = new Date(keys[i]).valueOf();  //Sets the date of the OLDEST entry
      }
      
      let daily = {},
          UTCDaily = new Date(keys[i]);
      
      daily.apiDate = keys[i];
      daily.date = UTCDaily.valueOf();
      daily.price = results[keys[i]]['4. close'];
      
      stock.closing.push(daily);
    }
    
    //May be directly called w/o io during testing;
    if (!io) {
      return stock
    }
    
    db.collection('tickers').update({ticker: stock.ticker}, stock, {upsert: true}, (err, result) => {
      log.info('Inserted %s into db. Pushing updates', ticker);
      io.sockets.emit('update', {});      
    })
  },
  trendsBST: function(closings, target, startIdx, endIndex){
    //Binary search for index position. 
    //Used in trendRoutes to find startDate and endDate
    let middle = Math.ceil((endIndex + startIdx)/2);

    if (closings[startIdx].date == target) {
      return startIdx;
    }
    
    if (closings[endIndex].date == target) {
      return endIndex;
    }
    
    if((endIndex - startIdx) == 1){
      return (startIdx);
    }
    
    if (closings[middle].date == target) {
      return middle;
    } else if (closings[middle].date > target){
      return this.trendsBST(closings, target, middle, endIndex);
    } else {
      return this.trendsBST(closings, target, startIdx, middle);
    }
  }
}