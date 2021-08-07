const discord = require('discord.js');
const schedule = require('node-schedule');
const request = require('request');
const mergeImg = require('merge-img');
const fs = require('fs');
const path = require('path');

// load other files
var utils = require('./utils');

// authentication tokens and settings
var auth = require('./auth.json');
var settings = require('./settings.json');
var pjson = require('./package.json');

const logger = utils.createLogger(pjson.name)

// Create an instance of a Discord client
const client = new discord.Client();

async function print_image(teamsImagesPath, homeTeam, awayTeam, season, callback) {
    var dir = path.join(module.path, '/images/LigaPortugalBwin/games/' + season + '/');

    // creating folder to put matches generated images
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, {recursive: true}, err => {
            logger.error(`Something went wrong whn trying to create games directory. ${err}`)
        });
    }

    var imagePath = path.join(dir, `${homeTeam}vs${awayTeam}.png`);
    // cant have special characters or whitespaces
    var imageAttachmentName = `${homeTeam}vs${awayTeam}`.replace(/[^a-zA-Z ]|\s/g, "") + ".png";
    await mergeImg(
        [
            `${teamsImagesPath}${homeTeam}.png`,
            `${teamsImagesPath}${awayTeam}.png`
        ]).then((img) => {
            // Save image as file
            img.write(imagePath, () => {  
                logger.debug(`Generated image for game ${homeTeam} vs ${awayTeam} at ${imagePath}`);
                callback(imagePath, imageAttachmentName)
            });
        });
}

function scheduleGame(game) {
    var gameScheduleDate = new Date(Date.parse(String(game.utcDate)));
    var notificationScheduleDate = new Date(gameScheduleDate);
    //notificationScheduleDate = new Date()
    //notificationScheduleDate.setSeconds(notificationScheduleDate.getSeconds() + 10)
    notificationScheduleDate.setMinutes(notificationScheduleDate.getMinutes() - 15)

    var hours = ("0" + notificationScheduleDate.getHours()).slice(-2);
    var minutes = ("0" + notificationScheduleDate.getMinutes()).slice(-2);
    var seconds = ("0" + notificationScheduleDate.getSeconds()).slice(-2);

    var homeTeam = game.homeTeam.name;
    var awayTeam = game.awayTeam.name;
    var season = game.season.id;

    logger.info(`Match betweeen ${homeTeam} and ${awayTeam} will be announced at ${hours}:${minutes}:${seconds}`);
    schedule.scheduleJob(notificationScheduleDate, function(){

        print_image(path.join(module.path, '/images/LigaPortugalBwin/teams/'), homeTeam, awayTeam, season, function(imagePath, imageAttachmentName) {
            var hours = ("0" + gameScheduleDate.getHours()).slice(-2);
            var minutes = ("0" + gameScheduleDate.getMinutes()).slice(-2);
            var attachments = [
                new discord.MessageAttachment(path.join(module.path, '/images/LigaPortugalBwin/LigaPortugalBwin.png'), 'LigaPortugalBwin.png'),
                new discord.MessageAttachment(imagePath, imageAttachmentName)
            ];

            var personsInCharge = settings.persons_in_charge.split(",");
            var personsInChargeResultStr = "";
            /*if (personsInCharge.length > 0) {
                personsInCharge.forEach(async function(element, i) {
                    if (i != 0 && i < personsInCharge.length - 1) {
                        personsInChargeResultStr += ", ";
                    } else if (i != 0 && i == personsInCharge.length - 1) {
                        personsInChargeResultStr += " ou ";
                    }
                    var user = await client.users.fetch(element)
                    personsInChargeResultStr += `${user.username}`;
                    
                });
            }*/
            const embedMessage = new discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Euro 2020 - ${utils.createSimplifyDate(gameScheduleDate)}`)
                .setAuthor('Euro 2020', 'attachment://LigaPortugalBwin.png')
                .setDescription('Hey, o próximo jogo da Liga Portugal Bwin está prestes a começar!')
                .setThumbnail('attachment://LigaPortugalBwin.png')
                .addFields(
                    { name: 'Próximo Jogo', value: `${homeTeam} vs ${awayTeam}` },
                    { name: 'Horário', value: `${hours}:${minutes}h`},
                    { name: 'Canal', value: 'O Tasco :soccer: :beer: :hotdog:' },
                    //{ name: 'Bilhetes com', value: personsInChargeResultStr },
                )
                .setImage(`attachment://${imageAttachmentName}`)
                .attachFiles(attachments);

            if (personsInCharge.length > 0) {
                personsInCharge.forEach(element => {
                    const personsInChargeMessage = new discord.MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`Euro 2020 - ${utils.createSimplifyDate(gameScheduleDate)}`)
                        .setAuthor('Euro 2020', 'attachment://LigaPortugalBwin.png')
                        .setDescription('Hey, o próximo jogo da Liga Portugal Bwin está prestes a começar!')
                        .setThumbnail('attachment://LigaPortugalBwin.png')
                        .addFields(
                            { name: 'Próximo Jogo', value: `${homeTeam} vs ${awayTeam}` },
                            { name: 'Horário', value: `${hours}:${minutes}h`},
                        )
                        .setImage(`attachment://${imageAttachmentName}`)
                        .attachFiles(attachments);

                    client.users.fetch(element).then(user => user.send({embed: personsInChargeMessage}));
                    });
            }
            
            if (settings.announcements_channel.trim())
                client.channels.fetch(settings.announcements_channel).then(channel => channel.send({embed: embedMessage}));
        });
    });
}

function processResquestResponse(error, response, body) {
    if (!error && response.statusCode == 200) {
        let responseContent = JSON.parse(body);
        // if there is any games for the day, schedule job to notify people about that game
        if (responseContent.count > 0) {
            responseContent.matches.forEach(game => {
                scheduleGame(game)
            });
        }
    }
    else {
        logger.debug("Something went wrong during daily matches request.");
    }
}

function startDailyScheduleTask() {
    logger.info("Fetcher is starting...");
    logger.debug("Scheduling job to retrieve daily matches...");
    settings.football_data_competitions.forEach(element => {
        if (element.active)
        {
            schedule.scheduleJob(element.daily_cron_job, function() {
            var todayDate = new Date()
            todayDate = utils.createSimplifyDate(todayDate)
            var finalUrl = settings.football_data_api + `matches?dateFrom=${todayDate}&dateTo=${todayDate}&competitions=${element.id}`
    
            logger.debug("Fetching daily matches request: " + finalUrl)
            const options = {
                url: finalUrl,
                headers: {
                'X-Auth-Token': auth.football_api_token
                }
            };
            
            request(options, processResquestResponse)
        });
        }
    });
}


client.on('ready', () => {
    startDailyScheduleTask()
});

// Create an event listener for messages
client.on('message', message => {
    let prefix_on_message = message.content.substring(0, settings.bot_prefix_command.length)
    let check_prefix = prefix_on_message === settings.bot_prefix_command;

    if (check_prefix)
    {
        let args = message.content.substring(settings.bot_prefix_command.length).split(" ");
        switch(args[0]) {
            case 'help':
                const embed = 
                {
                    title: 'Football Annourcer Commands',
                    fields: [{
                            name: 'Prefix (+)',
                            value: `Example: +help`
                    },{
                            name: 'Enable',
                            value: `enable - Enable notifications for the next Liga NOS matches to the announcements channel.`
                    }, {
                            name: 'Disable',
                            value: `disable - Disables notifications for the next Liga NOS matches on the announcements channel.`
                    }, {
                            name: 'Discord.js',
                            value: `v${discord.version}`
                    }]
                }
                message.channel.send('', {embed:embed});
                break
            case 'enable':
                settings.is_daily_job_active = true;
                break;
            case 'disable':
                settings.is_daily_job_active = false;
        }
    }
});

client.login(auth.discord_token);