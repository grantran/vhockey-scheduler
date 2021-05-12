const showGames = () => {
  let output = "";
  db.ref("games/").on("value", (snapshot) => {
    const games = snapshot.val();

    games.forEach(
      ({ date, time, rink, team, gameNumber }) => {
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

        const container = document.querySelector(".container");
        container.innerHTML = output;
      }
    );
  });
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
