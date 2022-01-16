/**
 * Functions to handle the SQLite3 DB
 * Tables:
 * - Streams : for streams of a game data
 * - Tags : datas for the used tags
 * - TagNames : link between id, name and desc of a tag
 */
const sqlite3 = require('sqlite3')

const db = new sqlite3.Database('./twitchstats.db')
const tables = ['Streams', 'Tags', 'TagNames']

// Init the DB, create tables if missing
exports.create = () => new Promise((s,f) => {
    db.serialize(() => {
        const req = `SELECT name FROM sqlite_master WHERE type='table' AND (${tables.map(t => `name='${t}'`).join(' OR ')}) ORDER by name`

        db.all(req, (e,data) => {
            if(e) f(e)
            if(data.length === 3) s('Tables already exists') // tables already exists

            // Streams
            if(!data.find(t => t.name === tables[0])) {
                console.log('Create table ' + tables[0])
                db.run(`CREATE TABLE ${tables[0]} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id INTEGER,
                    timestamp INTEGER,
                    language VARCHAR(10),
                    streamers INTEGER,
                    viewers INTEGER
                )`)
            }

            // Tags
            hasTable = data.find(t => t.name === tables[1])
            if(!hasTable) {
                console.log('Create table ' + tables[1])
                db.run(`CREATE TABLE ${tables[1]} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id INTEGER,
                    tag_id VARCHAR(50),
                    timestamp INTEGER,
                    language VARCHAR(10),
                    occurences INTEGER,
                    viewers INTEGER
                )`)
            }

            // TagNames
            hasTable = data.find(t => t.name === tables[2])
            if(!hasTable) {
                console.log('Create table ' + tables[2])
                db.run(`CREATE TABLE ${tables[2]} (
                    tag_id VARCHAR(50) PRIMARY KEY,
                    tag_name VARCHAR(50),
                    tag_desc TEXT
                )`)
            }
            s('Done')
        })
    })
})

// Add the datas for a game at a specific time
exports.insertStreamData = data => new Promise((s,f) => {
    db.serialize(() => {
        db.prepare(`INSERT INTO ${tables[0]} (game_id, timestamp, language, streamers, viewers) VALUES (?,?,?,?,?)`)
            .run(data.GAMEID, data.timestamp, data.language, data.streams, data.viewers, function(e) {
                if(e) f(e)
                s(this.lastID)
            }).finalize()
    })
})

// Add the datas for a tag at a specific time
exports.insertTagData = data => new Promise(s => {
    db.serialize(() => {
        const prepared = db.prepare(`INSERT INTO ${tables[1]} (game_id, tag_id, timestamp, language, occurences, viewers) VALUES (?,?,?,?,?,?)`)
        for(const tag in data.tags) {
            prepared.run(data.GAMEID, tag, data.timestamp, data.language, data.tags[tag], data.viewers)
        }
        prepared.finalize()
        s()
    })
})

exports.getTagName = id => new Promise((s,f) => {
    db.all(`SELECT tag_id, tag_name FROM ${tables[2]} WHERE tag_id='${id}'`, (e, data) => {
        if(e) f(e)
        s(data)
    })
})

// add a new tag informations
exports.insertTagName = (id, name, desc) => new Promise((s,f) => {
    db.serialize(() => {
        db.prepare(`INSERT INTO ${tables[2]} (tag_id, tag_name, tag_desc) VALUES (?,?,?)`)
            .run(id, name, desc, function(e) {
                if(e) f(e)
                s(this.lastID)
            }).finalize()
    })
})