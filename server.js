// server.js
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

// Armazenamos em memória as salas e seus estados, mas
// também gravamos em JSON para persistência (caso o server reinicie).
const SALAS_DIR = path.join(__dirname, "salas");
if (!fs.existsSync(SALAS_DIR)) {
  fs.mkdirSync(SALAS_DIR);
}

// Helper para ler sala do disco (ou criar nova)
function carregarOuCriarSala(idSala) {
  const arquivo = path.join(SALAS_DIR, `sala_${idSala}.json`);
  if (fs.existsSync(arquivo)) {
    const raw = fs.readFileSync(arquivo);
    return JSON.parse(raw);
  } else {
    const novaSala = {
      idSala: idSala,
      jogadores: [],            // { nome: string, socketId: string }
      perguntasRespondidas: [], // array de números (1..13)
    };
    fs.writeFileSync(arquivo, JSON.stringify(novaSala, null, 2));
    return novaSala;
  }
}

// Helper para salvar sala em disco
function salvarSalaEmDisco(sala) {
  const arquivo = path.join(SALAS_DIR, `sala_${sala.idSala}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(sala, null, 2));
}

// Em-memory cache de salas para performance (leitura/atualização)
const salasCache = new Map();

// Ao iniciar uma sala, vamos carregá-la no cache
function getSala(idSala) {
  if (!salasCache.has(idSala)) {
    const sala = carregarOuCriarSala(idSala);
    salasCache.set(idSala, sala);
  }
  return salasCache.get(idSala);
}

// Lógica de Socket.IO
io.on("connection", (socket) => {
  let salaAtual = null;
  let nomeAtual = null;

  // Evento: criar ou entrar em sala
  socket.on("entrarSala", ({ idSala, nome }) => {
    salaAtual = idSala;
    nomeAtual = nome;

    // Carrega (ou cria) sala
    const sala = getSala(idSala);

    // Verifica se já existe esse jogador (talvez reconexão)
    const idxExistente = sala.jogadores.findIndex(
      (j) => j.nome === nome
    );

    if (idxExistente === -1) {
      sala.jogadores.push({ nome, socketId: socket.id });
    } else {
      // Atualiza socketId em caso de reconexão
      sala.jogadores[idxExistente].socketId = socket.id;
    }

    salvarSalaEmDisco(sala);

    // Entra na “room” do Socket.IO
    socket.join(idSala);

    // Envia estado inicial da sala a quem acabou de entrar
    io.to(socket.id).emit("estadoSala", {
      jogadores: sala.jogadores.map((j) => j.nome),
      perguntasRespondidas: sala.perguntasRespondidas,
    });

    // Notifica todos na sala sobre novo jogador
    io.to(idSala).emit("jogadoresAtualizados", {
      jogadores: sala.jogadores.map((j) => j.nome),
    });
  });

  // Evento: solicitar roleta (girar)
  socket.on("girarRoleta", () => {
    if (!salaAtual) return;

    const sala = getSala(salaAtual);

    // Se já tiverem respondido todas (13), não gira mais
    if (sala.perguntasRespondidas.length >= 13) {
      io.to(socket.id).emit("todasRespondidas");
      return;
    }

    // Gera número 1..13 não repetido (se sorteado repetir, soma +1 até achar livre)
    let numero = Math.floor(Math.random() * 13) + 1;
    while (sala.perguntasRespondidas.includes(numero)) {
      numero = numero === 13 ? 1 : numero + 1;
    }

    // Marca como respondida
    sala.perguntasRespondidas.push(numero);
    salvarSalaEmDisco(sala);

    // Envia a todos na sala o número sorteado
    io.to(salaAtual).emit("resultadoRoleta", { numero });
  });

  // Evento: jogador desconecta
  socket.on("disconnect", () => {
    if (!salaAtual || !nomeAtual) return;

    const sala = getSala(salaAtual);
    sala.jogadores = sala.jogadores.filter((j) => j.socketId !== socket.id);
    salvarSalaEmDisco(sala);

    io.to(salaAtual).emit("jogadoresAtualizados", {
      jogadores: sala.jogadores.map((j) => j.nome),
    });
  });
});

// Rota padrão: serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
