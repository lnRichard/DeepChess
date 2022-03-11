"use strict";
/* eslint-disable no-undef */
// Define the constants
const hue = $("#hue");
const elo = $("#elo");
const dynamicElo = $("#dynamic-elo");
const darkMode = $("#dark-mode");
const settingsPath = "./data/settings.json";
const options = JSON.parse(fs.readFileSync(settingsPath));
const { nativeTheme } = require('@electron/remote')

// Save options on back button click
$("#back-button").on("click", () => {
   fs.writeFileSync(settingsPath, JSON.stringify(options));
   window.location.href = "./menu.html";
});

// Update the settings
$(hue).val(options.hue);
$(elo).val(options.elo);
$(dynamicElo).prop("checked", options.dynamic_elo);
$(darkMode).prop("checked", options.dark_mode);

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
   fs.writeFileSync(settingsPath, JSON.stringify(options));
   return value;
}

// Save setting
function saveBoolean(field, type) {
   let value = field.checked;
   console.log(field.checked);

   // Update setting
   field.value = value;
   options[type] = value;
   fs.writeFileSync(settingsPath, JSON.stringify(options));
   return value;
}

// Change application hue on settings change
document.querySelector("#hue")
   .addEventListener("change", () => {
      let value = saveNumeric(document.querySelector("#hue"), "hue", 0, 360);
      root.style.setProperty("--hue", value);
   });

// Change elo on settings change
document.querySelector("#elo")
   .addEventListener("change", () => {
      saveNumeric(document.querySelector("#elo"), "elo", 0, 3400);
   });

// Change dynamic elo on setting change
document.querySelector("#dynamic-elo")
   .addEventListener("change", () => {
      saveBoolean(document.querySelector("#dynamic-elo"), "dynamic_elo");
   });

// Change dark mode on setting change
document.querySelector("#dark-mode")
   .addEventListener("change", () => {
      const value = saveBoolean(document.querySelector("#dark-mode"), "dark_mode");
      nativeTheme.themeSource = (value) ? "dark" : "light";
   });

// Secret if the hue label is clicked
$("#hue-label").on("click", () => {
   // Random integer from 0 to 360
   const value = Math.floor(Math.random() * 361);
   hue.val(value);
   options.hue = value;
   root.style.setProperty("--hue", value);
   fs.writeFileSync(settingsPath, JSON.stringify(options));
});

// Secret when the user is named "Chroma", "Rainbow", or "Colors"
if (["chroma", "rainbow", "colors"]
   .includes(
      JSON.parse(fs.readFileSync('./data/account.json')).username.toLowerCase()
   )) {
   // Update hue every x miliseconds
   var up = true;
   setInterval(() => {
      if (up) {
         // Hue is going up
         hue.val(hue.val() + 1);
         root.style.setProperty("--hue", hue.val());
         options.hue = hue.val();
         if (hue.val() >= 360) {
            // Make hue go down
            hue.val(360);
            up = false;
         }
      } else {
         // Hue is going down
         hue.val(hue.val() - 1);
         root.style.setProperty("--hue", hue.val());
         options.hue = hue.val();
         if (hue.val() <= 0) {
            // Make hue go up
            hue.val(0);
            up = true;
         }
      }
   }, 20);
}
