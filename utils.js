const { nanoid } = require("nanoid");
const { DB, db } = require('./DB.js');
const dbNames = Object.keys(DB);

const generateId = () => {
    const openDbs = dbNames.map(dbName => db.get(dbName));
    let idPredicate = {id: ''};
    do {
        idPredicate.id = nanoid();
    } while (
        openDbs.some(db => db.find(idPredicate).value())
    );

    return idPredicate.id;
};

const resError = (res, errorMsg, status = 400) => {
    return res.status(status).json({
        success: false,
        error: errorMsg
    })
};

module.exports = { generateId, resError };