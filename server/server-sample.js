'use strict';

const TrendRoutes = require('./trendRoutes.js');

const config = require("./sample-config.js")[process.env.NODE_ENV];
const vantageAPI = config.vantageKey;

module.exports = function(db, io, bunyan) {
  let log = bunyan.createLogger({
              name: "market tracker",
              stream: process.stdout,
              level: process.env.NODE_ENV === "test" ? "fatal" : "info"
            });

  io.on('connection', (socket)=>{
    log.info('A client has connected to socket');
    
    //Handles routes related to trends comparison
    //Sends out trends data within the past 90 days if available
    //Hands requests to add tickers to db
    //Handles deletion of tickers from db
    //Handles requests for a specific range of dates
    TrendRoutes(io, socket, db, vantageAPI, log);
    
    socket.on('disconnect', () => {
      log.info('A client has disconnected');
    });
  })
}