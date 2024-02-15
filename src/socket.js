const app = require("./app");
var server = require('http').createServer(app);
const axios = require('axios');


var Web3 = require('web3');
const NFTInfo = require("./models/NFTInfo");
const RPC = require("../env").RPC;
const NFTABI = require("../env").NFTABI;
const NftContractAddress = require("../env").NftContractAddress;

var web3WS = new Web3(RPC);
var myContract = new web3WS.eth.Contract(NFTABI, NftContractAddress);

var scanBlockNumber = 5517196;
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
            scanBlockNumber = curMaxBlock + 1;
        } catch (e) {

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

                console.log("---------------------- end of TransferNFT event --------------------")
                console.log("");
                // }
            }
        }

    } catch (error) {
        console.log("Something went wrong 7: " + error.message)
    }
}

const updateMetadata = async (tokenId) => {
    try {
        let ipfs_base_url = 'https://ipfs.io/ipfs/';
        let ipfs_hash = 'ipfs://bafybeigkkpsr2kec7krjdeprq4k4fzpp2tnqxkbh26r4x4ov2yhht46u2y/' //await myContract.methods.baseURI().call();
        ipfs_hash = 'bafybeigkkpsr2kec7krjdeprq4k4fzpp2tnqxkbh26r4x4ov2yhht46u2y' //await myContract.methods.baseURI().call();
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
                    const response = await axios.get(ipfs_base_url + ipfs_hash + '/' + value.tokenId);
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
    catch (err) {
        console.log(err.message);
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));



module.exports = {
    server: app,
    getBlockNumber,
    getData,
    updateMetadata
}