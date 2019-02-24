const request = require('request');
const trendFunctions = require('./trendFunctions.js');
const moment = require('moment');

module.exports = function(io, socket, db, vantageAPI, log){  
  //used to send out default trend data - used for initial connection or if there is no date range cached.
  //Sets a limit of 90 days
  socket.on("default trend", () => {
    db.collection('tickers').find({}, {_id: 0}).toArray((err, docs) => {
      let tickers = [],
          longest = 0,
          rangeLimit = process.env.NODE_ENV === 'test' ? 
            new Date(new Date('2018-08-23') - (90*24*3600*1000)).getTime() : 
            new Date(new Date() - (90*24*3600*1000)).getTime(),
          initialStartV = Infinity,
          initialEndV = -Infinity,
          initialStart = '',
          initialEnd = '',
          idx;
      
      for (let i = 0; i < docs.length; i++){
        tickers.push(docs[i].ticker);
        
        //If ticker is out of range, null it, otherwise look for index position for date closest to 90 day
        if (docs[i].closing[0].date < rangeLimit){
          docs[i].closing = [];
          docs[i].startDate = null;
          docs[i].endDate = null;
        } else {
          //In case of incomplete range
          if(docs[i].closing[docs[i].closing.length - 1].date > rangeLimit) {
            idx = docs[i].closing.length - 1;
          } else {
            idx = trendFunctions.trendsBST(docs[i].closing, rangeLimit, 0, (docs[i].closing.length-1));
          }
          
          docs[i].closing.splice(idx + 1);
          docs[i].startDate = docs[i].closing[idx].date;

          //In the event that there is incomplete day (e.g. new IPO), we may not have full data
          //Hence, start and stop range will be evaluated based on ticker data
          if (docs[i].closing[0].date > initialEndV){
            initialEnd = docs[i].closing[0].apiDate;
            initialEndV = docs[i].closing[0].date;
          }
          
          if (docs[i].closing[docs[i].closing.length - 1].date < initialStartV){
            initialStart = docs[i].closing[docs[i].closing.length - 1].apiDate;
            initialStartV = docs[i].closing[docs[i].closing.length - 1].date;
          }
        }
      }
      
      socket.emit('initialRange', {initialEnd: initialEnd, initialStart: initialStart});
      socket.emit('loadTickers', {tickers: tickers});
      socket.emit('loadData', docs);
      log.info('Initial trends data sent')
    });
  });

  //Add new ticker and ask to update
  socket.on('ticker', (data) => {
    const apiURL = "https://demoendpoint.com/test";

    //Tickers should only have letters
    let regExp = /[^A-Za-z]/g;
    
    log.info('Attempting to add new ticker: ', data.ticker);

    //Quick check for length and alphabets only
    if (data.ticker.length <= 5) {
      if (regExp.test(data.ticker)) {
        socket.emit('tickerError', {error: 'Invalid Entry'});
      } else {
        request.get(apiURL, {timeout: 15000}, (err, res) => { 
          if (err) {
            log.info("Error encountered while getting ticker info for adding to db: %s", err);
            socket.emit('tickerError', {error: 'Error encountered.'});
          } else {
            try{
              let results = JSON.parse(res.body);

              if(results["Error Message"]){
                //Do not use emit error... 
                socket.emit('tickerError', {error: 'Ticker not found.'});
                log.info('Failed to add ', data.ticker);
              } else if (!results["Time Series (Daily)"]){
                socket.emit('tickerError', {error: 'Error encountered.'});
                log.info('Error encountered while retrieving data for ', data.ticker);
              } else {
                trendFunctions.processTicker(data.ticker, results, io, db, log);
              }
            } catch (err) {
              log.info("Error encountered while getting ticker info for adding to db: %s", err);
              socket.emit('tickerError', {error: 'Error encountered.'});
            }
          }
        });
      }
    } else {
      socket.emit('tickerError', {error: 'Invalid Entry'});
    }
  });
  
  //Delete ticker and ask to update
  socket.on('del', (data) =>{ 
    log.info('Request to delete ticker: ', data.del);
    db.collection('tickers').deleteOne({ticker: data.del}, (err, results) => {
      if (err) {throw err}
      io.sockets.emit('update', {});
    });
  });
  
  //Push updates using the range view from respective clients
  socket.on('getRange', (data) => {
    log.info('Get data from range: ', data)
    //new Date object causes a time zone adjustment that has to be adjusted to match date object from API call, but DST not accounted for unless you use a separate algorithm 
    //Easier to parse as string, making sure that month is '0X' or '1X'
    //Also, https://stackoverflow.com/questions/10269513/date-constructor-numeric-arguments-vs-string-argument-giving-different-dates-i
    let tickers = [],
        testStart = moment(data.start, "YYYY-MM-DD",true),
        testEnd = moment(data.end, "YYYY-MM-DD",true),
        startDate = new Date(data.start).valueOf(),
        endDate = new Date(data.end).valueOf();
        
    //Filtered on client side, but will re-filter server-side
    if (!testStart.isValid() || !testEnd.isValid() || startDate > endDate){
      socket.emit("invalidRange");
      return; 
    } else if (startDate <= new Date("2005-12-31") || endDate > new Date()) {
      socket.emit("invalidRange");
      return;
    }

    db.collection('tickers').find({}, {_id: 0}).toArray((err, docs) => {
      if (err) throw err;
      
      let closingInRange = [],
          nearestStartIndex,
          nearestEndIndex;
      
      for (let i = 0; i < docs.length; i++) {
        tickers.push(docs[i].ticker);

        //determine if requested start date is in range of data set
        //Note that startDate refers to the oldest point in the series
        if (startDate < docs[i].startDate){
          //if req startDate is out of range, then just grab everything up to the end first
          docs[i].startDate = docs[i].closing[docs[i].closing.length - 1].date;
        } else if (startDate > docs[i].endDate){
          //if startDate is actually newer than the latest entry in our DB, then no results
          docs[i].closing = [];
          docs[i].startDate = null;
        } else {
          //if it is, then find the index of the start date, then splice off everything that's older
          //use binary search to find index for splicing
          nearestStartIndex = trendFunctions.trendsBST(docs[i].closing, startDate, 0, (docs[i].closing.length-1)) + 1;
          
          //Remove all elements after req. start date
          //Reminder: dates in rev chrono order, so all subsequent elements are older than start
          docs[i].closing.splice(nearestStartIndex);
          docs[i].startDate = docs[i].closing[nearestStartIndex-1].date;
        }
        
        //Second half of screening, similar to screening startDate.
        //If requested endDate is before start, return []. 
        //If requested end exceeds data, return everything. If it is in between, then find index
        if (endDate < docs[i].startDate){
          docs[i].closing = [];
          docs[i].endDate = null;
          closingInRange.push(docs[i]);
        } else if (endDate > docs[i].endDate){
          if (docs[i].closing.length > 0) {
            docs[i].endDate = docs[i].closing[0].date;
          } else {
            docs[i].endDate = null
          }
          
          closingInRange.push(docs[i]);
        } else {
          //use binary search to find index for splicing
          nearestEndIndex = trendFunctions.trendsBST(docs[i].closing, endDate, 0, (docs[i].closing.length-1)) + 1;
          
          //Splice off and store the range requested
          docs[i].closing = docs[i].closing.splice(nearestEndIndex-1);
          docs[i].endDate = docs[i].closing[0].date;
          closingInRange.push(docs[i]);
        }
      }
      
      socket.emit('loadTickers', {tickers: tickers});
      socket.emit('loadData', closingInRange);
      socket.emit('currIndex', {startIndex: nearestStartIndex - 1, endIndex: nearestEndIndex});
    });
  });
}