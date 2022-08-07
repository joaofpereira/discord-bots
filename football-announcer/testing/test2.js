const dateUtils = require('date-and-time')
const request = require('request');
const mergeImg = require('merge-img');
var svg2png = require('svg-to-png');
var axios = require('axios');
var sharp = require('sharp');
  
const https = require('https')
const fs = require('fs')
const path = require('path')

const fetcher = require('./api-fetcher')
const logger = require('./logger');

global.imagesGenerationPath = `${path.join(__dirname, 'matches-images/')}`
global.dummyCrest = `${path.join(__dirname, 'logos/dummy.png')}`
global.competitionsPath = `${path.join(__dirname, 'logos/competitions/')}`

const fetcherMode = Object.freeze({"download": 1, "local": 2});

function printMatches(error, response, body) {
	if (!error && response.statusCode == 200) {
		let responseContent = JSON.parse(body);
		if (responseContent.count > 0) {
			responseContent.matches.forEach(game => {
				logger.info(game)
			});
		}
	}
	else {
		logger.debug("Something went wrong during daily matches request.");
	}
}

function cleanGeneratedImages() {
	fs.readdir(global.imagesGenerationPath, (err, files) => {
		if (err) throw err;
	  
		for (const file of files) {
		  fs.unlink(path.join(global.imagesGenerationPath, file), err => {
			if (err) throw err;
		  });
		}
	  });
}


async function downloadCrest(team) {
	// home team image download
	var teamCrestFilePath = null;
	if (team.crestUrl == null) {
		teamCrestFilePath = `${path.join(global.imagesGenerationPath, team.shortName)}.png`;
		fs.copyFileSync(global.dummyCrest, teamCrestFilePath);
	}
	else {
		teamCrestFilePath = `${path.join(global.imagesGenerationPath, team.shortName + path.extname(team.crestUrl))}`;
		await downloadImage(team.crestUrl, teamCrestFilePath);
	}
		
	// home team svg convertion
	let convertionResult = await try2ConvertSvg(teamCrestFilePath);
	if(convertionResult[0])
		return convertionResult[1];
	else
		return null;
}

async function processMatch(match, homeTeam, awayTeam, fMode) {
	logger.info(`Processing match ${homeTeam.name} vs ${awayTeam.name}`);
	let homeTeamCrestFilePath = null;
	let awayTeamCrestFilePath = null;
	if (fMode == fetcherMode.download) {
		// home team image download
		homeTeamCrestFilePath = await downloadCrest(homeTeam)
		// away team image download
		awayTeamCrestFilePath = await downloadCrest(awayTeam)
	}
	else {
		homeTeamCrestFilePath = `${path.join(global.competitionsPath, match.competition.id.toString(), 'teams', homeTeam.id.toString())}.png`
		awayTeamCrestFilePath = `${path.join(global.competitionsPath, match.competition.id.toString(), 'teams', awayTeam.id.toString())}.png`
	}

	let scaledImagesPath = await scaleImages(homeTeamCrestFilePath, awayTeamCrestFilePath);
	
	await joinImage(match, scaledImagesPath[0], scaledImagesPath[1]);
	
}

async function main() {
	if (!fs.existsSync(global.imagesGenerationPath)){
		fs.mkdirSync(global.imagesGenerationPath);
	}

	// 7 august, month ranges between 0 - 11
	var startDate = new Date(2022, 7, 7);
	var endDate = new Date(2022, 7, 7);
	var startDateFormatted = dateUtils.format(startDate, "YYYY-MM-DD");
	var endDateFormatted = dateUtils.format(endDate, "YYYY-MM-DD");
	//logger.info(dateFormatted)
	let matches = await fetcher.fetchMatches(startDateFormatted, endDateFormatted, 2021)
	//printMatches(matches)
	
	//let team = await fetcher.getTeam(582);
	//let team2 = await fetcher.getTeam(5531);
	//await processMatch(123, team, team2)
	for (const match of matches) {
		const homeTeam = await fetcher.getTeam(match.homeTeam.id);
		const awayTeam = await fetcher.getTeam(match.awayTeam.id);
		await processMatch(match, homeTeam, awayTeam);
	}

	return;

	var teamCrestFilePath = `${path.join(process.cwd(), team.shortName + path.extname(team.crestUrl))}`;
	await downloadImage(team.crestUrl, teamCrestFilePath);
	let convertionResult = await try2ConvertSvg(teamCrestFilePath);
	if(convertionResult[0])
	{
		teamCrestFilePath = convertionResult[1];
	}
	teamCrestFilePath = await resizeImage(teamCrestFilePath, 200, 200);

	var team2CrestFilePath = `${team2.shortName + path.extname(team2.crestUrl)}`;
	await downloadImage(team2.crestUrl, team2CrestFilePath);
	convertionResult = await try2ConvertSvg(team2CrestFilePath);
	if(convertionResult[0])
	{
		team2CrestFilePath = convertionResult[1];
	}
	team2CrestFilePath = await resizeImage(team2CrestFilePath, 200, 200);

	
}

main()