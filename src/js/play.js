"use strict";
/* eslint-disable no-undef */
const evaluation_field = document.getElementById("evaluation");
const elo_mod_field = document.getElementById("elo-mod");
const turn_history_field = document.getElementById("history");
const turn_history_container = document.getElementById("history-container");
const type_2_eval = document.getElementById("type-2-eval");

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
var type_2_eval_active = false;
var type_2_eval_line = 8;
var type_2_eval_skip = true;
var type_2_eval_board = {};
reset_type_2_eval_board();

// Reset type 2 eval board
function reset_type_2_eval_board() {
	type_2_eval_board = {
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

// Convert line to letter
function line_to_letter(line) {
	return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][line]
}

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
	if (value > 0) {
		field.classList.add("positive");
		field.classList.remove("negative");
		field.classList.remove("neutral");
	} else if (value < 0) {
		field.classList.add("negative");
		field.classList.remove("positive");
		field.classList.remove("neutral");
	} else {
		field.classList.add("neutral");
		field.classList.remove("positive");
		field.classList.remove("negative");
	}
}

// Update field
function update_numeric_field(field_id, value) {
	let field = document.getElementById(field_id);
	field.innerHTML = Math.round(value * 100) / 100;
	if (value > 0) {
		field.classList.add("positive");
		field.classList.remove("negative");
		field.classList.remove("neutral");
	} else if (value < 0) {
		field.classList.add("negative");
		field.classList.remove("positive");
		field.classList.remove("neutral");
	} else {
		field.classList.add("neutral");
		field.classList.remove("positive");
		field.classList.remove("negative");
	}
}


// Update turn history
function update_turn_history(turn) {
	turn_id += 1;
	turn_history.push(turn);
	let positive = (get_elo_mod(turn_id) >= 0)
	let neutral = (get_elo_mod(turn_id) == 0)

	turn_history_field.innerHTML += /*html*/`
	<div class="turn" id="turn-${turn_id}"><span>${turn_id}. </span>
		AI: <span class=${neutral ? "neutral" : positive ? "negative" : "positive"}>${turn["AI"]["FROM"]} -> ${turn["AI"]["TO"]}</span>
		<br>
		Player: <span class=${neutral ? "neutral" : positive ? "positive" : "negative"}>${turn["PLAYER"]["FROM"]} -> ${turn["PLAYER"]["TO"]}</span>
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
	if ((ai_moving || ai_hint || freeze) && !game.game_over()) {
		console.log("[!] Cannot back turn while AI is moving or hinting");
		return
	}

	// Back turn
	$("#bottom-note").html("<h3 class='highlight'>Your turn</h3>");
	console.log("\n[!] Backing turn to: ", turn);
	for (let i = turn_id; i >= turn; i--) {
		// Log reversions
		turn_id -= 1;
		let turn = turn_history.pop();
		console.log("[!] Revering move: " + i);

		// Reset board
		type_2_eval_board = turn["PLAYER"]["EVAL_BOARD"];

		// Revert AI move
		if (!turn["AI"]["CASTLING"]) {
			console.log("[*] {AI} FROM: ", turn["AI"]["FROM"], turn["AI"]["FROM_PIECE"], " TO: ", turn["AI"]["TO"], turn["AI"]["TO_PIECE"]);
			if (turn["AI"]["TO_PIECE"]) {
				game.remove(turn["AI"]["TO"]);
				game.put(turn["AI"]["TO_PIECE"], turn["AI"]["TO"]);
			} else {
				game.remove(turn["AI"]["TO"]);
			}

			game.remove(turn["AI"]["FROM_PIECE"]);
			game.put(turn["AI"]["FROM_PIECE"], turn["AI"]["FROM"]);
		} else if (turn["AI"]["CASTLING"]) {
			if (turn["AI"]["CASTLING"] == "O-O") {
				console.log("[*] {AI} O-O");
				game.remove("g8");
				game.remove("f8");
				game.put({ type: "k", color: 'b' }, "e8");
				game.put({ type: "r", color: 'b' }, "h8");
			} else {
				console.log("[*] {AI} O-O-O");
				game.remove("b8");
				game.remove("c8");
				game.put({ type: "k", color: 'b' }, "e8");
				game.put({ type: "r", color: 'b' }, "a8");
			}
		}

		// Revert player move
		if (!turn["PLAYER"]["CASTLING"]) {
			console.log("[*] {PLAYER} FROM: ", turn["PLAYER"]["FROM"], turn["PLAYER"]["FROM_PIECE"], " TO: ", turn["PLAYER"]["TO"], turn["PLAYER"]["TO_PIECE"]);
			if (turn["PLAYER"]["TO_PIECE"]) {
				game.remove(turn["PLAYER"]["TO"]);
				game.put(turn["PLAYER"]["TO_PIECE"], turn["PLAYER"]["TO"]);
			} else {
				game.remove(turn["PLAYER"]["TO"]);
			}

			game.remove(turn["PLAYER"]["FROM_PIECE"]);
			game.put(turn["PLAYER"]["FROM_PIECE"], turn["PLAYER"]["FROM"]);
		} else if (turn["PLAYER"]["CASTLING"]) {
			if (turn["PLAYER"]["CASTLING"] == "O-O") {
				console.log("[*] {PLAYER} O-O");
				game.remove("g1");
				game.remove("f1");
				game.put({ type: "k", color: 'w' }, "e1");
				game.put({ type: "r", color: 'w' }, "h1");
			} else {
				console.log("[*] {PLAYER} O-O-O");
				game.put({ type: "k", color: 'w' }, "e1");
				game.put({ type: "r", color: 'w' }, "a1");
				game.remove("b1");
				game.remove("c1");
			}
		}

		// Update game state
		document.getElementById(`turn-${i}`).remove();
		remove_latest_eval();
		game.put(turn["AI"]["FROM_PIECE"], turn["AI"]["FROM"]);
		updateFen();
		checkEnd();
		ai_moving = false;
		if (game.turn() === 'b') {
			game.swapTurn()
		}
	}
}

// Get piece type
function piece_from(pos) {
	return game.get(pos)
}

// Type 1 eval
function parse_type1_eval(type1, type="Undefined") {
	let white_eval = type1.split("|")[2].trim();
	let black_eval = type1.split("|")[3].trim();
	let mg_white_eval = white_eval.replaceAll("  ", " ").split(" ")[0].trim();
	let eg_white_eval = white_eval.replaceAll("  ", " ").split(" ")[1].trim();
	let mg_black_eval = black_eval.replaceAll("  ", " ").split(" ")[0].trim();
	let eg_black_eval = black_eval.replaceAll("  ", " ").split(" ")[1].trim();

	// Update fields
	// console.log(`[*] White ${type} Evaluation: {MG: ` + mg_white_eval + ", EG: " + eg_white_eval + "}");
	// console.log(`[*] Black ${type} Evaluation: {MG: ` + mg_black_eval + ", EG: " + eg_black_eval + "}");
	if (mg_white_eval - mg_black_eval <= -0.25) {
		console.log(`[*] WARNING: Weak MG ${type} evaluation {${Math.round((mg_white_eval - mg_black_eval) * 100) / 100} < -0.25}`);
	} else if (mg_white_eval - mg_black_eval >= 0.25) {
		console.log(`[*] WARNING: Strong MG ${type} evaluation {${Math.round((mg_white_eval - mg_black_eval) * 100) / 100} > 0.25}`);
	}
	if (eg_white_eval - eg_black_eval <= -0.25) {
		console.log(`[*] WARNING: Weak EG ${type} evaluation {${Math.round((eg_white_eval - eg_black_eval) * 100) / 100} < -0.25}`);
	} else if (eg_white_eval - eg_black_eval >= 0.25) {
		console.log(`[*] WARNING: Strong EG ${type} evaluation {${Math.round((eg_white_eval - eg_black_eval) * 100) / 100} > 0.25}`);
	}

	return [parseFloat(mg_white_eval), parseFloat(eg_white_eval), parseFloat(mg_black_eval), parseFloat(eg_black_eval)]
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
					console.log("[!] AI MOVE: ", from, " -> ", to);
					game.remove(from);
					game.put({type: type, color: "b"}, to);

					// Update game state
					updateFen();
					swapTurn();

					// Set last player move
					let castling = null;
					if (from_piece["type"].toLowerCase() == "k") {
						if (to === "g1") {
							castling = "O-O";
							console.log("[*] Castling: O-O");
						} else if (to === "c1") {
							castling = "O-O-O";
							console.log("[*] Castling: O-O-O");
						}
					}

					// Update turn history display
					latest_turn = {
						"PLAYER": last_player_move,
						"AI": {
							"FROM": from,
							"TO": to,
							"FROM_PIECE": from_piece,
							"TO_PIECE": to_piece,
							"PROMOTION": type,
							"CASTLING": castling,
						}
					}

					// Analysis
					analysis_mode();
					stockfish.postMessage("eval depth 15");

					// Update state
					ai_moving = false
					checkEnd();
				} catch (ex) {
					// Retry
					stockfish.postMessage("go depth " + get_depth());
				}
			}, 500);
		} else if (ai_hint) {
			try {
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
			} catch(ex) {
				console.log("[!] AI HINT ERROR: " + ex)
				update_stockfish()
			}
		}

	// AI EVALUATION
	} else if (event.data.includes("Final evaluation")) {
		try {
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
		} catch (ex) {
			console.log("[!] AI EVAL ERROR: " + ex);
			eval_history.push(eval_history[eval_history.length - 1] ? eval_history[eval_history.length - 1] : 0);
			update_turn_history(latest_turn);
		}
	} else if (event.data.includes("Pawns")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Pawn");
		update_numeric_field("mg-pawn-strength", (w_mg - b_mg));
		update_numeric_field("eg-pawn-strength", (w_eg - b_eg));
	} else if (event.data.includes("Knights")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Knight");
		update_numeric_field("mg-knight-strength", (w_mg - b_mg));
		update_numeric_field("eg-knight-strength", (w_eg - b_eg));
	} else if (event.data.includes("Bishops")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Bishop");
		update_numeric_field("mg-bishop-strength", (w_mg - b_mg));
		update_numeric_field("eg-bishop-strength", (w_eg - b_eg));
	} else if (event.data.includes("Rooks")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Rook")
		update_numeric_field("mg-rook-strength", (w_mg - b_mg));
		update_numeric_field("eg-rook-strength", (w_eg - b_eg));
	} else if (event.data.includes("Queens")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Queen")
		update_numeric_field("mg-queen-strength", (w_mg - b_mg));
		update_numeric_field("eg-queen-strength", (w_eg - b_eg));
	} else if (event.data.includes("Mobility")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Mobility")
		update_numeric_field("mg-mobility", (w_mg - b_mg));
		update_numeric_field("eg-mobility", (w_eg - b_eg));
	} else if (event.data.includes("King safety")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "King safety")
		update_numeric_field("mg-king-safety", (w_mg - b_mg));
		update_numeric_field("eg-king-safety", (w_eg - b_eg));
	} else if (event.data.includes("Threats")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Threat")
		update_numeric_field("mg-threat", (w_mg - b_mg));
		update_numeric_field("eg-threat", (w_eg - b_eg));
	} else if (event.data.includes("Passed")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Passed")
		update_numeric_field("mg-passed", (w_mg - b_mg));
		update_numeric_field("eg-passed", (w_eg - b_eg));
	} else if (event.data.includes("Space")) {
		let [w_mg, w_eg, b_mg, b_eg] = parse_type1_eval(event.data, "Space")
		update_numeric_field("mg-space", (w_mg - b_mg));
		update_numeric_field("eg-space", (w_eg - b_eg));
	} else if (event.data.includes("NNUE derived piece values")) {
		type_2_eval_active = true;
	} else if (type_2_eval_active && event.data.includes("|")) {
		if (type_2_eval_skip === true) {
			// Skip current line
			type_2_eval_skip = false;
		} else {
			// Update parsed line
			type_2_eval_skip = true;
			console.log(`[*] TYPE 2 EVAL ${type_2_eval_line }:`, event.data)
			let type_2_eval_array = event.data.split("|");
			for (let i = 1; i < (type_2_eval_array.length - 1); i++) {
				const element = type_2_eval_array[i];
				type_2_eval_board[line_to_letter((i - 1)) + type_2_eval_line] = parseFloat(element) ? parseFloat(element) : 0;
			}

			type_2_eval_line -= 1;
			// Check end
			if (type_2_eval_line <= 0) {
				type_2_eval_line = 8;
				type_2_eval_skip = true;
				type_2_eval_active = false;
				console.log("[*] TYPE 2 EVAL BOARD: ", type_2_eval_board);
			}
		}

		// Clear div
		type_2_eval.innerHTML = "";
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
	if (game.game_over() || freeze || ai_moving || ai_hint) return false;

	// or if it's not that side's turn
	if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
		(game.turn() === 'b')) {
		return false
	}
}

// Drop piece
let firstMove = true;
function onDrop(source, target) {
	removeHighlightSquares();

	// Set last player move
	let castling = null;
	if (piece_from(source)["type"].toLowerCase() == "k") {
		if (target === "g1") {
			castling = "O-O";
			console.log("[*] Castling: O-O");
		} else if (target === "c1") {
			castling = "O-O-O";
			console.log("[*] Castling: O-O-O");
		}
	}

	// Set last move
	last_player_move = { 
		"FROM": source, 
		"TO": target, 
		"FROM_PIECE": piece_from(source), 
		"TO_PIECE": piece_from(target), 
		"PROMOTION": promotion, 
		"CASTLING": castling,
		"EVAL_BOARD": type_2_eval_board,
	};

	// see if the move is legal
	let move = game.move({
		from: source,
		to: target,
		promotion: promotion
	});

	// illegal move
	if (move === null) return 'snapback'
	reset_type_2_eval_board();

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
	let type_2 = type_2_eval_board[square]
	if (type_2 > 0) {
		type_2_eval.innerHTML = `${square}:&nbsp;<span class="positive">${type_2}</span>`;
	} else if (type_2 < 0) {
		type_2_eval.innerHTML = `${square}:&nbsp;<span class="negative">${type_2}</span>`;
	} else {
		type_2_eval.innerHTML = `${square}:&nbsp;<span class="neutral">${type_2}</span>`;
	}

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
		stockfish.postMessage(`go depth ${get_depth()}` + ` movetime -1`);
	}, 1000);
}

// The game ends
function checkEnd() {
	if (game.game_over()) {
		// Game is over
		document.getElementById("back-button").innerHTML = "Return";
		if (game.turn() === 'w') {
			$("#bottom-note").html("<h3 class='highlight'>You lose D:</h3>");
		} else {
			$("#bottom-note").html("<h3 class='highlight'>You win :D</h3>");
		}
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

// TODO: Rerformat the horrible code {FEB 12} (Will probably fix every bug)
// ! BUG: Only the pawn type 1 evaluation gets updated for some reason at some cases at some times {FEB 12}
// ! BUG: Fix turn back time to the gool old days after a win {FEB 12}
// TODO: Save and load games (Use clipboard) {FEB 12}
// TODO: Fix en passant turn back time to the good old days {FEB 12}
// TODO: Balance AI difficulty {FEB 13}
// TODO: Give player hints based on the full evaluation of the board {FEB 13}
// TODO: Timer for the game and AI {FEB 13}
// TODO: Show what pieces are attacking each other for the current position {FEB 13}
// TODO: Allow branching in bar, by keeping different turn tracks
// TODO: Ability to get list of best moves instead of only the best move
// TODO: Show moves towards check by M1, M2, etc.
// TODO: Find move variations, and show them on the board
// TODO: Visualize current game rating as a progress bar (White v.s. Black)
// TODO: Try to rationalize the AI, by showing the next few move the hint would make as well
// TODO: Custom AI difficulty, outside of it automatically adjusting
// TODO: Add opening display, where you can try different openings
// TODO: Defining starting positions/puzzles
// TODO: Show arrows based on pawn moves on the board
// TODO: Protect app from security vulnerabilities
