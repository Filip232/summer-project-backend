const { app } = require('./DB.js');
const PORT = 4000;

require('./games.js');
require('./users.js');
require('./messages.js');

app.listen(PORT, ()=>{
    console.log(`Backend is running on http://localhost:${PORT}`)
});
