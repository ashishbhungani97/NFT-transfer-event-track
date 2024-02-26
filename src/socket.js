const app = require("./app");
var server = require('http').createServer(app);
const axios = require('axios');
var Web3 = require('web3');
const NFTInfo = require("./models/NFTInfo");
const Pooldata = require("./models/Pooldata");
const StakeInfo = require("./models/StakeInfo");
const RPC = require("../env").RPC;
const NFTABI = require("../env").NFTABI;
const NftContractAddress = require("../env").NftContractAddress;

const NFTSTAKEABI = require("../env").NFTSTAKEABI;
const NftStakeContract = require("../env").NftStakeContract;

var web3WS = new Web3(RPC);
var myContract = new web3WS.eth.Contract(NFTABI, NftContractAddress);
var stakeContract = new web3WS.eth.Contract(NFTSTAKEABI, NftStakeContract);

var scanBlockNumber = 5722318;
var maxBlockNumber = 0;

const getBlockNumber = () => {
    web3WS.eth.getBlockNumber()
        .then((number) => {
            if (maxBlockNumber < number) {
                let difference = number - scanBlockNumber;
                if (difference >= 5000) {
                    maxBlockNumber = parseInt(scanBlockNumber) + 5000
                }
                else {
                    maxBlockNumber = number;
                }

                if (scanBlockNumber == 0) {
                    scanBlockNumber = number;
                }
                //   console.log("max block number", number);
            }
        }).catch((error) => {
            console.log("get blocknumber error");
        });
    setTimeout(getBlockNumber, 300);
}

const getData = async () => {

    let curMaxBlock = maxBlockNumber;
    if (scanBlockNumber != 0 && scanBlockNumber < curMaxBlock) {
        console.log('scanFrom : ', scanBlockNumber, " scanTo : ", curMaxBlock);
        try {
            await TransferNFT_monitor(scanBlockNumber, curMaxBlock);
            await StakePool_monitor(scanBlockNumber, curMaxBlock)
            await NftStaked_monitor(scanBlockNumber, curMaxBlock)
            await NFTUnstaked_monitor(scanBlockNumber, curMaxBlock)
            scanBlockNumber = curMaxBlock + 1;
        } catch (e) {
            console.log('getData', e.message)
        }
    }
    setTimeout(getData, 10000);
}

const TransferNFT_monitor = async (blockNumber, toBlockNumber) => {
    try {
        var event = await myContract.getPastEvents("Transfer", { fromBlock: blockNumber, toBlock: toBlockNumber });
        if (event.length > 0) {
            let i;
            for (i = 0; i < event.length; i++) {
                let data = event[i];
                console.log("---------------------- TransferNFT event --------------------")

                var tokenHash = data.transactionHash;
                var sender = data.returnValues.from;
                var receiver = data.returnValues.to;
                var tokenId = data.returnValues.tokenId;
                var scanedblockNumber = data.blockNumber;

                let checkHashExist = await NFTInfo.findOne({ tokenHash: tokenHash, tokenId: tokenId });

                if (!checkHashExist) {
                    await NFTInfo.create({
                        sender,
                        owner: receiver.toString().toLowerCase(),
                        tokenHash,
                        tokenId,
                        blockNumber: scanedblockNumber
                    }).then(() => {

                    })
                        .catch((err) => {
                            console.log("transferNFT error : ", err)
                        })


                }

                updateMetadata(tokenId)

                // }
            }
        }

    } catch (error) {
        console.log("Something went wrong 7: " + error.message)
    }
}

const StakePool_monitor = async (blockNumber, toBlockNumber) => {
    try {
        var event = await stakeContract.getPastEvents("PoolAdded", { fromBlock: blockNumber, toBlock: toBlockNumber });
        if (event.length > 0) {
            let i;
            for (i = 0; i < event.length; i++) {
                let data = event[i];
                let poolId = data.returnValues[0];
                console.log("---------------------- PoolAdded event --------------------")
                await updatePoolData(poolId)

            }
        }

        var event = await stakeContract.getPastEvents("PoolUpdated", { fromBlock: blockNumber, toBlock: toBlockNumber });
        if (event.length > 0) {
            let i;
            for (i = 0; i < event.length; i++) {
                let data = event[i];
                let poolId = data.returnValues[0];
                console.log("---------------------- PoolUpdated event --------------------")
                await updatePoolData(poolId)

            }
        }

    } catch (error) {
        console.log("Something went wrong 7: " + error.message)
    }
}

const NftStaked_monitor = async (blockNumber, toBlockNumber) => {
    try {
        var event = await stakeContract.getPastEvents("NFTStaked", { fromBlock: blockNumber, toBlock: toBlockNumber });
        if (event.length > 0) {
            let i;
            for (i = 0; i < event.length; i++) {
                let data = event[i];
                let poolId = data.returnValues[0];
                console.log("---------------------- NFTStaked event --------------------")
                await updatePoolData(poolId)

                var tokenHash = data.transactionHash;
                var tokenId = data.returnValues[2];
                var userAddress = data.returnValues[1];
                var scanedblockNumber = data.blockNumber;

                let checkHashExist = await StakeInfo.findOne({ tokenHash: tokenHash, tokenId: tokenId });

                if (!checkHashExist) {
                    await StakeInfo.create({
                        pool_id: poolId,
                        owner: userAddress.toString().toLowerCase(),
                        tokenHash,
                        tokenId,
                        blockNumber: scanedblockNumber
                    }).then(() => {

                    })
                        .catch((err) => {
                            console.log("transferNFT error : ", err)
                        })


                }

            }
        }

    } catch (error) {
        console.log("Something went wrong 7: " + error.message)
    }
}

const NFTUnstaked_monitor = async (blockNumber, toBlockNumber) => {
    try {
        var event = await stakeContract.getPastEvents("NFTUnstaked", { fromBlock: blockNumber, toBlock: toBlockNumber });
        if (event.length > 0) {
            let i;
            for (i = 0; i < event.length; i++) {
                let data = event[i];
                let poolId = data.returnValues[0];
                var tokenId = data.returnValues[2];
                console.log("---------------------- NFTUnstaked event --------------------")
                let unstake = await StakeInfo.findOneAndDelete({ tokenId: tokenId })
                await updatePoolData(poolId)
            }
        }

    } catch (error) {
        console.log("Something went wrong 7: " + error.message)
    }
}

const updateMetadata = async (tokenId) => {
    try {
        let ipfsUrl = await myContract.methods.tokenURI(1).call();
        let match = ipfsUrl.match(/^ipfs:\/\/([a-zA-Z0-9]+)/);
        let ipfs_base_url = "https://alchemy.mypinata.cloud/ipfs/"
        let ipfs_hash = match ? match[1] : null;
        if (ipfs_hash) {
            let nftCollection;
            if (tokenId) {
                nftCollection = await NFTInfo.find({ tokenId });
            } else {
                nftCollection = await NFTInfo.aggregate([
                    {
                        $group: {
                            _id: '$tokenId', // group by NFT ID
                            latestTransfer: { $last: '$$ROOT' } // get the latest transfer event for each NFT ID
                        }
                    },
                    {
                        $project: {
                            _id: 0, // exclude the default _id field
                            tokenId: '$latestTransfer.tokenId',
                            currentHolder: '$latestTransfer.owner', // the latest receiver is the current holder
                            metaData: '$latestTransfer.metaData'
                        }
                    }
                ]).exec();
            }

            if (nftCollection) {

                for (let i = 0; i < nftCollection.length; i++) {
                    const value = nftCollection[i];

                    try {
                        const response = await axios.get(ipfs_base_url + ipfs_hash + '/' + value.tokenId + '.json');
                        const r = await NFTInfo.updateMany({ tokenId: parseInt(value.tokenId) }, { metaData: response.data });
                        console.log('Token ID updated:', value.tokenId);

                    } catch (error) {
                        console.error('Error fetching data:', error.message);
                    }
                    // Introduce a delay between requests
                    await delay(500);

                }
            }
        }
    }
    catch (err) {
        console.log(err.message);
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updatePoolData = async (poolId = 0) => {
    if (poolId) {
        let poolData = await stakeContract.methods.pools(poolId).call();
        let checkExist = await Pooldata.findOne({ pool_id: poolId });

        if (checkExist) {
            await Pooldata.findOneAndUpdate({ pool_id: poolId }, {
                startTime: poolData.startTime,
                endTime: poolData.endTime,
                totalReward: poolData.totalReward,
                totalNFT: poolData.totalNFT,
                totalNFTFiled: poolData.totalNFTFiled,
                totalUnstaked: poolData.totalUnstaked,
                rewardToken: poolData.rewardToken,
                status: poolData.status,
                title: poolData.poolData.split('#')[0],
                logo: poolData.poolData.split('#')[1],
            })

        } else {
            await Pooldata.create({
                pool_id: poolId,
                startTime: poolData.startTime,
                endTime: poolData.endTime,
                totalReward: poolData.totalReward,
                totalNFT: poolData.totalNFT,
                totalNFTFiled: poolData.totalNFTFiled,
                totalUnstaked: poolData.totalUnstaked,
                rewardToken: poolData.rewardToken,
                status: poolData.status,
                title: poolData.poolData.split('#')[0],
                logo: poolData.poolData.split('#')[1],
            });
        }
    }
}



module.exports = {
    server: app,
    getBlockNumber,
    getData,
    updateMetadata
}