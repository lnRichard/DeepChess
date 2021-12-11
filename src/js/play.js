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

var names = ["Niek", "Richard", "Jeremiah"];
let process = document.querySelectorAll(".process");
for (let i = 0; i < process.length; i++) {
	const name = names[Math.floor(Math.random() * names.length)];
	process[i].innerHTML = process[i].innerHTML.replaceAll("{enemy}", `<span class="highlight">${name}</span>`);
}


// Chess:
const $ = require('jquery');
const Chess = require('chess.js').Chess;
var board = null
var game = new Chess()
var whiteSquareHighlight = '#a9a9a9'
var blackSquareHighlight = '#696969'

function removeHighlightSquares() {
	$('#chessboard .square-55d63').css('background', '')
}

function highlightSquare(square) {
	var $square = $('#chessboard .square-' + square)

	var background = whiteSquareHighlight
	if ($square.hasClass('black-3c85d')) {
		background = blackSquareHighlight
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

var firstMove = true;
function onDrop(source, target) {
	removeHighlightSquares()

	// see if the move is legal
	var move = game.move({
		from: source,
		to: target,
		promotion: 'q' // NOTE: always promote to a queen for example simplicity
	})

	// illegal move
	if (move === null) return 'snapback'

	// Check if the first move was made
	if (firstMove) {
		console.log("First move");
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
	var moves = game.moves({
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
	for (var i = 0; i < moves.length; i++) {
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
	var possibleMoves = game.moves()

	// game over
	if (possibleMoves.length === 0) return

	var randomIdx = Math.floor(Math.random() * possibleMoves.length)
	game.move(possibleMoves[randomIdx])
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
			console.log(game.get_comments());
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
