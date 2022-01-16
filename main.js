/**
 * Root file
 * Get a game informations from twitch API
 * Game ID is needed to get datas
 */
const db = require('./src/db.js')
const request = require('./src/requests.js')

const main = async () => {
    db.create().then(async res => {

        // Get the game ID from twitch
        const gameId = await request.getGameID('Software%20and%20Game%20Development')
        // Get the list of all streams on this game
        const item = await request.getGameStats(gameId,'fr')

        // Store the data in the DB
        await db.insertStreamData(item)
        await db.insertTagData(item)

        // Keep track of all tags to link id with name and description
        for(tag in item.tags) {
            // in case tag name isn't in the DB => add it
            if(!await db.getTagName(tag)) {
                // Get tag name and desc from id on twitch API
                const [tagName, tagDesc] = await request.getTagFromID(tag)
                db.insertTagName(tag, tagName, tagDesc)
            }
        }

        return

        // Get list of all tag id received 
        const tagIds = Object.keys(item.tags)
        const all = await Promise.all(
            tagIds.map(t => db.getTagName(t))
        )

        // If they are already in DB but not filled, get the missing informations
        all.forEach(async (a,i) => {
            if(a.length === 0) {
                // get name & desc from twitch
                const [tagName, tagDesc] = await request.getTagFromID(tagIds[i])
                db.insertTagName(tagIds[i], tagName, tagDesc)
            }
        })
    })
}

main()