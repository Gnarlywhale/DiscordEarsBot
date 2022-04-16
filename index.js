// Static page

// TODO add command to discord interface that prints status to heroku log
// Currently the bot will seemingly stop listening without crashing - could be an api limit but I doubt it
// ^ It actually looks like this could just be a heroku log limit reached or something, I commanded the bot to leave and come back
// without reseting and it worked okay

// so far it has only actually crashed twice
// Increasingly thinking this may be log related

// Should probably post the jar total everytime a swear is detected in the discord chat

// New plan, on discord bot startup, check if people are in the playthrucrew voice channel
// If so, hop in, if not, sleep for 10-15 min or so  <- covers crashing (should hop in without posting alert)

// Either setup persistent storage OR
// post status messages every swear, with totals
// on load into the voice channel, grab totals from last discord message that was sent by the swear jar, use the text channel itself as a log
// Also provide a way to trigger the on-screen status for 

// Persistent storage: 
// there's a free postgres add-on that should be fine to use
// can store persistent swear lists on the storage as well

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const INDEX = 'public/index.html';
const socketIO = require('socket.io');
const { Client } = require('pg');
const server = express()



//   .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .get('/', (req, res) =>  res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

// Defaults
jarTotal = 0;
userRecord = {};
low = .10;
mid = .25
high = .1;
swearList = {}
swearSet = new Set()
// Should parse in swear list from server
// Add "suck my balls" as a 1 dollar swear
async function updateSwears(guildId)
{
    db.query("SELECT high_cost, low_cost, mid_cost FROM swear_jar WHERE guild_id='"+guildId+"';").then( res => {
        
        low = Math.round(res.rows[0]["low_cost"] * 100) / 100;
        mid = Math.round(res.rows[0]["mid_cost"] * 100) / 100;
        high = Math.round(res.rows[0]["high_cost"] * 100) / 100;
        db.query("SELECT * FROM swear_list WHERE guild_id='"+guildId+"';").then(res =>{
            
            for(i in res.rows){
                row = res.rows[i];
                if(row['rank'] == 1) cost = low;
                if(row['rank'] == 2) cost = mid;
                if(row['rank'] == 3) cost = high;
                console.log('we lost?')
                console.log(row['word'])
                console.log(cost)
                swearList[row['word']] = cost;
                console.log(swearList)

            }
            swearSet = new Set(Object.keys(swearList));
        }).catch(e => console.error(e.stack))
    }
    ).catch(e => console.error(e.stack))

    // swearList = {
    //     bastard: low,
    //     bastards: low,
    //     dipshit: low,
    //     dipshits: low,
    //     shit: low,
    //     shitting: low,
    //     shitty: low,
    //     fuck: low,
    //     fucker: low,
    //     fucked: low,
    //     fucks: low,
    //     fucking: low,
    //     motherfucker: low,
    //     motherfuckers: low,
    //     motherfucking: low,
    //     goddamn:low,
    //     bitch: high,
    //     bitches: high,
    //     cunt: high,
    //     cunts: high,
    //     fuckers: low,
    //     asshole: low,
    //     assholes: low,
    //     ass: low,
    //     assis: low,
    //     asses: low,
    //     fatass: low,
    //     fatasses: low,
    //     bullshit: low
    // };
    // swearSet = new Set(Object.keys(swearList));
}
updateSwears()
// const server = express()
//   .use(express.static(path.join(__dirname, 'public')))
//   .set('views', path.join(__dirname, 'views'))
//   .set('view engine', 'ejs')
//   .get('/', (req, res) => res.render('pages/index'))
//   .listen(PORT, () => console.log(`Listening on ${ PORT }`))

const io = socketIO(server);
// io.on('connection', (socket) => {
//     console.log('Client connected');
//     socket.on('disconnect', () => console.log('Client disconnected'));
//   });
  
//   setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
//////////////////////////////////////////
//////////////// LOGGING /////////////////
//////////////////////////////////////////
function getCurrentDateString() {
    return (new Date()).toISOString() + ' ::';
};
__originalLog = console.log;
console.log = function () {
    var args = [].slice.call(arguments);
    __originalLog.apply(console.log, [getCurrentDateString()].concat(args));
};
//////////////////////////////////////////
//////////////////////////////////////////

const fs = require('fs');
const util = require('util');
//const path = require('path');
const { Readable } = require('stream');

//////////////////////////////////////////
///////////////// VARIA //////////////////
//////////////////////////////////////////

function necessary_dirs() {
    if (!fs.existsSync('./data/')){
        fs.mkdirSync('./data/');
    }
}
necessary_dirs()

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function convert_audio(input) {
    try {
        // stereo to mono channel
        const data = new Int16Array(input)
        const ndata = new Int16Array(data.length/2)
        for (let i = 0, j = 0; i < data.length; i+=4) {
            ndata[j++] = data[i]
            ndata[j++] = data[i+1]
        }
        return Buffer.from(ndata);
    } catch (e) {
        console.log(e)
        console.log('convert_audio: ' + e)
        throw e;
    }
}
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


//////////////////////////////////////////
//////////////// CONFIG //////////////////
//////////////////////////////////////////

const SETTINGS_FILE = 'settings.json';

let DISCORD_TOK = null;
let WITAPIKEY = null; 
let SPOTIFY_TOKEN_ID = null;
let SPOTIFY_TOKEN_SECRET = null;

function loadConfig() {
    if (fs.existsSync(SETTINGS_FILE)) {
        const CFG_DATA = JSON.parse( fs.readFileSync(SETTINGS_FILE, 'utf8') );
        DISCORD_TOK = CFG_DATA.discord_token;
        WITAPIKEY = CFG_DATA.wit_ai_token;
        DATABASE_URL = CFG_DATA.postgresURI;
    } else {
        DISCORD_TOK = process.env.DISCORD_TOK;
        WITAPIKEY = process.env.WITAPIKEY;
        DATABASE_URL = process.env.DATABASE_URL;
    }
    if (!DISCORD_TOK || !WITAPIKEY)
        throw 'failed loading config #113 missing keys!'
    
}
loadConfig()

// Connect db
const db = new Client({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized:false
    }
})
db.connect();

const https = require('https')
function listWitAIApps(cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps?offset=0&limit=100',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+WITAPIKEY,
      },
    }

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      });
      res.on('end',function() {
        cb(JSON.parse(body))
      })
    })

    req.on('error', (error) => {
      console.error(error)
      cb(null)
    })
    req.end()
}
function showJarStatus(msg){
    if (Object.keys(userRecord).length > 0){
        for(const [key, value] of Object.entries(userRecord)){
            msg.channel.send(key + ' said '+ value['swearCount'] + ' swear(s), costing $'+ value['swearCost'].toFixed(2) + ' in total.')   
            }
    }
    msg.channel.send('The swear jar total is $'+ jarTotal.toFixed(2))
}
function updateWitAIAppLang(appID, lang, cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps/' + appID,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+WITAPIKEY,
      },
    }
    const data = JSON.stringify({
      lang
    })

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      });
      res.on('end',function() {
        cb(JSON.parse(body))
      })
    })
    req.on('error', (error) => {
      console.error(error)
      cb(null)
    })
    req.write(data)
    req.end()
}

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


const Discord = require('discord.js')
const DISCORD_MSG_LIMIT = 2000;
const discordClient = new Discord.Client()
if (process.env.DEBUG)
    discordClient.on('debug', console.debug);
discordClient.on('ready', async () => {
    console.log(`Logged in as ${discordClient.user.tag}!`)
    // Check if we should re-join
    db.query("SELECT DISTINCT guild_id, vc_id FROM swear_log;").then(async res => {
        res.rows.forEach(async row => {

            let VC = await discordClient.channels.cache.get(row['vc_id']);
if(!VC){
    return(message.channel.send("channel inaccessible"));
}
        if (VC.members.size > 0){
            //directConnect(row['guild_id'], row['voice_id'], VC.members)
            directConnect(row['guild_id'],row['vc_id'],VC.members.values().next().value)
            // Active channel found! jump in
        }
        })
    }).catch(e => console.error(e.stack))
})
discordClient.login(DISCORD_TOK)

function restartCheck(){
    // For each guild + voice channel pair in swear log
    // Check if people are currently in a voice channel
    // if so, connect
    db.query("SELECT DISTINCT guild_id, vc_id FROM swear_log;").then(res => {
        res.rows.forEach(row => {
            discordClient.guilds.get(row['guild_id'])
        })
    }).catch(e => console.error(e.stack))
}


const PREFIX = '&';
const _CMD_HELP        = PREFIX + 'help';
const _CMD_JOIN        = PREFIX + 'join';
const _CMD_LEAVE       = PREFIX + 'leave';
const _CMD_DEBUG       = PREFIX + 'debug';
const _CMD_TEST        = PREFIX + 'hello';
const _CMD_LANG        = PREFIX + 'lang';
const _CMD_SET         = PREFIX + 'set';
const _CMD_TOTAL       = PREFIX + 'total';
const _CMD_STATUS      = PREFIX + 'status';
const _CMD_RESET      = PREFIX + 'reset';
const _CMD_GET       = PREFIX + 'get';
const _CMD_INSERT = PREFIX + 'insert';

const guildMap = new Map();

function payloadFactory(message,payload = []){
    if (payload.length == 0){
        payload = Array(message)
    } else {
        payload.push(message);
    }
    return payload
}
function messageFactory ({top='',middle='',bot='',duration = 2000} ={}){
    message = {'duration':duration};
    if (top.length != 0) message['top-text'] = top;
    if (middle.length != 0) message['middle-text'] = middle;
    if (bot.length != 0) message['bot-text'] = bot;
return message
}

discordClient.on('message', async (msg) => {
    try {
        if (!('guild' in msg) || !msg.guild) return; // prevent private messages to bot
        const mapKey = msg.guild.id;
        if (msg.content.trim().toLowerCase() == _CMD_JOIN) {
            if (!msg.member.voice.channelID) {
                msg.reply('Error: please join a voice channel first.')
            } else {
                if (!guildMap.has(mapKey)){
                    await connect(msg, mapKey);
                    // Should probably make swear set a set of swear words by guild TODO 
                    updateSwears(mapKey);
                    console.log(swearSet)
                    //initMember(msg.member,mapKey,msg.member.voice.channelID,msg.channel.id)                 
                    io.emit('bot-connected',Array(messageFactory({middle:'Swear Jar Connected'})))
                }else
                    msg.reply('Already connected')
            }
        } else if (msg.content.trim().toLowerCase() == _CMD_LEAVE) {
            if (guildMap.has(mapKey)) {
                let val = guildMap.get(mapKey);
                if (val.voice_Channel) val.voice_Channel.leave()
                if (val.voice_Connection) val.voice_Connection.disconnect()
                guildMap.delete(mapKey)
                showJarStatus(msg)
                msg.reply("Disconnected.")
                userRecord = {}; 
                io.emit('bot-disconnected',Array(messageFactory({middle:'Swear Jar Disconnected'})))
            } else {
                msg.reply("Cannot leave because not connected.")
            }
        } else if (msg.content.trim().toLowerCase() == _CMD_HELP) {
            msg.reply(getHelpString());
        }
        else if (msg.content.trim().toLowerCase() == _CMD_DEBUG) {
            console.log('toggling debug mode')
            let val = guildMap.get(mapKey);
            if (val.debug)
                val.debug = false;
            else
                val.debug = true;
        }
        else if (msg.content.trim().toLowerCase() == _CMD_TEST) {
            msg.reply('Sending Test Payload')
            swearPayload = Array();
            intersection = new Set(["fuck","shit","bitch"]);
            user = {'username': msg.author.username};
            for (let item of intersection.values()) swearPayload.push(messageFactory({top: user.username+' said', middle: item.toUpperCase().replace(/(?<!^).(?!$)/g, '*')}))
            swearPayload.push(messageFactory({top: 'Jar Total:', middle: '$'+jarTotal.toFixed(2),duration:4000}))
            io.emit('swear',swearPayload)
        }  
        else if (msg.content.split('\n')[0].split(' ')[0].trim().toLowerCase() == _CMD_LANG) {
            const lang = msg.content.replace(_CMD_LANG, '').trim().toLowerCase()
            listWitAIApps(data => {
              if (!data.length)
                return msg.reply('no apps found! :(')
              for (const x of data) {
                updateWitAIAppLang(x.id, lang, data => {
                  if ('success' in data)
                    msg.reply('succes!')
                  else if ('error' in data && data.error !== 'Access token does not match')
                    msg.reply('Error: ' + data.error)
                })
              }
            })
        } else if (msg.content.trim().toLowerCase().split(' ')[0] == _CMD_INSERT){
                   toks = msg.content.trim().split(' ');
                   insertSwear(msg, toks.slice(1).join(' '));
        } else if (msg.content.trim().toLowerCase().split(' ')[0]== _CMD_SET){
            toks = msg.content.trim().toLowerCase().split(' ')
            type = toks[1];
            if (type == 'cost'){
                word = toks.slice(2,toks.length-1);
                cost = toks[toks.length-1];
                cost = Math.round(cost * 100) / 100;
                await db.query("UPDATE swear_list SET custom_cost="+cost+" WHERE word='"+word+"';");
                updateSwears(msg.guild.id);
            }else {
            
      
      

            newVal = Math.round(msg.content.split(' ')[2] * 100) / 100;
            if (!isNaN(newVal)){
            
            if (type == 'total'){
                await db.query("UPDATE swear_jar SET total="+newVal+" WHERE guild_id='"+msg.guild.id+"';")
                jarTotal = newVal
                msg.reply('The new swear jar total is: $' + jarTotal.toFixed(2));
            } else if (type == 'low') {
                low = newVal;
                await db.query("UPDATE swear_jar SET low_cost="+low+" WHERE guild_id='"+ msg.guild.id+"' AND vc_id='"+voice_Channel+"';");
                msg.reply('The new low swear cost is: $' + newVal)
                updateSwears(msg.guild.id);
            } else if (type == 'high') {
                high = newVal;
                await db.query("UPDATE swear_jar SET high_cost="+high+" WHERE guild_id='"+ msg.guild.id+"' AND vc_id='"+voice_Channel+"';");
                msg.reply('The new high swear cost is: $' + newVal)
                updateSwears(msg.guild.id);
            } else if (type == 'mid') {
                low = newVal;
                await db.query("UPDATE swear_jar SET mid_cost="+mid+" WHERE guild_id='"+ msg.guild.id+"' AND vc_id='"+voice_Channel+"';");
                msg.reply('The new low swear cost is: $' + newVal)
                updateSwears(msg.guild.id);           
            }
            } else {
                msg.reply('The message after *set must be a valid number, i.e. *set total 12.25')
            }
        }
        } else if (msg.content.trim().toLowerCase().split(' ')[0]== _CMD_GET){
            type = msg.content.trim().toLowerCase().split(' ')[1];
            
            
            if (type == 'swears'){
                try {
                    getSwearList(msg);
                } catch(e){
                    console.log('Get Swears Error: '+e)
                }
            } else if (type == 'low') {                
                msg.reply('The low swear cost is: $' + low)
            } else if (type == 'mid') {
                msg.reply('The mid swear cost is: $' + mid)
            }else if (type == 'high') {  
                msg.reply('The high swear cost is: $' + high)
            }
        }else if (msg.content.trim().toLowerCase()  == _CMD_TOTAL){
            msg.reply('The current swear jar total is: $'+jarTotal.toFixed(2))
        } else if (msg.content.trim().toLowerCase()  == _CMD_STATUS){
            showJarStatus(msg)

        } else if (msg.content.trim().toLowerCase().split(' ')[0]  == _CMD_RESET){
            toks = msg.content.trim().toLowerCase().split(' ');
            if (toks.length > 1 && msg.content.trim().toLowerCase().split(' ')[1] == 'full'){
                      await db.query("UPDATE swear_log SET total_cost = 0 WHERE guild_id ='"+msg.guild.id+"';");
        }
        await db.query("UPDATE swear_log SET total_cost = 0 WHERE guild_id ='"+msg.guild.id+"';");
        jarTotal = 0;
        userRecord = {};
     
        showJarStatus(msg)
        }
    } catch (e) {
        console.log('discordClient message: ' + e)
        msg.reply('Error#180: Something went wrong, try again or contact the developers if this keeps happening.');
    }
})
function query (text, params){
    db.query(text,params)
}
async function insertSwear(msg,phrase){
 console.log("Inserting the following phrase");
 console.log(phrase);
 //io.emit('test',msg)
 //console.log(msg)
 db.query("INSERT INTO swear_list (guild_id, word) VALUES ('"+msg.guild.id+"', '"+phrase+"') ON CONFLICT DO NOTHING").then( res =>{
    console.log("Insert result:") 
    console.log(res)
    msg.reply('Phrase inserted c:')
 }).catch(e=> console.error(e.stack));
 updateSwears(msg.guild.id)
}
async function getSwearList(msg){
    db.query("SELECT * FROM swear_list WHERE guild_id ='"+msg.guild.id+"'").then( res => {
        
        response = 'Swear List:\n';
        console.log(response)
        
        for (let row of res.rows) {
            console.log(row)
            response += JSON.stringify(row.word) + "\n";        
        }
        msg.reply(response);
    }).catch(e => console.error(e.stack))
    
   
}

function getHelpString() {
    let out = '**COMMANDS:**\n'
        out += '```'
        out += PREFIX + 'join\n';
        out += PREFIX + 'status\n';
        out += PREFIX + 'total\n';
        out += PREFIX + 'set\n';
        out += PREFIX + 'reset\n';
        out += PREFIX + 'leave\n';
        out += '```';
        out += 'Use, `jar` `low` or `high` with a number to set new jar total and swear costs (non-retroactive).\n';
        out += 'Example `&set jar 14.25`\n'
    return out;
}

const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);

class Silence extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
    this.destroy();
  }
}

function addServer(discordID,voiceID,msg){
    var q = "INSERT INTO swear_jar (guild_id, vc_id) VALUES \
    ('"+discordID+"', '"+voiceID+"') ON CONFLICT DO NOTHING;"

    db.query(q).then( res => {
        // db.query("SELECT SUM(total_cost) FROM swear_log WHERE guild_id = '"+discordID+"' AND vc_id = '"+voiceID+"';").then(res => {
        //     jarTotal = parseFloat(res.rows[0]['sum']);
        //     if (!(msg === undefined))
        //     showJarStatus(msg);
        // }).catch(e => console.log(e.stack))
        db.query("SELECT total FROM swear_jar WHERE guild_id = '"+discordID+"';").then(res => {
            jarTotal = parseFloat(res.rows[0]['total']);
            if (!(msg === undefined))
            showJarStatus(msg);
        }).catch(e => console.log(e.stack))
        //db.query("SELECT SUM(total_cost) FROM swear_log WHERE guild_id = '"+discordID+"' AND vc_id = '"+voiceID+"';").then(res => console.log(res)).catch(e => console.log(e.stack))
        console.log('Logged guild.')
        
    }).catch(e => console.error(e.stack))
}
function initMember(member,guildID,voiceID,textID){
    console.log(textID)
    if (!member.user.bot){



        // Add member to local user record
        if (member.nickname === undefined){
            var q = "INSERT INTO swear_log (guild_id, vc_id, username, text_id) VALUES \
        ('"+guildID+"', '"+voiceID+"', '"+member.user.username +"','"+textID+"') ON CONFLICT DO NOTHING;"

    }else{
        var q = "INSERT INTO swear_log (guild_id, vc_id,alias, username, text_id) VALUES \
        ('"+guildID+"', '"+voiceID+"', '"+member.nickname +"', '"+member.user.username +"','"+textID+"') ON CONFLICT DO NOTHING;"
    }
    console.log('query:')
    console.log(q);
    db.query(q).then(res => {
            db.query("SELECT * FROM swear_log WHERE \
            vc_id = '"+ voiceID+"' AND guild_id = '"+guildID+"' AND username = '"+member.user.username+"';"
        ).then(res => {
            console.log("heyo")
            userRecord[member.user.username] = {};
            
            userRecord[member.user.username].alias = res.rows[0].alias;
            userRecord[member.user.username].swearCount = res.rows[0]['swear_count'];
            userRecord[member.user.username].swearCost = parseFloat(res.rows[0]['total_cost']);
            
            console.log(userRecord[member.user.username])
            
            })
    })

}

   
}

async function directConnect(mapKey, voice_id, member){
    console.log('directConnecting');
    db.query("SELECT text_id FROM swear_log WHERE username = '"+member.user.username+ "' AND guild_id = '"+mapKey+"' AND vc_id = '"+voice_id+"';").then(async res => {
        console.log(res)
        try {
       let voice_Channel = await discordClient.channels.fetch(member.voice.channelID);
        //if (!voice_Channel) return msg.reply("Error: The voice channel does not exist!");
        
        let text_Channel = await discordClient.channels.fetch(res.rows[0]['text_id']);
        //if (!text_Channel) return msg.reply("Error: The text channel does not exist!");
        let voice_Connection = await voice_Channel.join();
        voice_Connection.play(new Silence(), { type: 'opus' });
        guildMap.set(mapKey, {
            'text_Channel': text_Channel,
            'voice_Channel': voice_Channel,
            'voice_Channel_ID':member.voice.channelID,
            'voice_Connection': voice_Connection,
            'debug': false,
        });
                // Add current guid id (mapKey) and voice channel id (msg.member.voice.channelID)
        // to swear_jar if they don't currently exist
        addServer(mapKey,member.voice.channelID)
        // Get current list of voice channel members (usernames and alias (might as well set andrew and emma's directly)
        members = voice_Channel.members;
        // console.log(members);
        members.forEach(member => initMember(member,mapKey,member.voice.channelID,res.rows[0]['text_id']));
        // ^ add to swear_log if not present
        speak_impl(voice_Connection, mapKey)
        db.query("SELECT total FROM swear_jar WHERE guild_id = '"+discordID+"';").then(res => {
            jarTotal = parseFloat(res.rows[0]['total']);
            if (!(msg === undefined))
            showJarStatus(msg);
        }).catch(e => console.log(e.stack))

        voice_Connection.on('disconnect', async(e) => {
            if (e) console.log(e);
            guildMap.delete(mapKey);
        })
        // msg.reply('connected!')
    } catch (e) {
        console.log('connect: ' + e)
        // msg.reply('Error: unable to join your voice channel.');
        throw e;
    }
    }).catch(e => console.error(e.stack));
    // try {
    //     let voice_Channel = await discordClient.channels.fetch(msg.member.voice.channelID);
    //     if (!voice_Channel) return msg.reply("Error: The voice channel does not exist!");
    //     let text_Channel = await discordClient.channels.fetch(msg.channel.id);
    //     if (!text_Channel) return msg.reply("Error: The text channel does not exist!");
    //     let voice_Connection = await voice_Channel.join();
    //     voice_Connection.play(new Silence(), { type: 'opus' });
    //     guildMap.set(mapKey, {
    //         'text_Channel': text_Channel,
    //         'voice_Channel': voice_Channel,
    //         'voice_Channel_ID':msg.member.voice.channelID,
    //         'voice_Connection': voice_Connection,
    //         'debug': false,
    //     });
    //     // Add current guid id (mapKey) and voice channel id (msg.member.voice.channelID)
    //     // to swear_jar if they don't currently exist
    //     addServer(mapKey,msg.member.voice.channelID,msg)
    //     // Get current list of voice channel members (usernames and alias (might as well set andrew and emma's directly)
    //     members = voice_Channel.members;
    //     // console.log(members);
    //     members.forEach(member => initMember(member,mapKey,msg.member.voice.channelID, msg.channel.id));
    //     // ^ add to swear_log if not present
    //     speak_impl(voice_Connection, mapKey)
    //     voice_Connection.on('disconnect', async(e) => {
    //         if (e) console.log(e);
    //         guildMap.delete(mapKey);
    //     })
    //     msg.reply('connected!')
    // } catch (e) {
    //     console.log('connect: ' + e)
    //     msg.reply('Error: unable to join your voice channel.');
    //     throw e;
    // }
}
async function connect(msg, mapKey) {
    try {
        let voice_Channel = await discordClient.channels.fetch(msg.member.voice.channelID);
        if (!voice_Channel) return msg.reply("Error: The voice channel does not exist!");
        let text_Channel = await discordClient.channels.fetch(msg.channel.id);
        if (!text_Channel) return msg.reply("Error: The text channel does not exist!");
        let voice_Connection = await voice_Channel.join();
        voice_Connection.play(new Silence(), { type: 'opus' });
        guildMap.set(mapKey, {
            'text_Channel': text_Channel,
            'voice_Channel': voice_Channel,
            'voice_Channel_ID':msg.member.voice.channelID,
            'voice_Connection': voice_Connection,
            'debug': false,
        });
        // Add current guid id (mapKey) and voice channel id (msg.member.voice.channelID)
        // to swear_jar if they don't currently exist
        addServer(mapKey,msg.member.voice.channelID,msg)
        // Get current list of voice channel members (usernames and alias (might as well set andrew and emma's directly)
        members = voice_Channel.members;
        // console.log(members);
        members.forEach(member => initMember(member,mapKey,msg.member.voice.channelID,msg.channel.id));
        // ^ add to swear_log if not present
        speak_impl(voice_Connection, mapKey)
        voice_Connection.on('disconnect', async(e) => {
            if (e) console.log(e);
            guildMap.delete(mapKey);
        })
        msg.reply('connected!')
    } catch (e) {
        console.log('connect: ' + e)
        msg.reply('Error: unable to join your voice channel.');
        throw e;
    }
}


function speak_impl(voice_Connection, mapKey) {
    voice_Connection.on('speaking', async (user, speaking) => {
        if (speaking.bitfield == 0 || user.bot) {
            return
        }
        console.log(`I'm listening to ${user.username}`)
        // this creates a 16-bit signed PCM, stereo 48KHz stream
        const audioStream = voice_Connection.receiver.createStream(user, { mode: 'pcm' })
        audioStream.on('error',  (e) => { 
            console.log('audioStream: ' + e)
        });
        let buffer = [];
        audioStream.on('data', (data) => {
            buffer.push(data)
        })
        audioStream.on('end', async () => {
            buffer = Buffer.concat(buffer)
            const duration = buffer.length / 48000 / 4;
            console.log("duration: " + duration)

            if (duration < 0.1 || duration > 19) { // 20 seconds max dur
                console.log("TOO SHORT / TOO LONG; SKPPING")
                return;
            }

            try {
                let new_buffer = await convert_audio(buffer)
                let out = await transcribe(new_buffer);

                if (out != null)
                    
                    process_commands_query(out, mapKey, user);
            } catch (e) {
                console.log('tmpraw rename: ' + e)
            }


        })
    })
}

async function process_commands_query(txt, mapKey, user) {
    //io.emit('swear',Array(messageFactory({top: txt})))
    
    // console.log(txt)
    if (txt && txt.length) {
        let val = guildMap.get(mapKey);
        // Uncomment to send captured text to the discord
        // val.text_Channel.send(user.username + ': ' + txt)
        // Uncomment to send the captured text to the alert client
        io.emit('time', user.username + ': ' + txt)
        
        //intersection = new Set(txt.split(' ').filter( x=> swearSet.has(x)))
        intersection = new Set()
        swearSum = 0;
        
        swearSet.forEach((x) => {
            if (txt.toLowerCase().includes(x)){
                intersection.add(x)

                swearSum += swearList[x]
                
            }
        })
        jarTotal += swearSum
        // console.log(txt)
        // console.log(swearSet)
        // console.log(intersection)
        if (intersection.size > 0){

            // swearSum = 0;
            // intersection.forEach( (x) => swearSum += swearList[x])
            // jarTotal += swearSum
            if (user.username in userRecord){
                 
                userRecord[user.username]['swearCount'] += intersection.size;
                userRecord[user.username]['swearCost'] += swearSum;
                // q = "UPDATE swear_log SET swear_count = "+userRecord[user.username]['swearCount']+", total_cost = "+userRecord[user.username]['swearCost']+"\
                // WHERE  guild_id ='"+mapKey+"' AND vc_id = '"+guildMap.get(mapKey).voice_Channel_ID+"' AND username = '"+user.username+"';"
                q = "UPDATE swear_log SET swear_count = "+userRecord[user.username]['swearCount']+", total_cost = "+userRecord[user.username]['swearCost']+"\
                WHERE  guild_id ='"+mapKey+"' AND username = '"+user.username+"';"
                await db.query(q);
                // await db.query("UPDATE swear_jar SET total="+ jarTotal+" WHERE guild_id='"+mapKey+"' AND vc_id = '"+guildMap.get(mapKey).voice_Channel_ID+"';");
                await db.query("UPDATE swear_jar SET total="+ jarTotal+" WHERE guild_id='"+mapKey+"';");
            } else {                
                initMember({'user':user, 'nickname':undefined})
                while(!(user.username in userRecord)) await sleep(500);
                userRecord[user.username]['swearCount'] = intersection.size;
                userRecord[user.username]['swearCost'] = swearSum;
                //initMember(mapKey,guildMap.mapKey.voice_Channel_ID)
            }

            
            swearPayload = Array();
            // if (user.username.toLowerCase() == 'benindetto') user.username = 'Andrew';
            // if (user.username.toLowerCase() == 'emmaeira') user.username = 'Emma';
            // if (user.username.toLowerCase() == 'gnarlywhale') user.username = 'Riley';
            userName = user.username;
            if (userRecord[user.username]['alias'] != 'null') {
                userName = userRecord[user.username]['alias']
            } 
            for (let item of intersection.values()) swearPayload.push(messageFactory({top: userName +' said', middle: item.toUpperCase().replace(/(?<!^).(?!$)/g, '*')}))
            swearPayload.push(messageFactory({top: 'Jar Total:', middle: '$'+jarTotal.toFixed(2),duration:4000}))
            io.emit('swear',swearPayload)
            
            
            val.text_Channel.send(user.username+','+Array.from(intersection))
        }
    }
}


//////////////////////////////////////////
//////////////// SPEECH //////////////////
//////////////////////////////////////////
async function transcribe(buffer) {

  return transcribe_witai(buffer)
  // return transcribe_gspeech(buffer)
}

// WitAI
let witAI_lastcallTS = null;
const witClient = require('node-witai-speech');
async function transcribe_witai(buffer) {
    try {
        // ensure we do not send more than one request per second
        if (witAI_lastcallTS != null) {
            let now = Math.floor(new Date());    
            while (now - witAI_lastcallTS < 1000) {
                console.log('sleep')
                await sleep(100);
                now = Math.floor(new Date());
            }
        }
    } catch (e) {
        console.log('transcribe_witai 837:' + e)
    }

    try {
        // io.emit('swear',Array(messageFactory({top: 'Debug', middle: 'Sending',duration:2000})))
        console.log('transcribe_witai')
        const extractSpeechIntent = util.promisify(witClient.extractSpeechIntent);
        var stream = Readable.from(buffer);
        const contenttype = "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little"
        const output = await extractSpeechIntent(WITAPIKEY, stream, contenttype)
        witAI_lastcallTS = Math.floor(new Date());
        
        cleanOutput = jsonEscape(output);
        if (typeof cleanOutput != undefined){
        jsonOut = JSON.parse(cleanOutput.substr(cleanOutput.indexOf('{  "entities"')))
        console.log(jsonOut.text)
        io.emit('sample',buffer);
        //io.emit('sample','Test audio sample maybe')
        stream.destroy()
        return jsonOut.text;
    }

        // console.log(output)
        
        // stream.destroy()
        // io.emit('swear',Array(messageFactory({top: 'Debug', middle: jsonEscape(output),duration:2000})))
        // if (output && '_text' in output && output._text.length)
        //     return output._text
        // if (output && 'text' in output && output.text.length)
        //     return output.text
        // return output;
    } catch (e) { console.log('transcribe_witai 851:' + e); console.log(e) }
}

// Google Speech API
// https://cloud.google.com/docs/authentication/production
const gspeech = require('@google-cloud/speech');
const { matches } = require('underscore');
const gspeechclient = new gspeech.SpeechClient({
  projectId: 'discordbot',
  keyFilename: 'gspeech_key.json'
});

async function transcribe_gspeech(buffer) {
  try {
      console.log('transcribe_gspeech')
      const bytes = buffer.toString('base64');
      const audio = {
        content: bytes,
      };
      const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 48000,
        languageCode: 'en-US',  // https://cloud.google.com/speech-to-text/docs/languages
      };
      const request = {
        audio: audio,
        config: config,
      };

      const [response] = await gspeechclient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      console.log(`gspeech: ${transcription}`);
      return transcription;

  } catch (e) { console.log('transcribe_gspeech 368:' + e) }
}

function jsonEscape(str)  {
    if (str && (typeof str) == "string") return str.replace(/(\r\n|\n|\r)/gm, "");
    //return str.replace(/\n/g, "\\\\n").replace(/\r/g, "\\\\r").replace(/\t/g, "\\\\t");
}
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////

