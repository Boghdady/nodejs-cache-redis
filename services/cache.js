const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');

const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
// Instead client.get return callback it will return a promise
client.hget = util.promisify(client.hget);

// When calling cache method in mongoose Query set useCache = true
mongoose.Query.prototype.cache = function (options = {}) {
  console.log('MARKED AS CACHE QUERY..');
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');

  return this; // For applying chaining query Query().cache().limit().skip()
};

// Store a reference for the original exec function
const exec = mongoose.Query.prototype.exec;

// Override the original exec function, exec function calls with every query execution
mongoose.Query.prototype.exec = async function () {
  // If cache method not call then not apply cache logic
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }

  // This logic will run before execute any query
  // Create consistent and unique key {query, collection name}
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name,
    })
  );

  // Caching steps
  // 1. See if we have a value for 'key' in redis
  const cacheValue = await client.hget(this.hashKey, key);
  // 2. If we do, return that
  if (cacheValue) {
    console.log('FROM CACHED LAYER : ');
    // return a mongoose document
    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc)
      ? doc.map((d) => new this.model(d))
      : new this.model(doc);
  }
  // 3. Otherwise, issue the query and store the result in redis
  // this -> refer to Query
  const result = await exec.apply(this, arguments);
  client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10); // expire time = 10 seconds

  console.log('FROM MONGO DB: ');
  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
};
