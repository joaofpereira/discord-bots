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
global.dummyCrest = `${path.join(__dirname, 'matches-images/dummy.png')}`

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

async function downloadImage(imageUrl, imagePath) {
    await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'stream'
    })
    .then(
        response =>
            new Promise((resolve, reject) => {
                response.data
                    .pipe(fs.createWriteStream(imagePath))
                    .on('finish', () => resolve())
                    .on('error', e => reject(e));
            })
    );
}

async function resizeImage(imagePath, width, height) {
    try {
        var resizedName = path.join(path.dirname(imagePath), `${path.basename(imagePath, '.png')}-resized.png`)
        await sharp(imagePath)
            .resize({
                width: width,
                height: height
            })
            .toFile(resizedName)
        fs.unlinkSync(imagePath)
        return resizedName
    }
    catch (error) {
        logger.error(error);
        return null
    }
}

async function scaleImages(homeTeamCrestFilePath, awayTeamCrestFilePath) {
    let homeTeamCrestImageMetadata = await sharp(homeTeamCrestFilePath).metadata();
    let awayTeamCrestImageMetadata = await sharp(awayTeamCrestFilePath).metadata();

    //logger.info(homeTeamCrestImageMetadata)
    //logger.info(awayTeamCrestImageMetadata)

    var widthScale = 0;
    if (homeTeamCrestImageMetadata.width > awayTeamCrestImageMetadata.width)
    {
        widthScale = awayTeamCrestImageMetadata.width / homeTeamCrestImageMetadata.width;
        homeTeamCrestFilePath = await resizeImage(homeTeamCrestFilePath, Math.round(homeTeamCrestImageMetadata.width * widthScale), null);
    }
    else
    {
        widthScale = homeTeamCrestImageMetadata.width / awayTeamCrestImageMetadata.width;
        awayTeamCrestFilePath = await resizeImage(awayTeamCrestFilePath, Math.round(awayTeamCrestImageMetadata.width * widthScale), null);
    }

    // update width scaling
    homeTeamCrestImageMetadata = await sharp(homeTeamCrestFilePath).metadata();
    awayTeamCrestImageMetadata = await sharp(awayTeamCrestFilePath).metadata();

    var heightScale = 0;
    if (homeTeamCrestImageMetadata.height > awayTeamCrestImageMetadata.height)
    {
        heightScale = awayTeamCrestImageMetadata.height / homeTeamCrestImageMetadata.height;
        homeTeamCrestFilePath = await resizeImage(homeTeamCrestFilePath, null, Math.round(homeTeamCrestImageMetadata.height * heightScale));
    }
    else
    {
        heightScale = homeTeamCrestImageMetadata.height / awayTeamCrestImageMetadata.height;
        awayTeamCrestFilePath = await resizeImage(awayTeamCrestFilePath, null, Math.round(awayTeamCrestImageMetadata.height * heightScale));
    }

    return [homeTeamCrestFilePath, awayTeamCrestFilePath]
}

async function joinImage(match, homeTeamCrestFilePath, awayTeamCrestFilePath) {

    var imagePath = path.join(global.imagesGenerationPath, `${match.id}.png`);
    await mergeImg(
        [
            homeTeamCrestFilePath,
            awayTeamCrestFilePath
        ]).then((img) => {
            img.write(imagePath, () => {  
                //logger.debug(`Generated image for game ${match.homeTeam.name} vs ${match.awayTeam.name} at ${imagePath}`);
            });
        });
    fs.unlink(homeTeamCrestFilePath, (err) => { logger.error(`Error deleting file ${homeTeamCrestFilePath}. Exception: ${err}`); });
    fs.unlink(awayTeamCrestFilePath, (err) => { logger.error(`Error deleting file ${awayTeamCrestFilePath}. Exception: ${err}`); });
}

async function try2ConvertSvg(crestSvgFilePath) {
    if(path.extname(crestSvgFilePath) == '.svg')
    {
        var parentDir = path.dirname(crestSvgFilePath)
        await svg2png.convert(crestSvgFilePath, parentDir)
            .then(function(){
                fs.unlinkSync(crestSvgFilePath)
            });
        return [true, crestSvgFilePath.replace('.svg', '.png')]
    }
    return [false, null]
}

async function processMatch(match, homeTeam, awayTeam) {
    // home team image download
    var homeTeamCrestFilePath = null;
    if (homeTeam.crestUrl == null) {
        homeTeamCrestFilePath = `${path.join(global.imagesGenerationPath, homeTeam.shortName)}.png`;
        fs.copyFileSync(global.dummyCrest, homeTeamCrestFilePath);
    }
    else {
        homeTeamCrestFilePath = `${path.join(global.imagesGenerationPath, homeTeam.shortName + path.extname(homeTeam.crestUrl))}`;
        await downloadImage(homeTeam.crestUrl, homeTeamCrestFilePath);
    }
        
    // home team svg convertion
    let convertionResult = await try2ConvertSvg(homeTeamCrestFilePath);
    if(convertionResult[0])
        homeTeamCrestFilePath = convertionResult[1];

    // away team image download
    var awayTeamCrestFilePath = null;
    if (awayTeam.crestUrl == null) {
        awayTeamCrestFilePath = `${path.join(global.imagesGenerationPath, awayTeam.shortName)}.png`;
        fs.copyFileSync(global.dummyCrest, awayTeamCrestFilePath);
    }
    else {
        awayTeamCrestFilePath = `${path.join(global.imagesGenerationPath, awayTeam.shortName + path.extname(awayTeam.crestUrl))}`;
        await downloadImage(awayTeam.crestUrl, awayTeamCrestFilePath);
    }
    
    // away team svg convertion
    convertionResult = await try2ConvertSvg(awayTeamCrestFilePath);
    if(convertionResult[0])
        awayTeamCrestFilePath = convertionResult[1];

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
    let matches = await fetcher.fetchMatches(startDateFormatted, endDateFormatted, 2017)
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