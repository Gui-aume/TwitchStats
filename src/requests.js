/**
 * handle the requests on twitch API
 */
const https = require('https')
require('dotenv').config()

// get the required token for the API
const getAPIToken = require('./tokenHandler.js')

const {CLIENTID} = process.env

/**
 * Handle any request to the twitch API
 * @param {string} apiToken access bearer token
 * @param {string} request params of the url to build the request: read twitch doc
 * @param {boolean} debug print the data in console
 * @returns object with all data result
 */
const requestAPI = (apiToken, request, debug=false) => new Promise((s,f) => {
    if(!request) return console.error('Request path is empty')

    const user_options = {
        headers: {
            'client-id': CLIENTID,
            'Authorization': 'Bearer '+ apiToken
        }
    }
    let buffer = ''

    https.get(`https://api.twitch.tv/helix/${request}`, user_options, async res => {
        // if we get {"error":"Unauthorized","status":401,"message":"Invalid OAuth token"} : force a new Bearer token
        if(res.statusCode === 401)
            await await getAPIToken(true)
        // read every packet of data
        res.on('data', d => {
            buffer+=d
        })
        // until end of data
        res.on('end', () => {
            if(debug)
                console.log(buffer)
            s(JSON.parse(buffer))
        })
    }).on('error', e => f(e))
})

// A query to get a streamed game ID from name
module.exports.getGameID = async (gameName='Software%20and%20Game%20Development') => {
    const token = await getAPIToken()
    if(!token) return

    try {
        const res = await requestAPI(token, 'games?name=' + gameName).catch(console.error)
        return res.data[0]['id']
    } catch (e) {
        console.error(e)
    }
}

// get the infos of a tag from its ID
module.exports.getTagFromID = async tagID => {
    if(!tagID) return console.error('TagID required')
    const token = await getAPIToken()
    if(!token) return

    // get name and desc from a tag for a specific language
    const res = await requestAPI(token, 'tags/streams?tag_id=' + tagID)
    const tagName = res.data[0].localization_names['fr-fr']
    const tagDesc = res.data[0].localization_descriptions['fr-fr']

    return [tagName, tagDesc]
}

// Get datas for a specific game : number of streams and viewers for a specific (or all) language
module.exports.getGameStats = async (GAMEID='1469308723', GAMELANG) => {
    const token = await getAPIToken()
    if(!token) return

    const DATASIZE = 100
    const tags = {}

    // the API return a max of 100 values, so we need to make several requests if number of streams is bigger than that
    let lastPagination = ''

    let lastDataSize
    let totalStreams = 0

    let totalViewers = 0
    
    const timestamp = Date.now()
    const request = `streams?game_id=${GAMEID}&first=${DATASIZE}` + (GAMELANG ? `&language=${GAMELANG}` : '')

    try{
        // require each page of data
        do {
            const {data, pagination} = await requestAPI(token, request + (lastPagination ? '&after=' + lastPagination : ''))
            
            // keep track to query next page number
            lastDataSize = data.length
            lastPagination = pagination.cursor

            // Count number of streams for the game
            totalStreams += lastDataSize

            // Keep track of the tags
            data.forEach(stream => {
                const {tag_ids, viewer_count} = stream

                // Increment stream counters
                totalViewers += viewer_count

                // Count tags
                tag_ids.forEach(tag => {
                    if(tag in tags)
                        tags[tag]++
                    else tags[tag] = 1
                })
                
            })
        } while(lastDataSize === DATASIZE)
    } catch(e) {console.error(e)}

    return { 
        GAMEID,
        language : GAMELANG ? GAMELANG : 'all',
        streams : totalStreams,
        viewers : totalViewers,
        timestamp,
        tags
    }
}