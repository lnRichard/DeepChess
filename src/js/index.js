"use strict";
/* eslint-disable no-undef */
// Parse any possible requests
const request = {};
const pairs = location.search.slice(1).split('&');
for (const pair_ of pairs) {
   const pair = pair_.split('=');
   request[pair[0]] = pair[1];
}

// Handles the user login sequence
function handleLogin() {
   // Check if a username and password has been entered
   if ((request["username"] == undefined) && (request["password"] == undefined)) return;

   // Fetch username and password
   const username = decodeURIComponent(request["username"]);
   const password = decodeURIComponent(request["password"]);

   // Update input fields
   $("#username").val(username);
   $("#password").val(password);

   // Check if the username and password are valid
   if (!/^\w+$/.test(username)) {
      $("#error").html("Invalid username; please do not use special characters");
   } else if (username.length > 16) {
      $("#error").html("Username too long; please shorten to 16 characters");
   } else if (username.length < 3) {
      $("#error").html("Username too short; please lengthen to 3 characters");
   } else if (password.length > 128) {
      $("#error").html("Password too long; please shorten to 128 characters");
   } else if (password.length < 8) {
      $("#error").html("Password too short; please lengthen to 8 characters");
   } else {
      // Login the user
      const json_request = JSON.stringify(request);
      fs.writeFileSync("./data/account.json", json_request);
      window.location.href = "./menu.html"; // * * Go to menu.html * *
   }
} handleLogin();
