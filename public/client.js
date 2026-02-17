// public/client.js
const socket = io();

const entrarBtn = document.getElementById('entrarBtn');
const girarBtn = document.getElementById('girarBtn');
const surpresaBtn = document.getElementById('surpresaBtn');
const nomeInput = document.getElementById('nomeInput');
const salaInput = document.getElementById('salaInput');
const jogadoresList = document.getElementById('jogadoresList');

const modal = document.getElementById('romanceModal');
const modalQuestion = document.getElementById('modalQuestion');
const proximaBtn = document.getElementById('proximaBtn');
const fecharBtn = document.querySelector('.close');

let perguntas = [];
let perguntaIndex = 0;

// Busca perguntas do server
fetch('/perguntas')
  .then(r => r.json())
  .then(data => { perguntas = data.perguntas || []; })
  .catch(()=>{ perguntas = ["Qual é sua memória favorita da gente?", "Se pudéssemos jantar agora, o que escolheria?"]; });

entrarBtn.addEventListener('click', () => {
  const nome = nomeInput.value.trim() || 'Anônimo';
  const idSala = salaInput.value.trim() || '1';
  socket.emit('entrarSala', { idSala, nome });
});

girarBtn.addEventListener('click', () => {
  socket.emit('girarRoleta');
});

surpresaBtn.addEventListener('click', () => {
  // pergunta aleatória local
  if(!perguntas.length) return;
  const idx = Math.floor(Math.random() * perguntas.length);
  mostrarModal(perguntas[idx]);
});

socket.on('estadoSala', (estado) => {
  atualizarLista(estado.jogadores);
});

socket.on('jogadoresAtualizados', (data) => {
  atualizarLista(data.jogadores);
});

socket.on('resultadoRoleta', ({ numero }) => {
  // usaremos o número para escolher uma pergunta, indexando no array (mod)
  if(!perguntas.length) {
    mostrarModal(`Pergunta sorteada: #${numero}`);
    return;
  }
  const idx = (numero - 1) % perguntas.length;
  mostrarModal(perguntas[idx]);
});

function atualizarLista(arr){
  jogadoresList.innerHTML = '';
  arr.forEach(n => {
    const li = document.createElement('li');
    li.textContent = n;
    jogadoresList.appendChild(li);
  });
}

function mostrarModal(text){
  modalQuestion.textContent = text;
  modal.classList.remove('hidden');
}

function esconderModal(){
  modal.classList.add('hidden');
}

proximaBtn.addEventListener('click', () => {
});
