"use strict";
/* eslint-disable no-undef */
// Define the constants
const hue = document.querySelector("#hue");
const elo = document.querySelector("#elo");
const dynamic_elo = document.querySelector("#dynamic-elo");
const options = JSON.parse(fs.readFileSync("./data/settings.json"));

// Save options on back button click
document.querySelector("#back-button")
.addEventListener("click", () => {
   fs.writeFileSync("./data/settings.json", JSON.stringify(options));
   window.location.href = "./menu.html";
});

// Update the settings
hue.value = options["hue"];
elo.value = options["elo"];
dynamic_elo.checked = options["dynamic_elo"];

// Save a numeric settings
function saveNumeric(field, type, min, max) {
   let value = Number.parseInt(field.value);

   // Keep hue in bounds
   if (value < min) {
      value = min;
   } else if (value > max) {
      value = max;
   } else if (!value) {
      value = min;
   }

   // Update setting
   field.value = value;
   options[type] = value;
   fs.writeFileSync("./data/settings.json", JSON.stringify(options));
   return value;
}

// Save setting
function saveBoolean(field, type) {
   let value = field.checked;
   console.log(field.checked);

   // Update setting
   field.value = value;
   options[type] = value;
   fs.writeFileSync("./data/settings.json", JSON.stringify(options));
}

// Change application hue on settings change
hue.addEventListener("change", () => {
   let value = saveNumeric(hue, "hue", 0, 360);
   root.style.setProperty("--hue", value);
});

// Change elo on settings change
elo.addEventListener("change", () => {
   saveNumeric(elo, "elo", 0, 3400);
});

// Change dynamic elo on setting change
dynamic_elo.addEventListener("change", () => {
   saveBoolean(dynamic_elo, "dynamic_elo");
});

// Secret if the hue label is clicked
document.querySelector("#hue-label").addEventListener("click", () => {
   // Random integer from 0 to 360
   const value = Math.floor(Math.random() * 361);
   hue.value = value;
   options["hue"] = value;
   root.style.setProperty("--hue", value);
   fs.writeFileSync("./data/settings.json", JSON.stringify(options));
});

// Secret when the user is named "Chroma", "Rainbow", or "Colors"
if (["chroma", "rainbow", "colors"]
.includes(
JSON.parse(fs.readFileSync('./data/account.json'))["username"].toLowerCase()
)) {
   // Update hue every x miliseconds
   var up = true;
   setInterval(() => {
      if (up) {
         // Hue is going up
         hue.value++;
         root.style.setProperty("--hue", hue.value);
         options["hue"] = hue.value;
         if (hue.value >= 360) {
            // Make hue go down
            hue.value = 360;
            up = false;
         }
      } else {
         // Hue is going down
         hue.value--;
         root.style.setProperty("--hue", hue.value);
         options["hue"] = hue.value;
         if (hue.value <= 0) {
            // Make hue go up
            hue.value = 0;
            up = true;
         }
      }
   }, 20);
}
