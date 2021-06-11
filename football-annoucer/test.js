const request = require('request');
const { Client, Intents  } = require('discord.js');

// authentication tokens and settings
var auth = require('./auth.json');
var settings = require('./settings.json');

const myIntents = new Intents();
myIntents.add('GUILD_PRESENCES', 'GUILD_MEMBERS');

// Create an instance of a Discord client
const client = new Client({ ws: { intents: myIntents } });

client.login(auth.discord_token);

var result = "";

const id = "165606532325572609"

async function fetchUser(id) {
    try {
        return user = await client.users.fetch(id)
    }
    catch (error) {
        console.log(error)
    }
}

const c = client.users.find(u => u.id == id)
console.log(c.username)

let user = fetchUser(id)

console.log(user);

/*var user = client.users.fetch(id)
    .then(u => {
        console.log(`${u.username}`)
    })
    .catch(e => {
        console.log(`${e}CATCH`)
    });

console.log(result)
*/