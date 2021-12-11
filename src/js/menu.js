"use strict";
/* eslint-disable no-undef */
const fs = require('fs');
const account = JSON.parse(fs.readFileSync('./data/account.json'));
const username = account["username"];

let process = document.querySelectorAll(".process");
for (let i = 0; i < process.length; i++) {
   process[i].innerHTML = process[i].innerHTML.replaceAll("{username}", `<span class="highlight">${username}</span>`);
}

document.getElementById("play-button").addEventListener("click", () => {
   window.location.href = "./play.html";
});

document.getElementById("stats-button").addEventListener("click", () => {
   window.location.href = "./stats.html";
});

document.getElementById("settings-button").addEventListener("click", () => {
   window.location.href = "./settings.html";
});

if (username === "admin") {
   const player = new Audio('../audio/secret.mp3');
   player.play();
   setInterval(() => {
      player.currentTime = 0;
   }, 2600);

   for (let i = 0; i < process.length; i++) {
      process[i].innerHTML = process[i].innerHTML.replaceAll("admin", `coconut mall'd`);
   }
}
