const functions = require('firebase-functions');

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

      // These if blocks grab the current attending / absent / uncertain object if they exist
      if ("attending" in games[key]) {
        attendingObj = { ... games[key]["attending"]};
      }
      if ("absent" in games[key]) {
        absentObj = { ... games[key]["absent"]};
      }
      if ("uncertain" in games[key]) {
        uncertainObj = { ... games[key]["uncertain"]};
      }

      // appends the new user id to the 3 objects with the initial state
      attendingObj[uid] = false;
      absentObj[uid] = false;
      uncertainObj[uid] = true;

      root.ref(`games/${key}/attending`).set(attendingObj);
      root.ref(`games/${key}/absent`).set(absentObj);
      root.ref(`games/${key}/uncertain`).set(uncertainObj);
    }

    userObject["uncertain"] = uncertain;
    userObject["attending"] = attending;
    userObject["absent"] = absent;

    root.ref(`users/${uid}`).set(userObject);
  });


});
