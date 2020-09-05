const express = require("express")
const cors = require("cors")
const lowDb = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const bodyParser = require("body-parser")

const app = express()

app.use(cors())
app.use(bodyParser.json())

const DB = {
    GAME: 'games',
    USER: 'users',
    MESSAGE: 'messages'
};

const db = lowDb(new FileSync('db.json'));

db.defaults({ games: [], users: [] }).write();

module.exports = { app, DB, db };
