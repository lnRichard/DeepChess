"use strict";
/* eslint-disable no-undef, no-unused-vars */


// IMPORTS

// Node imports
const Chess = require('chess.js').Chess;


// CONFIGS

// Game Config
const logging = true;
const settingsFilePath = "./data/settings.json";
const errorPrefix = "[!] An error occurred:";
const game = new Chess();
const chessboard = {
   // Chessboard.js
   draggable: true,
   position: 'start',
   onDragStart: onDragStart,
   onDrop: onDrop,
   onMouseoutSquare: onMouseOutSquare,
   onMouseoverSquare: onMouseOverSquare,
   onSnapEnd: onSnapEnd
};
$("#back-button").on("click", function () {
   window.location.href = "./menu.html";
});
$("#promotion").on("change", function () {
   piecePromotion = this.value;
});
$("#hint-button").on("click", function () {
   generateHint();
});
$("#gradient-button").on("click", function () {
   toggleGradient();
});
$(".game-hint").on("click", function () {
   $(".game-hint").remove();
});

// Chessboard Config
const board = Chessboard('chessboard', chessboard);

// User Config
var piecePromotion = 'q';
var gradientDisplay = false;

// Highlight Config
const whiteSquareHighlight = '#a9a9a9';
const blackSquareHighlight = '#696969';
const whiteRedSquareHighlight = '#978fb0';
const blackRedSquareHighlight = '#625978';

// Hint highlight Config
const whiteSquareHighlightHint = '#cce2ff';
const blackSquareHighlightHint = '#99b0cc';
const whiteRedSquareHighlightHint = '#978fb0';
const blackRedSquareHighlightHint = '#625978';

// Stockfish Config
const stockfish = new Worker("../../node_modules/stockfish/src/stockfish.js");
const stockfishMoveDelay = 1000; // ms
const stockfishGenerationDelay = 500; // ms
var isStockfishPlaying = false;
var isStockfishHinting = false;

// Board evaluation
var boardEval = defaultBoardEval();
var isBoardEval = false;
var isBoardEvalSkipLine = true;
var boardEvalLineCount = 8;

// Chess turn history
var chessTurnHistory = [];
var chessTurn = 0;

// Piece evaluation
var pieceEval = defaultPieceEval();


// PRECONFIG

// Update ELO
$("#stockfish-elo").html(`${JSON.parse(fs.readFileSync(settingsFilePath))["elo"].toFixed(0)}`);


// UTILITY FUNCTIONS

function log() {
   // Log a console message if logging is enabled
   if (!logging) return;
   console.log.apply(console, arguments);
}

function updateGameFen() {
   // Update stockfish fen
   stockfish.postMessage("position fen " + game.fen());

   // Update board fen
   board.position(game.fen());
}

function isStockfishActive(piece = '') {
   // Check if it is the stockfish turn
   return (((game.turn() == 'w' && (piece ? piece.search(/^b/) : -1) !== -1) || game.turn() === 'b') || isStockfishPlaying)
}

function lineToLetter(line) {
   // Convert a line number to a letter
   return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][line]
}

function clamp(value, min, max) {
   return Math.min(Math.max(value, min), max)
}

function percentageToColor(percentage, maxHue = 120, minHue = 0) {
   const hue = clamp(percentage * (maxHue - minHue) + minHue, minHue, maxHue);
   return `hsl(${hue}, 50%, 50%)`;
}

function toggleGradient() {
   // Toggle the gradient display
   gradientDisplay = !gradientDisplay;
   if (gradientDisplay) {
      appendGradient();
   } else {
      removeSquareHighlights()
   }
}

function appendGradient() {
   // Append a gradient to the board
   for (const key in boardEval) {
      const squareEval = clamp(boardEval[key], -20, 20) + 20;
      const percentage = squareEval / 40;

      if (game.get(key) && game.get(key)["type"] === "k") {
         if (game.get(key)["color"] === 'w') $(`.square-${key}`).css("background-color",
            percentageToColor(pieceEval["King safety"]["mg_white"] + pieceEval["King safety"]["eg_white"] - pieceEval["King safety"]["mg_black"] - pieceEval["King safety"]["eg_black"] + 0.5)
         );
         else if (game.get(key)["color"] === 'b') $(`.square-${key}`).css("background-color",
            percentageToColor(pieceEval["King safety"]["mg_black"] + pieceEval["King safety"]["eg_black"] - pieceEval["King safety"]["mg_white"] - pieceEval["King safety"]["eg_white"] + 0.5)
         );
         continue;
      } else if (percentage == 0.5) continue;
      $(`.square-${key}`).css("background-color", percentageToColor(percentage));
   }
}

// STOCKFISH FUNCTIONS

function enableStockfishMoveMode() {
   // Set different parameters for stockfish (https://github.com/official-stockfish/Stockfish)
   stockfish.postMessage("setoption name UCI_LimitStrength value true");
   stockfish.postMessage("setoption name Skill Level value " + getSkillLevel());
   stockfish.postMessage("setoption name UCI_Elo value " + Number.parseInt(getElo()));
   stockfish.postMessage("setoption name MultiPV value " + GetMultiPV());
   log("[!] Updated stockfish with parameters: ", {
      "skill_level": getSkillLevel(),
      "multi_pv": GetMultiPV(),
      "uci_elo": Number.parseInt(getElo())
   });
}

function enableStockfishAnalysisMode() {
   // Set analysis parameters
   stockfish.postMessage("setoption name UCI_LimitStrength value false");
   stockfish.postMessage("setoption name Skill Level value 20");
   stockfish.postMessage("setoption name MultiPV value 5");
}

// TODO: Balance this function
function getElo() {
   // Returns the player's elo
   const elo = JSON.parse(fs.readFileSync(settingsFilePath))["elo"]
   return (elo <= 0) ? 0 : elo;
}

// TODO: Balance this function
function getSkillLevel() {
   // Calculates the skill level stockfish should play at
   const skillLevel = Number.parseInt(getElo() / 100);
   return (skillLevel <= 0) ? 1 : skillLevel;
}

// TODO: Balance this function
function getDepth() {
   // Calculates the depth stockfish should search
   const depth = Number.parseInt(getElo() / 500);
   return (depth <= 0) ? 1 : depth;
}

// TODO: Balance this function
function getMoveTime() {
   // Calculates the amount of time stockfish gets to think
   const time = getElo() / 1000 - 0.01;
   return (time <= 0) ? -1 : time;
}

// TODO: Balance this function
function GetMultiPV() {
   // Calculates how many moves stockfish generates
   const multiPV = getDepth() * 10 + 10
   return (multiPV <= 0) ? 1 : multiPV;
}

function addElo(amount) {
   // Add an amount to the player's elo
   const settings = JSON.parse(fs.readFileSync(settingsFilePath));
   if (!settings["dynamic_elo"]) return;

   // Fetch elo
   let elo = (getElo() + amount);
   if (elo < 0) elo = 0;

   // Update settings
   $("#stockfish-elo").html(`${elo.toFixed(0)}`);
   settings["elo"] = elo;
   fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
}

function getEloChange(evaluation) {
   // Check if history is valid
   const historyLength = chessTurnHistory.length - 1;
   if (historyLength <= 0) return evaluation, 0;

   // Calculate elo change
   let eloChange = 0;
   if (Number.isNaN(evaluation)) {
      // Evaluation is invalid
      evaluation = chessTurnHistory[historyLength - 1]["eval"]["eval"];
   } else {
      // Evaluation is valid
      eloChange = (evaluation - chessTurnHistory[historyLength - 1]["eval"]["eval"]);
   }

   // Return evaluation and elo change
   return { "evaluation": evaluation, "eloChange": eloChange };
}


// CHESSBOARD FUNCTIONS

function defaultBoardEval() {
   // Reset board rating back to default
   return {
      "a1": 0, "a2": 0, "a3": 0, "a4": 0, "a5": 0, "a6": 0, "a7": 0, "a8": 0,
      "b1": 0, "b2": 0, "b3": 0, "b4": 0, "b5": 0, "b6": 0, "b7": 0, "b8": 0,
      "c1": 0, "c2": 0, "c3": 0, "c4": 0, "c5": 0, "c6": 0, "c7": 0, "c8": 0,
      "d1": 0, "d2": 0, "d3": 0, "d4": 0, "d5": 0, "d6": 0, "d7": 0, "d8": 0,
      "e1": 0, "e2": 0, "e3": 0, "e4": 0, "e5": 0, "e6": 0, "e7": 0, "e8": 0,
      "f1": 0, "f2": 0, "f3": 0, "f4": 0, "f5": 0, "f6": 0, "f7": 0, "f8": 0,
      "g1": 0, "g2": 0, "g3": 0, "g4": 0, "g5": 0, "g6": 0, "g7": 0, "g8": 0,
      "h1": 0, "h2": 0, "h3": 0, "h4": 0, "h5": 0, "h6": 0, "h7": 0, "h8": 0,
   };
}

function defaultPieceEval() {
   return {
      "Pawns": 0,
      "Knights": 0,
      "Bishops": 0,
      "Rooks": 0,
      "Queens": 0,
      "Mobility": 0,
      "King safety": 0,
      "Threats": 0,
      "Passed": 0,
      "Space": 0,
   }
}

function handleMoveEnd() {
   // Start the next turn
   if (isStockfishPlaying) swapActivePlayer();
   if (game.game_over()) return false
   $("#bottom-note").html(`<h3 class='highlight'>${game.turn() === 'w' ? "Your" : "Their"} turn</h3>`);
   return true
}

function updateChessTurnHistory() {
   // Update the chess turn history
   chessTurnHistory[chessTurn] = {
      "fen": {},
      "white_move": {},
      "black_move": {},
      "eval": {},
      "board_eval": {},
      "piece_eval": {},
   };
}

function startFirstChessTurn() {
   updateChessTurnHistory();
   chessTurnHistory[chessTurn]["white_move"] = undefined;
   chessTurnHistory[chessTurn]["black_move"] = undefined;
   chessTurnHistory[chessTurn]["eval"] = { "eval": 0, "elo_change": 0 };
   chessTurnHistory[chessTurn]["board_eval"] = $.extend(true, {}, boardEval);
   chessTurnHistory[chessTurn]["piece_eval"] = $.extend(true, {}, pieceEval);
   startNextChessTurn();
}

function getLabel(value) {
   if (value < 0) return "negative"
   return (value == 0) ? "neutral" : "positive";
}

function buildChessTurnHTML(chessTurn) {
   return /*html*/`
      <div class='chess-turn' id='chess-turn-${chessTurn}'>
         <span class='chess-turn-field turn-number'>
            <span class='chess-turn-label turn-number-label'>TURN</span>: ${chessTurn}
         </span><br>
         <span class='chess-turn-field white-move'>
            <span class='chess-turn-label white-move-label'>White</span>: ${chessTurnHistory[chessTurn]["white_move"]["from"] ?? "None"} ${chessTurnHistory[chessTurn]["black_move"]["to"] ?? "None"}
         </span>
         <span class='chess-turn-field black-move'>
            | <span class='chess-turn-label black-move-label'>Black</span>: ${chessTurnHistory[chessTurn]["black_move"]["from"] ?? "None"} ${chessTurnHistory[chessTurn]["black_move"]["to"] ?? "None"}
         </span><br>
         <span class='chess-turn-field eval'>
            <span class='chess-turn-label eval-label ${getLabel(chessTurnHistory[chessTurn]["eval"]["eval"])}'>Eval</span>: ${chessTurnHistory[chessTurn]["eval"]["eval"].toFixed(2)}
         </span>
         <span class='chess-turn-field elo-change'>
            | <span class='chess-turn-label elo-change-label ${getLabel(chessTurnHistory[chessTurn]["eval"]["elo_change"])}'>Turn Eval</span>: ${chessTurnHistory[chessTurn]["eval"]["elo_change"].toFixed(2)}
         </span>
      </div>
   `;
}

function updateChessTurnDisplay(currentTurn) {
   // Update the chess turn display
   if (currentTurn <= 0) return;
   $("#moves").append(buildChessTurnHTML(currentTurn));

   // Scroll down to new turn
   $("#container-right").scrollTop($("#container-right")[0].scrollHeight);
   $("#moves").scrollTop($("#moves")[0].scrollHeight);

   // Add automatic revert move to div
   $(`#chess-turn-${currentTurn}`).on("click", function () {
      // Revert the move
      console.log(chessTurn > currentTurn, !isStockfishActive())
      if (!isStockfishActive()) {
         moveToTurn(currentTurn - 1);
      }
   });
}

function addAlert(type, attribute, future, key) {
   const alertKey = `${attribute.replaceAll(' ', '').toLowerCase()}-${future}-${key.toLowerCase()}`;
   if ($(`#${alertKey}`).length > 0) return;
   $("#alerts").append(/*html*/`
   <div class='alert' id='${alertKey}'>
      <span class='alert-attribute ${type}'>${attribute}</span>&nbsp;
      <span class='alert-${future}'>${future}</span>&nbsp;
      <span class='alert-key'>${key}</span>&nbsp;
      <span class='alert-eval'>eval</span>&nbsp;
   </div>`);
}

function updateEvaluationDisplay(chessTurn) {
   // Update the evaluation display
   // Clear alerts div
   $("#alerts").html("");

   // Fetch piece evaluation
   for (const key of Object.keys(pieceEval)) {
      const pieceEval = chessTurnHistory[chessTurn]["piece_eval"][key];

      // Midgame evaluation
      if (pieceEval["mg_white"] - pieceEval["mg_black"] > 0.5) addAlert("very-positive", "Very strong", "midgame", key);
      else if (pieceEval["mg_white"] - pieceEval["mg_black"] > 0.2) addAlert("positive", "Strong", "midgame", key);
      else if (pieceEval["mg_white"] - pieceEval["mg_black"] < -0.2) addAlert("negative", "Weak", "midgame", key);
      else if (pieceEval["mg_white"] - pieceEval["mg_black"] < -0.5) addAlert("very-negative", "Very weak", "midgame", key);

      // Endgame evaluation
      if (pieceEval["eg_white"] - pieceEval["eg_black"] > 0.5) addAlert("very-positive", "Very strong", "endgame", key);
      else if (pieceEval["eg_white"] - pieceEval["eg_black"] > 0.2) addAlert("positive", "Strong", "endgame", key);
      else if (pieceEval["eg_white"] - pieceEval["eg_black"] < -0.2) addAlert("negative", "Weak", "endgame", key);
      else if (pieceEval["eg_white"] - pieceEval["eg_black"] < -0.5) addAlert("very-negative", "Very weak", "endgame", key);
   }
}

function startNextChessTurn() {
   // Set fen of turn
   chessTurnHistory[chessTurn]["fen"] = game.fen();
   log("[!] Last chess turn:", chessTurnHistory[chessTurn]);
   updateChessTurnDisplay(chessTurn);
   updateEvaluationDisplay(chessTurn);
   updateBoardElo($("#board-elo-square").html());

   // Update new chess turn
   chessTurn += 1;
   updateChessTurnHistory();
   updateGameFen();

   // Update gradient display
   if (gradientDisplay) {
      removeSquareHighlights();
      appendGradient();
   }
}

function moveToTurn(turn) {
   // Check if turn is valid
   if (chessTurnHistory.length === 0 || turn < 0 || turn >= chessTurnHistory.length - 1 || isStockfishActive()) return;

   // Update chess turn
   chessTurn = turn;
   game.load(chessTurnHistory[chessTurn]["fen"]);

   if (chessTurn > 0) {
      boardEval = chessTurnHistory[chessTurn]["board_eval"];
      pieceEval = chessTurnHistory[chessTurn]["piece_eval"];
   } else {
      boardEval = defaultBoardEval();
      pieceEval = defaultPieceEval();
   }

   // Update Display
   for (let index = chessTurnHistory.length; index > turn - 1; index--) {
      $(`#chess-turn-${index}`).remove();
   }

   // Remove all dedundant chessTurnHistory
   // TODO: Replace this with branching turn history
   const targetTurn = chessTurnHistory[turn];
   chessTurnHistory = turn >= 0 ? chessTurnHistory.slice(0, turn) : [];

   // Reset board state
   chessTurnHistory[turn] = targetTurn;

   // Start next turn
   startNextChessTurn();
   log("[!] Moved to turn:", turn, chessTurnHistory);
}

function swapActivePlayer() {
   // Parse fen data and swap active player
   const tokens = game.fen().split(" ");
   tokens[1] = game.turn() === "b" ? "w" : "b";
   tokens[3] = "-";
   game.load(tokens.join(" "));
}

function setActivePlayer(color) {
   // Parse fen data and swap active player
   const tokens = game.fen().split(" ");
   tokens[1] = color;
   tokens[3] = "-";
   game.load(tokens.join(" "));
}

function removeSquareHighlights() {
   $('#chessboard .square-55d63').css('background', '');
}

function highlightSquare(square) {
   // Fetch the square element
   const $square = $("#chessboard .square-" + square);

   // Fetch the background
   let background = $square.hasClass('black-3c85d') ? blackSquareHighlight : whiteSquareHighlight;

   // Check if the square is an opponent's piece
   if (game.get(square) && game.get(square).color === 'b') {
      background = background === whiteSquareHighlight ? whiteRedSquareHighlight : blackRedSquareHighlight;
   }

   // Update the square's background
   $square.css('background', background)
}

function hightlightSquareHint(square) {
   // Fetch the square element
   const $square = $("#chessboard .square-" + square);

   // Fetch the background
   let background = $square.hasClass('black-3c85d') ? blackSquareHighlightHint : whiteSquareHighlightHint;

   // Check if the square is an opponent's piece
   if (game.get(square) && game.get(square).color === 'b') {
      background = background === whiteSquareHighlightHint ? whiteRedSquareHighlightHint : blackRedSquareHighlightHint;
   }

   // Update the square's background
   $square.css('background', background)
}

function onDragStart(source, piece) {
   // Check if the game has ended
   if (game.game_over()) return false;

   // Check if it's not the active player's turn
   if (isStockfishActive(piece)) return false;
}

function onDrop(source, target) {
   // Check if stockfish is playing
   if (isStockfishActive()) return 'snapback';

   // Check if the move is legal
   let move = game.move({
      from: source,
      to: target,
      promotion: piecePromotion
   });

   // Check if the move is legal
   if (move === null) return 'snapback';

   // Check if the next turn can start
   if (!handleMoveEnd()) return 'snapback';

   // Update move history
   chessTurnHistory[chessTurn]["white_move"] = { from: source, to: target };

   // Remove square highlighting
   removeSquareHighlights();

   // Make stockfish move
   startStockfishTurn();

   // Update gradient display
   if (gradientDisplay) {
      highlightSquare(source)
      boardEval[source] = 0;
   }
}

function updateBoardElo(square) {
   // Update board elo
   $("#board-elo-square").html(square);
   $("#board-elo").html(boardEval[square]);

   // Toggle class
   $("#board-elo").removeClass("neutral positive negative");
   if (boardEval[square] > 0) $("#board-elo").addClass("positive");
   else if (boardEval[square] < 0) $("#board-elo").addClass("negative");
   else if (boardEval[square] == 0) $("#board-elo").addClass("neutral");
}

function onMouseOverSquare(square, piece) {
   // Update board elo
   updateBoardElo(square);

   // Get all possible moves for this square
   const moves = game.moves({
      square: square,
      verbose: true
   });

   // Exit if no valid moves
   if (moves.length <= 0) return false;

   // Exit if it's not the active player's turn
   if (isStockfishActive(piece)) return false;

   // Highlight the current square
   highlightSquare(square);

   // Highlight all possible moves
   for (const move of moves) {
      highlightSquare(move.to);
   }
}

function onMouseOutSquare() {
   // Remove all highlights
   removeSquareHighlights()
   if (gradientDisplay) appendGradient();
}

function onSnapEnd() {
   // Update game fen
   updateGameFen();
}


// AI FUNCTIONS

function startStockfishTurn() {
   isStockfishPlaying = true;
   removeSquareHighlights();

   // Update gradient display
   if (gradientDisplay) appendGradient();
   log("\n[!] Generating move with parameters:", {
      "depth": getDepth(),
      "move_time": getMoveTime(), // 0.01 is good for me to test
   });

   // Start stockfish move
   setTimeout(() => {
      stockfish.postMessage(`go depth ${getDepth()}` + ` movetime ${getMoveTime()}`);
   }, stockfishMoveDelay);
}

function handleStockfishMove(eventData) {
   setTimeout(() => {
      try {
         // Check for game over
         const possibleMoves = game.moves()
         if (possibleMoves.length === 0) return

         // Fetch move and type of the piece
         const move = eventData.split(" ")[1];
         const from = move.slice(0, 2);
         const to = move.slice(2, 4);
         const convert = move[4];

         // Get type
         let type = (convert) ? convert.toUpperCase() : game.get(move.slice(0, 2))["type"].toUpperCase();

         // Update chess turn history
         chessTurnHistory[chessTurn]["black_move"] = { from: from, to: to };

         // Make the move
         log("[!] AI MOVE: ", from, " -> ", to);
         game.remove(from);
         game.put({ type: type, color: "b" }, to);
         if (to == "e8") game.put({ type: "R", color: "b" }, "f8");
         else if (to === "c8") game.put({ type: "R", color: "b" }, "d8");

         // Update game fen
         updateGameFen();
         handleMoveEnd();

         // Generate board analysis
         enableStockfishAnalysisMode();
         stockfish.postMessage("eval depth 15");
      } catch (error) {
         // Retry stockfish move
         log(errorPrefix, error);
         stockfish.postMessage("go depth " + getDepth());
      }
   }, stockfishGenerationDelay);
}

function handleStockfishEvaluation(eventData) {
   try {
      // Fetch evaluation and elo change
      let eloChange = 0;
      let evaluation = Number.parseFloat(eventData.replaceAll("Final evaluation       ", "").replaceAll(" (white side)", ""));
      ({ evaluation, eloChange } = getEloChange(evaluation));

      // Generate evaluation
      log(`[*] Evaluation: ${evaluation} {white}`);
      log(`[*] Turn Evaluation: ${eloChange} {white}`);
      addElo(eloChange);

      // Update chess turn history
      chessTurnHistory[chessTurn]["eval"] = { "eval": evaluation, "elo_change": eloChange };

      // Update stockfish
      enableStockfishMoveMode();
      isStockfishPlaying = false;
   } catch (error) {
      // Retry stockfish evaluation
      setTimeout(() => {
         stockfish.postMessage("eval depth 15");
      }, 500);
      log(errorPrefix, error);
   }
}

function handleStockfishBoardEvaluation(eventData) {
   // Skip reduntant lines
   if (isBoardEvalSkipLine === true) {
      isBoardEvalSkipLine = false;
      return;
   }

   // Update parsed line
   log(`[*] BOARD EVAL ${boardEvalLineCount}:`, eventData)
   let boardEvalArray = eventData.split("|");

   // Update evaluation for each position
   for (let index = 1; index < (boardEvalArray.length - 1); index++) {
      boardEval[lineToLetter((index - 1)) + boardEvalLineCount] = Number.parseFloat(boardEvalArray[index]) ? Number.parseFloat(boardEvalArray[index]) : 0;
   }

   // Decrement line count
   boardEvalLineCount -= 1;

   // Check end
   if (boardEvalLineCount <= 0) {
      // Stop board evaluation
      isBoardEval = false;
      log("[*] BOARD EVAL END:", boardEval);

      // Update chess turn history
      chessTurnHistory[chessTurn]["board_eval"] = $.extend(true, {}, boardEval);
      return;
   }

   // Skip next line
   isBoardEvalSkipLine = true;
}

function parsePieceEval(eventData, white = true) {
   // Parse the line
   let splitEval = eventData.split("|")[(white) ? 2 : 3].trim();

   // Returns the split values
   return [
      Number.parseFloat(splitEval.replaceAll("  ", " ").split(" ")[0].trim()),
      Number.parseFloat(splitEval.replaceAll("  ", " ").split(" ")[1].trim())
   ];
}

function handleStockfishPieceEvaluation(eventData, key) {
   // Fetch evaluations
   let [mg_white, eg_white] = parsePieceEval(eventData, true);
   let [mg_black, eg_black] = parsePieceEval(eventData, false);

   // Update fields
   log(`[*] PIECE EVAL ${key}:`, { "mg_white": mg_white, "eg_white": eg_white, "mg_black": mg_black, "eg_black": eg_black });
   pieceEval[key] = { "mg_white": mg_white, "eg_white": eg_white, "mg_black": mg_black, "eg_black": eg_black };

   // Update chess turn history
   chessTurnHistory[chessTurn]["piece_eval"][key] = { "mg_white": mg_white, "eg_white": eg_white, "mg_black": mg_black, "eg_black": eg_black };
}

function handleStockfishHint(eventData) {
   // Update stockfish status
   try {
      // Check for game over
      const possibleMoves = game.moves()
      if (possibleMoves.length === 0) return

      // Fetch move and type of the piece
      const move = eventData.split(" ")[1];
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);

      // Highlight the move
      hightlightSquareHint(from)
      hightlightSquareHint(to)
      console.log("[!] AI HINT: " + from + " -> " + to);

      // Update state
      isStockfishHinting = false;
      isStockfishPlaying = false;
      enableStockfishMoveMode();
   } catch (error) {
      // Retry stockfish move
      log(errorPrefix, error);
      stockfish.postMessage("go depth 10");
   }
}

function generateHint() {
   // Update state
   isStockfishHinting = true;
   isStockfishPlaying = true;

   // Generate hint
   enableStockfishAnalysisMode();
   setTimeout(() => {
      stockfish.postMessage("go depth 10");
   }, 100);
}


// STOCKFISH LOGIC

// Initialize stockfish
stockfish.postMessage("uci");
stockfish.postMessage("setoption name Use NNUE value true");
enableStockfishMoveMode();
startFirstChessTurn();

function stockfishErrorFallback() {
   // Reset turn to default state
   isStockfishHinting = false;
   isStockfishPlaying = false;
   setActivePlayer("w");
   moveToTurn(chessTurn - 1);
   removeSquareHighlights();
   if (gradientDisplay) appendGradient();
}

var _DEBUG_THROW_ERROR = false; // TODO: Remove
// Listen for stockfish messages
stockfish.addEventListener("message", function (event) {
   try {
      if (isStockfishHinting || !isStockfishPlaying) return;
      if (_DEBUG_THROW_ERROR) throw new Error("[!] DEBUG: Stockfish error");

      // Check for stockfish move
      if (event.data.includes("bestmove")) {
         // Stockfish returned a move
         handleStockfishMove(event.data);
      } else if (event.data.includes("Final evaluation")) {
         // Stockfish returned an evaluation
         handleStockfishEvaluation(event.data);
         startNextChessTurn();
      } else if (event.data.includes("NNUE derived piece values")) {
         // Start the board evaluation
         isBoardEval = true;
         isBoardEvalSkipLine = true;
         boardEvalLineCount = 8;
      } else if (isBoardEval && event.data.includes("|")) {
         handleStockfishBoardEvaluation(event.data);
      } else {
         // Fetch piece evaluation
         for (const key of Object.keys(pieceEval)) {
            if (event.data.includes(key)) {
               // Calculate piece evaluation
               handleStockfishPieceEvaluation(event.data, key);
            }
         }
      }
   } catch (error) {
      log(errorPrefix, error);
      stockfishErrorFallback();
   }
});

// Listen for stockfish messages
stockfish.addEventListener("message", function (event) {
   try {
      if (!isStockfishHinting || !isStockfishPlaying) return;

      // Check for stockfish move
      if (event.data.includes("bestmove")) {
         // Stockfish returned a move
         handleStockfishHint(event.data);
      }
   } catch (error) {
      log(errorPrefix, error);
      stockfishErrorFallback();
   }
});
