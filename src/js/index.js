"use strict";
/* eslint-disable no-undef */
// Parse any possible requests
var request = {};
var pairs = location.search.slice(1).split('&');
for (const pair_ of pairs) {
   var pair = pair_.split('=');
   request[pair[0]] = pair[1];
}

// Handles the user login sequence
function handleLogin() {
   // Check if a username and password has been entered
   if ((request["username"] == undefined) && (request["password"] == undefined)) return;

   // Fetch username and password
   let username = decodeURIComponent(request["username"]);
   let password = decodeURIComponent(request["password"]);

   // Update input fields
   document.querySelector("#username").value = username;
   document.querySelector("#password").value = password;

   // Check if the username and password are valid
   if (!/^\w+$/.test(username)) {
      document.querySelector("#error").innerHTML = "Invalid username; please do not use special characters";
   } else if (username.length > 16) {
      document.querySelector("#error").innerHTML = "Username too long; please shorten to 16 characters";
   } else if (username.length < 3) {
      document.querySelector("#error").innerHTML = "Username too short; please lengthen to 3 characters";
   } else if (password.length > 128) {
      document.querySelector("#error").innerHTML = "Password too long; please shorten to 128 characters";
   } else if (password.length < 8) {
      document.querySelector("#error").innerHTML = "Password too short; please lengthen to 8 characters";
   } else {
      // Login the user
      var json_request = JSON.stringify(request);
      fs.writeFileSync("./data/account.json", json_request);
      window.location.href = "./menu.html"; // * * Go to menu.html * *
   }
} handleLogin();
