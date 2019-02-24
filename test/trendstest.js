'use strict';

//Test-related
const chai = require("chai");
const should = require('chai').should();
const expect = chai.expect;

//Sample data
const sampleAPIData = require("./samples/stocks-trends/sampleAPIdata.js");
const sampleTickerDBdata = require("./samples/stocks-trends/sampleTickerDBdata.js");
const extendedAPIdata = require("./samples/stocks-trends/extendedAPIdata.js");

//Files
const trendFunctions = require("../server/trendFunctions.js");
const trendRoutes = require("../server/trendRoutes.js");
const config = require("../server/sample-config.js");
const vantageAPI = config.test.key;

//Core modules
const nock = require('nock');
const demoUrl = "https://demoendpoint.com/"


const mongo = require('mongodb').MongoClient;
const mongoURL = "mongodb://localhost:27017/";
let db = mongo.connect(mongoURL, { useNewUrlParser: true });
let trendsDB;

const bunyan = require('bunyan');
const log = bunyan.createLogger({name: "market tracker", level: "fatal"});

const io = require('socket.io-client');
const endpoint = "http://localhost:8002";
const options={'force new connection': true};
let client;

const app = require("../server.js");

describe("Trend Functions", function() {
  describe("Binary Search Tree", function() {
    let closing = sampleTickerDBdata.closing,
        endIdx = closing.length - 1;

    it("should return 0 when date is 1395878400000", function(){
      trendFunctions.trendsBST(closing, 1395878400000, 0, endIdx).should.equal(0);
    });
    
    it("should return 34 when date is 1391644800000", function(){
      trendFunctions.trendsBST(closing, 1391644800000, 0, endIdx).should.equal(34);
    });
    
    it("should return 1 when date is 1395792000000", function(){
      trendFunctions.trendsBST(closing, 1395792000000, 0, endIdx).should.equal(1);
    });
    
    it("should return 7 when date is 1395100800000", function(){
      trendFunctions.trendsBST(closing, 1395100800000, 0, endIdx).should.equal(7);
    });

    it("should return 17 when date is 1393891200000", function(){
      trendFunctions.trendsBST(closing, 1393891200000, 0, endIdx).should.equal(17);
    });
  });
  
  describe("Process Ticker", function() {
    it("should format sample API data into sampleTickerDBdata format", function() {
      let temp = trendFunctions.processTicker("MSFT", sampleAPIData, null, trendsDB, log);
      let time = new Date().getTime();

      temp.lastUpdate = time;
      
      JSON.stringify(temp)
        .should.equal(JSON.stringify(
          { ticker: 'MSFT',
            closing:
            [ 
              { apiDate: '2018-08-21', date: 1534809600000, price: '105.9800' },
              { apiDate: '2018-08-20', date: 1534723200000, price: '106.8700' } 
            ],
            lastUpdate:time,
            endDate: 1534809600000,
            startDate: 1534723200000 
          }
        ));
    });
  });
});

describe("Initializing, cleaning and populating test DB", function(){
  before(function(done){
    db.then(function(client){
      db = client.db("portfoliotest");
      
      db.collection('tickers').deleteMany({}, function(err, delResult){
        if (err) {
          return done(new Error("Failed to clean DB: ", err));
        }

        return done();
      });
    })
      .catch(function(err){
        return done(new Error("Failed to connect to DB: ", err));
      })
  });

  it("Should have 4 items in initial test DB", function(done){
    //Short = data spans from within period to end of period (cut off idx = 10);
    //Full = data spans full period (cut off idx = n/a);
    //Tip = data stops before end of period (max idx = 20);
    //Miss = data stops before start of period (max off idx = 90);
    
    let fakeTickers = ["SHORT", "FULL", "TIP", "MISS"],
        entries = [],
        results = extendedAPIdata,
        ticker, temp, dates;
          
    for (let i = 0; i < fakeTickers.length; i++) {
      ticker = fakeTickers[i];
      temp = JSON.parse(JSON.stringify(results));
      dates = Object.keys(temp["Time Series (Daily)"]);

      switch (ticker) {
        case "SHORT":
          for (let j = 10; j < dates.length; j++) {
            delete temp["Time Series (Daily)"][dates[j]];
          }
          break;
        case "FULL": 
          break;
        case "TIP":
          for (let j = 0; j < 20; j++) {
            delete temp["Time Series (Daily)"][dates[j]];
          }
          break;
        case "MISS": 
          for (let j = 0; j < 90; j++) {
            delete temp["Time Series (Daily)"][dates[j]];
          }
          break;
      }
      entries.push(trendFunctions.processTicker(ticker, temp, null, trendsDB, log));
    }
    
    db.collection("tickers").insertMany(entries, function(err, result) {
      if (err) {
        return done(new Error("Something happened while inserting for test: ", err));
      }
      
      db.collection("tickers").find({}).toArray(function(err, docs) {
        if (err) {
          return done(new Error("Something happened while testing intial test DB state: ", err));
        }
        
        docs.length.should.equal(4);
        return done();
      });
    });
  });
});

describe("Get default date range for trends graph", function(){
  before(function(done){
    client = io.connect(endpoint, options);
    client.on("connect", function() {
      return done();
    });
  });
  
  it("Should receive a date range within the last 85-90 days(minus holidays/weekends)", function(done){
    client.on("initialRange", function(data) {
      data.initialEnd.should.equal("2018-08-23");
      data.initialStart.should.equal("2018-05-25");
      return done();
    });
    
    client.emit("default trend");
    this.timeout(2000);
  });
  
  after(function(){
    client.close();
  });
});

describe("Should receive data that fits in defined date range", function(){
  before(function(done){
    client = io.connect(endpoint, options);
    client.on("connect", function() {
      return done();
    });
  });
  
  this.timeout(2000);
  
  it("Should have the specified closing lengths", function(done){
    client.on("loadData", function(data) {
      data[0].closing.length.should.equal(10);
      data[1].closing.length.should.equal(63);
      data[2].closing.length.should.equal(43);
      data[3].closing.length.should.equal(0);
      return done();
    });
    
    client.emit("default trend");
  });
  
  after(function(){
    client.close();
  });
});


describe("Testing addition & deletion of tickers", function(){
  beforeEach(function(done){
    client = io.connect(endpoint, options);
    client.on("connect", function() {
      return done();
    });
  });
  
  it("Should not allow symbols", function(done){
    client.on("tickerError", function(data){
      expect(data).to.have.property("error");
      return done();
    });
    
    client.emit("ticker", {ticker: "#DSCDSC"});
  });
  
  it("Should not allow numbers", function(done){
    client.on("tickerError", function(data){
      expect(data).to.have.property("error");
      return done();
    });
    
    client.emit("ticker", {ticker: "3DSCDSC"});
  });
  
  it("Should not allow ticker symbols of length >= 10", function(done){
    client.on("tickerError", function(data){
      expect(data).to.have.property("error");
      return done();
    });
    
    client.emit("ticker", {ticker: "SDJKDN"});
  });
  
  it("Should pass filters and insert MSFT into db", function(done){
    nock("https://demoendpoint.com/")
      .get(/^\/test/)
      .reply(200, sampleAPIData);
      
    client.on("update", function(){
      db.collection('tickers').findOne({ticker: "MSFT"}, {_id: 0}, function(err, doc){
        let time = new Date().getTime();
        
        doc.lastUpdate = time
        
        JSON.stringify(doc)
          .should.equal(JSON.stringify(
            { _id: doc._id,
              ticker: 'MSFT',
              closing:
              [ 
                { apiDate: '2018-08-21', date: 1534809600000, price: '105.9800' },
                { apiDate: '2018-08-20', date: 1534723200000, price: '106.8700' } 
              ],
              lastUpdate: time,
              endDate: 1534809600000,
              startDate: 1534723200000 
            }
          ));

          return done();
      });
    });

    client.emit("ticker", {ticker: "MSFT"});
  });
  
  it("Should not change db for non-existent ticker(MMMB)", function(done){
    client.on("update", function(){
      db.collection('tickers').find({}).toArray(function(err, docs){
        docs.length.should.equal(5);
        return done();
      });
    });

    client.emit("del", {del: "MMMB"});
  });
  
  it("Should remove the newly added MSFT", function(done){
    client.on("update", function(){
      db.collection('tickers').find({}).toArray(function(err, docs){
        docs.length.should.equal(4);
        return done();
      });
    });

    client.emit("del", {del: "MSFT"});
  });
  
  afterEach(function(){
    client.close();
  });
});

describe("Testing date range requests", function(){
  beforeEach(function(done){
    client = io.connect(endpoint, options);
    client.on("connect", function() {
      return done();
    });
  });
  
  it("Should not allow invalid start dates such as 2018-0A-19", function(done){
    client.on("invalidRange", function(){
      return done();
    });
    
    client.on("loadData", function(data){
      return done(new Error("Received data for invalid range"));
    });
    
    client.emit("getRange", {start:"2018-0A-19", end:"2018-01-30"});
  });
  
  it("Should not allow invalid end dates such as 2018-0A-19", function(done){
    client.on("invalidRange", function(){
      return done();
    });
    
    client.on("loadData", function(data){
      return done(new Error("Received data for invalid range"));
    });
    
    client.emit("getRange", {start:"2018-01-19", end:"2018-0A-30"});
  });
  
  it("Should not allow invalid months [00] (01 <= month <= 12)", function(done){
    client.on("invalidRange", function(){
      return done();
    });
    
    client.on("loadData", function(data){
      return done(new Error("Received data for invalid range"));
    });
    
    client.emit("getRange", {start:"2018-00-19", end:"2018-03-18"});
  });
   
  it("Should not allow invalid months [13] (01 <= month <= 12)", function(done){
    client.on("invalidRange", function(){
      return done();
    });
    
    client.on("loadData", function(data){
      return done(new Error("Received data for invalid range"));
    });
    
    client.emit("getRange", {start:"2017-01-19", end:"2017-13-18"});
  });

  it("Should not allow invalid days [31 of Feb]", function(done){
    client.on("invalidRange", function(){
      return done();
    });
    
    client.on("loadData", function(data){
      return done(new Error("Received data for invalid range"));
    });
    
    client.emit("getRange", {start:"2017-02-31", end:"2017-13-18"});
  });
  
  it("Should not start date to be > end date", function(done){
    client.on("invalidRange", function(){
      return done();
    });
    
    client.on("loadData", function(data){
      return done(new Error("Received data for invalid range"));
    });
    
    client.emit("getRange", {start:"2017-07-19", end:"2017-06-18"});
  });
  
  it("Should not allow end month to be greater than new Date()", function(done){
    client.on("invalidRange", function(){
      return done();
    });
    
    client.on("loadData", function(data){
      return done(new Error("Received data for invalid range"));
    });
    
    client.emit("getRange", {start:"2017-01-19", end: new Date() + 90000000});
  });
  
  it("Should not allow start dates earlier than 2006-01-01", function(done){
    client.on("invalidRange", function(){
      return done();
    });
    
    client.on("loadData", function(data){
      return done(new Error("Received data for invalid range"));
    });
    
    client.emit("getRange", {start:"2005-12-31", end:"2017-13-18"});
  });
  
  it("Should return valid entries for range 2018-08-05 to 2018-08-25", function(done){
    client.on("loadData", function(data){
      data[0].closing.length.should.equal(10);
      data[1].closing.length.should.equal(14);
      data[2].closing.length.should.equal(0);
      data[3].closing.length.should.equal(0);
      return done();
    });
    
    client.emit("getRange", {start:"2018-08-05", end:"2018-08-25"});
  });
  
  it("Should return valid entries for range 2018-07-01 to 2018-08-15", function(done){
    client.on("loadData", function(data){
      data[0].closing.length.should.equal(4);
      data[1].closing.length.should.equal(32);
      data[2].closing.length.should.equal(18);
      data[3].closing.length.should.equal(0);
      return done();
    });
    
    client.emit("getRange", {start:"2018-07-01", end:"2018-08-15"});
  });
  
  it("Should return valid entries for range 2018-02-15 to 2018-05-15", function(done){
    client.on("loadData", function(data){
      data[0].closing.length.should.equal(0);
      data[1].closing.length.should.equal(62);
      data[2].closing.length.should.equal(62);
      data[3].closing.length.should.equal(42);
      return done();
    });
    
    client.emit("getRange", {start:"2018-02-15", end:"2018-05-15"});
  });
  
  afterEach(function(){
    client.close();
  });
  
  after(function() { client.close(); });
});


