const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const NFTInfo = require('../../models/NFTInfo');
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
                        'latestTransfer.owner':  address.toString().toLowerCase() // Case-insensitive exact match
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
        return res.status(200).json({ error: errors.message });
    }
})

router.get('/metadata/:id', (req, res) => {
    const { id } = req.params;
    const jsonFilePath = path.join(__dirname, 'upload', 'Json', `${id}.json`);

    // Check if the JSON file exists
    fs.access(jsonFilePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('Error:', err);
            return res.status(404).json({ error: 'Metadata not found' });
        }

        // Read the JSON file and send its contents as response
        fs.readFile(jsonFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            const metadata = JSON.parse(data);
            res.json(metadata);
        });
    });
});


module.exports = router;