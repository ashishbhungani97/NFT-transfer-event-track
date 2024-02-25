const mongoose = require('mongoose');

const PooldataSchema = new mongoose.Schema({
  pool_id : {
    type:Number,
    required : true
  },
  startTime : {
    type:Number,
    required : true
  },
  endTime : {
    type:Number,
    required : true
  },
  totalReward : {
    type:String,
    required : true
  },
  totalNFT : {
    type:Number,
    required : true
  },
  totalNFTFiled : {
    type:Number,
    required : true
  },
  totalUnstaked : {
    type:Number,
    required : true
  },
  rewardToken : {
    type:String,
    required : true
  },
  status : {
    type:Number,
    required : true
  },
  title : {
    type:String,
    required : false
  },
  logo : {
    type:String,
    required : false
  },
  created: {
    type: Date,
    default: Date.now,
  }
});

module.exports = Pooldata = mongoose.model('pooldata', PooldataSchema);
