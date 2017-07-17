/*!
 * coinview.js - coin viewpoint object for bcoin
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const Coins = require('./coins');
const UndoCoins = require('./undocoins');
const CoinEntry = require('./coinentry');

/**
 * Represents a coin viewpoint:
 * a snapshot of {@link Coins} objects.
 * @alias module:coins.CoinView
 * @constructor
 * @property {Object} map
 * @property {UndoCoins} undo
 */

function CoinView() {
  if (!(this instanceof CoinView))
    return new CoinView();

  this.map = new Map();
  this.undo = new UndoCoins();
}

/**
 * Get coins.
 * @param {Hash} hash
 * @returns {Coins} coins
 */

CoinView.prototype.get = function get(hash) {
  return this.map.get(hash);
};

/**
 * Test whether the view has an entry.
 * @param {Hash} hash
 * @returns {Boolean}
 */

CoinView.prototype.has = function has(hash) {
  return this.map.has(hash);
};

/**
 * Add coins to the collection.
 * @param {Hash} hash
 * @param {Coins} coins
 */

CoinView.prototype.add = function add(hash, coins) {
  this.map.set(hash, coins);
  return coins;
};

/**
 * Remove coins from the collection.
 * @param {Coins} coins
 * @returns {Boolean}
 */

CoinView.prototype.remove = function remove(hash) {
  if (!this.map.has(hash))
    return false;

  this.map.delete(hash);

  return true;
};

/**
 * Add a tx to the collection.
 * @param {TX} tx
 * @param {Number} height
 */

CoinView.prototype.addTX = function addTX(tx, height) {
  let coins = Coins.fromTX(tx, height);
  return this.add(tx.hash('hex'), coins);
};

/**
 * Remove a tx from the collection.
 * @param {TX} tx
 * @param {Number} height
 */

CoinView.prototype.removeTX = function removeTX(tx, height) {
  let coins = Coins.fromTX(tx, height);

  for (let coin of coins.outputs.values())
    coin.spent = true;

  return this.add(tx.hash('hex'), coins);
};

/**
 * Add an entry to the collection.
 * @param {Outpoint} prevout
 * @param {CoinEntry} coin
 * @returns {Coins|null}
 */

CoinView.prototype.addEntry = function addEntry(prevout, coin) {
  let {hash, index} = prevout;
  let coins = this.get(hash);

  if (!coins) {
    coins = new Coins();
    this.add(hash, coins);
  }

  if (coin.output.script.isUnspendable())
    return;

  if (!coins.has(index))
    coins.add(index, coin);

  return coins;
};

/**
 * Add a coin to the collection.
 * @param {Coin} coin
 */

CoinView.prototype.addCoin = function addCoin(coin) {
  let {hash, index} = coin;
  let coins = this.get(hash);

  if (!coins) {
    coins = new Coins();
    this.add(hash, coins);
  }

  if (coin.script.isUnspendable())
    return;

  if (!coins.has(index))
    coins.addCoin(coin);

  return coins;
};

/**
 * Add an output to the collection.
 * @param {Outpoint} prevout
 * @param {Output} output
 */

CoinView.prototype.addOutput = function addOutput(prevout, output) {
  let {hash, index} = prevout;
  let coins = this.get(hash);

  if (!coins) {
    coins = new Coins();
    this.add(hash, coins);
  }

  if (output.script.isUnspendable())
    return;

  if (!coins.has(index))
    coins.addOutput(index, output);
};

/**
 * Spend an output.
 * @param {Outpoint} prevout
 * @returns {Boolean}
 */

CoinView.prototype.spendOutput = function spendOutput(prevout) {
  let {hash, index} = prevout;
  let coins = this.get(hash);
  let coin;

  if (!coins)
    return false;

  coin = coins.spend(index);

  if (!coin)
    return false;

  this.undo.push(coin);

  return true;
};

/**
 * Remove an output.
 * @param {Outpoint} prevout
 * @returns {Boolean}
 */

CoinView.prototype.removeOutput = function removeOutput(prevout) {
  let {hash, index} = prevout;
  let coins = this.get(hash);

  if (!coins)
    return false;

  return coins.remove(index);
};

/**
 * Test whether the view has an entry by prevout.
 * @param {Outpoint} prevout
 * @returns {Boolean}
 */

CoinView.prototype.hasEntry = function hasEntry(prevout) {
  let {hash, index} = prevout;
  let coins = this.get(hash);

  if (!coins)
    return false;

  return coins.has(index);
};

/**
 * Get a single entry by input.
 * @param {Outpoint} prevout
 * @returns {CoinEntry}
 */

CoinView.prototype.getEntry = function getEntry(prevout) {
  let {hash, index} = prevout;
  let coins = this.get(hash);

  if (!coins)
    return;

  return coins.get(index);
};

/**
 * Get a single coin by prevout.
 * @param {Outpoint} prevout
 * @returns {Coin}
 */

CoinView.prototype.getCoin = function getCoin(prevout) {
  let coins = this.get(prevout.hash);

  if (!coins)
    return;

  return coins.getCoin(prevout);
};

/**
 * Get a single output by prevout.
 * @param {Outpoint} prevout
 * @returns {Output}
 */

CoinView.prototype.getOutput = function getOutput(prevout) {
  let {hash, index} = prevout;
  let coins = this.get(hash);

  if (!coins)
    return;

  return coins.getOutput(index);
};

/**
 * Get coins height by prevout.
 * @param {Outpoint} prevout
 * @returns {Number}
 */

CoinView.prototype.getHeight = function getHeight(prevout) {
  let coin = this.getEntry(prevout);

  if (!coin)
    return -1;

  return coin.height;
};

/**
 * Get coins coinbase flag by prevout.
 * @param {Outpoint} prevout
 * @returns {Boolean}
 */

CoinView.prototype.isCoinbase = function isCoinbase(prevout) {
  let coin = this.getEntry(prevout);

  if (!coin)
    return false;

  return coin.coinbase;
};

/**
 * Test whether the view has an entry by input.
 * @param {Input} input
 * @returns {Boolean}
 */

CoinView.prototype.hasEntryFor = function hasEntryFor(input) {
  return this.hasEntry(input.prevout);
};

/**
 * Get a single entry by input.
 * @param {Input} input
 * @returns {CoinEntry}
 */

CoinView.prototype.getEntryFor = function getEntryFor(input) {
  return this.getEntry(input.prevout);
};

/**
 * Get a single coin by input.
 * @param {Input} input
 * @returns {Coin}
 */

CoinView.prototype.getCoinFor = function getCoinFor(input) {
  return this.getCoin(input.prevout);
};

/**
 * Get a single output by input.
 * @param {Input} input
 * @returns {Output}
 */

CoinView.prototype.getOutputFor = function getOutputFor(input) {
  return this.getOutput(input.prevout);
};

/**
 * Get coins height by input.
 * @param {Input} input
 * @returns {Number}
 */

CoinView.prototype.getHeightFor = function getHeightFor(input) {
  return this.getHeight(input.prevout);
};

/**
 * Get coins coinbase flag by input.
 * @param {Input} input
 * @returns {Boolean}
 */

CoinView.prototype.isCoinbaseFor = function isCoinbaseFor(input) {
  return this.isCoinbase(input.prevout);
};

/**
 * Retrieve coins from database.
 * @method
 * @param {ChainDB} db
 * @param {Outpoint} prevout
 * @returns {Promise} - Returns {@link Coins}.
 */

CoinView.prototype.readCoin = async function readCoin(db, prevout) {
  let coin = this.getEntry(prevout);

  if (coin)
    return coin;

  coin = await db.readCoin(prevout);

  if (!coin)
    return null;

  this.addEntry(prevout, coin);

  return coin;
};

/**
 * Read all input coins into unspent map.
 * @method
 * @param {ChainDB} db
 * @param {TX} tx
 * @returns {Promise} - Returns {Boolean}.
 */

CoinView.prototype.readInputs = async function readInputs(db, tx) {
  let found = true;

  for (let {prevout} of tx.inputs) {
    if (!(await this.readCoin(db, prevout)))
      found = false;
  }

  return found;
};

/**
 * Spend coins for transaction.
 * @method
 * @param {ChainDB} db
 * @param {TX} tx
 * @returns {Promise} - Returns {Boolean}.
 */

CoinView.prototype.spendInputs = async function spendInputs(db, tx) {
  if (tx.inputs.length < 4) {
    let jobs = [];
    let coins;

    for (let {prevout} of tx.inputs)
      jobs.push(this.readCoin(db, prevout));

    coins = await Promise.all(jobs);

    for (let coin of coins) {
      if (!coin || coin.spent)
        return false;

      coin.spent = true;
      this.undo.push(coin);
    }

    return true;
  }

  for (let {prevout} of tx.inputs) {
    let coin = await this.readCoin(db, prevout);

    if (!coin || coin.spent)
      return false;

    coin.spent = true;
    this.undo.push(coin);
  }

  return true;
};

/**
 * Calculate serialization size.
 * @returns {Number}
 */

CoinView.prototype.getSize = function getSize(tx) {
  let size = 0;

  size += tx.inputs.length;

  for (let input of tx.inputs) {
    let coin = this.getEntry(input);

    if (!coin)
      continue;

    size += coin.getSize();
  }

  return size;
};

/**
 * Write coin data to buffer writer
 * as it pertains to a transaction.
 * @param {BufferWriter} bw
 * @param {TX} tx
 */

CoinView.prototype.toWriter = function toWriter(bw, tx) {
  for (let input of tx.inputs) {
    let coin = this.getEntry(input);

    if (!coin) {
      bw.writeU8(0);
      continue;
    }

    bw.writeU8(1);
    coin.toWriter(bw);
  }

  return bw;
};

/**
 * Read serialized view data from a buffer
 * reader as it pertains to a transaction.
 * @private
 * @param {BufferReader} br
 * @param {TX} tx
 */

CoinView.prototype.fromReader = function fromReader(br, tx) {
  for (let {prevout} of tx.inputs) {
    let coin;

    if (br.readU8() === 0)
      continue;

    coin = CoinEntry.fromReader(br);

    this.addEntry(prevout, coin);
  }

  return this;
};

/**
 * Read serialized view data from a buffer
 * reader as it pertains to a transaction.
 * @param {BufferReader} br
 * @param {TX} tx
 * @returns {CoinView}
 */

CoinView.fromReader = function fromReader(br, tx) {
  return new CoinView().fromReader(br, tx);
};

/*
 * Expose
 */

module.exports = CoinView;
