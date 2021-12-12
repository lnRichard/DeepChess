"use strict";
/* eslint-disable no-undef */
document.getElementById("back-button").addEventListener("click", () => {
	if (document.getElementById("back-button").innerHTML === "Forfeit") {
		let stats = JSON.parse(fs.readFileSync("./data/stats.json"));
		stats["losses"] += 1;
		fs.writeFileSync("./data/stats.json", JSON.stringify(stats));
	}
	window.location.href = "./menu.html";
});

let names = ["Niek", "Richard", "Jeremiah"];
let process = document.querySelectorAll(".process");
for (let i = 0; i < process.length; i++) {
	const name = names[Math.floor(Math.random() * names.length)];
	process[i].innerHTML = process[i].innerHTML.replaceAll("{enemy}", `<span class="highlight">${name}</span>`);
}

// Stockfish
var stockfish = new Worker("../../node_modules/stockfish/src/stockfish.js");
stockfish.postMessage("uci");
stockfish.onmessage = function (event) {
	if (event.data.includes("bestmove")) {
		var check = setInterval(() => {
			// Fetch move and type of the piece
			const id = check;
			const move = event.data.split(" ")[1];
			const type = game.get(move.substring(0, 2))["type"].toUpperCase();
			console.log(">TYPE: " + type);
			console.log("[?] FOUND: " + move);
			let possibleMoves = game.moves();

			// Loop all possible moves
			for (let i = 0; i < possibleMoves.length; i++) {

				// Remove all unused chars
				let local = possibleMoves[i].replaceAll("+", "").replaceAll("#", "");
				let target = local;

				// Process if needed
				console.log(" |CHECKING: " + target);
				if (target.length - 2 > 0) {
					target = target.substring(target.length - 2);
					console.log("  |PROCESS: " + target);
				}

				if (move.includes(target)) {
					// Check if there is a conflict
					if (local.includes("x")) {
						if (local[0] === local[0].toUpperCase()) {
							console.log("   |CHECK: Type A");
							if (local[0] !== type) {
								console.log("   |CONFLICT: Pass")
								continue;
							}
						} else {
							console.log("   |CHECK: Type B");
							if (local[0] !== move[0]) {
								console.log("   |CONFLICT: Pass")
								continue;
							}
						}
					}

					console.log("[!] DOING THE MOVE: " + possibleMoves[i]);
					game.move(possibleMoves[i]);
					updateFen();
					checkEnd();
					clearInterval(id);
					return;
				}
			}
		}, 500);
	}
}

// Chess:
const $ = require('jquery');
const Chess = require('chess.js').Chess;
let board = null;
let game = new Chess();
let whiteSquareHighlight = '#a9a9a9';
let blackSquareHighlight = '#696969';
let whiteRedSquareHighlight = '#b59b9b';
let blackRedSquareHighlight = '#785959';

function updateFen() {
	stockfish.postMessage("position fen " + game.fen());
	board.position(game.fen());
}

function removeHighlightSquares() {
	$('#chessboard .square-55d63').css('background', '');
}

function highlightSquare(square) {
	let $square = $('#chessboard .square-' + square);

	let background = whiteSquareHighlight;
	if ($square.hasClass('black-3c85d')) {
		background = blackSquareHighlight;
	}

	if (game.get(square) && game.get(square).color === 'b') {
		if (background === whiteSquareHighlight) {
			background = whiteRedSquareHighlight;
		} else {
			background = blackRedSquareHighlight;
		}
	}

	$square.css('background', background)
}

function onDragStart(source, piece) {
	// do not pick up pieces if the game is over
	if (game.game_over()) return false

	// or if it's not that side's turn
	if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
		(game.turn() === 'b')) {
		return false
	}
}

let firstMove = true;
function onDrop(source, target) {
	removeHighlightSquares()

	// see if the move is legal
	let move = game.move({
		from: source,
		to: target,
		promotion: 'q' // NOTE: always promote to a queen for example simplicity
	})

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

function onMouseoverSquare(square, piece) {
	// get list of possible moves for this square
	let moves = game.moves({
		square: square,
		verbose: true
	})

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

function onMouseoutSquare() {
	removeHighlightSquares()
}

function onSnapEnd() {
	updateFen();
}

function makeAIMove() {
	setTimeout(() => {
		stockfish.postMessage("go depth 15");
	}, 1000);
}

function checkEnd() {
	if (game.game_over()) {
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
		if (game.turn() === 'w') {
			$("#bottom-note").html(`<h3 class='highlight'>Your turn</h3>`);
		} else {
			$("#bottom-note").html("<h3 class='highlight'>Their turn</h3>");
		}
	}
}

var config = {
	draggable: true,
	position: 'start',
	onDragStart: onDragStart,
	onDrop: onDrop,
	onMouseoutSquare: onMouseoutSquare,
	onMouseoverSquare: onMouseoverSquare,
	onSnapEnd: onSnapEnd
}
board = Chessboard('chessboard', config)
