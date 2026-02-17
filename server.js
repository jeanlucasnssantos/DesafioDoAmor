// server.js (atualizado)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Pasta "public" será servida como estática
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------------
// Perguntas românticas (PG-13): o front-end pode buscar via GET /perguntas
// Se quiser editar/remover/perfilhar, altere esse array.
const PERGUNTAS_ROMANTICAS = [
  "Qual foi o momento mais romântico que já vivemos?",
  "Qual música te lembra de mim?",
  "Qual seria nosso encontro perfeito (dia + lugar)?",
  "Conte um pequeno segredo fofo que você nunca contou antes.",
  "Se pudesse descrever nosso relacionamento com uma cor e um sabor, quais seriam?",
  "Qual o detalhe mais simples meu que te faz sorrir?",
  "Qual viagem curta ou passeio você gostaria de fazer comigo?",
  "Qual foi a primeira coisa que percebeu em mim?",
  "Se tivéssemos um apelido secreto, qual seria?",
  "O que você mais aprecia quando estamos juntos (sem ser físico)?",
  "Diga uma lembrança nossa que você quer repetir para sempre.",
  "Qual série/filme você quer assistir comigo agora e por quê?",
  "Escreva uma frase curta que eu devesse dizer a você toda semana."
];

app.get('/perguntas', (req, res) => {
  res.json({ perguntas: PERGUNTAS_ROMANTICAS });
});
// ---------------------------------------------------------------------------------

// Persistência das salas em disco (mesma lógica sua, só levemente comentada)
const SALAS_DIR = path.join(__dirname, "salas");
if (!fs.existsSync(SALAS_DIR)) {
  fs.mkdirSync(SALAS_DIR);
}

function carregarOuCriarSala(idSala) {
  const arquivo = path.join(SALAS_DIR, `sala_${idSala}.json`);
  if (fs.existsSync(arquivo)) {
    const raw = fs.readFileSync(arquivo);
    return JSON.parse(raw);
  } else {
    const novaSala = {
      idSala: idSala,
      jogadores: [],
      perguntasRespondidas: [],
    };
    fs.writeFileSync(arquivo, JSON.stringify(novaSala, null, 2));
    return novaSala;
  }
}

function salvarSalaEmDisco(sala) {
  const arquivo = path.join(SALAS_DIR, `sala_${sala.idSala}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(sala, null, 2));
}

const salasCache = new Map();
function getSala(idSala) {
  if (!salasCache.has(idSala)) {
    const sala = carregarOuCriarSala(idSala);
});
