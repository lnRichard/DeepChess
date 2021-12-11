"use strict";
/* eslint-disable no-undef */
const fs = require('fs');
document.getElementById("back-button").addEventListener("click", () => {
   window.location.href = "./menu.html";
});

const json = JSON.parse(fs.readFileSync('./data/stats.json'));
let process = document.querySelectorAll(".process");
for (let i = 0; i < process.length; i++) {
   process[i].innerHTML = process[i].innerHTML.replaceAll("{wins}", `<span class="highlight">${json["wins"]}</span>`);
   process[i].innerHTML = process[i].innerHTML.replaceAll("{losses}", `<span class="highlight">${json["losses"]}</span>`);
   process[i].innerHTML = process[i].innerHTML.replaceAll("{elo}", `<span class="highlight">${json["elo"]}</span>`);
}
