const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp();

exports.user_register = functions.auth.user().onCreate((user) => {
  const root = admin.database();
  // Create the users object and push to the users node
  const uid = user.uid;
  const userObject = {
    email: user.email,
  };

  const uncertain = {};
  const attending = {};
  const absent = {};
  root.ref("games/").on("value", (snapshot) => {
    for (const key in games) {
      uncertain[key] = true;

      attending[key] = false;
      absent[key] = false;
    }

    userObject["uncertain"] = uncertain;
    userObject["attending"] = attending;
    userObject["absent"] = absent;

    root.ref(`users/${uid}`).set(userObject);

    return 'Done'
  });
  });
