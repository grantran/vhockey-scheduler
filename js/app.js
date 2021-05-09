const container = document.querySelector(".container");
const games = [
  {
    date: "Wednesday September 1st 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 11
  },
  {
    date: "Friday September 17th 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 12
  },
  {
    date: "Saturday October 2nd 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 13
  },
  {
    date: "Tuesday October 11th 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 14
  },
  {
    date: "Sunday October 31st 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 15
  },
  {
    date: "Monday November 8th 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 16
  },
  {
    date: "Thursday November 25th 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 17
  },
  {
    date: "Wednesday December 15th 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 18
  },
  {
    date: "Saturday December 25th 2021",
    time: "8PM",
    rink: 4,
    team: "Away",
    gameNumber: 19
  },
];
const showGames = () => {
  let output = "";
  games.forEach(
    ({ date, time, rink, team, gameNumber }) =>
      (output += `
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
              </div>
              `)
  );
  container.innerHTML = output;
};

const attachButtonHandlers = () => {
  console.log("Attaching button handlers");
  $(".button").on("click", (e) => {
    console.log("Click");
    console.log($(e.currentTarget).attr('data-game'));

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

const init  = () => {
  showGames();
  attachButtonHandlers();
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
