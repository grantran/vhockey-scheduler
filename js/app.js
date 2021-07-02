let gamesOnLoad; // Global object for games
let usersCompleteDataObject; // Global object for the current user's list of games and statuses
let userObj; // global user object to be used
let allUsersObj; // global all users object
let attendanceObject = {}; // global for players statuses
let currentGameAttendanceListIndex = -1;
let globalPersonIdentifier = "email"; // if they don't have a first_name yet, use an email

const showGames = () => {
  return db.ref("games/").once("value", (snapshot) => {
    // const games = snapshot.val();
    gamesOnLoad = snapshot.val();

    // Calling this first so we can get the number of players to render the html
    getGameAttendance();

    const container = document.querySelector(".container");
    for (const key in gamesOnLoad) {
      const game = gamesOnLoad[key];
      const date = game.date;
      const time = game.time;
      const rink = game.rink;
      const team = game.team;
      const gameNumber = game.gameNumber;
      const attendingPlayersOfGame = attendanceObject[key].length;

      container.innerHTML += renderCard(key, date, time, rink, team, gameNumber, attendingPlayersOfGame);
    }

    attachButtonHandlers();
    initMyGames();
    attachProfileFormHandler();
    attachGameAttendanceHandler();
  });
};

const renderCard = (key, date, time, rink, team, gameNumber, initialPlayersCount) => {
  let currentGameStatus = "uncertain";

  if (usersCompleteDataObject && usersCompleteDataObject.attending[key]) {
    currentGameStatus = "attending";
  }

  if (usersCompleteDataObject && usersCompleteDataObject.absent[key]) {
    currentGameStatus = "absent";
  }

  let attendingButtonClasses ="neutral button button--accept";
  let absentButtonClasses = "neutral button button--decline";

  switch(currentGameStatus) {
    case "attending":
      attendingButtonClasses += " active";
      absentButtonClasses += " inactive";
      break;
    case "absent":
      attendingButtonClasses += " inactive";
      absentButtonClasses += " active";
      break;
  }

  const output = `
    <div class="card" data-game=${gameNumber}>
    <div class="card--game-info">
      <h4 class="game-number">${gameNumber}</h4>
      <h2>Date: ${date}</h2>
      <h2>Time: ${time}</h2>
      <h2>Rink: ${rink}</h2>
      <h2>${team} Team</h2>
      <h3 data-game=${key} class="game-attendance-trigger">${initialPlayersCount} Attending - View Players</h3>
    </div>
    <div class="button-container" >
      <button data-game=${gameNumber} data-key=${key} data-action="attending" class="${attendingButtonClasses}">In!</button>
      <button data-game=${gameNumber} data-key=${key} data-action="absent" class="${absentButtonClasses}">Out</button>
    </div>
  </div>
  `;

  return output;
};

const attachButtonHandlers = () => {
  $(".button").on("click", (e) => {
    const $this = $(e.currentTarget);

    if ($this.hasClass("active")) {
      return;
    }

    const gameKey = $this.attr("data-key");
    const gameAction = $this.attr("data-action");
    updateAttendance(gameKey, userObj.uid, gameAction);

    // Update the attendance object for this game
    // Also update your own games list
    if (gameAction === 'attending') {
      console.log('pushing', userObj);

      // use the current users object from the all user object, caue it has the first_name
      // you can index the current user with the uid
      attendanceObject[gameKey].push(allUsersObj[userObj.uid][globalPersonIdentifier]);
      usersCompleteDataObject.attending[gameKey] = true;
      usersCompleteDataObject.absent[gameKey] = false;
      usersCompleteDataObject.uncertain[gameKey] = false;

    } else if (gameAction === 'absent') {
      console.log(allUsersObj[userObj.uid], globalPersonIdentifier);
      const userIndex = attendanceObject[gameKey].indexOf(allUsersObj[userObj.uid][globalPersonIdentifier]);
      if (userIndex !== -1) {
        attendanceObject[gameKey].splice(userIndex, 1);
      }
    }

    // Update MyGames
    updateMyGames(gameAction, gameKey);
    updateGameAttendanceTriggerValue(gameKey);

    if (! $this.hasClass("active")) {
      $this.addClass("active").removeClass("inactive");
      $this.siblings('button').addClass("inactive").removeClass("active");
    }
  });
};

const updateGameAttendanceTriggerValue = (gameKey) => {
  const attendValue = attendanceObject[gameKey].length;
  $(`h3.game-attendance-trigger[data-game="${gameKey}"]`).text(`${attendValue} Attending - View Players`);
};

const attachMyGamesHandler = () => {
  $("#my-games").on("click", () => {
    showModal('#my-games-modal');
  });
};

const attachMyProfileHandler = () => {
  $("#my-profile").on("click", () => {
    showModal('#my-profile-modal');
  });
};

const attachProfileFormHandler = () => {
  // Fill in the values for the current profile if it exists 
  // It may not exist yet for that first time as the cloud function runs

  if (usersCompleteDataObject) {
    const $profileForm = $("#profile-form");
    $profileForm.children("input#first_name").val(usersCompleteDataObject.first_name);
    $profileForm.children("input#last_name").val(usersCompleteDataObject.last_name);
    $profileForm.children("input#phone").val(usersCompleteDataObject.phone);
    $profileForm.children("input#jerseyno").val(usersCompleteDataObject.jerseyno);
  }
  // Form handler
  $("#profile-form").on("submit", function(e){
    e.preventDefault();

    const formArray = $(this).serializeArray();
    const profileObj = {};

    for (const fieldObj of formArray) {
      profileObj[fieldObj.name] = fieldObj.value;
    }

    db.ref(`users/${userObj.uid}`).update(profileObj)
    .then(() => {
      console.log("profile updated successfully", usersCompleteDataObject);
    })
    .catch((e) => {
      console.log("profile updated failed", e);
    });
  })
};

const attachGameAttendanceHandler = () => {
  $(".game-attendance-trigger").on("click", (e) => {
    const $this = $(e.currentTarget);
    const gameKey = $this.attr("data-game");

    const game = attendanceObject[gameKey];
    console.log(game);
    const $attendingList = $('#game-attendance-container > .players-list > .attending-list');
    $attendingList.empty();
    for (const player of game) {
      const htmlStr = `<li data-game=${gameKey} data-status=attending>${player}</li>`;

      const htmlObj = $.parseHTML(htmlStr);

      $attendingList.append(htmlObj);
    }

    showModal('#game-attendance-modal');

    currentGameAttendanceListIndex = gameKey.split("_")[1];
  });
};

const showModal = (selector) => {
  const $modal = $(selector);
    
  $modal.css("display", "block");

  $(".close-modal").on("click", ()=> { 
    $modal.css("display", "none")
  });

  const modal = document.getElementById(selector.split("#")[1]);

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
};

const attachLogoutHandler = () => {
  $('#logout-link').on("click", () => {
    firebase.auth().signOut().then(function() {
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
  db.ref(`users/${uid}/${gameAction}`).update(trueUserObject);

  const statusIndex = statuses.indexOf(gameAction);
  statuses.splice(statusIndex, 1);

  for (const falseAction of statuses) {
    db.ref(`users/${uid}/${falseAction}`).update(falseUserObject);
  }

  // Update the games
  const trueGameObject = {};
  const falseGameObject = {};

  trueGameObject[uid] = true;
  falseGameObject[uid] = false;

  db.ref(`games/${gameIndex}/${gameAction}`).update(trueGameObject);

  for (const falseAction of statuses) {
    db.ref(`games/${gameIndex}/${falseAction}`).update(falseGameObject);
  }
};

const getUserGamesStatus = () => {
  return db.ref(`users/${userObj.uid}`).on("value", (snapshot) => {
    usersCompleteDataObject = snapshot.val();
  });
};

const getGameAttendance = () => {
  for (const key in gamesOnLoad) {
    attendanceObject[key] = [];
    const gameAttendingObject = gamesOnLoad[key].attending;

    const gameAttendingTrueObject = Object.keys(gameAttendingObject).reduce((p, c) => {    
      if (gameAttendingObject[c] === true) p[c] = gameAttendingObject[c];
      return p;
    }, {});

    for (const uid in gameAttendingTrueObject) {
      let playerIdentifier;
      if ("first_name" in allUsersObj[uid]) {
        playerIdentifier = allUsersObj[uid].first_name;
      } else {
        playerIdentifier = allUsersObj[uid].email
      }
      attendanceObject[key].push(playerIdentifier);
    }
  }
};

const getAllPlayers = () => {
  return db.ref(`users/`).on("value", (snapshot) => {
    allUsersObj = snapshot.val();
  });
};

const initMyGames = () => {
  if (! usersCompleteDataObject) {
    // this block handles the case where a new user signs up and there isn't a usersCompleteDataObject yet 
    // just append all the games as uncertain in their my games
    // you can use gamesOnLoad cause it should be available before initMyGames fires
    for (const gameKey in gamesOnLoad) {
      $('#my-games-container > .games-uncertain > .uncertain-list').append(
        createMyGameElement(gameKey, "uncertain")
      );
    }
  } else {
    const { attending, absent, uncertain } = usersCompleteDataObject;
  
    for (const gameKey in attending) {
      if (attending[gameKey]) {
        $('#my-games-container > .games-attending > .attending-list').append(
          createMyGameElement(gameKey, "attend")
        );
      }
    }
  
    for (const gameKey in absent) {
      if (absent[gameKey]) {
        $('#my-games-container > .games-absent > .absent-list').append(
          createMyGameElement(gameKey, "absent")
        );
      }
    }
  
    for (const gameKey in uncertain) {
      if (uncertain[gameKey]) {
        $('#my-games-container > .games-uncertain > .uncertain-list').append(
          createMyGameElement(gameKey, "uncertain")
        );
      }
    }
  }
};

const updateMyGames = (status, gameKey) => {
  const $attendingList = $('#my-games-container > .games-attending > .attending-list');
  const $absentList = $('#my-games-container > .games-absent > .absent-list');
  const $uncertainList = $('#my-games-container > .games-uncertain > .uncertain-list');
  let indexOfInterest;

  switch(status) {
    case "attending":
      indexOfInterest = 0;
      break;
    case "absent":
      indexOfInterest = 1
      break;
    case "uncertain":
      indexOfInterest = 2;
    default:
      indexOfInterest = -1;
  }

  // Order matters here
  const allLists = [$attendingList, $absentList, $uncertainList];

  for (const [idx, list] of allLists.entries()) {
    list.find(`[data-game="${gameKey}"]`).remove();

    if (indexOfInterest === idx) {
      list.append(createMyGameElement(gameKey, status));
    }
  }
};

// Specifically returns a <li> element for game attendance
const createMyGameElement = (game_key, status) => {
  const gameDate = gamesOnLoad[game_key].date;
  const gameNumber = game_key.split("_")[1];
  const htmlStr = `<li data-game=${game_key} data-status=${status}>G${gameNumber} - ${gameDate}</li>`;

  return $.parseHTML(htmlStr);
};

const init  = () => {
  // let userObj; // global user object to be used
  auth.onAuthStateChanged(async function(user) {
    if (user) {
      userObj = user;
      console.log(userObj);
      getAllPlayers();
      await getUserGamesStatus();
      await showGames();

    } else {
      // No user is signed in.
      window.location.replace('login.html')
    }
  });
  attachMyProfileHandler();
  attachMyGamesHandler();
  attachLogoutHandler();
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
