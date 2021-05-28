let gamesOnLoad; // Global object for games
let usersCompleteDataObject; // Global object for the current user's list of games and statuses
let userObj; // global user object to be used
let attendanceObject = {}; // global for players statuses
let currentGameAttendanceListIndex = -1;

const showGames = () => {
  let output = "";
  let isInitialLoad = true;
  return db.ref("games/").on("value", (snapshot) => {
    if (! isInitialLoad) {
      return;
    }
    // const games = snapshot.val();
    gamesOnLoad = snapshot.val();
    console.log("GAMES ON LOAD", gamesOnLoad);

    // Calling this first so we can get the number of players to render the html
    getGameAttendance();

    for (const key in gamesOnLoad) {
      const game = gamesOnLoad[key];
      const date = game.date;
      const time = game.time;
      const rink = game.rink;
      const team = game.team;
      const gameNumber = game.gameNumber;

      let currentGameStatus = "uncertain";

      if (usersCompleteDataObject.attending[key]) {
        currentGameStatus = "attending";
      }

      if (usersCompleteDataObject.absent[key]) {
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

      const attendingPlayersOfGame = attendanceObject[key].length;

      output += `
          <div class="card" data-game=${gameNumber}>
            <div class="card--game-info">
              <h4 class="game-number">${gameNumber}</h4>
              <h2>Date: ${date}</h2>
              <h2>Time: ${time}</h2>
              <h2>Rink: ${rink}</h2>
              <h2>${team} Team</h2>
              <h3 data-game=${key} class="game-attendance-trigger">${attendingPlayersOfGame} Attending - View Players</h3>
            </div>
            <div class="button-container" >
              <button data-game=${gameNumber} data-key=${key} data-action="attending" class="${attendingButtonClasses}">In!</button>
              <button data-game=${gameNumber} data-key=${key} data-action="absent" class="${absentButtonClasses}">Out</button>
            </div>
          </div>`;
    }

    const container = document.querySelector(".container");
    container.innerHTML = output;

    attachButtonHandlers();
    updateMyGames();
    attachProfileFormHandler();
    attachGameAttendanceHandler();
    isInitialLoad = false;
  });
};

const attachButtonHandlers = () => {
  console.log("Attaching button handlers", usersCompleteDataObject);
  $(".button").on("click", (e) => {
    const $this = $(e.currentTarget);

    const gameKey = $this.attr("data-key");
    const gameAction = $this.attr("data-action");
    updateAttendance(gameKey, userObj.uid, gameAction);

    if (! $this.hasClass("active")) {
      $this.addClass("active").removeClass("inactive");
      $this.siblings('button').addClass("inactive").removeClass("active");
    }
  });
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
  // Fill in the values for the current profile 
  const $profileForm = $("#profile-form");
  $profileForm.children("input#first_name").val(usersCompleteDataObject.first_name);
  $profileForm.children("input#last_name").val(usersCompleteDataObject.last_name);
  $profileForm.children("input#phone").val(usersCompleteDataObject.phone);
  $profileForm.children("input#jerseyno").val(usersCompleteDataObject.jerseyno);
  // Form handler
  $("#profile-form").on("submit", function(e){
    e.preventDefault();

    console.log("submitted");
    console.log($(this).serializeArray());
    const formArray = $(this).serializeArray();
    const profileObj = {};

    for (const fieldObj of formArray) {
      profileObj[fieldObj.name] = fieldObj.value;
    }

    console.log(profileObj);
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

    if (gameKey === "game_" + currentGameAttendanceListIndex) {
      showModal('#game-attendance-modal');
    } else {
      const game = attendanceObject[gameKey];
      console.log("GAME", game);
      const $attendingList = $('#game-attendance-container > .players-list > .attending-list');
      $attendingList.empty();
      for (const player of game) {
        const htmlStr = `<li data-game=${gameKey} data-status=attending>${player}</li>`;
  
        const htmlObj = $.parseHTML(htmlStr);
  
        $attendingList.append(htmlObj);
      }

      showModal('#game-attendance-modal');

      currentGameAttendanceListIndex = gameKey.split("_")[1];
    }
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
      db.ref(`users/${uid}/email`).on("value", (snapshot) => {
        const email = snapshot.val();
        attendanceObject[key].push(email);
      });
    }
  }

  console.log("ATTENDANCE OBJECT", attendanceObject);
};

const updateMyGames = () => {
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
