const { footballApiToken } = require('./config.json');
const logger = require('./logger');
const axios = require('axios');

const apiEndpoint = 'https://api.football-data.org/v2/';

module.exports = {
	fetchMatches: async function(dateBegin, dateEnd, competitionId) {
		const finalUrl = apiEndpoint + `matches?dateFrom=${dateBegin}&dateTo=${dateEnd}&competitions=${competitionId}`;
		logger.debug(`Fetching matches for day: ${dateBegin}`);

		const response = await axios.get(finalUrl, {
			headers: {
				'X-Auth-Token': footballApiToken,
			},
		});
		return response.data.matches;
	},
	getTeam: async function(teamId) {
		const finalUrl = apiEndpoint + `teams/${teamId}`;

		const response = await axios.get(finalUrl, {
			headers: {
				'X-Auth-Token': footballApiToken,
			},
		});
		return response.data;
	},
};