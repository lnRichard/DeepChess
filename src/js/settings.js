"use strict";
/* eslint-disable no-undef */
const account = JSON.parse(fs.readFileSync('./data/account.json'));
const username = account["username"];
document.getElementById("back-button").addEventListener("click", () => {
   fs.writeFileSync("./data/settings.json", JSON.stringify(settings));
   window.location.href = "./menu.html";
});

const hue = document.getElementById("hue");
var settings = JSON.parse(fs.readFileSync("./data/settings.json"));
hue.value = settings["hue"];
hue.addEventListener("change", () => {
   var value = parseInt(hue.value);
   if (value < 0) {
      value = 0;
   } else if (value > 255) {
      value = 255;
   } else if (!value) {
      value = 0;
   }

   hue.value = value;
   settings["hue"] = value;
   root.style.setProperty("--hue", value);
   fs.writeFileSync("./data/settings.json", JSON.stringify(settings));
});

document.getElementById("hue-label").addEventListener("click", (e) => {
   // Random integer from 0 to 255
   const value = Math.floor(Math.random() * 256);
   hue.value = value;
   settings["hue"] = value;
   root.style.setProperty("--hue", value);
   fs.writeFileSync("./data/settings.json", JSON.stringify(settings));
});

if (["chroma", "rainbow", "colors"].includes(username.toLowerCase())) {
   var up = true;
   setInterval(() => {
      if (up) {
         hue.value++;
         root.style.setProperty("--hue", hue.value);
         settings["hue"] = hue.value;
         if (hue.value >= 255) {
            hue.value = 255;
            up = false;
         }
      } else {
         hue.value--;
         root.style.setProperty("--hue", hue.value);
         settings["hue"] = hue.value;
         if (hue.value <= 0) {
            hue.value = 0;
            up = true;
         }
      }
   }, 1);
}
