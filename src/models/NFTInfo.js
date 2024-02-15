const mongoose = require('mongoose');

const NFTInfoSchema = new mongoose.Schema({
  blockNumber : {
    type : Number,
    required : true
  },
  sender: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  metaData: {
    type: Object,
    required: false,
  },
  tokenId: {
    type: Number,
    required: true,
  },
  tokenHash: {
    type: String,
    required: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

module.exports = NFTInfo = mongoose.model('nftinfo', NFTInfoSchema);
