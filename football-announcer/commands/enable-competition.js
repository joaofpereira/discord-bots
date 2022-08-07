const { competitions } = require('../config.json');
const { ActionRowBuilder, SelectMenuBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('enable-competition')
		.setDescription('Enables the selected competition to schedule notifications.'),
	async execute(interaction) {
		const options = [];
		competitions.forEach(competition => {
			if (!global.activeCompetitions.includes(competition.id)) {
				options.push({
					label: competition.name,
					value: competition.id.toString(),
				});
			}
		});

		const row = new ActionRowBuilder()
			.addComponents(
				new SelectMenuBuilder()
					.setCustomId('enable-competition')
					.setPlaceholder('Nothing selected')
					.addOptions(options),
			);
		await interaction.reply({ components: [row] });
	},
};
