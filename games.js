const { app, DB, db } = require('./DB.js');
const { generateId, resError } = require('./utils.js');

/*
DB {
    id: '',
    lastUpdate: number,
    active: false,
    owner: string,
    players: string[],
    messages: string[],
    spectators: string[]
}

game {
    id: '',
    lastUpdate: number,
    active: true,
    owner: User,
    players: [
        { user: User, points: 0 }
    ],
    messages: Message[],
    spectators: User[]
}
*/

app.get('/games', (req, res) => {
    const data = db.get(DB.GAME).value();
    return res.json(data);
});

app.post('/games', (req, res) => {
    const ownerId = req.body.ownerId;
    const owner = db.get(DB.USER).find({ id: ownerId }).value();
    if (!owner) return resError(res, `Cannot find user with id: "${ownerId}"`);

    const game = {
        id: generateId(),
        active: false,
        owner: ownerId,
        players: [],
        messages: [],
        spectators: [ownerId],
        lastUpdate: Date.now()
    };
    db.get(DB.GAME).push(game).write();
    res.json({ success: true, game });
});

// app.delete('/game/:id', (req, res) => {
//     const { id } = req.params;
//     db.get(DB.GAME).remove({ id }).write();
//     res.json({ success : true });
// });

app.patch('/game/:id', (req, res) => {
    const ownerId = req.body.ownerId;
    const { id } = req.params;
    const game = req.body;
    db.get(DB.GAME)
        .find({ id })
        .assign( ...game, id )
        .write();
    res.json({ success: true });
});

app.get('/games/:id', (req, res) => {
    const {id} = req.params;
    const game = db.get(DB.GAME).find({ id }).value();
    if (!game) return resError(res, `Cannot find a game with an id: "${id}"`, 404);
    return res.json({
        success: true
    });
});

app.post('/games/:id/join', (req, res) => {
    const { userId } = req.body;
    const playerDb = db.get(DB.USER);
    const user = playerDb.find({ id: userId }).value();
    if (!user) return resError(res, `Cannot find a user with an id: "${userId}"`);
    const { id } = req.params;
    const game = db.get(DB.GAME).find({ id });
    const gameValue = game.value();
    const messagesDb = db.get(DB.MESSAGE);
    const players = gameValue.players.map(id => playerDb.find({id}).value());
    const spectators = gameValue.spectators.map(id => playerDb.find({id}).value());
    const owner = playerDb.find({id: gameValue.ownerId}).value();
    const messages = gameValue.messages.map(id => messagesDb.find({id}).value());

    if (!players.find(({id}) => id === userId) && !spectators.find(({id}) => id === userId)) {
        spectators.push(user);
        game
            .update('spectators', spectators => {
                spectators.push(userId);
                return spectators;
            })
            .set('lastUpdated', Date.now())
            .write();
    }
    
    return res.json({
        success: true,
        game: {
            ...gameValue,
            players,
            spectators,
            owner,
            messages
        }
    });
});

app.get('/games/:id/updatePoll', async (req, res) => {
    const { id } = req.params;
    const game = db.get(DB.GAME).find({ id }).value();
    if (!game) return resError(res, `Cannot find a game with an id: "${id}"`, 404);
    
    const {game: gameValue} = await checkGameState(id);

    return res.json({
        success: !!gameValue,
        game: gameValue
    });
});

const POLL_TIMEOUT = 200;
function checkGameState (id) {
    const game = db.get(DB.GAME).find({ id });
    const gameLastUpdated = game.get('lastUpdated');
    const initialLastUpdated = gameLastUpdated.value();
    let initialTime = Date.now();
    return new Promise((resolve) => {
        let timeout;
        const checkChanges = () => {
            if (initialLastUpdated < gameLastUpdated.value()) {
                resolve({game:game.value()});
            } else if (Date.now() - initialTime > 25000) {
                resolve({});
            } else {
                timeout = setTimeout(checkChanges, POLL_TIMEOUT);
            }
        };
        setTimeout(checkChanges, POLL_TIMEOUT);
    });
}
