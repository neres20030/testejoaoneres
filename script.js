const currentPlayer = document.querySelector(".currentPlayer");

let selected = Array(9).fill(null);
let player = null;
let isMyTurn = false;
let roomId = null;
let gameRef = null;
let chatRef = null;
let scoreRef = null;

const positions = [
    [1, 2, 3], [4, 5, 6], [7, 8, 9],
    [1, 4, 7], [2, 5, 8], [3, 6, 9],
    [1, 5, 9], [3, 5, 7]
];

const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const sendMsg = document.getElementById('sendMsg');

document.getElementById('joinRoom').addEventListener('click', () => {
    roomId = document.getElementById('roomInput').value.trim();
    if (!roomId) return alert('Informe um código de sala!');

    gameRef = firebase.database().ref("jogos/" + roomId);
    chatRef = firebase.database().ref("chats/" + roomId);
    scoreRef = firebase.database().ref("placar/" + roomId);

    // Valida jogadores
    gameRef.child('players').once('value').then(snapshot => {
        const players = snapshot.val() || {};
        if (!players?.x) {
            player = 'x';
            gameRef.child('players').update({ x: true });
        } else if (!players?.o) {
            player = 'o';
            gameRef.child('players').update({ o: true });
        } else {
            alert('A sala já está cheia!');
            return;
        }

        isMyTurn = player === 'x';
        startGame();
    });
});

function updateTurnText(turn) {
    currentPlayer.innerHTML = `Vez de: ${turn}`;
}

function renderBoard(board) {
    document.querySelectorAll(".game button").forEach((item, index) => {
        item.innerHTML = board[index] ? board[index] : "";
        item.disabled = !!board[index];
        item.style.backgroundColor = board[index] ? "#ddd" : "white";
    });
}

function checkWinner(board) {
    for (let i = 0; i < positions.length; i++) {
        const [a, b, c] = positions[i].map(pos => pos - 1);
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            alert(`Jogador ${board[a]} venceu!`);
            updateScore(board[a]);
            resetGame();
            return true;
        }
    }

    if (!board.includes(null)) {
        alert("Empate!");
        resetGame();
        return true;
    }

    return false;
}

function resetGame() {
    gameRef.set({
        board: Array(9).fill(null),
        turn: "x",
        players: { x: true, o: true }
    });
}

function updateScore(winner) {
    scoreRef.once('value').then(snapshot => {
        let scores = snapshot.val() || { x: 0, o: 0 };
        scores[winner]++;
        scoreRef.set(scores);
    });
}

function startGame() {
    // Placar
    scoreRef.on('value', snapshot => {
        let scores = snapshot.val() || { x: 0, o: 0 };
        scoreX.innerText = scores.x;
        scoreO.innerText = scores.o;
    });

    // Chat
    chatRef.on('child_added', snapshot => {
        const msg = snapshot.val();
        const p = document.createElement('p');
        p.textContent = msg;
        chatBox.appendChild(p);
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    sendMsg.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (!message) return;
        const msg = `${player}: ${message}`;
        chatRef.push(msg);
        chatInput.value = '';
    });

    // Botões do tabuleiro
    document.querySelectorAll(".game button").forEach(item => {
        item.addEventListener("click", () => {
            if (!isMyTurn) return;

            const index = item.getAttribute("data-i") - 1;

            gameRef.once('value').then(snapshot => {
                const data = snapshot.val();
                let board = data?.board || Array(9).fill(null);
                let turn = data?.turn || "x";

                if (board[index] !== null) return;

                board[index] = player;

                gameRef.set({
                    board: board,
                    turn: player === "x" ? "o" : "x",
                    players: data.players
                });

                isMyTurn = false;
            });
        });
    });

    gameRef.on('value', snapshot => {
        const data = snapshot.val();
        if (!data) {
            resetGame();
            return;
        }

        selected = data.board;
        renderBoard(selected);
        updateTurnText(data.turn);
        isMyTurn = data.turn === player;

        checkWinner(selected);
    });

    resetGame();
}
