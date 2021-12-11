"use strict";
/* eslint-disable no-undef */
document.getElementById("back-button").addEventListener("click", () => {
   window.location.href = "./menu.html";
});

var names = ["Niek", "Richard", "Jeremiah"];
let process = document.querySelectorAll(".process");
for (let i = 0; i < process.length; i++) {
   const name = names[Math.floor(Math.random() * names.length)];
   process[i].innerHTML = process[i].innerHTML.replaceAll("{enemy}", `<span class="highlight">${name}</span>`);
}
