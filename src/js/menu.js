"use strict";
/* eslint-disable no-undef */
const fs = require('fs');
const account = JSON.parse(fs.readFileSync('./data/account.json'));
const username = account["username"];

let process = document.querySelectorAll(".process");
for (let i = 0; i < process.length; i++) {
   process[i].innerHTML = process[i].innerHTML.replaceAll("{username}", username);
}
