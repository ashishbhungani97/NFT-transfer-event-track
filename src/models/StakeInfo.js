const mongoose = require('mongoose');

const StakeInfoSchema = new mongoose.Schema({
  blockNumber : {
    type : Number,
    required : true
  },
  pool_id : {
    type : Number,
    required : true
  },
  owner: {
    type: String,
    required: true,
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

module.exports = StakeInfo = mongoose.model('stakeinfo', StakeInfoSchema);
