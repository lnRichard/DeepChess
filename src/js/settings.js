"use strict";
/* eslint-disable no-undef */
document.getElementById("back-button").addEventListener("click", () => {
   window.location.href = "./menu.html";
});

var settings = JSON.parse(fs.readFileSync("./data/settings.json"));
document.getElementById("hue").value = settings["hue"];
document.getElementById("hue").addEventListener("change", () => {
   var value = parseInt(document.getElementById("hue").value);
   if (value < 0) {
      value = 0;
   } else if (value > 255) {
      value = 255;
   }

   document.getElementById("hue").value = value;
   settings["hue"] = value;
   root.style.setProperty("--hue", value);
   fs.writeFileSync("./data/settings.json", JSON.stringify(settings));
});
