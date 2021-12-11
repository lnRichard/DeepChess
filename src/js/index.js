"use strict";
/* eslint-disable no-undef */
var request = {};
var pairs = location.search.substring(1).split('&');
for (var i = 0; i < pairs.length; i++) {
   var pair = pairs[i].split('=');
   request[pair[0]] = pair[1];
}

if (pair.length > 0) {
   if ((request["username"] != undefined) && (request["password"] != undefined)) {
      let username = decodeURIComponent(request["username"]);
      let password = decodeURIComponent(request["password"]);
      document.getElementById("username").value = username;
      document.getElementById("password").value = password;
      if (!username.match(/^\w+$/)) {
         document.getElementById("error").innerHTML = "Invalid username; please do not use special characters";
      } else if (username.length > 16) {
         document.getElementById("error").innerHTML = "Username too long; please shorten to 16 characters";
      } else if (username.length < 3) {
         document.getElementById("error").innerHTML = "Username too short; please lengthen to 3 characters";
      } else if (password.length > 128) {
         document.getElementById("error").innerHTML = "Password too long; please shorten to 128 characters";
      } else if (password.length < 8) {
         document.getElementById("error").innerHTML = "Password too short; please lengthen to 8 characters";
      } else {
         console.log("Logging in...");
         var json_request = JSON.stringify(request);
         fs.writeFileSync("./data/account.json", json_request);
         window.location.href = "./menu.html";
      }
   }
}
