const { getCompetitionDetails } = require('../utils.js');

module.exports = {
	name: 'interactionCreate',
	once: false,
	async execute(client, interaction) {
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);

		// TODO create handler for this select menu
		if (interaction.isSelectMenu()) {
			if (interaction.customId == 'enable-competition') {
				const competitionDetails = getCompetitionDetails(interaction.values[0]);
				if (!global.activeCompetitions.includes(interaction.values[0])) {
					global.activeCompetitions.push(parseInt(interaction.values[0], 10));
				}

				await interaction.reply(`Enabled competition\n\t${competitionDetails.flag_emoji} ${competitionDetails.name}`);
			}
			else if (interaction.customId == 'disable-competition') {
				const competitionDetails = getCompetitionDetails(interaction.values[0]);
				const indexToRemove = global.activeCompetitions.indexOf(parseInt(interaction.values[0], 10));
				if (indexToRemove > -1) {
					global.activeCompetitions.splice(indexToRemove, 1);
				}

				await interaction.reply(`Disabled competition\n\t${competitionDetails.flag_emoji} ${competitionDetails.name}`);
			}
		}
		else {
			if (!interaction.isChatInputCommand()) return;

			const command = client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				await command.execute(interaction);
			}
			catch (error) {
				console.error(error);
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	},
};