const server = require("./socket").server;
const getBlockNumber = require("./socket").getBlockNumber;
const getData = require("./socket").getData;
const updateMetadata = require("./socket").updateMetadata;

const connectDB = require('./db');

const port = process.env.PORT || 1234;

connectDB();
getBlockNumber();
getData();


updateMetadata();

server.listen(port, () => console.log(`Listening on port ${port}..`));
