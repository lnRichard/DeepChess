"use strict";
/* eslint-disable no-undef */
document.getElementById("back-button").addEventListener("click", () => {
   window.location.href = "./menu.html";
});

const json = JSON.parse(fs.readFileSync('./data/stats.json'));
let pr = document.querySelectorAll(".process");
for (let i = 0; i < pr.length; i++) {
   pr[i].innerHTML = pr[i].innerHTML.replaceAll("{elo}", `<span class="highlight">${json["elo"]}</span>`);
}
