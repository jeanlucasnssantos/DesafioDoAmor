// public/app.js
// Corrigido para manter roleta perfeitamente circular e adicionar som.

const socket = io();

// Elementos do DOM
const telaEntrada = document.getElementById("telaEntrada");
const inputNome = document.getElementById("inputNome");
const inputSala = document.getElementById("inputSala");
const btnEntrar = document.getElementById("btnEntrar");

const telaJogo = document.getElementById("telaJogo");
const idSalaDisplay = document.getElementById("idSalaDisplay");
const jogadoresList = document.getElementById("jogadoresList");

const roletaContainer = document.getElementById("roletaContainer");
const canvasRoleta = document.getElementById("canvasRoleta");
const btnGirar = document.getElementById("btnGirar");

const resultadoPergunta = document.getElementById("resultadoPergunta");
const numeroPerguntaSpan = document.getElementById("numeroPergunta");
const imagemPergunta = document.getElementById("imagemPergunta");
const btnCompartilhar = document.getElementById("btnCompartilhar");

const fimPerguntas = document.getElementById("fimPerguntas");

let meuNome = null;
let minhaSala = null;
let wheel = null;
let respondidas = [];

// Carrega áudio de roleta (coloque o arquivo em public/sound/roleta.mp3)
const audioRoleta = new Audio('sound/roleta.mp3');

btnEntrar.addEventListener("click", () => {
  const nome = inputNome.value.trim();
  const idSala = inputSala.value.trim().toUpperCase();

  if (!nome || !idSala) {
    alert("Digite seu nome e o ID da Sala para continuar.");
    return;
  }

  meuNome = nome;
  minhaSala = idSala;

  socket.emit("entrarSala", { idSala, nome });

  telaEntrada.classList.add("hidden");
  telaJogo.classList.remove("hidden");
  idSalaDisplay.textContent = idSala;

  inicializarRoleta();
});

socket.on("estadoSala", (data) => {
  atualizarListaJogadores(data.jogadores);
  respondidas = data.perguntasRespondidas || [];
  marcarPerguntasRespondidas(respondidas);
  if (respondidas.length >= 13) {
    roletaContainer.classList.add("hidden");
    fimPerguntas.classList.remove("hidden");
  }
});

socket.on("jogadoresAtualizados", (data) => {
  atualizarListaJogadores(data.jogadores);
});

btnGirar.addEventListener("click", () => {
  btnGirar.disabled = true;
  socket.emit("girarRoleta");
});

socket.on("resultadoRoleta", ({ numero }) => {
  // Toca som e reseta posição da roleta
  audioRoleta.currentTime = 0;
  audioRoleta.play();

  wheel.stopAnimation(false);
  wheel.rotationAngle = 0;
  wheel.draw();

  girarParaNumero(numero);
  respondidas.push(numero);

  if (respondidas.length >= 13) {
    setTimeout(() => {
      roletaContainer.classList.add("hidden");
      fimPerguntas.classList.remove("hidden");
    }, 3500);
  }
});

socket.on("todasRespondidas", () => {
  btnGirar.disabled = true;
  roletaContainer.classList.add("hidden");
  fimPerguntas.classList.remove("hidden");
});

function atualizarListaJogadores(arrayNomes) {
  jogadoresList.textContent = arrayNomes.join(", ");
}

function marcarPerguntasRespondidas(lista) {
  console.log("Perguntas já respondidas:", lista);
}

function inicializarRoleta() {
  // Garante que o canvas tenha as mesmas dimensões do contêiner
  const size = roletaContainer.offsetWidth;
  canvasRoleta.width = size;
  canvasRoleta.height = size;

  const segmentos = [];
  const corRosa = '#ff69b4';
  for (let i = 1; i <= 13; i++) {
    segmentos.push({
      fillStyle: corRosa,
      text: i.toString(),
      textFontSize: 24,
      textOrientation: "horizontal",
      textAlignment: "center"
    });
  }

  wheel = new Winwheel({
    canvasId: "canvasRoleta",
    numSegments: 13,
    segments: segmentos,
    outerRadius: size / 2 - 4, // -4 para considerar a borda de 4px
    rotationAngle: 0,
    textFontSize: 20,
    textAlignment: "center",
    textOrientation: "horizontal",
    lineWidth: 2,
    strokeStyle: "#ffffff",
    animation: {
      type: "spinToStop",
      direction: "clockwise",
      duration: 3,
      spins: 10,
      callbackFinished: roletaParou
    }
  });
}

function roletaParou(indicatedSegment) {
  const numero = parseInt(indicatedSegment.text);
  mostrarPergunta(numero);
  btnGirar.disabled = false;
}

function girarParaNumero(numeroAlvo) {
  const degreesPorSegmento = 360 / 13;
  const targetAngle = (270 - (numeroAlvo - 1) * degreesPorSegmento + 360) % 360;
  wheel.animation.stopAngle = targetAngle;
  wheel.startAnimation();
}

function mostrarPergunta(numero) {
  // Deixa só o número visível (sem a imagem antiga)
  resultadoPergunta.classList.remove("hidden");
  numeroPerguntaSpan.textContent = numero;
  btnCompartilhar.classList.remove("hidden");

  // Limpa o src antigo imediatamente, para a imagem antiga sumir
  imagemPergunta.src = "";

  // Esconde a tag <img> enquanto carrega
  imagemPergunta.style.display = "none";

  // Quando a nova imagem terminar de carregar, exibe-a
  imagemPergunta.onload = () => {
    imagemPergunta.style.display = "block";
  };

  // Só então atribui o novo src, iniciando o carregamento
  imagemPergunta.src = `images/${numero}.jpg`;
}

btnCompartilhar.addEventListener("click", async () => {
  const numero = numeroPerguntaSpan.textContent;
  const imgURL = window.location.origin + `/images/${numero}.jpg`;

  if (navigator.canShare && navigator.canShare({ files: [] })) {
    try {
      const response = await fetch(imgURL);
      const blob = await response.blob();
      const file = new File([blob], `pergunta_${numero}.jpg`, { type: blob.type });
      await navigator.share({
        files: [file],
        title: `Pergunta #${numero}`,
        text: `Olha a pergunta #${numero} do nosso Desafio do Amor!`
      });
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      alert("Não foi possível compartilhar via Web Share API.");
    }
  } else {
    window.open(imgURL, "_blank");
  }
});
