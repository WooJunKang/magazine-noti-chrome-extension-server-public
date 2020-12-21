
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

var contentSchema = new Schema({
  title: String,
  scraped_at: Date,
  url: String,
  img_url: String,
  description: String
});

module.exports = mongoose.model('contentsMagazine', contentSchema);

