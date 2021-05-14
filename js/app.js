const showGames = () => {
  let output = "";
  db.ref("games/").on("value", (snapshot) => {
    const games = snapshot.val();
    console.log(games);

    for (const key in games) {
      const game = games[key];
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
              <button data-game=${gameNumber} class="neutral button button--accept">In!</button>
              <button data-game=${gameNumber} class="neutral button button--decline">Out</button>
            </div>
          </div>`;
    }

    const container = document.querySelector(".container");
    container.innerHTML = output;

    attachButtonHandlers();
  });
};

const attachButtonHandlers = () => {
  console.log("Attaching button handlers");
  $(".button").on("click", (e) => {
    const $this = $(e.currentTarget);

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

const getUsers = () => {
  console.log("about to get users");
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
  showGames();
  attachLogoutHandler();

  getUsers();
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
