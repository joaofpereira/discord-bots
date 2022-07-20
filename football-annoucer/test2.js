const dateUtils = require('date-and-time')
const request = require('request');
const mergeImg = require('merge-img');
var svg2png = require('svg-to-png');
var axios = require('axios');
  
const https = require('https')
const fs = require('fs')
const path = require('path')

const fetcher = require('./api-fetcher')
const logger = require('./logger');
const asyncRequest = require('./async-request');


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

const download_image = (url, image_path) =>
  axios({
    url,
    responseType: 'stream',
  }).then(
    response =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(image_path))
          .on('finish', () => resolve())
          .on('error', e => reject(e));
      }),
  );

async function joinImage(homeTeam, awayTeam, homeTeamCrestFilePath, awayTeamCrestFilePath, callback) {

    var imagePath = `${homeTeam}vs${awayTeam}.png`;
    await mergeImg(
        [
            homeTeamCrestFilePath,
            awayTeamCrestFilePath
        ]).then((img) => {
            // Save image as file
            img.write(imagePath, () => {  
                logger.debug(`Generated image for game ${homeTeam} vs ${awayTeam} at ${imagePath}`);
                callback(imagePath)
            });
        });
}

async function Try2ConvertSvg(crestSvgFilePath)
{
    if(path.extname(crestSvgFilePath) == '.svg')
    {
        var parentDir = path.dirname(crestSvgFilePath)
        await svg2png.convert(crestSvgFilePath, parentDir)
            .then(function(){
                fs.unlinkSync(crestSvgFilePath)
            });
        return true
    }
    return false
}

async function main() {
    // 7 august, month ranges between 0 - 11
    var date = new Date(2022, 7, 7);
    var dateFormatted = dateUtils.format(date, "YYYY-MM-DD");
    //logger.info(dateFormatted)
    //fetcher.fetchMatches(dateFormatted, dateFormatted, 2017, printMatches)
    
    let team = await fetcher.getTeam(582);
    var teamCrestFilePath = `${path.join(process.cwd(), team.shortName + path.extname(team.crestUrl))}`;
    (async () => {
        
        let downloadImageStatus = await download_image(team.crestUrl, teamCrestFilePath);
        if (downloadImageStatus.status)
        {
            await Try2ConvertSvg(teamCrestFilePath);
        }
    })();

    let team2 = await fetcher.getTeam(5531);
    var team2CrestFilePath = `${team2.shortName + path.extname(team2.crestUrl)}`;
    (async () => {
        
        let downloadImageStatus = await download_image(team2.crestUrl, team2CrestFilePath);
        if (downloadImageStatus.status)
        {
            await Try2ConvertSvg(team2CrestFilePath);
        }
    })();

    //await joinImage(team.shortName, team2.shortName, `${path.basename(teamCrestFilePath, '.svg')}.png`, team2CrestFilePath, function(imagePath) {logger.info(`image create at ${imagePath}`)})
}

main()