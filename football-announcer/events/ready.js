const logger = require('../logger');
const fetcher = require('../api-fetcher');
const { getCompetitionDetails } = require('../utils');
const { dailyCronJob, fetcherMode, notificationsChannel } = require('../config.json');

const path = require('path');
const fs = require('fs');
const scheduler = require('node-schedule');
const dateUtils = require('date-and-time');
const { joinImages } = require('join-images');
// const svg2png = require('svg-to-png');
const axios = require('axios');
const sharp = require('sharp');
const { EmbedBuilder } = require('discord.js');

const fetcherModeEnum = Object.freeze({ 'download': 1, 'local': 2 });

async function downloadImage(imageUrl, imagePath) {
	await axios({
		method: 'get',
		url: imageUrl,
		responseType: 'stream',
	})
		.then(
			response =>
				new Promise((resolve, reject) => {
					response.data
						.pipe(fs.createWriteStream(imagePath))
						.on('finish', () => resolve())
						.on('error', e => reject(e));
				}),
		);
}

async function resizeImage(imagePath, width, height) {
	try {
		const resizedName = path.join(global.imagesGenerationPath, `${path.basename(imagePath, '.png')}-resized.png`);
		await sharp(imagePath)
			.resize({
				width: width,
				height: height,
			})
			.toFile(resizedName);
		return resizedName;
	}
	catch (error) {
		logger.error(error);
		return null;
	}
}

async function scaleImages(homeTeamCrestFilePath, awayTeamCrestFilePath) {
	let homeTeamCrestImageMetadata = await sharp(homeTeamCrestFilePath).metadata();
	let awayTeamCrestImageMetadata = await sharp(awayTeamCrestFilePath).metadata();

	// logger.info(homeTeamCrestImageMetadata)
	// logger.info(awayTeamCrestImageMetadata)

	let widthScale = 0;
	if (homeTeamCrestImageMetadata.width > awayTeamCrestImageMetadata.width) {
		widthScale = awayTeamCrestImageMetadata.width / homeTeamCrestImageMetadata.width;
		homeTeamCrestFilePath = await resizeImage(homeTeamCrestFilePath, Math.round(homeTeamCrestImageMetadata.width * widthScale), null);
	}
	else {
		widthScale = homeTeamCrestImageMetadata.width / awayTeamCrestImageMetadata.width;
		awayTeamCrestFilePath = await resizeImage(awayTeamCrestFilePath, Math.round(awayTeamCrestImageMetadata.width * widthScale), null);
	}

	// update width scaling
	homeTeamCrestImageMetadata = await sharp(homeTeamCrestFilePath).metadata();
	awayTeamCrestImageMetadata = await sharp(awayTeamCrestFilePath).metadata();

	let heightScale = 0;
	if (homeTeamCrestImageMetadata.height > awayTeamCrestImageMetadata.height) {
		heightScale = awayTeamCrestImageMetadata.height / homeTeamCrestImageMetadata.height;
		homeTeamCrestFilePath = await resizeImage(homeTeamCrestFilePath, null, Math.round(homeTeamCrestImageMetadata.height * heightScale));
	}
	else {
		heightScale = homeTeamCrestImageMetadata.height / awayTeamCrestImageMetadata.height;
		awayTeamCrestFilePath = await resizeImage(awayTeamCrestFilePath, null, Math.round(awayTeamCrestImageMetadata.height * heightScale));
	}

	return [homeTeamCrestFilePath, awayTeamCrestFilePath];
}

async function joinImage(match, homeTeamCrestFilePath, awayTeamCrestFilePath) {

	const imagePath = path.join(global.imagesGenerationPath, `${match.id}.png`);
	await joinImages(
		[
			homeTeamCrestFilePath,
			awayTeamCrestFilePath,
		], {
			direction: 'horizontal',
			color: { alpha: 0, b: 0, g: 0, r: 255 },
		})
		.then(async (img) => {
			logger.debug(`Generated image for game ${match.homeTeam.name} vs ${match.awayTeam.name} at ${imagePath}`);
			await img.toFile(imagePath);
		});
	// fs.unlink(homeTeamCrestFilePath, (err) => { logger.error(`Error deleting file ${homeTeamCrestFilePath}. Exception: ${err}`); });
	// fs.unlink(awayTeamCrestFilePath, (err) => { logger.error(`Error deleting file ${awayTeamCrestFilePath}. Exception: ${err}`); });
}

async function cleanGeneratedImages() {
	await fs.readdir(global.imagesGenerationPath, (err, files) => {
		if (err) throw err;

		for (const file of files) {
			fs.unlinkSync(path.join(global.imagesGenerationPath, file));
		}
	});
}

/*
async function try2ConvertSvg(crestSvgFilePath) {
	if (path.extname(crestSvgFilePath) == '.svg') {
		const parentDir = path.dirname(crestSvgFilePath);
		await svg2png.convert(crestSvgFilePath, parentDir)
			.then(function() {
				fs.unlinkSync(crestSvgFilePath);
			});
		return [true, crestSvgFilePath.replace('.svg', '.png')];
	}
	return [false, null];
}
*/

/*
async function downloadCrest(team) {
	// home team image download
	let teamCrestFilePath = null;
	if (team.crestUrl == null) {
		teamCrestFilePath = `${path.join(global.imagesGenerationPath, team.shortName)}.png`;
		fs.copyFileSync(global.dummyCrest, teamCrestFilePath);
	}
	else {
		teamCrestFilePath = `${path.join(global.imagesGenerationPath, team.shortName + path.extname(team.crestUrl))}`;
		await downloadImage(team.crestUrl, teamCrestFilePath);
	}

	// home team svg convertion
	const convertionResult = await try2ConvertSvg(teamCrestFilePath);
	if (convertionResult[0]) {
		return convertionResult[1];
	}
	else {
		return null;
	}
}
*/

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function scheduleMatch(client, match, fMode) {
	// commented to save requests to the API
	// const homeTeam = await fetcher.getTeam(match.homeTeam.id);
	// const awayTeam = await fetcher.getTeam(match.awayTeam.id);

	const homeTeam = match.homeTeam;
	const awayTeam = match.awayTeam;

	logger.info(`Processing match ${homeTeam.name} vs ${awayTeam.name}`);
	let homeTeamCrestFilePath = null;
	let awayTeamCrestFilePath = null;
	if (fMode == fetcherModeEnum.download) {
		// home team image download
		// homeTeamCrestFilePath = await downloadCrest(homeTeam);
		// away team image download
		// awayTeamCrestFilePath = await downloadCrest(awayTeam);
	}
	else {
		homeTeamCrestFilePath = `${path.join(global.competitionsPath, match.competition.id.toString(), 'teams', homeTeam.id.toString())}.png`;
		awayTeamCrestFilePath = `${path.join(global.competitionsPath, match.competition.id.toString(), 'teams', awayTeam.id.toString())}.png`;
	}

	const scaledImagesPath = await scaleImages(homeTeamCrestFilePath, awayTeamCrestFilePath);

	await joinImage(match, scaledImagesPath[0], scaledImagesPath[1]);
	// await sleep(1000);
	const competitionName = getCompetitionDetails(match.competition.id).name;

	const competitionId = match.competition.id.toString();
	const competitionLogoPath = `${path.join(global.competitionsPath, competitionId, competitionId)}.png`;
	const matchId = match.id.toString();
	const matchImagePath = `${path.join(global.imagesGenerationPath, matchId)}.png`;
	const attachments = [
		{
			attachment: competitionLogoPath,
			name: `${competitionId}.png`,
		},
		{
			attachment: matchImagePath,
			name: `${matchId}.png`,
		},
	];
	const matchDate = new Date(Date.parse(String(match.utcDate)));
	const embedMessage = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle(`${competitionName} - ${dateUtils.format(matchDate, 'DD-MM-YYYY')}`)
		.setAuthor({ name: `${competitionName}`, iconURL: `attachment://${competitionId}.png` })
		.setDescription(`Hey, o próximo jogo da ${competitionName} está prestes a começar!`)
		.setThumbnail(`attachment://${competitionId}.png`)
		.setImage(`attachment://${matchId}.png`)
		.addFields(
			{ name: 'Próximo Jogo', value: `${homeTeam.name} vs ${awayTeam.name}` },
			{ name: 'Horário', value: `${String(matchDate.getHours()).padStart(2, '0')}:${String(matchDate.getMinutes()).padStart(2, '0')}h` },
			{ name: 'Canal', value: 'O Tasco :soccer: :beer: :hotdog:' },
			// { name: 'Bilhetes com', value: personsInChargeResultStr },
		);

	const previewMessage = `⚽ ${homeTeam.name} vs ${awayTeam.name}`;
	const announcementsChannel = await client.channels.cache.get(notificationsChannel);
	await announcementsChannel.send({ content: previewMessage, embeds: [embedMessage], files: attachments })
		.then(logger.info(`Announcement made for ${homeTeam.name} vs ${awayTeam.name}.`))
		.catch(console.error);

	await cleanGeneratedImages();
}

async function processMatch(client, match, fMode) {
	//const matchDate = new Date();
	const matchDate = new Date(Date.parse(String(match.utcDate)));
	logger.info(`Schedule date is: ${matchDate}`);
	//matchDate.setSeconds(matchDate.getSeconds() + 10);
	matchDate.setMinutes(matchDate.getMinutes() - 15);

	const hours = ('0' + matchDate.getHours()).slice(-2);
	const minutes = ('0' + matchDate.getMinutes()).slice(-2);
	const seconds = ('0' + matchDate.getSeconds()).slice(-2);

	logger.info(`Match betweeen ${match.homeTeam.name} and ${match.awayTeam.name} will be announced at ${hours}:${minutes}:${seconds}`);

	scheduler.scheduleJob(matchDate, async function() {
		await scheduleMatch(client, match, fMode);
	});
}

module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {
		logger.info(`Ready! Logged in as ${client.user.tag}`);
		logger.info('Football fetcher is starting...');
		//const now = new Date();
		//now.setSeconds(now.getSeconds() + 10);
		//logger.info(now);
		//scheduler.scheduleJob(now, async function() {
		scheduler.scheduleJob(dailyCronJob, async function() {
			const today = new Date();
			const startDateFormatted = dateUtils.format(today, 'YYYY-MM-DD');
			const endDateFormatted = dateUtils.format(today, 'YYYY-MM-DD');
			//const startDate = new Date(2024, 7, 15);
			//const endDate = new Date(2024, 7, 25);
			//const startDateFormatted = dateUtils.format(startDate, 'YYYY-MM-DD');
			//const endDateFormatted = dateUtils.format(endDate, 'YYYY-MM-DD');
			for (const activeCompetition of global.activeCompetitions) {
				const matches = await fetcher.fetchMatches(startDateFormatted, endDateFormatted, activeCompetition);

				// invoke job 20 minutes before game
				for (const match of matches) {
					await processMatch(client, match, fetcherMode);
				}
			}
		});
	},
};