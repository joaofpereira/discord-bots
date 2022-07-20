const request = require('request');

const auth = require('./auth.json')
const logger = require('./logger');
const asyncRequest = require('./async-request')

const apiEndpoint = "https://api.football-data.org/v2/";

module.exports = {
    fetchMatches: function (dateBegin, dateEnd, competitionId, callback) {
        var finalUrl = apiEndpoint + `matches?dateFrom=${dateBegin}&dateTo=${dateEnd}&competitions=${competitionId}`  
        logger.debug("Fetching matches for day: " + dateBegin)
            const options = {
                url: finalUrl,
                headers: {
                    'X-Auth-Token': auth.football_api_token
                }
            };
            
            request(options, callback)
    },
    getTeam: async function (teamId, ) {
        var finalUrl = apiEndpoint + `teams/${teamId}`
        const options = {
            url: finalUrl,
            headers: {
                'X-Auth-Token': auth.football_api_token
            }
        };
        
        return asyncRequest(options)
    }

};