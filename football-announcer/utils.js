const { competitions } = require('./config.json');

module.exports = {
	getCompetitionDetails: function(competitionId) {
		for (const competition of competitions) {
			if (competition.id == competitionId) {
				return competition;
			}
		}
	},
};