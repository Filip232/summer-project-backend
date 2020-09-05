const { app, DB, db } = require('./DB.js');
const { generateId, resError } = require('./utils.js');

/*
game {
    id: '',
    active: true,
    owner: User,
    players: [
        { user: User, points: 0 }
    ],
    messages: Message[]],
    spectators: User[]
}
*/

app.get('/games', (req, res) => {
    const data = db.get(DB.GAME).value();
    return res.json(data);
});

app.post('/games', (req, res) => {
    const ownerId = req.body.ownerId;
    const user = db.get(DB.USER).find({ id: ownerId }).value();
    if (!user) return resError(res, `Cannot find user with id: "${ownerId}"`);

    const game = {
        id: generateId(),
        active: false
     };
    db.get(DB.GAME).push(game).write()
    res.json({ success: true, game });
});

app.delete('/game/:id', (req, res) => {
    const { id } = req.params;
    db.get(DB.GAME).remove({ id }).write();
    res.json({ success : true });
});

app.patch('/game/:id', (req, res) => {
    const { id } = req.params;
    const game = req.body;
    db.get(DB.GAME)
        .find({ id })
        .assign( ...game, id )
        .write();
    res.json({ success: true });
});

app.get('/games/:id', (req, res) => {
    const { id } = req.params;
    const game = db.get(DB.GAME)
        .find({ id });
    return res.json(game);
});
