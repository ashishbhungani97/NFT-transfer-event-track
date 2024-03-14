const express = require("express");
const cors = require("cors");
const bodyParser = require('body-parser');
const app = express();
const path = require("path");
const configureRoutes = require('./routes');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!')
})

// Set-up Routes
configureRoutes(app);

module.exports = app;
