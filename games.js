const { app, DB, db } = require('./DB.js');
const { generateId, resError } = require('./utils.js');

const messageTypes = ['', 'ROTATING'];
const messageTypesLength = messageTypes.length;

/*
DB {
    id: '',
    lastUpdate: number,
    active: false,
    owner: string,
    players: [
        { user: string, points: 0 }
    ],
    messages: string[],
    spectators: string[],
    currentWord: string,
    currentWordOptions: {
        x: number;
        y: number;
    },
    currentWordType: '',
    finished: boolean
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
    spectators: User[],
    currentWord: string,
    currentWordOptions: {
        x: number;
        y: number;
    },
    currentWordType: '',
    finished: boolean
}
*/

// app.get('/games', (req, res) => {
//     const data = db.get(DB.GAME).value();
//     return res.json(data);
// });

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
        lastUpdate: Date.now(),
        currentWord: '',
        currentWordOptions: {
            x: 0,
            y: 0
        },
        currentWordType: messageTypes[0],
        finished: false
    };
    db.get(DB.GAME).push(game).write();
    res.json({ success: true, game });
});

// app.delete('/game/:id', (req, res) => {
//     const { id } = req.params;
//     db.get(DB.GAME).remove({ id }).write();
//     res.json({ success : true });
// });

// app.patch('/game/:id', (req, res) => {
//     const ownerId = req.body.ownerId;
//     const { id } = req.params;
//     const game = req.body;
//     db.get(DB.GAME)
//         .find({ id })
//         .assign( ...game, id )
//         .write();
//     res.json({ success: true });
// });

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
    const user = db.get(DB.USER).find({ id: userId }).value();
    if (!user) return resError(res, `Cannot find a user with an id: "${userId}"`);
    const { id } = req.params;
    const game = db.get(DB.GAME).find({ id });
    let gameValue = game.value();
    if (!gameValue) return resError(res, `Cannot find a game with an id: "${id}"`, 404);

    gameValue = parseGame(gameValue);

    if (!gameValue.players.find(({user: {id}}) => id === userId) && !gameValue.spectators.find(({id}) => id === userId)) {
        gameValue.spectators.push(user);
        game
            .update('spectators', spectators => {
                spectators.push(userId);
                return spectators;
            })
            .set('lastUpdate', Date.now())
            .write();
    }
    
    return res.json({
        success: true,
        game: gameValue
    });
});

app.post('/games/:id/start', (req, res) => {
    const {id} = req.params;
    const game = db.get(DB.GAME).find({ id });
    const gameValue = game.value();
    if (!gameValue) return resError(res, `Cannot find a game with an id: "${id}"`, 404);
    if (gameValue.active && !gameValue.finished) return resError(res, `Game with an id: "${id}" has been already started`, 400);

    game
        .set('active', true)
        .set('finished', false)
        .set('lastUpdate', Date.now())
        .set('currentWord', generateWord())
        .set('currentWordOptions', {
            x: Math.floor(Math.random() * 30) - 15,
            y: Math.floor(Math.random() * 30) - 15
        })
        .set('currentWordType', messageTypes[Math.floor(messageTypesLength * Math.random())])
        .update('players', players => {
            return players
                .map(player => {
                    player.points = 0;
                    return player;
                })
                .concat(gameValue.spectators.map(spectator => ({
                    user: spectator,
                    points: 0
                })));
        })
        .set('spectators', [])
        .write();

    return res.json({
        success: true
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

const MSG_TIMEOUT = 4000;
app.post('/games/:id/messages', (req, res) => {
    const { userId, text } = req.body;
    if (!text) return resError(res, `Cannot create an emoty message`);
    const user = db.get(DB.USER).find({ id: userId });
    const userValue = user.value();
    if (!userValue) return resError(res, `Cannot find a user with an id: "${userId}"`);
    const { id } = req.params;
    const game = db.get(DB.GAME).find({ id });
    const gameValue = game.value();
    if (!gameValue) return resError(res, `Cannot find a game with an id: "${id}"`, 404);
    if (gameValue.finished) return resError(res, `Cannot add message to already finished game: "${id}"`, 400);
    if (!gameValue.players.some(player => player.user === userId)) return resError(res, `Cannot create a message when not playing game, user id: "${userId}", game id: ${id}`);

    const message = {
        id: generateId(),
        text,
        user: userId,
        x: Math.random() * 90,
        y: Math.random() * 90,
        type: messageTypes[Math.floor(messageTypesLength * Math.random())]
    };

    db.get(DB.MESSAGE)
        .push(message)
        .write();

    if (gameValue.currentWord === text) {
        game
            .set('currentWord', generateWord())
            .set('currentWordOptions', {
                x: Math.floor(Math.random() * 30) - 15,
                y: Math.floor(Math.random() * 30) - 15
            })
            .set('currentWordType', messageTypes[Math.floor(messageTypesLength * Math.random())])
            .set('lastUpdate', Date.now())
            .thru( game => {
                const user = game.players.find(player => player.user === userId);
                ++user.points;
                if (user.points === 10){
                    game.finished = true;
                }
                return game;
            })
            .get('messages').push(message.id)
            .write();
        game
            .get(DB.USER)
            .find({ id: userId })
            .update('win', win => ++win)
            .write();
    }  else {
        game
            .set('lastUpdate', Date.now())
            .get('messages').push(message.id)
            .write();
    }

    setTimeout(() => {
        db.get(DB.MESSAGE)
            .remove({ id: message.id })
            .write();
        db.get(DB.GAME)
            .find({ id })
            .update('messages', messages => 
                messages.filter(id => id !== message.id)
            )
            .set('lastUpdate', Date.now())
            .write();
    }, MSG_TIMEOUT);

    return res.json({ success: true })
});

const POLL_TIMEOUT = 200;
function checkGameState (id) {
    const game = db.get(DB.GAME).find({ id });
    const gameLastUpdate = game.get('lastUpdate');
    const initialLastUpdate = gameLastUpdate.value();
    let initialTime = Date.now();
    return new Promise((resolve) => {
        const checkChanges = () => {
            if (initialLastUpdate < gameLastUpdate.value()) {
                resolve({ game: parseGame(game.value()) });
            } else if (Date.now() - initialTime > 25000) {
                resolve({});
            } else {
                timeout = setTimeout(checkChanges, POLL_TIMEOUT);
            }
        };
        setTimeout(checkChanges, POLL_TIMEOUT);
    });
}

const alphabet = 'ABCDEFGHJKLMNOPQRSTUWVXYZabcdefghijkmnopqrstuvwxyz@$#_&-+()/*"\':;!?1234567890';
const alphabetLen = alphabet.length;
function generateWord (length = 7) {
    let word = '';
    do {
        word += alphabet[Math.floor(Math.random() * alphabetLen)];
    } while(--length)
    return word;
}

function parseGame (game) {
    const playerDb = db.get(DB.USER);
    const messagesDb = db.get(DB.MESSAGE);
    const players = game.players.map((player) => ({
        ...player,
        user: playerDb.find({id: player.user}).value()
    }));
    const spectators = game.spectators.map(id => playerDb.find({id}).value());
    const owner = playerDb.find({id: game.owner}).value();
    const messages = game.messages.map(id => {
        const message = messagesDb.find({id}).value();
        return {
            ...message,
            user: playerDb.find({ id: message.user }).value()
        };
    });

    return {
        ...game,
        players,
        spectators,
        owner,
        messages
    };
}
