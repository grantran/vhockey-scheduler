const functions = require('firebase-functions');
const express = require('express');
const app = express();

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true }))

const admin = require('firebase-admin');
admin.initializeApp();

exports.user_register = functions.auth.user().onCreate(async (user) => {
  const root = admin.database();
  // Create the users object and push to the users node
  const uid = user.uid;
  const userObject = {
    email: user.email,
    isGoalie: false,
  };

  const uncertain = {};
  const attending = {};
  const absent = {};

  root.ref("games/").on("value", (snapshot) => {
    const games = snapshot.val();

    for (const key in games) {
      // These are for the user nodes
      // Each user has 3 objects, uncertain, attending, absent where the keys are games
      // We build each of these 3 objects by as many games there are
      uncertain[key] = true;
      attending[key] = false;
      absent[key] = false;

      // These are for the game nodes
      // A new user need to be added to each game's three objects
      let attendingObj = {};
      let absentObj = {};
      let uncertainObj = {};

      // appends the new user id to the 3 objects with the initial state
      attendingObj[uid] = false;
      absentObj[uid] = false;
      uncertainObj[uid] = true;

      root.ref(`games/${key}/attending`).update(attendingObj);
      root.ref(`games/${key}/absent`).update(absentObj);
      root.ref(`games/${key}/uncertain`).update(uncertainObj);
    }

    userObject["uncertain"] = uncertain;
    userObject["attending"] = attending;
    userObject["absent"] = absent;

    root.ref(`users/${uid}`).set(userObject);
  });


});

const sendPubSubMessage = async (topicString, type, gameKey) => {
  const { PubSub } = require('@google-cloud/pubsub');
  const pubsub = new PubSub();
  const topic = pubsub.topic(topicString);
  console.log(`Sending message type ${type} for ${gameKey}`);

  const messageObject = {
    data: {
      messageType: type,
      gameKey: gameKey
    },
  };

  const messageBuffer = Buffer.from(JSON.stringify(messageObject), 'utf8');

  try {
    await topic.publish(messageBuffer);
    return new Promise(() => {}) 
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
};

const checkGames = () => {
  const moment = require('moment-timezone');
  const root = admin.database();

  return root.ref("games/").once("value", async (snapshot) => {

    const millisInOneWeek = 604800000;
    const millisInTenHours = 36000000;
    const games = snapshot.val();
    const promises = [];
    for (const key in games) {
      const game = games[key];
      const date = game.date;
      const gameNumber = game.gameNumber;
      const sentWeekPriorText = game.sentWeekPriorText;
      const sentGameDayText = game.sentGameDayText;
      const gameHasPassed = game.gameHasPassed;
      console.log("date", date, gameNumber, sentWeekPriorText, sentGameDayText);

      const gameDateParsed = moment(date).tz('America/Los_Angeles');
      const curr = moment().tz("America/Los_Angeles").format();
      const diffMillis = gameDateParsed.diff(curr);

      if (diffMillis < 0 && ! gameHasPassed) {
        console.log("game in the past", gameNumber);
        const updateObj = {
          gameHasPassed: true,
        };
        
        root.ref(`games/${key}`).update(updateObj);
      } else if (diffMillis <= millisInOneWeek && diffMillis > millisInTenHours && ! sentWeekPriorText) {
        console.log("Within 1 week, send week prior text", gameNumber);

        promises.push(sendPubSubMessage("send-sms", "weekPrior", key));

        const updateObj = {
          sentWeekPriorText: true,
        };

        root.ref(`games/${key}`).update(updateObj);
      } else if (diffMillis <= millisInTenHours && diffMillis > 0 && ! sentGameDayText) {
        console.log("Within 10 hours, send game day text", gameNumber);
        promises.push(sendPubSubMessage("send-sms", "gameDay", key));
        const updateObj = {
          sentGameDayText: true,
        };
        
        root.ref(`games/${key}`).update(updateObj);
      } else {
        console.log("Nothing going on for game", gameNumber);
      }

      console.log("done with ", gameNumber);
    }

    await Promise.all(promises);
  });
};

exports.timeCheck = functions.region('us-west2').pubsub.topic('fifteen-minutes').onPublish(async (message) => {
  console.log("Triggered by pubsub fifteen-minutes");
  await checkGames();

  return 'ok';
});

const getPlayerPhoneNumber = async function(playerId) {
  const root = admin.database();
  console.log(`Inside get player phone ${playerId}`);
  return new Promise((resolve, reject) => {
    root.ref(`users/${playerId}`).once("value")
    .then((snapshot) => {
      const user = snapshot.val();
      if (user.phone) {
        console.log("PHONE", user.phone);
        return resolve(user.phone);
      }

      return reject();
    }).catch((err) => { return reject(err) });
  });
};

exports.sendSms = functions.region('us-west2').pubsub.topic('send-sms').onPublish(async (message) => {
  const root = admin.database();
  const twilio = require('twilio');
  const config = require('./config.json');
  const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

  const messageBody = message.data ? Buffer.from(message.data, 'base64').toString() : null;
  const parsedMessageBody = JSON.parse(messageBody);
  const data = parsedMessageBody.data;
  
  const messageType = data.messageType;
  const gameKey = data.gameKey;
  console.log(`sendSMS::sendingSMS(${gameKey})`);

  const gameRef = root.ref(`games/${gameKey}`);
  const gameSnapshot = await gameRef.once("value");
  const gameData = gameSnapshot.val();

  const userRef = root.ref(`users/`);
  const userSnapshot = await userRef.once("value");
  const userData = userSnapshot.val();

  let bodyText;
  let confirmedBodyText;

  switch(messageType) {
    case "weekPrior":
      bodyText = `Game ${gameData.gameNumber} - ${gameData.date}, Rink ${gameData.rink}, ${gameData.team}`;
      confirmedBodyText = `Game ${gameData.gameNumber} - ${gameData.date}, you've confirmed IN.`;
      break;
    case "gameDay":
      confirmedBodyText = `Game day text. Game ${gameData.gameNumber} - ${gameData.date}, Rink ${gameData.rink}, ${gameData.team}`;
      break;
    default:
      bodyText = "You shouldn't see this. If you do, text grant";
  }
  
  const promises = [];

  const numbers = [];
  // All text types will text attending players so grab their numbers
  const attendingPlayers = gameData.attending;

  for (const userId in attendingPlayers) {
    console.log(`On user ${userId}, value ${attendingPlayers[userId]}`);
    if (attendingPlayers[userId]) {
      console.log(`going to get phone number for ${userId}`);

      // const number = await getPlayerPhoneNumber(userId);
      const number = userData[userId].phone;

      console.log(`Number for ${userId} is ${number}`);

      if (number) {
        numbers.push(number);
      }
    }

    if (numbers.length > 0) {
      promises.push(
        numbers.map(number => {
          return client.messages.create({
            to: number,
            from: config.TWILIO_MESSAGING_SERVICE_SID,
            body: confirmedBodyText
          });
        })
      )
    }
  }

  const uncertainNumbers = [];

  if (messageType === 'weekPrior') {
    // Also text the uncertain users
    const uncertainPlayers = gameData.uncertain;

    for (const userId in uncertainPlayers) {
      if (uncertainPlayers[userId]) {
        const number = userData[userId].phone;

        if (number) {
          uncertainNumbers.push(number);
        }
      }
    }

    if (uncertainNumbers.length > 0) {
      console.log("Sending texts to uncertain players", uncertainNumbers.length);
      promises.push(
        uncertainNumbers.map(number => {
          return client.messages.create({
            to: number,
            from: config.TWILIO_MESSAGING_SERVICE_SID,
            body: bodyText
          });
        })
      )
    }
  }

  Promise.all(promises)
  .then(messages => {
    console.log('Messages sent!');
    return;
  })
  .catch(err => console.error(err));

  return 'ok';
});

app.post('/reply', (req, res) => {
  const twilio = require('twilio');
  const config = require('./config.json');
  const projectId = process.env.GCLOUD_PROJECT;
  const region = 'us-west2';
  console.log("request");
  console.log(req.body);
  const MessagingResponse = twilio.twiml.MessagingResponse;
  let isValid = true;

  const obj = req.body;

  console.log(Object.keys(obj));

  console.log(obj.Body);
  // Only validate that requests came from Twilio when the function has been
  // deployed to production.
  isValid = twilio.validateExpressRequest(req, config.TWILIO_AUTH_TOKEN, {
    url: `https://${region}-${projectId}.cloudfunctions.net/app/reply`
  });
  

  // Halt early if the request was not sent from Twilio
  if (!isValid) {
    res
      .type('text/plain')
      .status(403)
      .send('Twilio Request Validation Failed.')
      .end();
    return;
  }

  // Prepare a response to the SMS message
  const response = new MessagingResponse();

  // Add text to the response
  response.message('Hello from Google Cloud Functions!');

  // Send the response
  res
    .status(200)
    .type('text/xml')
    .end(response.toString());
});

exports.app = functions.region('us-west2').https.onRequest(app);