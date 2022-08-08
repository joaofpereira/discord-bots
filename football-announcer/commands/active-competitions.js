const { getCompetitionDetails } = require('../utils.js');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('active-competitions')
		.setDescription('Lists all active competitions for notifications.'),
	async execute(interaction) {
		let output = '';
		global.activeCompetitions.forEach(competitionId => {
			const competitionDetails = getCompetitionDetails(competitionId);
			output += `${competitionDetails.flag_emoji} ${competitionDetails.name}\n`;
		});
		await interaction.reply(output);
	},
};