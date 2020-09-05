const express = require("express")
const cors = require("cors")
const lowDb = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const bodyParser = require("body-parser")
const { nanoid } = require("nanoid")

const db = lowDb(new FileSync('db.json'))

db.defaults({ notes: [] }).write()

const app = express()

app.use(cors())
app.use(bodyParser.json())

const PORT = 4000;

app.get('/notes', (req, res) => {
    const data = db.get("notes").value()
    return res.json(data)
})

app.post('/notes/new', (req, res) => {
    const note = req.body
    db.get("notes").push({
        ...note, id: nanoid()
    }).write()
    res.json({ success : true })
})

app.delete('/notes/:id', (req, res) => {
    const note = req.params
    db.get("notes").remove({
        id: note.id
    }).write()
    res.json({ success : true })
})

app.patch('/notes/:id', (req, res) => {
    const note = req.params
    const newNote = req.body
    db.get("notes").find({
        id: note.id
    }).assign({
        text: newNote.text
    }).write()
    res.json({ success: true })
})

app.get('/notes/:id', (req, res) =>{
    const note = req.params
    const data = db.get("notes").find({
        id: note.id
    })
    return res.json(data)
})

app.listen(PORT, ()=>{
    console.log(`Backend is running on http://localhost:${PORT}`)
})