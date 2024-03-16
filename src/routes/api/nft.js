const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const NFTInfo = require('../../models/NFTInfo');
const Pooldata = require('../../models/Pooldata');
const StakeInfo = require('../../models/StakeInfo');
dotenv.config();

router.get('/', [], async (req, res) => {
    try {
        let { page, address } = req.query;

        if (address) {

            NFTInfo.aggregate([
                {
                    $group: {
                        _id: '$tokenId', // group by NFT ID
                        latestTransfer: { $last: '$$ROOT' } // get the latest transfer event for each NFT ID
                    }
                },
                {
                    $sort: {
                        '_id': -1 // Sort by tokenId in descending order
                    }
                },
                {
                    $match: {
                        'latestTransfer.owner': address.toString().toLowerCase() // Case-insensitive exact match
                    }
                },
                {
                    $project: {
                        _id: 0, // exclude the default _id field
                        tokenId: '$latestTransfer.tokenId',
                        owner: '$latestTransfer.owner', // the latest receiver is the current holder
                        metaData: '$latestTransfer.metaData'
                    }
                }
            ]).exec()
                .then(currentHolders => {
                    return res.status(200).json({ error: 'OK', data: currentHolders });
                })
                .catch(err => {
                    console.error('Error fetching current holders:', err);
                    return res.status(500).json({ error: err.message });
                });
        }
        else {
            const pageSize = 100; // number of documents per page
            if (!page || page <= 0) {
                page = 1;
            }

            NFTInfo.aggregate([
                {
                    $group: {
                        _id: '$tokenId', // group by NFT ID
                        latestTransfer: { $last: '$$ROOT' } // get the latest transfer event for each NFT ID
                    }
                },
                {
                    $sort: {
                        '_id': -1 // Sort by tokenId in descending order
                    }
                },
                {
                    $project: {
                        _id: 0, // exclude the default _id field
                        tokenId: '$latestTransfer.tokenId',
                        owner: '$latestTransfer.owner', // the latest receiver is the current holder
                        metaData: '$latestTransfer.metaData'
                    }
                },
                {
                    $skip: (page - 1) * pageSize // Skip documents based on the page number and page size
                },
                {
                    $limit: pageSize // Limit the number of documents per page
                }
            ]).exec()
                .then(currentHolders => {
                    // currentHolders.map(async (value)=>{
                    //     await NFTInfo.updateMany({owner : value.owner } , {owner : value.owner.toString().toLowerCase() })
                    // })
                    return res.status(200).json({ error: 'OK', data: currentHolders });
                })
                .catch(err => {
                    console.error('Error fetching current holders:', err);
                    return res.status(500).json({ error: err.message });
                });
        }
    }
    catch (error) {
        console.log(error.message);
        return res.status(200).json({ error: error.message });
    }
})

router.get('/upcoming-pool', async (req, res) => {
    let { page } = req.query;
    const perPage = 10;
    if (!page || page == 'undefined' || page <= 0) {
        page = 1;
    }

    let offset = parseInt(parseInt(page) - 1) * perPage;
   
    try {
        const currentTimeUnix = Math.floor(Date.now() / 1000);
        const count = await Pooldata.countDocuments({ startTime: { $gt: currentTimeUnix } });
        let data = await Pooldata.find({ startTime: { $gt: currentTimeUnix } ,status : 'true'  })
            .sort({ startTime: 1 })
            .skip(offset)
            .limit(perPage)

        if (data) {
            return res.status(200).json({ error: 'OK', data: data, count });
        }
        else {
            return res.status(200).json({ error: 'OK', data: [], count: 0 });
        }
    }
    catch (error) {
        console.log(error.message);
        return res.status(200).json({ error: error.message });
    }
});

router.get('/completed', async (req, res) => {
    let { page } = req.query;
    const perPage = 10;
    if (!page || page == 'undefined' || page <= 0) {
        page = 1;
    }

    let offset = parseInt(parseInt(page) - 1) * perPage;

    try {
        const currentTimeUnix = Math.floor(Date.now() / 1000);
        const count = await Pooldata.countDocuments({ startTime: { $gt: currentTimeUnix } , status : 'true' });
        let data = await Pooldata.find({ startTime: { $lt: currentTimeUnix } })
            .sort({ startTime: -1 })
            .skip(offset)
            .limit(perPage)

        if (data) {
            return res.status(200).json({ error: 'OK', data: data, count });
        }
        else {
            return res.status(200).json({ error: 'OK', data: [], count: 0 });
        }
    }
    catch (error) {
        console.log(error.message);
        return res.status(200).json({ error: error.message });
    }
});

router.get('/user-nft', async (req, res) => {
    let { page, address } = req.query;
    if (!address) {
        return res.status(200).json({ error: 'OK', data: [], count: 0 });
    }

    const perPage = 10;
    if (!page || page == 'undefined' || page <= 0) {
        page = 1;
    }

    let offset = parseInt(parseInt(page) - 1) * perPage;
    try {
        const count = await StakeInfo.countDocuments({ owner: address.toString().toLowerCase() });
        let stakeInfoRecords = await StakeInfo.find({ owner: address.toString().toLowerCase() })
            .sort({ created: -1 })
            .skip(offset)
            .limit(perPage)
        if (stakeInfoRecords) {

            let resultWithNFTInfo = [];

            for (let stakeInfo of stakeInfoRecords) {
                // Fetch NFTInfo data based on tokenId
                let nftInfoData = await NFTInfo.findOne({ tokenId: stakeInfo.tokenId });
                let poolData = await Pooldata.findOne({ pool_id: stakeInfo.pool_id });

                // Combine StakeInfo and NFTInfo data
                let combinedData = {
                    poolData : poolData,
                    stakeInfo: stakeInfo,
                    nftInfo: nftInfoData // If nftInfoData is null, it means no NFTInfo found for the given tokenId
                };

                // Push the combined data to the result array
                resultWithNFTInfo.push(combinedData);
            }

            return res.status(200).json({ error: 'OK', data: resultWithNFTInfo, count : resultWithNFTInfo.length });
        }
        else {
            return res.status(200).json({ error: 'OK', data: [], count: 0 });
        }
    }
    catch (error) {
        console.log(error.message);
        return res.status(200).json({ error: error.message });
    }
});


module.exports = router;