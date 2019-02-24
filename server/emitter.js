const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const recEmit = new MyEmitter();

module.exports.recEmit = recEmit;