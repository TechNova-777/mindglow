// --- SONIDOS ---
const sonidoBurbuja = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
const sonidoExito = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');

// --- SELECCIÓN DE MASCOTAS ---
function seleccionarMascota(nombre, titulo, emoji, idCard) {
    // Actualizar textos en la pantalla
    document.getElementById('nombre-activo').innerText = `${nombre} (${titulo})`;
    document.getElementById('hero-avatar').innerText = emoji;
    document.getElementById('hero-mascota-nombre').innerText = `${nombre} · Tu guía Zen`;

    // Cambiar estilos de las tarjetas
    document.querySelectorAll('.card-mascota').forEach(card => card.classList.remove('activa'));
    document.getElementById(idCard).classList.add('activa');
    
    sonidoExito.currentTime = 0;
    sonidoExito.play();
}

// --- RASTREADOR DE EMOCIONES ---
function registrarEmocion(emocion, emoji) {
    const mensajes = {
        'feliz': '¡Qué alegría! Aprovecha esta energía positiva para compartirla con los demás.',
        'tranquilo': 'La calma es tu superpoder hoy. Sigue manteniendo ese balance.',
        'estresado': 'Tómate 3 minutos en el Centro Zen con el ejercicio de respiración.',
        'cansado': 'Recuerda que descansar también es ser productivo. ¡Date un respiro!'
    };

    const texto = `${emoji} ${mensajes[emocion]}`;
    document.getElementById('mensaje-emocion').innerText = texto;
}

// --- BURBUJAS ANTI-ESTRÉS ---
let puntos = 0;

function reventarBurbuja(elemento) {
    if (elemento.classList.contains('reventada')) return;

    // Reproducir sonido de explosión de burbuja
    sonidoBurbuja.currentTime = 0;
    sonidoBurbuja.play();

    elemento.classList.add('reventada');
    puntos++;
    document.getElementById('puntos').innerText = puntos;
}

function reiniciarBurbujas() {
    puntos = 0;
    document.getElementById('puntos').innerText = puntos;
    document.querySelectorAll('.burbuja').forEach(b => b.classList.remove('reventada'));
}

// --- RESPIRACIÓN GUIADA ---
let enRespiracion = false;
let intervaloRespiracion;

function toggleRespiracion() {
    const circulo = document.getElementById('circulo-respiracion');
    const texto = document.getElementById('texto-respiracion');
    const btn = document.getElementById('btn-respiracion');

    if (!enRespiracion) {
        enRespiracion = true;
        btn.innerText = 'Detener Ejercicio';
        
        let inhalar = true;
        texto.innerText = 'Inhala...';
        circulo.classList.add('expandir');

        intervaloRespiracion = setInterval(() => {
            inhalar = !inhalar;
            if (inhalar) {
                texto.innerText = 'Inhala...';
                circulo.classList.add('expandir');
            } else {
                texto.innerText = 'Exhala...';
                circulo.classList.remove('expandir');
            }
        }, 3000);
    } else {
        enRespiracion = false;
        clearInterval(intervaloRespiracion);
        btn.innerText = 'Iniciar Ejercicio';
        texto.innerText = 'Inhala';
        circulo.classList.remove('expandir');
    }
}

// --- MEMORIA ZEN ---
const iconosMemoria = ['🌸', '🌸', '🌊', '🌊', '🧘', '🧘', '☀️', '☀️'];

function iniciarJuegoMemoria() {
    const grid = document.getElementById('memoria-grid');
    grid.innerHTML = '';
    
    // Mezclar cartas
    const cartasMezcladas = iconosMemoria.sort(() => Math.random() - 0.5);

    cartasMezcladas.forEach((emoji) => {
        const carta = document.createElement('div');
        carta.classList.add('carta-memoria');
        carta.innerText = '?';
        
        carta.onclick = () => {
            carta.innerText = emoji;
            sonidoBurbuja.currentTime = 0;
            sonidoBurbuja.play();
        };

        grid.appendChild(carta);
    });
}

// Inicializar juego de memoria al cargar la página
window.onload = () => {
    iniciarJuegoMemoria();
};

// --- FORMULARIO DE CONTACTO ---
function enviarFormulario(e) {
    e.preventDefault();
    alert('¡Gracias por enviar tu mensaje! El equipo de MindGlow te responderá pronto.');
}