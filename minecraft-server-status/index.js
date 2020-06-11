const discord = require('discord.js');
const schedule = require('node-schedule');
const winston = require('winston');
const isPortReachable = require('is-port-reachable');

var auth = require('./auth.json');
var settings = require('./settings.json');

const logger = winston.createLogger({
    level: 'debug',
    format: combine(
        winston.format.timestamp(),
        winston.format.prettyPrint()
      ),
    defaultMeta: { service: 'minecraft-server-status' },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new winston.transports.File({ filename: 'logs' }),
    ],
});

const client = new discord.Client();
const prefix = ':'

var last_state = null

client.on('ready', () => {
    logger.debug('Discord client ready');

    const onlineMessage = new discord.MessageEmbed()
        .setColor('#008000')
        .setTitle(`Minecraft Server`)
        .setDescription('Status do Minecraft server.')
        .setThumbnail('https://imagepng.org/wp-content/uploads/2017/08/minecraft-icone-icon.png')
        .addFields(
            { name: 'IP', value: settings.server_ip_address },
            { name: 'Port', value: settings.server_port },
            { name: 'Estado', value: ':green_square:' }
        );

    const offlineMessage = new discord.MessageEmbed()
        .setColor('#FF0000')
        .setTitle(`Minecraft Server`)
        .setDescription('Status do Minecraft server.')
        .setThumbnail('https://imagepng.org/wp-content/uploads/2017/08/minecraft-icone-icon.png')
        .addFields(
            { name: 'Estado', value: ':red_square:' }
        );

    schedule.scheduleJob(settings.cron_job, () => {
        (async () => {
            result = await isPortReachable(settings.server_port, {host: settings.server_ip_address});

            var is_different = false;
            if (last_state == null || last_state != result) {
                logger.info(`Updating last state to ${last_state}.`);
                last_state = result;
                is_different = true;
            }
            if (is_different) {
                if (last_state) {
                    logger.debug('Sending online message.');
                    client.channels.cache.get(settings.notifications_channel).send({embed:onlineMessage});
                }
                else {
                    logger.debug('Sending offline message.');
                    client.channels.cache.get(settings.notifications_channel).send({embed:offlineMessage});
                }
            }
        })();
    });
});

client.on('message', message => {
    if (message.channel.type == "dm" || settings.allowed_command_channels.includes(message.channel.id)) {

        var textMessage = message.content
        var messagePrefix = textMessage[0]
        var messageContent = textMessage.substring(1, textMessage.length)

        if (messagePrefix == prefix) {
            var parts = messageContent.split(' ');
            switch (parts[0]) {
                case 'help':
                    var embed = new discord.MessageEmbed()
                        .setColor('#D3D3D3')
                        .setTitle(`Comandos:`)
                        .setThumbnail('https://imagepng.org/wp-content/uploads/2017/08/minecraft-icone-icon.png')
                        .addFields(
                            { name: ':help', value: 'Lista todos os comandos possíveis.' },
                            { name: ':info', value: 'Devolve o actual IP e porto a serem monitorizados.' },
                            { name: ':setEndpoint', value: 'Muda o ip e porto do servidor a monitorizar.\nEx: :setEndpoint 127.0.0.1:25565' }
                        );
                    message.channel.send({embed:embed});
                    break;
                case 'info':
                    var embed = new discord.MessageEmbed()
                        .setColor('#D3D3D3')
                        .setTitle(`IP e porto`)
                        .setThumbnail('https://imagepng.org/wp-content/uploads/2017/08/minecraft-icone-icon.png')
                        .addFields(
                            { name: 'IP', value: settings.server_ip_address },
                            { name: 'Porto', value: settings.server_port },
                            { name: 'Estado', value: last_state == null || !last_state ? ':red_square:' : ':green_square:'}
                        );
                    message.channel.send({embed:embed});
                    break;
                case 'setEndpoint':
                    if (message.author.id != settings.admin_id) {
                        var embed = new discord.MessageEmbed()
                            .setColor('#FF0000')
                            .setTitle(`Permissões`)
                            .setDescription('Não tens permissões para correr este comando. Pede ao admin deste Discord server.')
                            .setThumbnail('https://imagepng.org/wp-content/uploads/2017/08/minecraft-icone-icon.png');
                        message.channel.send({embed:embed});
                    }
                    if (parts.length > 2) {
                        var embed = new discord.MessageEmbed()
                            .setColor('#FF0000')
                            .setTitle(`Erro`)
                            .setDescription('Número de argumentos incorrecto.\n Exemplo: :setEndpoint 127.0.0.1:25565')
                            .setThumbnail('https://imagepng.org/wp-content/uploads/2017/08/minecraft-icone-icon.png');
                        message.channel.send({embed:embed});
                    }
                    else {
                        var endpointParts = parts[2].split(':');
                        settings.server_ip_address = endpointParts[0]
                        settings.server_port = parseInt(endpointParts[1])
                        var embed = new discord.MessageEmbed()
                            .setColor('##008000')
                            .setTitle(`IP e porto actualizados!`)
                            .setThumbnail('https://imagepng.org/wp-content/uploads/2017/08/minecraft-icone-icon.png');
                        message.channel.send({embed:embed});
                    }
                    break;
                default:
                    var embed = new discord.MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle(`Erro`)
                    .setDescription('Comando inválido.\n Comandos possíveis em baixo.')
                    .setThumbnail('https://imagepng.org/wp-content/uploads/2017/08/minecraft-icone-icon.png')
                    .addFields(
                        { name: ':help', value: 'Lista todos os comandos possíveis.' },
                        { name: ':setEndpoint', value: 'Muda o ip e porto do servidor a monitorizar.\nExemplo: :setEndpoint 127.0.0.1:25565' }
                    );
                    message.channel.send({embed:embed});
                    break;
            }
        }   
    }
});

client.login(auth.discord_token);