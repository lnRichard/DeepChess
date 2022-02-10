"use strict";
/* eslint-disable no-undef */
const evaluation_field = document.getElementById("evaluation");
const elo_mod_field = document.getElementById("elo_mod");
const turn_history_field = document.getElementById("history");
const turn_history_container = document.getElementById("history_container");

// Augment DOM
Element.prototype.remove = function () {
	this.parentElement.removeChild(this);
}

NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
	for (var i = this.length - 1; i >= 0; i--) {
		if (this[i] && this[i].parentElement) {
			this[i].parentElement.removeChild(this[i]);
		}
	}
}

// Add hint button functionality
document.getElementById("hint-button").addEventListener("click", function () {
	if (!ai_moving && !ai_hint && !freeze) {
		if (game.turn() === 'w') {
			console.log("[!] Generating AI Hint");
			analysis_mode();
			ai_hint = true;
			stockfish.postMessage("go depth 15");
			return
		}
	}

	// Error
	console.log("[!] Error: AI is already moving or hinting");
});

// Add back button functionality
document.getElementById("back-button").addEventListener("click", () => {
	if (document.getElementById("back-button").innerHTML === "Forfeit") {
		let stats = JSON.parse(fs.readFileSync("./data/stats.json"));
		stats["losses"] += 1;
		fs.writeFileSync("./data/stats.json", JSON.stringify(stats));
	}
	window.location.href = "./menu.html";
});

// List possible names for the AIs
let names = ["Niek", "Richard", "Jeremiah"];
let process = document.querySelectorAll(".process");
for (let i = 0; i < process.length; i++) {
	const name = names[Math.floor(Math.random() * names.length)];
	process[i].innerHTML = process[i].innerHTML.replaceAll("{enemy}", `<span class="highlight">${name}</span>`);
}

// Add promotion handling
document.getElementById("promotion").addEventListener("change", function () {
	promotion = this.value;
});


// GET STOCKFISH STATS

// Get ELO of the user
function get_elo() {
	let elo = JSON.parse(fs.readFileSync("./data/stats.json"))["elo"]
	return (elo <= 0 ) ? 0 : elo;
}

// Get skill level of the user
function get_skill_level() {
	let skill_level = parseInt(get_elo() / 100.0);
	return (skill_level <= 0) ? 1 : skill_level;
}

// Get depth
function get_depth() {
	let depth = (parseInt(get_elo() / 500.0));
	return (depth <= 0) ? 1 : depth;
}

// Get move time
function get_movetime() {
	let time = get_elo() / 1000.0;
	return (time <= 0) ? 1 : time;
}

// Get multipv
function get_multipv() {
	return 10 + (get_depth() * 10);
}


// STOCKFISH AI VARS

// Stockfish
var promotion = 'q';
var stockfish = new Worker("../../node_modules/stockfish/src/stockfish.js");
var eval_history = [];
var freeze = false;
var ai_moving = false;
var ai_hint = false;
var last_player_move = null;
var latest_turn = null;
var turn_history = [];
var turn_id = 0;

// Updates stockfish's parameters
function update_stockfish() {
	stockfish.postMessage("setoption name UCI_LimitStrength value true");
	stockfish.postMessage("setoption name Skill Level value " + get_skill_level());
	stockfish.postMessage("setoption name UCI_Elo value " + parseInt(get_elo()));
	stockfish.postMessage("setoption name MultiPV value " + get_multipv());
	console.log("[!] Updated stockfish with parameters: ", {
		"Skill Level": get_skill_level(),
		"MultiPV": get_multipv(),
		"UCI_Elo": parseInt(get_elo())
	});
	freeze = false; // Late update
}

// Changes stockfish in analysis mode
function analysis_mode() {
	updateFen()
	freeze = true; // Early update
	stockfish.postMessage("setoption name UCI_LimitStrength value false");
	stockfish.postMessage("setoption name Skill Level value 20");
	stockfish.postMessage("setoption name MultiPV value 1");
}

// Update user elo
function add_elo(amount) {
	// Add elo
	let elo = (get_elo() + amount);
	let stats = JSON.parse(fs.readFileSync("./data/stats.json"));
	stats["elo"] = elo;
	fs.writeFileSync("./data/stats.json", JSON.stringify(stats));

	// Update stockfish with new parameters
	update_stockfish();
}

// Modify field
function modify_field_highlight(field, value) {
	if (value >= 0) {
		field.classList.add("positive");
		field.classList.remove("negative");
	} else {
		field.classList.add("negative");
		field.classList.remove("positive");
	}
}

// Update turn history
function update_turn_history(turn) {
	turn_id += 1;
	turn_history.push(turn);
	let positive = (get_elo_mod(turn_id) >= 0)

	turn_history_field.innerHTML += /*html*/`
	<div class="turn" id="turn-${turn_id}"><span>${turn_id}. </span>
		AI: <span class=${positive ? "negative" : "positive"}>${turn["AI"]["FROM"]} -> ${turn["AI"]["TO"]}</span>
		<br>
		Player: <span class=${positive ? "positive" : "negative"}>${turn["PLAYER"]["FROM"]} -> ${turn["PLAYER"]["TO"]}</span>
	</div>
	`

	turn_history_container.scrollTo(turn_history_container.scrollLeft + 1000, 0);
	for (let i = 1; i < (turn_id + 1); i++) {
		document.getElementById(`turn-${i}`).onclick = () => { turn_back_turn(i); }
	}

	console.log("[!] Updated turn history: ", turn);
}

// Gets the elo mod of a turn
function get_elo_mod(turn) {
	let elo_mod = 0;
	if (turn - 2 >= 0) {
		elo_mod = eval_history[(turn - 1)] - eval_history[(turn - 2)];
	} else if (turn - 1 >= 0) {
		elo_mod = eval_history[(turn - 1)];
	} else {
		elo_mod = 0;
	}
	return elo_mod;
}

// Remove eval
function remove_latest_eval() {
	eval_history.pop();

	// Revert evaluations
	let new_eval = 0
	if (eval_history.length - 1 >= 0) {
		new_eval = (Math.round(eval_history[eval_history.length - 1] * 100) / 100);
	} else {
		new_eval = 0
	}

	// Revert elo modifications
	let elo_mod = get_elo_mod(eval_history.length);

	// Update fields
	evaluation_field.innerHTML = new_eval
	modify_field_highlight(evaluation_field, new_eval);
	elo_mod_field.innerHTML = (elo_mod >= 0 ? "+" : "") + (Math.round(elo_mod * 100) / 100);
	modify_field_highlight(elo_mod_field, elo_mod);
	add_elo(-elo_mod)
}

// Turn back turn
// eslint-disable-next-line no-unused-vars
function turn_back_turn(turn) {
	if (ai_moving || ai_hint || freeze) {
		console.log("[!] Cannot back turn while AI is moving or hinting");
		return
	}

	// Back turn
	console.log("\n[!] Backing turn to: ", turn);
	for (let i = turn_id; i >= turn; i--) {
		// Log reversions
		turn_id -= 1;
		let turn = turn_history.pop(); // TODO: Modify to dict when using multiple branches
		console.log("[!] Revering move: " + i);
		console.log(`[*] {PLAYER} FROM: ${turn["PLAYER"]["FROM"]} (${turn["PLAYER"]["FROM_PIECE"]}) TO: ${turn["PLAYER"]["TO"]} (${turn["PLAYER"]["TO_PIECE"]})`);
		console.log(`[*] {AI} FROM: ${turn["AI"]["FROM"]} (${turn["AI"]["FROM_PIECE"]}) TO: ${turn["AI"]["TO"]} (${turn["AI"]["TO_PIECE"]})`);

		// Revert player move
		game.put(turn["PLAYER"]["FROM_PIECE"], turn["PLAYER"]["FROM"]);
		if (turn["PLAYER"]["TO_PIECE"]) {
			game.put(turn["PLAYER"]["TO_PIECE"], turn["PLAYER"]["TO"]);
		} else {
			game.remove(turn["PLAYER"]["TO"]);
		}

		// Revert AI move
		game.put(turn["AI"]["FROM_PIECE"], turn["AI"]["FROM"]);
		if (turn["AI"]["TO_PIECE"]) {
			game.put(turn["AI"]["TO_PIECE"], turn["AI"]["TO"]);
		} else {
			game.remove(turn["AI"]["TO"]);
		}

		// Update game state
		document.getElementById(`turn-${i}`).remove();
		remove_latest_eval();
		updateFen();
		checkEnd();
	}
}

// Get piece type
function piece_from(pos) {
	return game.get(pos) ? game.get(pos) : null;
}


// AI MOVE HANDLING

// Load the stockfish engine
stockfish.postMessage("uci");
stockfish.postMessage("setoption name Use NNUE value true");

// Define stockfish's brain
stockfish.onmessage = function (event) {
	// AI MOVE
	if (event.data.includes("bestmove")) {
		// Start move
		if (ai_moving) {
			setTimeout(() => {
				try {
					// Check for game over
					var possibleMoves = game.moves()
					if (possibleMoves.length === 0) return

					// Fetch move and type of the piece
					const move = event.data.split(" ")[1];
					const from = move.substring(0, 2);
					const to = move.substring(2, 4);
					const convert = move.substring(5, 5);
					let type;

					// Get type
					if (!convert) {
						type = game.get(move.substring(0, 2))["type"].toUpperCase();
					} else {
						type = convert.toUpperCase();
					}

					// Make the move
					let from_piece = piece_from(from);
					let to_piece = piece_from(to);
					console.log("[!] AI MOVE: " + from + " -> " + to);
					game.remove(from);
					game.put({type: type, color: "b"}, to);

					// Update game state
					updateFen();
					swapTurn();
					checkEnd();

					// Update turn history display
					latest_turn = {
						"PLAYER": last_player_move,
						"AI": {
							"FROM": from,
							"TO": to,
							"FROM_PIECE": from_piece,
							"TO_PIECE": to_piece,
							"PROMOTION": type,
						}
					}

					// Analysis
					analysis_mode();
					stockfish.postMessage("eval depth 15");

					// Update state
					ai_moving = false
				} catch (ex) {
					// Retry
					stockfish.postMessage("go depth " + get_depth());
				}
			}, 500);
		} else if (ai_hint) {
			// Check for game over
			var possibleMoves = game.moves()
			if (possibleMoves.length === 0) return

			// Fetch move and type of the piece
			const move = event.data.split(" ")[1];
			const from = move.substring(0, 2);
			const to = move.substring(2, 4);
			highlightSquareHint(from)
			highlightSquareHint(to)
			console.log("[!] AI HINT: " + from + " -> " + to);
			update_stockfish()

			// Update state
			ai_hint = false;
		}

	// AI EVALUATION
	} else if (event.data.includes("Final evaluation")) {
		let evaluation = parseFloat(event.data.replaceAll("Final evaluation       ", "").replaceAll(" (white side)", ""));
		let elo_mod = 0

		// Process evaluation
		if (eval_history.length > 0) {
			if (!isNaN(evaluation)) {
				let turn_evaluation = (evaluation - eval_history[eval_history.length - 1]);
				console.log("[*] Turn Evaluation: " + turn_evaluation + " {white}");
				elo_mod = turn_evaluation
			} else {
				console.log("[*] Turn Evaluation: 0 {white}");
				evaluation = eval_history[eval_history.length - 1];
				elo_mod = 0;
			}
		} else {
			elo_mod = evaluation
		}

		// Add elo to player
		console.log("[*] Evaluation: " + evaluation + " {white}");
		evaluation_field.innerHTML = (Math.round(evaluation * 100) / 100);
		modify_field_highlight(evaluation_field, evaluation);
		elo_mod_field.innerHTML = (elo_mod >= 0 ? "+" : "") + (Math.round(elo_mod * 100) / 100);
		modify_field_highlight(elo_mod_field, elo_mod);
		add_elo(elo_mod)
		eval_history.push(evaluation);

		// Update turn
		update_turn_history(latest_turn);
	}
}


// CHESS SETTINGS

const $ = require('jquery');
const Chess = require('chess.js').Chess;
let board = null;
let game = new Chess();

// Highlight
let whiteSquareHighlight = '#a9a9a9';
let blackSquareHighlight = '#696969';
let whiteRedSquareHighlight = '#b59b9b';
let blackRedSquareHighlight = '#785959';

// Hint highlight
let whiteSquareHighlightHint = '#ffcccc';
let blackSquareHighlightHint = '#cc9999';
let whiteRedSquareHighlightHint = '#b08f8f';
let blackRedSquareHighlightHint = '#7f5353';


// CHESS FUNCTIONS

// Change active player
function swapTurn() {
	let tokens = game.fen().split(" ");
	tokens[1] = game.turn() === "b" ? "w" : "b";
	tokens[3] = "-";
	game.load(tokens.join(" "));
}

// Update game board
function updateFen() {
	stockfish.postMessage("position fen " + game.fen());
	board.position(game.fen());
}

// Remove highlighted squares
function removeHighlightSquares() {
	$('#chessboard .square-55d63').css('background', '');
}

// Highlight a square
function highlightSquareHint(square) {
	let $square = $('#chessboard .square-' + square);

	// Get the square
	let background = whiteSquareHighlightHint;
	if ($square.hasClass('black-3c85d')) {
		background = blackSquareHighlightHint;
	}

	// Update the background
	if (game.get(square) && game.get(square).color === 'b') {
		if (background === whiteSquareHighlightHint) {
			background = whiteRedSquareHighlightHint;
		} else {
			background = blackRedSquareHighlightHint;
		}
	}

	$square.css('background', background)
}

// Highlight a square
function highlightSquare(square) {
	let $square = $('#chessboard .square-' + square);

	// Get the square
	let background = whiteSquareHighlight;
	if ($square.hasClass('black-3c85d')) {
		background = blackSquareHighlight;
	}

	// Update the background
	if (game.get(square) && game.get(square).color === 'b') {
		if (background === whiteSquareHighlight) {
			background = whiteRedSquareHighlight;
		} else {
			background = blackRedSquareHighlight;
		}
	}

	$square.css('background', background)
}

// Drag piece
function onDragStart(source, piece) {
	// do not pick up pieces if the game is over
	if (game.game_over() || freeze || ai_moving || ai_hint) return false

	// or if it's not that side's turn
	if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
		(game.turn() === 'b')) {
		return false
	}
}

// Drop piece
let firstMove = true;
function onDrop(source, target) {
	removeHighlightSquares()

	// Set last player move
	last_player_move = { "FROM": source, "TO": target, "FROM_PIECE": piece_from(source), "TO_PIECE": piece_from(target), "PROMOTION": promotion };

	// see if the move is legal
	let move = game.move({
		from: source,
		to: target,
		promotion: promotion
	});

	// illegal move
	if (move === null) return 'snapback'

	// Check if the first move was made
	if (firstMove) {
		document.getElementById("back-button").innerHTML = "Forfeit";
		firstMove = false;
	}

	// AI move
	setTimeout(function () { // TODO: Integrate AI and remove Timeout
		makeAIMove();
	}, 500);
	checkEnd();
}

// Mouse over square
function onMouseoverSquare(square, piece) {
	// get list of possible moves for this square
	let moves = game.moves({
		square: square,
		verbose: true
	});

	// exit if there are no moves available for this square
	if (moves.length === 0) return

	// or if it's not that side's turn
	if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
		(game.turn() === 'b')) {
		return false
	}

	// highlight the square they moused over
	highlightSquare(square)

	// highlight the possible squares for this piece
	for (let i = 0; i < moves.length; i++) {
		highlightSquare(moves[i].to)
	}
}

// Mouse moves out a square
function onMouseoutSquare() {
	removeHighlightSquares()
}

// Place a new piece
function onSnapEnd() {
	updateFen();
}

// AI Makes a new move
function makeAIMove() {
	// Make the move
	ai_moving = true
	console.log("\n[!] Generating with parameters: ", {
		"Depth": get_depth(),
		"Movetime": get_movetime(), // 0.01 is good for me to test
	});

	// Generate move
	setTimeout(() => {
		// TODO: Use movetime along side depth
		stockfish.postMessage(`go depth ${get_depth()}`);
	}, 1000);
}

// The game ends
function checkEnd() {
	if (game.game_over()) {
		// Game is over
		let stats = JSON.parse(fs.readFileSync("./data/stats.json"));
		document.getElementById("back-button").innerHTML = "Return";
		if (game.turn() === 'w') {
			$("#bottom-note").html("<h3 class='highlight'>You lose D:</h3>");
			stats["losses"] += 1;
		} else {
			$("#bottom-note").html("<h3 class='highlight'>You win :D</h3>");
			stats["wins"] += 1;
		}
		fs.writeFileSync("./data/stats.json", JSON.stringify(stats));
	} else {
		// Game is not over
		if (game.turn() === 'w') {
			$("#bottom-note").html(`<h3 class='highlight'>Your turn</h3>`);
		} else {
			$("#bottom-note").html("<h3 class='highlight'>Their turn</h3>");
		}
	}
}

// Game config
var config = {
	draggable: true,
	position: 'start',
	onDragStart: onDragStart,
	onDrop: onDrop,
	onMouseoutSquare: onMouseoutSquare,
	onMouseoverSquare: onMouseoverSquare,
	onSnapEnd: onSnapEnd
}

// Start the game by creating the board
board = Chessboard('chessboard', config)

// TODO: Add move time mechanic
// TODO: Balance AI difficulty
// TODO: Add full evaluation of board
// TODO: Give player hints based on the full evaluation of the board
// TODO: Show text hints on the screen, next to the board
// TODO: Timer for the game and AI
// TODO: Save and load games
// TODO: Turning back turns
// TODO: Defining starting positions/puzzles
// TODO: Custom AI difficulty, outside of it automatically adjusting
// TODO: Add bar on top of page, where you can go back to previous turns
// TODO: Allow branching in bar, by keeping different turn tracks
// TODO: Ability to get list of best moves instead of only the best move3
// TODO: Add opening display, where you can try different openings
// TODO: Protect app from security vulnerabilities
// TODO: Show arrows based on pawn moves on the board
// TODO: Show what pieces are attacking each other for the current position
// TODO: Visualize current game rating as a progress bar (White v.s. Black)
// TODO: Try to rationalize the AI, by showing the next few move the hint would make as well
// TODO: Show moves towards check by M1, M2, etc.
// TODO: Find move variations, and show them on the board