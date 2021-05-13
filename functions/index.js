const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.user_register = functions.auth.user().onCreate((user) => {
  const root = admin.database().ref();
  // Create the users object and push to the users node
  // const userObject = {
  //   name: user.full_name,
  // };
  // Get the list of games and their ids

  // In the users object, mark all games in `uncertain` as true
  // Mark attending and not_attending false

  // In the games node, for every game, mark the userid in `uncertain` as true
  // Mark attending and not_attending false 

    const email = user.email; // The email of the user.
    const displayName = user.displayName; // The display name of the user.
    // [END eventAttributes]
    console.log(user);
    console.log(email);
    console.log(displayName);

    return;
  });
