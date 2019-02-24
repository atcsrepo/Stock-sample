'use strict';
//Stripped for sample
const express = require("express"),
      app = express(),
      bunyan = require('bunyan'),
      bodyParser = require('body-parser'),
      env = process.env.NODE_ENV,
      config = require("./server/sample-config.js")[env];

const mongo = require('mongodb').MongoClient;
      
const server = require('http').Server(app),
      io = require('socket.io')(server);

const stockServer = require("./server/server-sample.js");

if (process.env.NODE_ENV === "development"){
  const webpack = require('webpack'),
      webpackConfig = require('./webpack.dev.config.js'),
      compiler = webpack(webpackConfig);

  app.use(require("webpack-dev-middleware")(compiler, {
      noInfo: true, publicPath: webpackConfig.output.publicPath
  }));

  app.use(require("webpack-hot-middleware")(compiler));
}

const log = bunyan.createLogger({
              name: "sample test",
              stream: process.stdout,
              level: process.env.NODE_ENV === "test" ? "fatal" : "info"
            });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongo.connect(config.mongoURL, { useNewUrlParser: true }, (err, client) => {
  log.info('Established connection to mongodb');

  if (err) {
    throw err;
  } else {
    let db = client.db("portfoliotest");
    
    stockServer(db, io, bunyan);
  }
});

server.listen(config.port, () => {
  log.info('Server is listening on port: ', config.port);
});