const { app, DB, db } = require('./DB.js');
const { generateId, resError } = require('./utils.js');

/*
{
    id: '',
    name: '',
    stats: {
        win: 0,
        loose: 0
    }
}
*/

app.get('/users', (req, res) => {
    return res.json({elo:'s'});
})

app.post('/users', (req, res) => {
    const user = {
        id: generateId(),
        name: '',
        stats: {
            win: 0,
            loose: 0
        }
     };
    db.get(DB.USER).push(user).write();
    res.json({ success: true, user });
});

app.patch('/users/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const user = db.get(DB.USER).find({ id }).value();
    if (!user) return resError(res, 'No user found', 404);
    db.get(DB.USER)
        .find({ id })
        .assign({ name })
        .write();
    user.name = name;
    return res.json({ success: true, user });
});

app.get('/users/:id', (req, res) => {
    const { id } = req.params;
    const user = db.get(DB.USER)
        .find({ id });
    return res.json({ user });
});
