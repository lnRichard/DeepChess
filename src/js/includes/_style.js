
"use strict";
/* eslint-disable no-undef */
// eslint-disable-next-line no-unused-vars
const $ = require('jquery');
const root = document.documentElement;
const fs = require("fs");
var settings = JSON.parse(fs.readFileSync("./data/settings.json"));

// Update the hue property of the css
root.style.setProperty("--hue", settings["hue"]);
