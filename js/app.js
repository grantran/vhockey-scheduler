let gamesOnLoad; // Global object for games
let usersCompleteDataObject; // Global object for the current user's list of games and statuses
let userObj; // global user object to be used
const showGames = () => {
  let output = "";
  let isInitialLoad = true;
  return db.ref("games/").on("value", (snapshot) => {
    if (! isInitialLoad) {
      return;
    }
    // const games = snapshot.val();
    gamesOnLoad = snapshot.val();
    console.log(gamesOnLoad);

    for (const key in gamesOnLoad) {
      const game = gamesOnLoad[key];
      const date = game.date;
      const time = game.time;
      const rink = game.rink;
      const team = game.team;
      const gameNumber = game.gameNumber;

      output += `
          <div class="card" data-game=${gameNumber}>
            <div class="card--game-info">
              <h4 class="game-number">${gameNumber}</h4>
              <h2>Date: ${date}</h2>
              <h2>Time: ${time}</h2>
              <h2>Rink: ${rink}</h2>
              <h2>${team} Team</h2>
            </div>
            <div class="button-container" >
              <button data-game=${gameNumber} data-key=${key} data-action="attending" class="neutral button button--accept">In!</button>
              <button data-game=${gameNumber} data-key=${key} data-action="absent" class="neutral button button--decline">Out</button>
            </div>
          </div>`;
    }

    const container = document.querySelector(".container");
    container.innerHTML = output;

    attachButtonHandlers();
    isInitialLoad = false;
  });
};

const attachButtonHandlers = () => {
  console.log("Attaching button handlers", userObj);
  $(".button").on("click", (e) => {
    const $this = $(e.currentTarget);

    const gameKey = $this.attr("data-key");
    const gameAction = $this.attr("data-action");
    updateAttendance(gameKey, userObj.uid, gameAction);

    if ($this.hasClass("active")) {
      $this.removeClass("active");
      $this.siblings('button').removeClass("inactive");
    } else {
      $this.addClass("active").removeClass("inactive");
      $this.siblings('button').addClass("inactive").removeClass("active");
    }
  });
};

const attachLogoutHandler = () => {
  $('#logout-link').on("click", () => {
    firebase.auth().signOut().then(function() {
      console.log("Logging out");
    }.catch((error) => {
      console.log("logout error", error);
    }));
  });
};

const updateAttendance = (gameIndex, uid, gameAction) => {
  const statuses = ["attending", "absent", "uncertain"];

  // Update the user
  const trueUserObject = {};
  const falseUserObject = {};

  trueUserObject[gameIndex] = true;
  falseUserObject[gameIndex] = false;
  db.ref(`users/${uid}/${gameAction}`).set(trueUserObject);

  const statusIndex = statuses.indexOf(gameAction);
  statuses.splice(statusIndex, 1);

  for (const falseAction of statuses) {
    db.ref(`users/${uid}/${falseAction}`).set(falseUserObject);
  }

  // Update the games
  const trueGameObject = {};
  const falseGameObject = {};

  trueGameObject[uid] = true;
  falseGameObject[uid] = false;

  db.ref(`games/${gameIndex}/${gameAction}`).set(trueGameObject);

  for (const falseAction of statuses) {
    db.ref(`games/${gameIndex}/${falseAction}`).set(falseGameObject);
  }
};

const getUserGamesStatus = () => {
  return db.ref(`users/${userObj.uid}`).on("value", (snapshot) => {
    usersCompleteDataObject = snapshot.val();
  });
  // db.ref("users/").on("value", (snapshot) => {
  //   const isUsers = snapshot.exists();
  //   console.log("users exists?", snapshot.val());
  //   console.log(isUsers);


  // });
  // const fakeUID = "sdfsdkljj8wefw0";
  // const fakeUserObject = {email: "grant@formswim.com", first_name: "granny", last_name: "tranny"};
  // db.ref(`users/${fakeUID}`).set(fakeUserObject).then((what) => {
  //   console.log("done setting");
  //   console.log(what);
  // });
};

const init  = () => {
  // let userObj; // global user object to be used
  auth.onAuthStateChanged(async function(user) {
    if (user) {
      console.log("signed in");
      console.log(user);
      userObj = user;

      await getUserGamesStatus();
      await showGames();

    } else {
      // No user is signed in.
      window.location.replace('login.html')
    }
  });
  // showGames();
  attachLogoutHandler();

  // getUserGamesStatus();
};

document.addEventListener("DOMContentLoaded", init);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("/serviceWorker.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err));
  });
}
