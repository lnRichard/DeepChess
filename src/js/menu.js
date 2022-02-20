"use strict";
/* eslint-disable no-undef */
const account = JSON.parse(fs.readFileSync('./data/account.json'));
const username = account["username"];

// Parse gretting
let greeting = document.querySelector("#greeting");
greeting.innerHTML = `Hello <span class="highlight">${username}</span>`;

// Go to play page
document.querySelector("#play-button")
.addEventListener("click", () => {
   window.location.href = "./play.html";
});

// Go to settings page
document.querySelector("#settings-button").addEventListener("click", () => {
   window.location.href = "./settings.html";
});

// Secret if username is "admin"
if (username.toLowerCase() === "admin") {
   const player = new Audio('../audio/secret.mp3');
   player.play();
   setInterval(() => {
      fs.writeFileSync("./data/account.json", "{}");
      player.pause();
      window.close()
   }, 2700);

   // Coconut Mall the user
   document.body.innerHTML = "<main><h1>Get Coconut Mall'd</h1><img src='./img/secret.gif'></main>";
}
