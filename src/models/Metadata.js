const mongoose = require('mongoose');

const MetadataSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Metadata = mongoose.model('metadata', MetadataSchema);
