"use strict";
/* eslint-disable no-undef */
const root = document.documentElement;
const fs = require("fs");
var settings = JSON.parse(fs.readFileSync("./data/settings.json"));

// Update the hue property of the css
root.style.setProperty("--hue", settings["hue"]);
