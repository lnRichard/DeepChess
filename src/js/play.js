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


// Chess:
const $ = require('jquery');
const Chess = require('chess.js').Chess;
let board = null;
let game = new Chess();
let whiteSquareHighlight = '#a9a9a9';
let blackSquareHighlight = '#696969';
let whiteRedSquareHighlight = '#b59b9b';
let blackRedSquareHighlight = '#785959';

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
	}, Math.random() * 500 + 500);
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
	board.position(game.fen())
}

function makeAIMove() {
	let possibleMoves = game.moves()

	// game over
	let moves = [];
	if (possibleMoves.length === 0) return
	for (let i = 0; i < possibleMoves.length; i++) {
		// Remove all moves that do not take another piece
		let move = possibleMoves[i];
		if (move.length - 2 > 0) {
			move = move.substring(move.length - 2);
		}

		if (game.get(move)) {
			moves.push(possibleMoves[i]);
		}
	}

	console.log(moves);
	if (moves.length === 0) moves = game.moves();
	let randomIdx = Math.floor(Math.random() * moves.length)
	game.move(moves[randomIdx])
	board.position(game.fen())
	checkEnd();
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
