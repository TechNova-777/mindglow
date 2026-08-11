// 1. Seleccionamos los elementos del HTML
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const clearChatBtn = document.getElementById('clear-chat-btn');
const typingIndicator = document.getElementById('typing-indicator');

// --- ✨ NUEVA FUNCIÓN: Saludo Inteligente por hora ---
function obtenerSaludo() {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "¡Buenos días!";
    if (hora >= 12 && hora < 19) return "¡Buenas tardes!";
    return "¡Buenas noches!";
}

// 2. EL CEREBRO DE GLOW AI: Detector de Intenciones
function detectIntent(message) {
    const msg = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Si el usuario escribe muy poco (como "a", "?", "ok")
    if (msg.length < 3 && !msg.includes('ok')) return 'SHORT_MSG';

    // --- NUEVO: Detectar risas ---
    if (msg.includes('jaja') || msg.includes('jeje') || msg.includes('jiji') || msg.includes('lol')) return 'LAUGH';

    // 🩺 SÍNTOMAS Y MALESTAR FÍSICO
    if (msg.includes('cansad') && msg.includes('despertar') || msg.includes('energia diaria')) return 'PHYSICAL_TIRED';
    if (msg.includes('espalda') || msg.includes('dolor constante')) return 'BACK_PAIN';
    if (msg.includes('palpitacion') || msg.includes('corazon')) return 'PALPITATIONS';
    
    // 🧠 GESTIÓN DEL ESTRÉS Y EMOCIONES
    if (msg.includes('ansiedad') || msg.includes('panico') || msg.includes('miedo') || msg.includes('bloquea')) return 'ANXIETY';
    if (msg.includes('dormir') || msg.includes('sueño') || msg.includes('noches')) return 'SLEEP_ISSUES';
    if (msg.includes('estres') || msg.includes('saturad') || msg.includes('tarea') || msg.includes('pesado')) return 'STRESS';
    if (msg.includes('triste') || msg.includes('mal') || msg.includes('llorar') || msg.includes('solo')) return 'SADNESS';
    if (msg.includes('concentra') || msg.includes('foco') || msg.includes('distraig')) return 'FOCUS';
    if (msg.includes('relaja') || msg.includes('descans')) return 'RELAXATION';
    
    // 🍏 ESTILO DE VIDA Y HÁBITOS
    if (msg.includes('alimentacion') || msg.includes('cocinar') || msg.includes('comer') || msg.includes('comida')) return 'DIET';
    if (msg.includes('ejercicio') || msg.includes('rutina') || msg.includes('deporte')) return 'EXERCISE';
    
    // 👨‍⚕️ BÚSQUEDA DE AYUDA Y SOLUCIONES
    if (msg.includes('especialista') || msg.includes('medico') || msg.includes('doctor') || msg.includes('hospital')) return 'SEEK_DOC';
    if (msg.includes('entorno') || msg.includes('explicarle') || msg.includes('padres') || msg.includes('amigos')) return 'SEEK_SUPPORT';
    if (msg.includes('informacion confiable') || msg.includes('internet')) return 'INFO_TRUST';

    // 🎓 TEMAS ESCOLARES Y CHARLA CASUAL
    if (msg.includes('tecnica') || msg.includes('memorizar') || msg.includes('aprender') || msg.includes('estudio')) return 'STUDY_HACKS';
    if (msg.includes('tiempo') || msg.includes('organizar') || msg.includes('horario')) return 'TIME_MANAGEMENT';
    if (msg.includes('habito') || msg.includes('saludable') || msg.includes('consejo')) return 'TIPS';
    if (msg.includes('messi') || msg.includes('cristiano') || msg.includes('ronaldo') || msg.includes('futbol')) return 'SPORTS';
    if (msg.includes('estoy bien') || msg.includes('feliz') || msg.includes('alegre')) return 'GOOD_MOOD';
    if (msg.includes('repite') || msg.includes('robot') || msg.includes('automatico') || msg.includes('ia')) return 'BOT_AWARENESS';
    if (msg.includes('chiste') || msg.includes('broma') || msg.includes('reir')) return 'JOKE';
    if (msg.includes('quien soy') || msg.includes('quien eres') || msg.includes('hola') || msg.includes('ola')) return 'GREETING';
    
    // --- NUEVO: Temas muy random (videojuegos, aliens, etc.) ---
    if (msg.includes('alien') || msg.includes('videojuego') || msg.includes('minecraft') || msg.includes('gta') || msg.includes('magia') || msg.includes('mundial') || msg.includes('peru')) return 'RANDOM_TOPIC';
    
    return 'GENERAL';
}

// 3. EL CEREBRO DE GLOW AI: Generador de Respuestas
function getGlowResponse(intent) {
    const respuestas = {
        'SHORT_MSG': ["¡Te leo! ¿Quieres contarme un poco más? 🤔", "¿Todo bien? Puedes escribirme con confianza. ✨"],
        // --- NUEVO: Respuestas a risas ---
        'LAUGH': [
            "¡Me alegra sacarte una sonrisa! 😄", 
            "Jajaja, ¡la risa es la mejor medicina para el estrés! ✨",
            "¡Qué bueno verte reír! ¿En qué te ayudo ahora? 💙"
        ],
        // --- NUEVO: Respuestas a temas random ---
        'RANDOM_TOPIC': [
            "¡Jaja! Sabes que lo mío es el bienestar escolar, pero me encanta tu creatividad. 🤖✨",
            "Uf, me agarraste. Si fuera por mí, pasaría el día hablando de eso, pero mi creador me programó para ayudarte a estudiar. ¡A trabajar! 📚",
            "Mmm, interesante teoría. Mientras lo investigo... ¿qué tal si avanzamos con tus tareas pendientes? 😉"
        ],
        'PHYSICAL_TIRED': ["Sentirse cansado al despertar suele deberse a usar pantallas antes de dormir o estrés acumulado. ¡Intenta dejar el celular 30 minutos antes de acostarte! 🔋"],
        'BACK_PAIN': ["El dolor de espalda es muy común por la mala postura al estudiar. Recuerda estirarte cada 45 minutos y revisar cómo te sientas. 🧘‍♀️"],
        'PALPITATIONS': ["Es una respuesta común del cuerpo ante la preocupación (adrenalina). Respira profundo conmigo. *Ojo: si ocurren de la nada o duele el pecho, siempre decírselo a un médico.* ❤️"],
        'SLEEP_ISSUES': ["El cerebro no logra desactivarse si usas el celular en la cama (la luz azul frena la hormona del sueño). Prueba leer un libro físico o escuchar lluvia de fondo. 🌙"],
        'DIET': ["Si no hay tiempo, opta por cosas rápidas pero nutritivas: frutas, frutos secos, avena o yogur natural. ¡Tu cerebro necesita buen combustible! 🍎"],
        'EXERCISE': ["El error es querer empezar con rutinas de 1 hora. Empieza con solo 10 minutos al día de algo que disfrutes (como bailar o caminar). 🏃‍♀️"],
        'SEEK_DOC': ["Un Médico General es el mejor primer paso. Te hará un chequeo general. ¡Pedir ayuda es de valientes! 👨‍⚕️"],
        'SEEK_SUPPORT': ["Sé directo y honesto. Puedes decir: 'Últimamente me he sentido desbordado y me afecta físicamente. Necesito apoyo para organizarme'. 🗣️💙"],
        'INFO_TRUST': ["Busca en portales de salud reconocidos como la OMS o sitios de universidades. ¡Evita autodiagnosticarte en redes sociales! 🌐"],
        'TIPS': ["¡Claro! 1. Toma agua al despertar. 2. Duerme 8 horas. 3. Haz pausas al estudiar. 4. Camina 15 min al día. ¿Cuál te cuesta más? 🌱"],
        'SPORTS': ["¡Ambos son leyendas! Pero yo soy más fan de hacer deporte para desestresarse. ¿Tú juegas algo? ⚽"],
        'GOOD_MOOD': ["¡Qué alegría leer eso! ✨ Guardar esa energía positiva te ayudará mucho hoy."],
        'BOT_AWARENESS': ["¡Me atrapaste! 🤖 Soy una IA del proyecto MindGlow, aún aprendiendo a ser más humana. ¡Paciencia conmigo!"],
        'STRESS': ["Entiendo la presión. Vamos a dividirlo en partes pequeñas. ¿Qué es lo más urgente para hoy? ⚡"],
        'ANXIETY': ["Técnica 5-4-3-2-1: Nombra 5 cosas que veas, 4 que toques, 3 que oigas, 2 que huelas y 1 que saborees. Esto te devolverá al presente. 🌬️💙"],
        'SADNESS': ["Siento mucho que estés pasando por esto. Si deseas despejar la mente, podemos escuchar música suave. Estoy aquí. 🫂"],
        'GREETING': [`${obtenerSaludo()} Soy Glow AI ✨. Estoy lista para escucharte o darte un respiro. ¿Qué necesitas hoy?`],
        'GENERAL': [
            "¡Qué interesante! Cuéntame un poco más sobre eso. 🤔",
            "No estoy segura de entender del todo, pero me gusta escucharte. ¿Qué más me cuentas? ✨",
            "Mmm, buena pregunta. Mi especialidad es el bienestar, así que a veces me pierdo con otros temas. ¡Pero sigo aprendiendo! 💙"
        ]
    };

    const respuestaElegida = respuestas[intent] || respuestas['GENERAL'];
    
    if (Array.isArray(respuestaElegida)) {
        const indiceAleatorio = Math.floor(Math.random() * respuestaElegida.length);
        return respuestaElegida[indiceAleatorio];
    }
    return respuestaElegida;
}

// 4. Funciones de Interfaz
function appendMessage(text, isAi = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', isAi ? 'ai-message' : 'user-message');
    msgDiv.innerHTML = `<div class="message-content">${text}</div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping(show) {
    const indicator = document.getElementById('typing-indicator');
    show ? indicator.classList.remove('hidden') : indicator.classList.add('hidden');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.sendQuickMessage = function(text) {
    chatInput.value = text;
    chatForm.dispatchEvent(new Event('submit'));
};

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(text, false);
    chatInput.value = '';
    showTyping(true);

    const intencion = detectIntent(text);
    const respuestaInteligente = getGlowResponse(intencion);

    let tiempoEspera = 500 + (respuestaInteligente.length * 30);
    if (tiempoEspera > 3000) tiempoEspera = 3000;

    setTimeout(() => {
        showTyping(false);
        appendMessage(respuestaInteligente, true);
    }, tiempoEspera);
});

clearChatBtn.addEventListener('click', () => {
    chatMessages.innerHTML = `
      <div class="message ai-message">
        <div class="message-content">
          Chat reiniciado. ${obtenerSaludo()} ¿En qué te puedo ayudar ahora? ✨
        </div>
      </div>
    `;
});S