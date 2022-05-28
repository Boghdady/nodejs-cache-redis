const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const keys = require('./config/keys');

require('./models/User');
require('./models/Blog');
require('./services/passport');
require('./services/cache');

mongoose.Promise = global.Promise;
mongoose.connect(keys.mongoURI, { useMongoClient: true });

const app = express();

app.use(bodyParser.json());
app.use(
  cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000,
    keys: [keys.cookieKey],
  })
);
app.use(passport.initialize());
app.use(passport.session());

require('./routes/authRoutes')(app);
require('./routes/blogRoutes')(app);

if (['production'].includes(process.env.NODE_ENV)) {
  app.use(express.static('client/build'));

  const path = require('path');
  app.get('*', (req, res) => {
    res.sendFile(path.resolve('client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Listening on port`, PORT);
});

// Adding Indexes
// 1. Take long time when add record to the collection that have more indexes
// 2. Take more space and memory

// Caching layer
// key=query, value= query result
// simple key value lookup
// caching layer used for reading data, not writing data
// Redis is in memory data store
// database that run in memory in your machine

// redis-cli ping
// PONG

// How Redis work?
// 1.How data is stored inside redis
// set("key", "value")
// get("key", (err, value) => {  })

// Redis hashes
// hset("master_key", "nested_key", "value")

// key= query & value= query result
//
