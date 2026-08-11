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
});/* ============================================================
   MIND GLOW ULTRA PREMIUM
   MECÁNICAS COMPLEMENTARIAS
   NO REEMPLAZA LA IA ORIGINAL
============================================================ */


/* ============================================================
   NAVEGACIÓN
============================================================ */

const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".page-section");

const pageSubtitle = document.getElementById("pageSubtitle");

const subtitles = {

    home:
        "Tu espacio para sentirte mejor",

    ai:
        "Habla con Glow AI",

    wellness:
        "Respira y encuentra un momento de calma",

    games:
        "Juega y cambia de ritmo",

    focus:
        "Concéntrate en lo que importa",

    sounds:
        "Crea tu ambiente",

    school:
        "Nuestra comunidad educativa"
};


function openSection(sectionName) {

    sections.forEach(section => {

        section.classList.remove("active");

    });


    const target =
        document.getElementById(
            "section-" + sectionName
        );


    if (target) {

        target.classList.add("active");

    }


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.section === sectionName
        );

    });


    if (pageSubtitle) {

        pageSubtitle.textContent =
            subtitles[sectionName] || "";
    }


    document
        .querySelector(".content-area")
        ?.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    document
        .getElementById("sidebar")
        ?.classList.remove("open");
}


navItems.forEach(item => {

    item.addEventListener("click", () => {

        openSection(item.dataset.section);

    });

});


document.querySelectorAll("[data-go]").forEach(button => {

    button.addEventListener("click", () => {

        openSection(button.dataset.go);

    });

});


/* ============================================================
   MENÚ MÓVIL
============================================================ */

const menuBtn =
    document.getElementById("menuBtn");

const closeMenu =
    document.getElementById("closeMenu");

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("sidebarOverlay");


menuBtn?.addEventListener("click", () => {

    sidebar?.classList.add("open");

});


closeMenu?.addEventListener("click", () => {

    sidebar?.classList.remove("open");

});


overlay?.addEventListener("click", () => {

    sidebar?.classList.remove("open");

});


/* ============================================================
   TOAST
============================================================ */

const toast =
    document.getElementById("toast");

const toastText =
    document.getElementById("toastText");


function showToast(message) {

    if (!toast) return;

    toastText.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


/* ============================================================
   XP
============================================================ */

let mindGlowXP =
    Number(
        localStorage.getItem("mindGlowXP") || 0
    );


function updateXP() {

    const level =
        Math.floor(mindGlowXP / 100) + 1;

    const progress =
        mindGlowXP % 100;


    const levelElement =
        document.getElementById("level");

    const xpText =
        document.getElementById("xpText");

    const xpProgress =
        document.getElementById("xpProgress");


    if (levelElement)
        levelElement.textContent = level;


    if (xpText)
        xpText.textContent =
            mindGlowXP + " XP";


    if (xpProgress)
        xpProgress.style.width =
            progress + "%";

}


function addXP(amount) {

    mindGlowXP += amount;

    localStorage.setItem(
        "mindGlowXP",
        mindGlowXP
    );

    updateXP();

    showToast("+" + amount + " XP ✨");

}


updateXP();


/* ============================================================
   SONIDOS AMBIENTALES REALES — MIND GLOW
   Fuentes de audio:
   - Océano: Oceanwavescrushing.ogg — Luftrum — CC BY 3.0
   - Bosque: 20090610 0 ambience.ogg — nille — Dominio público
   - Lluvia: Rain.ogg — ジダネ — Dominio público
   - Río: Flowing-water-100019.ogg — Fg2 — Dominio público

   Los tres últimos audios son de dominio público. El audio del
   océano requiere atribución según CC BY 3.0.
============================================================ */

let currentSound = null;
let currentAmbientAudio = null;

const ambientSounds = {
    rain: {
        name: "Lluvia",
        icon: "🌧️",
        url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Rain.ogg"
    },
    ocean: {
        name: "Océano",
        icon: "🌊",
        url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Oceanwavescrushing.ogg"
    },
    forest: {
        name: "Bosque",
        icon: "🌿",
        url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/20090610_0_ambience.ogg"
    },
    river: {
        name: "Río",
        icon: "💧",
        url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flowing-water-100019.ogg"
    }
};

function stopAmbient() {
    if (currentAmbientAudio) {
        currentAmbientAudio.pause();
        currentAmbientAudio.currentTime = 0;
        currentAmbientAudio.removeAttribute("src");
        currentAmbientAudio.load();
        currentAmbientAudio = null;
    }

    currentSound = null;

    document
        .querySelectorAll(".sound-card")
        .forEach(card => card.classList.remove("active"));

    const status = document.getElementById("soundStatus");
    if (status) {
        status.textContent = "🔇 Selecciona un ambiente";
    }
}

function playAmbient(type) {
    const sound = ambientSounds[type];

    if (!sound) {
        console.warn("Ambiente no configurado:", type);
        return;
    }

    stopAmbient();

    const audio = new Audio();
    audio.src = sound.url;
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.35;

    currentAmbientAudio = audio;
    currentSound = type;

    audio.addEventListener("error", () => {
        console.error("No se pudo cargar el ambiente:", sound.name);
        showToast("No se pudo cargar " + sound.name + " 😕");
        stopAmbient();
    }, { once: true });

    audio.play().catch(error => {
        console.warn("El navegador bloqueó el audio hasta una interacción:", error);
        showToast("Pulsa de nuevo para reproducir " + sound.name + " 🎧");
    });

    document
        .querySelectorAll(".sound-card")
        .forEach(card => {
            card.classList.toggle(
                "active",
                card.dataset.sound === type
            );
        });

    const status = document.getElementById("soundStatus");
    if (status) {
        status.textContent =
            "🔊 Reproduciendo: " + sound.name;
    }

    showToast(
        sound.icon + " " + sound.name + " activado 🎧"
    );
}

document
    .querySelectorAll(".sound-card")
    .forEach(card => {
        card.addEventListener("click", () => {
            const sound = card.dataset.sound;

            if (currentSound === sound) {
                stopAmbient();
                showToast("🔇 " + ambientSounds[sound].name + " pausado");
                return;
            }

            playAmbient(sound);
        });
    });

/* ============================================================
   BOTÓN GENERAL DE SONIDO
============================================================ */

document
    .getElementById("soundToggle")
    ?.addEventListener(
        "click",
        () => {

            if (currentSound) {

                stopAmbient();

                showToast(
                    "Sonido pausado 🔇"
                );

            } else {

                openSection("sounds");

            }

        }
    );


/* ============================================================
   RESPIRACIÓN
============================================================ */

let breathingRunning = false;

let breathingInterval = null;

let breathingSeconds = 60;


const breathingCircle =
    document.getElementById(
        "breathingCircle"
    );

const breathingText =
    document.getElementById(
        "breathingText"
    );

const breathingTimer =
    document.getElementById(
        "breathingTimer"
    );


document
    .getElementById("breathingStart")
    ?.addEventListener(
        "click",
        startBreathing
    );


function startBreathing() {

    if (breathingRunning)
        return;


    breathingRunning = true;

    breathingSeconds = 60;


    addXP(10);


    breathingInterval =
        setInterval(() => {

            breathingSeconds--;


            if (breathingTimer) {

                breathingTimer.textContent =
                    breathingSeconds +
                    " s";

            }


            const elapsed =
                60 -
                breathingSeconds;


            const phase =
                elapsed % 8;


            if (phase < 4) {

                breathingCircle
                    ?.classList.add(
                        "breathe"
                    );

                if (breathingText)
                    breathingText.textContent =
                        "INHALA";

            } else {

                breathingCircle
                    ?.classList.remove(
                        "breathe"
                    );

                if (breathingText)
                    breathingText.textContent =
                        "EXHALA";

            }


            if (
                breathingSeconds <= 0
            ) {

                clearInterval(
                    breathingInterval
                );

                breathingRunning =
                    false;


                if (breathingText)
                    breathingText.textContent =
                        "LISTO";


                if (breathingTimer)
                    breathingTimer.textContent =
                        "60 s";


                showToast(
                    "Respiración completada ✨"
                );


                addXP(20);

            }

        }, 1000);

}


/* ============================================================
   FOCUS TIMER
============================================================ */

let focusMinutes = 25;

let focusSeconds = 0;

let focusInterval = null;

let focusRunning = false;


const focusTimer =
    document.getElementById(
        "focusTimer"
    );


function renderFocusTimer() {

    const minutes =
        String(focusMinutes)
            .padStart(2, "0");

    const seconds =
        String(focusSeconds)
            .padStart(2, "0");


    if (focusTimer) {

        focusTimer.textContent =
            minutes +
            ":" +
            seconds;

    }

}


document
    .getElementById("focusStart")
    ?.addEventListener(
        "click",
        () => {

            if (focusRunning)
                return;


            focusRunning = true;

            addXP(5);


            focusInterval =
                setInterval(() => {

                    if (
                        focusSeconds === 0
                    ) {

                        if (
                            focusMinutes === 0
                        ) {

                            clearInterval(
                                focusInterval
                            );

                            focusRunning =
                                false;

                            showToast(
                                "🎉 Sesión completada"
                            );

                            addXP(30);

                            return;

                        }

                        focusMinutes--;

                        focusSeconds =
                            59;

                    } else {

                        focusSeconds--;

                    }


                    renderFocusTimer();

                }, 1000);

        }
    );


document
    .getElementById("focusReset")
    ?.addEventListener(
        "click",
        () => {

            clearInterval(
                focusInterval
            );

            focusRunning = false;

            focusMinutes = 25;

            focusSeconds = 0;

            renderFocusTimer();

            showToast(
                "Temporizador reiniciado"
            );

        }
    );


renderFocusTimer();


/* ============================================================
   INICIO
============================================================ */

openSection("home");

console.log(
    "✨ Mind Glow Ultra Premium iniciado."
);
/* ============================================================
   MIND GLOW ULTRA PREMIUM — PATCH FINAL
   - Mute global real
   - SFX respetando mute
   - Juegos reales
   - XP únicamente al completar
   - Colegio interactivo
   ============================================================ */
(function () {
    'use strict';

    /* ---------- SONIDO GLOBAL ---------- */
    let soundEnabled = localStorage.getItem('mindGlowSound') !== 'off';
    let resumeAmbient = null;

    function renderSoundState() {
        document.body.classList.toggle('sound-muted', !soundEnabled);
        document.body.classList.toggle('sound-on', soundEnabled);
        const btn = document.getElementById('soundToggle');
        if (!btn) return;
        btn.innerHTML = soundEnabled
            ? '<i class="ph ph-speaker-high"></i>'
            : '<i class="ph ph-speaker-slash"></i>';
        btn.title = soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos';
        btn.setAttribute('aria-label', btn.title);
    }

    const oldPlayAmbient = window.playAmbient;
    if (typeof oldPlayAmbient === 'function') {
        window.playAmbient = function (type) {
            if (!soundEnabled) {
                showToast('🔇 El sonido está silenciado');
                return;
            }
            oldPlayAmbient(type);
        };
    }

    function sfx(kind = 'tap') {
        if (!soundEnabled) return;
        try {
            if (typeof createAudio === 'function') createAudio();
            if (!audioContext) return;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const now = audioContext.currentTime;
            const tones = {
                tap: [520, 0.055],
                good: [760, 0.11],
                bad: [180, 0.10],
                win: [920, 0.18]
            };
            const [freq, duration] = tones[kind] || tones.tap;
            osc.type = kind === 'bad' ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(Math.max(90, freq * 0.72), now + duration);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + duration + 0.02);
        } catch (e) {}
    }

    /* Reemplazamos el botón para retirar el listener antiguo y hacerlo un mute real. */
    const oldSoundBtn = document.getElementById('soundToggle');
    if (oldSoundBtn) {
        const soundBtn = oldSoundBtn.cloneNode(true);
        oldSoundBtn.replaceWith(soundBtn);
        soundBtn.addEventListener('click', () => {
            if (soundEnabled) {
                resumeAmbient = (typeof currentSound !== 'undefined' && currentSound) ? currentSound : null;
                soundEnabled = false;
                localStorage.setItem('mindGlowSound', 'off');
                if (typeof stopAmbient === 'function') stopAmbient();
                showToast('🔇 Sonidos silenciados');
            } else {
                soundEnabled = true;
                localStorage.setItem('mindGlowSound', 'on');
                showToast('🔊 Sonidos activados');
                if (resumeAmbient && typeof window.playAmbient === 'function') {
                    window.playAmbient(resumeAmbient);
                }
            }
            renderSoundState();
        });
    }
    renderSoundState();

    /* ---------- QUITAR XP POR ABRIR AMBIENTES ---------- */
    document.querySelectorAll('.sound-card').forEach(oldCard => {
        const card = oldCard.cloneNode(true);
        oldCard.replaceWith(card);
        card.addEventListener('click', () => {
            document.querySelectorAll('.sound-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            if (typeof window.playAmbient === 'function') window.playAmbient(card.dataset.sound);
            sfx('tap');
        });
    });

    /* ---------- ESTADO GLOBAL DE JUEGOS ---------- */
    let mindGlowPoints = Number(localStorage.getItem('mindGlowPoints') || 0);
    const gameBestScores = JSON.parse(localStorage.getItem('mindGlowGameScores') || '{}');

    function renderGamePoints() {
        const total = document.querySelectorAll('[data-mindglow-points], #totalPoints, #points, #gamePoints');
        total.forEach(el => { el.textContent = mindGlowPoints; });
    }

    function onGameComplete(score, xpEarned, gameId) {
        mindGlowPoints += Number(score) || 0;
        localStorage.setItem('mindGlowPoints', mindGlowPoints);
        if (gameId) {
            gameBestScores[gameId] = Math.max(Number(gameBestScores[gameId] || 0), Number(score) || 0);
            localStorage.setItem('mindGlowGameScores', JSON.stringify(gameBestScores));
        }
        if (gameId === 'bubble') {
            const el = document.getElementById('bubbleScore');
            if (el) el.textContent = gameBestScores.bubble || score || 0;
        } else if (gameId === 'focus') {
            const el = document.getElementById('focusScore');
            if (el) el.textContent = gameBestScores.focus || score || 0;
        } else if (gameId === 'memory') {
            const el = document.getElementById('memoryLevel');
            if (el) el.textContent = Math.max(1, Number(score) || 1);
        }
        renderGamePoints();
    }

    renderGamePoints();

    /* ---------- MODAL DE JUEGOS ---------- */
    const modal = document.createElement('div');
    modal.className = 'game-modal';
    modal.innerHTML = `
        <div class="game-modal-card" role="dialog" aria-modal="true">
            <div class="game-modal-top">
                <div>
                    <div class="game-modal-title" id="gameModalTitle">Mind Glow Game</div>
                    <div class="game-modal-subtitle" id="gameModalSubtitle">Una experiencia breve para cambiar de ritmo.</div>
                </div>
                <button class="game-close" id="gameModalClose" aria-label="Cerrar">×</button>
            </div>
            <div id="gameModalBody"></div>
        </div>`;
    document.body.appendChild(modal);

    const gameBody = modal.querySelector('#gameModalBody');
    const gameTitle = modal.querySelector('#gameModalTitle');
    const gameSubtitle = modal.querySelector('#gameModalSubtitle');
    let activeGame = null;
    let activeGameScore = 0;
    let activeGameXP = 0;
    let gameResultReported = false;

    const closeGame = () => {
        if (activeGame && !gameResultReported && activeGameScore > 0) {
            onGameComplete(activeGameScore, 0, activeGame);
        }
        modal.classList.remove('show');
        gameBody.innerHTML = '';
        if (gameTimer) clearInterval(gameTimer);
        if (gameCleanup) gameCleanup();
        gameTimer = null;
        gameCleanup = null;
        activeGame = null;
        activeGameScore = 0;
        activeGameXP = 0;
        gameResultReported = false;
    };
    modal.querySelector('#gameModalClose').addEventListener('click', closeGame);
    modal.addEventListener('click', e => { if (e.target === modal) closeGame(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGame(); });

    let gameTimer = null;
    let gameCleanup = null;

    function openGame(title, subtitle, html, gameId) {
        if (gameTimer) clearInterval(gameTimer);
        if (gameCleanup) gameCleanup();
        activeGame = gameId || null;
        activeGameScore = 0;
        activeGameXP = 0;
        gameResultReported = false;
        gameTitle.textContent = title;
        gameSubtitle.textContent = subtitle;
        gameBody.innerHTML = html;
        modal.classList.add('show');
    }

    function awardGameXP(amount, message, score = activeGameScore) {
        activeGameScore = Number(score) || 0;
        activeGameXP = Number(amount) || 0;
        if (!gameResultReported) {
            onGameComplete(activeGameScore, activeGameXP, activeGame);
            gameResultReported = true;
        }
        addXP(amount);
        sfx('win');
        showToast(message || `+${amount} XP ✨`);
    }

    function resultScreen(icon, title, text, xp) {
        gameBody.innerHTML = `
            <div class="game-result">
                <div class="game-result-icon">${icon}</div>
                <h3>${title}</h3>
                <p>${text}</p>
                <span class="xp-award">+${xp} XP · Desbloqueado por completar</span>
                <div style="margin-top:20px"><button class="primary-btn" id="closeResult">Continuar</button></div>
            </div>`;
        gameBody.querySelector('#closeResult').addEventListener('click', closeGame);
    }

    /* ---------- BUBBLE CALM ---------- */
    function startBubbleGame() {
        openGame('🫧 Bubble Calm', '30 segundos · alcanza 12 burbujas para ganar XP', `
            <div class="game-hud">
                <div class="game-stat">Puntos <strong id="bHudScore">0</strong></div>
                <div class="game-stat">Tiempo <strong id="bHudTime">30</strong>s</div>
                <div class="game-stat">Meta <strong>12</strong></div>
            </div>
            <div class="game-board" id="bubbleBoard"></div>`, 'bubble');
        const board = gameBody.querySelector('#bubbleBoard');
        let score = 0, time = 30, finished = false;
        const hudScore = gameBody.querySelector('#bHudScore');
        const hudTime = gameBody.querySelector('#bHudTime');
        const spawn = () => {
            if (finished) return;
            board.querySelectorAll('.bubble-target').forEach(b => b.remove());
            const b = document.createElement('button');
            b.className = 'bubble-target';
            b.setAttribute('aria-label', 'Burbuja');
            b.style.left = `${10 + Math.random() * 80}%`;
            b.style.top = `${12 + Math.random() * 76}%`;
            b.addEventListener('click', () => {
                if (finished) return;
                score++;
                activeGameScore = score;
                hudScore.textContent = score;
                sfx('good');
                if (score >= 12) finish(); else spawn();
            });
            board.appendChild(b);
        };
        const finish = () => {
            if (finished) return;
            finished = true;
            clearInterval(gameTimer);
            board.querySelectorAll('.bubble-target').forEach(b => b.remove());
            awardGameXP(20, '🫧 ¡Bubble Calm completado!');
            resultScreen('🫧', 'Muy bien', `Atrapaste ${score} burbujas. Entrar al juego no da XP: la recompensa se entrega al completar la meta.`, 20);
        };
        gameTimer = setInterval(() => {
            time--;
            hudTime.textContent = time;
            if (time <= 0) {
                clearInterval(gameTimer);
                if (score >= 12) finish();
                else {
                    finished = true;
                    resultScreen('🌱', 'Buen intento', `Conseguiste ${score} burbujas. La próxima puedes superar la meta de 12.`, 0);
                    sfx('bad');
                }
            }
        }, 1000);
        spawn();
    }

    /* ---------- FOCUS TAP ---------- */
    function startFocusTap() {
        openGame('⚡ Focus Tap', '20 objetivos · toca el objetivo que aparece', `
            <div class="game-hud">
                <div class="game-stat">Aciertos <strong id="fHudScore">0</strong>/20</div>
                <div class="game-stat">Tiempo <strong id="fHudTime">25</strong>s</div>
            </div>
            <div class="game-board" id="focusBoard"></div>`, 'focus');
        const board = gameBody.querySelector('#focusBoard');
        const scoreEl = gameBody.querySelector('#fHudScore');
        const timeEl = gameBody.querySelector('#fHudTime');
        let score = 0, time = 25, finished = false;
        const move = () => {
            board.querySelectorAll('.focus-target').forEach(x => x.remove());
            const target = document.createElement('button');
            target.className = 'focus-target';
            target.textContent = '✦';
            target.style.left = `${10 + Math.random() * 80}%`;
            target.style.top = `${12 + Math.random() * 76}%`;
            target.addEventListener('click', () => {
                score++;
                activeGameScore = score;
                scoreEl.textContent = score;
                sfx('good');
                if (score >= 20) finish(); else move();
            });
            board.appendChild(target);
        };
        const finish = () => {
            if (finished) return;
            finished = true;
            clearInterval(gameTimer);
            awardGameXP(25, '⚡ ¡Focus Tap completado!');
            resultScreen('⚡', 'Concentración lograda', 'Completaste los 20 objetivos. La XP se obtiene solo al terminar la partida.', 25);
        };
        gameTimer = setInterval(() => {
            time--;
            timeEl.textContent = time;
            if (time <= 0 && !finished) {
                clearInterval(gameTimer);
                finished = true;
                sfx('bad');
                resultScreen('🎯', 'Tiempo terminado', `Lograste ${score}/20 objetivos.`, 0);
            }
        }, 1000);
        move();
    }

    /* ---------- MEMORY GLOW ---------- */
    function startMemoryGame() {
        openGame('🧠 Memory Glow', '5 rondas · memoriza y repite la secuencia', `
            <div class="game-hud">
                <div class="game-stat">Ronda <strong id="mHudRound">1</strong>/5</div>
                <div class="game-stat">Estado <strong id="mHudState">Observa</strong></div>
            </div>
            <div class="game-board game-board-center" id="memoryBoard"></div>`, 'memory');
        const board = gameBody.querySelector('#memoryBoard');
        const roundEl = gameBody.querySelector('#mHudRound');
        const stateEl = gameBody.querySelector('#mHudState');
        let round = 1, sequence = [], input = [], locked = true, finished = false;
        const build = () => {
            board.innerHTML = '<div class="memory-grid" id="memoryGrid"></div>';
            const grid = board.querySelector('#memoryGrid');
            for (let i = 0; i < 8; i++) {
                const cell = document.createElement('button');
                cell.className = 'memory-cell';
                cell.dataset.index = i;
                cell.textContent = '✦';
                cell.addEventListener('click', () => press(i));
                grid.appendChild(cell);
            }
        };
        const flash = async () => {
            locked = true; input = [];
            stateEl.textContent = 'Observa';
            sequence = Array.from({length: round + 1}, () => Math.floor(Math.random() * 8));
            const cells = [...board.querySelectorAll('.memory-cell')];
            for (const index of sequence) {
                if (finished) return;
                cells[index].classList.add('lit'); sfx('tap');
                await new Promise(r => setTimeout(r, 430));
                cells[index].classList.remove('lit');
                await new Promise(r => setTimeout(r, 150));
            }
            locked = false; stateEl.textContent = 'Tu turno';
        };
        const press = index => {
            if (locked || finished) return;
            const cells = [...board.querySelectorAll('.memory-cell')];
            input.push(index); activeGameScore = round; cells[index].classList.add('lit');
            setTimeout(() => cells[index]?.classList.remove('lit'), 180);
            if (input[input.length - 1] !== sequence[input.length - 1]) {
                locked = true; sfx('bad');
                resultScreen('🧠', 'Casi lo tienes', `Llegaste hasta la ronda ${round}. Practicar también cuenta.`, 0);
                finished = true; return;
            }
            sfx('good');
            if (input.length === sequence.length) {
                if (round >= 5) {
                    finished = true; awardGameXP(30, '🧠 ¡Memory Glow completado!', 5);
                    resultScreen('🧠', 'Memoria brillante', 'Superaste las 5 rondas de la secuencia.', 30);
                } else {
                    round++; roundEl.textContent = round; locked = true;
                    setTimeout(flash, 600);
                }
            }
        };
        build(); flash();
    }

    /* ---------- REEMPLAZAR BOTONES DE JUEGO ---------- */
    const gameDefinitions = [
        ['bubbleGame', startBubbleGame],
        ['focusGame', startFocusTap],
        ['memoryGame', startMemoryGame]
    ];
    gameDefinitions.forEach(([id, handler]) => {
        const old = document.getElementById(id);
        if (!old) return;
        const fresh = old.cloneNode(true);
        old.replaceWith(fresh);
        fresh.addEventListener('click', handler);
    });

    /* ---------- ESCUELA: TARJETAS FUNCIONALES ---------- */
    const schoolDetails = {
        'Estudiantes': {
            icon:'🎓', title:'Estudiantes',
            text:'Un espacio pensado para acompañar el día a día escolar: organización, pausas de bienestar, herramientas de concentración y acceso directo a Glow AI.'
        },
        'Innovación': {
            icon:'💡', title:'Innovación',
            text:'Mind Glow integra diseño, inteligencia artificial y experiencias interactivas para convertir el bienestar escolar en una experiencia digital moderna.'
        },
        'Bienestar': {
            icon:'💚', title:'Bienestar',
            text:'Aquí reunimos herramientas de respiración, sonidos, juegos breves y recomendaciones generales para crear pequeños momentos de calma durante la jornada.'
        }
    };
    document.querySelectorAll('#section-school .info-card').forEach(card => {
        card.classList.add('school-card-clickable');
        card.setAttribute('role','button');
        card.setAttribute('tabindex','0');
        const title = card.querySelector('h3')?.textContent.trim();
        const open = () => {
            const data = schoolDetails[title];
            if (!data) return;
            // La tarjeta ya contiene la información de Estudiantes; no crear un segundo bloque.
            if (title === 'Estudiantes') {
                showToast('🎓 Estudiantes · Comunidad Mind Glow');
                sfx('tap');
                return;
            }
            document.querySelector('#section-school .school-detail')?.remove();
            const detail = document.createElement('div');
            detail.className = 'school-detail';
            detail.innerHTML = `<h3>${data.icon} ${data.title}</h3><p>${data.text}</p>`;
            document.querySelector('#section-school .school-grid')?.after(detail);
            sfx('tap');
        };
        card.addEventListener('click', open);
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });

    /* ---------- EVITAR XP POR INICIAR FOCUS ---------- */
    const oldFocusStart = document.getElementById('focusStart');
    if (oldFocusStart) {
        const fresh = oldFocusStart.cloneNode(true);
        oldFocusStart.replaceWith(fresh);
        fresh.addEventListener('click', () => {
            if (typeof focusRunning !== 'undefined' && focusRunning) return;
            focusRunning = true;
            showToast('🎯 Sesión de 25 minutos iniciada');
            sfx('tap');
            focusInterval = setInterval(() => {
                if (focusSeconds === 0) {
                    if (focusMinutes === 0) {
                        clearInterval(focusInterval); focusRunning = false;
                        addXP(30); sfx('win'); showToast('🎉 Sesión completada · +30 XP');
                        return;
                    }
                    focusMinutes--; focusSeconds = 59;
                } else focusSeconds--;
                renderFocusTimer();
            }, 1000);
        });
    }

    /* ---------- EVITAR XP AL INICIAR RESPIRACIÓN ---------- */
    const oldBreathing = document.getElementById('breathingStart');
    if (oldBreathing) {
        const fresh = oldBreathing.cloneNode(true);
        oldBreathing.replaceWith(fresh);
        fresh.addEventListener('click', () => {
            if (breathingRunning) return;
            breathingRunning = true; breathingSeconds = 60;
            showToast('🌿 Respiración iniciada'); sfx('tap');
            const updateBreathingPhase = () => {
                const elapsed = 60 - breathingSeconds;
                const phase = elapsed % 12; // 4 inhalar + 2 mantener + 6 exhalar
                if (phase < 4) {
                    breathingCircle?.classList.add('breathe');
                    if (breathingText) breathingText.textContent = 'INHALA';
                } else if (phase < 6) {
                    breathingCircle?.classList.add('breathe');
                    if (breathingText) breathingText.textContent = 'MANTÉN';
                } else {
                    breathingCircle?.classList.remove('breathe');
                    if (breathingText) breathingText.textContent = 'EXHALA';
                }
            };
            updateBreathingPhase();
            breathingInterval = setInterval(() => {
                breathingSeconds--;
                if (breathingTimer) breathingTimer.textContent = breathingSeconds + ' s';
                updateBreathingPhase();
                if (breathingSeconds <= 0) {
                    clearInterval(breathingInterval); breathingRunning = false;
                    breathingCircle?.classList.remove('breathe');
                    if (breathingText) breathingText.textContent = 'LISTO';
                    if (breathingTimer) breathingTimer.textContent = '60 s';
                    addXP(20); sfx('win'); showToast('🌿 Respiración completada · +20 XP');
                }
            }, 1000);
        });
    }

    console.log('✨ Mind Glow Ultra Premium — parche interactivo cargado.');
})();
