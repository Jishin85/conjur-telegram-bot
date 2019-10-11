const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const https = require('https');
const request = require('request');
const exec = require('ssh-exec');

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.BOT_TOKEN;
console.log('Token : ' + token);
const node_url = process.env.NODE_URL;
console.log('Url : ' + node_url);
const image_name = process.env.IMAGE_NAME;
console.log('Image Name : ' + image_name);

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

bot.on("polling_error", (err) => console.log(err));

var status = '';
var health = '';
function getConjurStatus(callback){

request.get({
  url: `https://${node_url}/health`,
  agentOptions: {
    ca: fs.readFileSync('conjur.pem')
  }
}, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log('Response = ' + response);
    console.log('Statuscode = ' + response.statusCode);
    status = response.statusCode;
    health = body;
    callback(status);
  }
  if (error && error.code == 'ECONNREFUSED') {
    status = 400;
    callback(status);
  }  
  console.log(error); 
});
}

// Matches "/status [whatever]"
bot.onText(/\/status/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  var resp = `Checking the status of https://${node_url}/health`;
  bot.sendMessage(chatId, resp);
  getConjurStatus( function(err, result){
    if (status == 200) {
      resp = "The master is up and running.";
      var resp2 = health;
    } else {
      resp = "Master is down or not reachable.";
    }
    // send back the response to the chat
    if (resp2) { bot.sendMessage(chatId, resp2); }
    bot.sendMessage(chatId, resp);
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

bot.onText(/\/stop/, (msg, match) => {

  const chatId = msg.chat.id;

  // Trying to stop Conjur's docker on the host configured via env parameters
  exec(`docker stop ${image_name}`, {
    // Hardcoded user for now, to parametrize
    user: 'ec2-user',
    host: `${node_url}`,
    key: fs.readFileSync('conjur-key.pem'),
  }, function (err, stdout, stderr) {
    console.log(err, stdout, stderr);
    if (err='null') {
      bot.sendMessage(chatId, `Node ${node_url} stopped successfully`);
    }
  })
});

bot.onText(/\/run/, (msg, match) => {

  const chatId = msg.chat.id;

  // Trying to run a new Conjur's docker image on the host configured via env parameters
  exec(`docker run --name ${image_name} -d --restart=always --security-opt seccomp:seccomp.json -p 443:443 -p 636:636 -p 5432:5432 -p 1999:1999 -v /home/ec2-user/logs:/var/log/conjur registry2.itci.conjur.net/conjur-appliance:5.6.0`, {
    // Hardcoded user for now, to parametrize
    user: 'ec2-user',
    host: `${node_url}`,
    key: fs.readFileSync('conjur-key.pem'),
  }, function (err, stdout, stderr) {
    console.log(err, stdout, stderr);
    if (err='null') {
      bot.sendMessage(chatId, `Node ${node_url} created successfully`);
    }
  })
});

bot.onText(/\/start/, (msg, match) => {

  const chatId = msg.chat.id;

  // Trying to start Conjur's docker on the host configured via env parameters
  exec(`docker start ${image_name}; docker exec -i ${image_name} sv start pg; docker exec -i ${image_name} sv start nginx; docker exec -i ${image_name} sv start conjur;`, {
    // Hardcoded user for now, to parametrize
    user: 'ec2-user',
    host: `${node_url}`,
    key: fs.readFileSync('conjur-key.pem'),
  }, function (err, stdout, stderr) {
    console.log(err, stdout, stderr);
    if (err='null') {
      bot.sendMessage(chatId, `Node ${node_url} started successfully`);
    }
  })
});

