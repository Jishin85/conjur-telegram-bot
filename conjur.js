const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const https = require('https');
const request = require('request');

// replace the value below with the Telegram token you receive from @BotFather
const token = $bot_token;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

bot.on("polling_error", (err) => console.log(err));

var status = '';
var health = '';
function getConjurStatus(callback){

request.get({
  url: '$node_url/health',
  agentOptions: {
    ca: fs.readFileSync('conjur.pem')
  }
}, function (error, response, body) {
  console.log('Statuscode = ' + response.statusCode);
  if (!error && response.statusCode == 200) {
    status = response.statusCode;
    health = body;
    callback(status);
  } 
});
}

// Matches "/status [whatever]"
bot.onText(/\/status/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  var resp = "Checking the status of $node_url/health";
  bot.sendMessage(chatId, resp);
  getConjurStatus( function(err, result){
    if (status == 200) {
    resp = "The master is up and running.";
    var resp2 = health;
  } else {
    resp = "Master is down or not reachable.";
  }
  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
  if (resp2) { bot.sendMessage(chatId, resp2); }
  });
});

function getRandomLine(){
  const data = fs.readFileSync('/opt/telegram/vocabulary', 'utf8');
  var lines = data.split('\n');
  return lines[Math.floor(Math.random()*lines.length)];
}

// Matches "Conjur"
bot.onText(/\bConjur|conjur\b/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  var resp = getRandomLine();

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});
