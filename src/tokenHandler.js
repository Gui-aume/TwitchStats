/**
 * Handle the request for a Bearer token, using a twitch API key
 * Record the bearer value and timeout in a file
 * If bearer is missing or expired, require a new Bearer token
 */
const fs = require('fs')
const https = require('https')
require('dotenv').config()

// API client ID and secret must be specified
const {CLIENTID, CLIENTSECRET} = process.env

const data = JSON.stringify({
    'client_id' : CLIENTID,
    'client_secret': CLIENTSECRET,
    'grant_type': 'client_credentials'
})

// settings to query the token
const options = {
    hostname: 'id.twitch.tv',
    port: 443,
    path: '/oauth2/token',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}

let APIToken = undefined
let APITokenTimeout = 0

// Query twitch auth to get the new token
const connectAPI = new Promise((s,f) => {
    const req = https.request(options, res => {
        res.on('data', d => {
            // {access_token, expires_in, token_type='Bearer'}
            s(JSON.parse(d))
        })
    })

    req.on('error', f)
    req.write(data)
    req.end()
})

// Reniew the token : call the api and record it to a file
const reniewAPIToken = () => new Promise((s,f) => {
    // Get Twitch API Token to make requests
    console.log('Get new Bearer token ...')
    connectAPI.then(json => {
        const {access_token, expires_in, token_type} = json

        // twitch send duration of token => adding the current timestamp
        const expireDate = Date.now() + expires_in * 1000
        const newToken = `${access_token}:${expireDate}`

        APIToken = access_token
        APITokenTimeout = expireDate

        // Store Token and expire timestamp to file
        fs.writeFile(__dirname + '/bearer', newToken, e => {
            e ? f(e) : s(access_token, expireDate)
        })
    })
    .catch(f)
})

/**
 * 
 * @param {boolean} force renew the Bearer token even if not expired
 * @returns API token
 */
module.exports = (force=false) => new Promise((s,f) => {
    // if token already loaded: check if expired, otherwise, renew it
    if(APIToken){
        if(!force && APITokenTimeout - Date.now() > 60 ) {
            s(APIToken)
        } else {
            reniewAPIToken().then(newToken => {
                if(newToken) s(newToken)
                else f('No token found')
            })
            .catch(f)
        }
    } else{
        // If APIToken not initialized: get from file
        fs.readFile(__dirname + '/bearer', 'utf8', async (e,data) => {
            if(e && e.code !== 'ENOENT') f(e)

            if(data){
                const [token, expires] = data.split(':')
                // renew if token exists and expires in more than 1 min
                if(token && (expires - Date.now()) > 60){
                    console.log('Reuse token')
                    APIToken = token
                    APITokenTimeout = expires
                    s(APIToken)
                }
            }

            // if token not setted : no token found in the file, or is expired
            if(!APIToken) {
                console.log('Renew token')
                reniewAPIToken().then(newToken => {
                    if(newToken) s(newToken)
                    else f('No token found')
                })
                .catch(f)
            }
        })
    }
})