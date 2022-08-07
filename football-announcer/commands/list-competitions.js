const { competitions } = require('../config.json');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('list-competitions')
		.setDescription('Lists all available competitions for notifications.'),
	async execute(interaction) {
		let output = '';
		competitions.forEach(competition => {
			output += `${competition.flag_emoji} ${competition.name}\n`;
		});
		await interaction.reply(output);
	},
};