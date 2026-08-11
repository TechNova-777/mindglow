/* ============================================================
   MIND GLOW ULTRA PREMIUM
   SCRIPT.JS — VERSIÓN FUSIONADA
   Glow AI + navegación + XP + sonidos + bienestar + juegos
============================================================ */


/* ============================================================
   1. GLOW AI — BASE ORIGINAL
============================================================ */

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const clearChatBtn = document.getElementById("clear-chat-btn");
const typingIndicator = document.getElementById("typing-indicator");


function obtenerSaludo() {

    const hora = new Date().getHours();

    if (hora >= 5 && hora < 12)
        return "¡Buenos días!";

    if (hora >= 12 && hora < 19)
        return "¡Buenas tardes!";

    return "¡Buenas noches!";
}


/* ============================================================
   DETECTOR DE INTENCIONES
============================================================ */

function detectIntent(message) {

    const msg = message
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");


    if (msg.length < 3 && !msg.includes("ok"))
        return "SHORT_MSG";


    if (
        msg.includes("jaja") ||
        msg.includes("jeje") ||
        msg.includes("jiji") ||
        msg.includes("lol")
    )
        return "LAUGH";


    if (
        (msg.includes("cansad") && msg.includes("despertar")) ||
        msg.includes("energia diaria")
    )
        return "PHYSICAL_TIRED";


    if (
        msg.includes("espalda") ||
        msg.includes("dolor constante")
    )
        return "BACK_PAIN";


    if (
        msg.includes("palpitacion") ||
        msg.includes("corazon")
    )
        return "PALPITATIONS";


    if (
        msg.includes("ansiedad") ||
        msg.includes("panico") ||
        msg.includes("miedo") ||
        msg.includes("bloquea")
    )
        return "ANXIETY";


    if (
        msg.includes("dormir") ||
        msg.includes("sueño") ||
        msg.includes("noches")
    )
        return "SLEEP_ISSUES";


    if (
        msg.includes("estres") ||
        msg.includes("saturad") ||
        msg.includes("tarea") ||
        msg.includes("pesado")
    )
        return "STRESS";


    if (
        msg.includes("triste") ||
        msg.includes("mal") ||
        msg.includes("llorar") ||
        msg.includes("solo")
    )
        return "SADNESS";


    if (
        msg.includes("concentra") ||
        msg.includes("foco") ||
        msg.includes("distraig")
    )
        return "FOCUS";


    if (
        msg.includes("relaja") ||
        msg.includes("descans")
    )
        return "RELAXATION";


    if (
        msg.includes("alimentacion") ||
        msg.includes("cocinar") ||
        msg.includes("comer") ||
        msg.includes("comida")
    )
        return "DIET";


    if (
        msg.includes("ejercicio") ||
        msg.includes("rutina") ||
        msg.includes("deporte")
    )
        return "EXERCISE";


    if (
        msg.includes("especialista") ||
        msg.includes("medico") ||
        msg.includes("doctor") ||
        msg.includes("hospital")
    )
        return "SEEK_DOC";


    if (
        msg.includes("entorno") ||
        msg.includes("explicarle") ||
        msg.includes("padres") ||
        msg.includes("amigos")
    )
        return "SEEK_SUPPORT";


    if (
        msg.includes("informacion confiable") ||
        msg.includes("internet")
    )
        return "INFO_TRUST";


    if (
        msg.includes("tecnica") ||
        msg.includes("memorizar") ||
        msg.includes("aprender") ||
        msg.includes("estudio")
    )
        return "STUDY_HACKS";


    if (
        msg.includes("tiempo") ||
        msg.includes("organizar") ||
        msg.includes("horario")
    )
        return "TIME_MANAGEMENT";


    if (
        msg.includes("habito") ||
        msg.includes("saludable") ||
        msg.includes("consejo")
    )
        return "TIPS";


    if (
        msg.includes("messi") ||
        msg.includes("cristiano") ||
        msg.includes("ronaldo") ||
        msg.includes("futbol")
    )
        return "SPORTS";


    if (
        msg.includes("estoy bien") ||
        msg.includes("feliz") ||
        msg.includes("alegre")
    )
        return "GOOD_MOOD";


    if (
        msg.includes("repite") ||
        msg.includes("robot") ||
        msg.includes("automatico") ||
        msg.includes("ia")
    )
        return "BOT_AWARENESS";


    if (
        msg.includes("chiste") ||
        msg.includes("broma") ||
        msg.includes("reir")
    )
        return "JOKE";


    if (
        msg.includes("quien soy") ||
        msg.includes("quien eres") ||
        msg.includes("hola") ||
        msg.includes("ola")
    )
        return "GREETING";


    if (
        msg.includes("alien") ||
        msg.includes("videojuego") ||
        msg.includes("minecraft") ||
        msg.includes("gta") ||
        msg.includes("magia") ||
        msg.includes("mundial") ||
        msg.includes("peru")
    )
        return "RANDOM_TOPIC";


    return "GENERAL";
}


/* ============================================================
   RESPUESTAS DE GLOW AI
============================================================ */

function getGlowResponse(intent) {

    const respuestas = {

        SHORT_MSG: [
            "¡Te leo! ¿Quieres contarme un poco más? 🤔",
            "¿Todo bien? Puedes escribirme con confianza. ✨"
        ],

        LAUGH: [
            "¡Me alegra sacarte una sonrisa! 😄",
            "Jajaja, ¡qué bueno verte sonreír! ✨",
            "¡Qué bueno verte de buen ánimo! 💙"
        ],

        RANDOM_TOPIC: [
            "¡Jaja! Me encanta tu creatividad. 🤖✨",
            "Interesante tema. Aunque mi especialidad es ayudarte con tu bienestar. 💙",
            "Podemos hablar de eso y después volver a tus objetivos. 🚀"
        ],

        PHYSICAL_TIRED: [
            "Sentirse cansado al despertar puede tener muchas causas. Si es frecuente, cuéntaselo a un adulto de confianza o a un profesional de salud."
        ],

        BACK_PAIN: [
            "Si pasas mucho tiempo estudiando, intenta hacer pausas y cambiar de postura. Si el dolor continúa o empeora, habla con un adulto de confianza y un profesional de salud."
        ],

        PALPITATIONS: [
            "Las palpitaciones pueden aparecer por estrés, pero también pueden tener otras causas. Si son nuevas, frecuentes o te preocupan, cuéntaselo a un adulto de confianza y busca orientación médica."
        ],

        SLEEP_ISSUES: [
            "Una rutina tranquila antes de dormir puede ayudar: baja las pantallas, prepara tus cosas para mañana y prueba un sonido relajante. 🌙"
        ],

        DIET: [
            "Intenta mantener comidas regulares y variadas. Si tienes dudas sobre alimentación, lo mejor es hablar con un adulto de confianza o un profesional."
        ],

        EXERCISE: [
            "Moverte un poco durante el día puede ayudarte a despejarte. Elige una actividad que disfrutes y que sea adecuada para ti. 🌱"
        ],

        SEEK_DOC: [
            "Pedir ayuda profesional es una buena decisión. Puedes hablar primero con un adulto de confianza para encontrar el apoyo adecuado. 💙"
        ],

        SEEK_SUPPORT: [
            "Puedes decir algo sencillo como: 'Últimamente no me estoy sintiendo muy bien y me gustaría hablar contigo'. No tienes que explicarlo todo de una vez."
        ],

        INFO_TRUST: [
            "Para temas de salud, intenta utilizar fuentes oficiales o profesionales y evita autodiagnosticarte con contenido de redes sociales."
        ],

        TIPS: [
            "Prueba una cosa a la vez: organiza tus tareas, haz pausas y reserva unos minutos para descansar. 🌱"
        ],

        SPORTS: [
            "¡El deporte puede ser una buena forma de despejar la mente! ⚽"
        ],

        GOOD_MOOD: [
            "¡Qué bueno leer eso! ✨ Disfruta este momento y aprovecha esa energía."
        ],

        BOT_AWARENESS: [
            "¡Me atrapaste! 🤖 Soy Glow AI, parte de Mind Glow."
        ],

        STRESS: [
            "Entiendo. Vamos paso a paso. ¿Qué es lo más urgente que necesitas resolver ahora?"
        ],

        ANXIETY: [
            "Vamos a bajar el ritmo. Mira a tu alrededor y menciona mentalmente algunas cosas que ves, escuchas y puedes tocar. Respira lentamente. 💙"
        ],

        SADNESS: [
            "Siento que estés pasando por un momento difícil. Hablar con alguien de confianza puede ayudarte a no llevarlo todo tú solo. 🫂"
        ],

        GREETING: [
            `${obtenerSaludo()} Soy Glow AI ✨. Estoy aquí para escucharte. ¿Qué necesitas hoy?`
        ],

        FOCUS: [
            "Prueba trabajar durante unos minutos sin distracciones y luego haz una pequeña pausa. 🎯"
        ],

        RELAXATION: [
            "Puedes probar uno de los sonidos relajantes de Mind Glow o hacer una respiración lenta durante un minuto. 🌿"
        ],

        STUDY_HACKS: [
            "Divide el tema en partes pequeñas, intenta recordarlo sin mirar y después comprueba tus respuestas. 📚"
        ],

        TIME_MANAGEMENT: [
            "Haz una lista corta con tres prioridades. Empieza por una sola y evita intentar resolver todo al mismo tiempo."
        ],

        GENERAL: [
            "¡Qué interesante! Cuéntame un poco más. 🤔",
            "Estoy aquí para escucharte. ¿Qué quieres conseguir o resolver?",
            "Podemos buscar juntos una forma sencilla de abordar eso. ✨"
        ]
    };


    const respuesta = respuestas[intent] || respuestas.GENERAL;

    return Array.isArray(respuesta)
        ? respuesta[Math.floor(Math.random() * respuesta.length)]
        : respuesta;
}


/* ============================================================
   CHAT
============================================================ */

function appendMessage(text, isAi = false) {

    if (!chatMessages)
        return;

    const msgDiv = document.createElement("div");

    msgDiv.classList.add(
        "message",
        isAi ? "ai-message" : "user-message"
    );

    const content = document.createElement("div");

    content.className = "message-content";

    content.textContent = text;

    msgDiv.appendChild(content);

    chatMessages.appendChild(msgDiv);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}


function showTyping(show) {

    if (!typingIndicator)
        return;

    typingIndicator.classList.toggle(
        "hidden",
        !show
    );

    if (chatMessages)
        chatMessages.scrollTop =
            chatMessages.scrollHeight;
}


window.sendQuickMessage = function(text) {

    if (!chatInput || !chatForm)
        return;

    chatInput.value = text;

    chatForm.dispatchEvent(
        new Event("submit")
    );
};


chatForm?.addEventListener("submit", event => {

    event.preventDefault();

    const text =
        chatInput?.value.trim();

    if (!text)
        return;

    appendMessage(text, false);

    chatInput.value = "";

    showTyping(true);

    const intent =
        detectIntent(text);

    const response =
        getGlowResponse(intent);

    let delay =
        500 + response.length * 20;

    delay =
        Math.min(delay, 2500);

    setTimeout(() => {

        showTyping(false);

        appendMessage(
            response,
            true
        );

        playUISound("message");

    }, delay);
});


clearChatBtn?.addEventListener(
    "click",
    () => {

        if (!chatMessages)
            return;

        chatMessages.innerHTML = `
            <div class="message ai-message">
                <div class="message-content">
                    Chat reiniciado. ${obtenerSaludo()}
                    ¿En qué te puedo ayudar ahora? ✨
                </div>
            </div>
        `;

        playUISound("click");
    }
);


/* ============================================================
   2. NAVEGACIÓN
============================================================ */

const navItems =
    document.querySelectorAll(".nav-item");

const sections =
    document.querySelectorAll(".page-section");

const pageSubtitle =
    document.getElementById("pageSubtitle");


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

        section.classList.remove(
            "active"
        );

    });


    const target =
        document.getElementById(
            "section-" + sectionName
        );


    if (target)
        target.classList.add("active");


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

    item.addEventListener(
        "click",
        () => {

            openSection(
                item.dataset.section
            );

            playUISound("click");
        }
    );

});


document
    .querySelectorAll("[data-go]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openSection(
                    button.dataset.go
                );

                playUISound("click");
            }
        );

    });


/* ============================================================
   3. MENÚ MÓVIL
============================================================ */

const menuBtn =
    document.getElementById("menuBtn");

const closeMenu =
    document.getElementById("closeMenu");

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById(
        "sidebarOverlay"
    );


menuBtn?.addEventListener(
    "click",
    () => {

        sidebar?.classList.add(
            "open"
        );

        playUISound("click");
    }
);


closeMenu?.addEventListener(
    "click",
    () => {

        sidebar?.classList.remove(
            "open"
        );
    }
);


overlay?.addEventListener(
    "click",
    () => {

        sidebar?.classList.remove(
            "open"
        );
    }
);


/* ============================================================
   4. TOAST
============================================================ */

const toast =
    document.getElementById("toast");

const toastText =
    document.getElementById("toastText");


let toastTimeout;


function showToast(message) {

    if (!toast || !toastText)
        return;

    toastText.textContent =
        message;

    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2500);
}


/* ============================================================
   5. XP
   IMPORTANTE:
   Entrar ≠ XP
   Jugar ≠ XP
   Completar = XP
============================================================ */

let mindGlowXP =
    Number(
        localStorage.getItem(
            "mindGlowXP"
        ) || 0
    );


function updateXP() {

    const level =
        Math.floor(
            mindGlowXP / 100
        ) + 1;

    const progress =
        mindGlowXP % 100;


    const levelElement =
        document.getElementById(
            "level"
        );

    const xpText =
        document.getElementById(
            "xpText"
        );

    const xpProgress =
        document.getElementById(
            "xpProgress"
        );


    if (levelElement)
        levelElement.textContent =
            level;


    if (xpText)
        xpText.textContent =
            mindGlowXP + " XP";


    if (xpProgress)
        xpProgress.style.width =
            progress + "%";
}


function addXP(amount) {

    if (!amount || amount <= 0)
        return;

    mindGlowXP += amount;

    localStorage.setItem(
        "mindGlowXP",
        mindGlowXP
    );

    updateXP();

    showToast(
        "+" + amount + " XP ✨"
    );

    playUISound("xp");
}


updateXP();


/* ============================================================
   6. SISTEMA GLOBAL DE SONIDO
============================================================ */

let audioContext = null;

let soundTimer = null;

let currentSound = null;

let soundEnabled =
    localStorage.getItem(
        "mindGlowSound"
    ) !== "off";


function createAudio() {

    if (!soundEnabled)
        return;

    if (!audioContext) {

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

    }


    if (
        audioContext.state ===
        "suspended"
    ) {

        audioContext.resume();

    }
}


/* ============================================================
   SONIDOS DE INTERFAZ
============================================================ */

function playTone(
    frequency,
    duration = 0.08,
    volume = 0.04
) {

    if (!soundEnabled)
        return;

    createAudio();

    if (!audioContext)
        return;


    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();


    oscillator.type = "sine";

    oscillator.frequency.value =
        frequency;


    gain.gain.setValueAtTime(
        volume,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime +
            duration
    );


    oscillator.connect(gain);

    gain.connect(
        audioContext.destination
    );


    oscillator.start();

    oscillator.stop(
        audioContext.currentTime +
            duration
    );
}


function playUISound(type) {

    if (!soundEnabled)
        return;


    if (type === "click")
        playTone(520, 0.06, 0.025);


    if (type === "success") {

        playTone(660, 0.08, 0.035);

        setTimeout(
            () =>
                playTone(
                    880,
                    0.12,
                    0.035
                ),
            80
        );
    }


    if (type === "error")
        playTone(
            220,
            0.12,
            0.03
        );


    if (type === "message")
        playTone(
            700,
            0.05,
            0.018
        );


    if (type === "xp") {

        playTone(
            700,
            0.06,
            0.025
        );

        setTimeout(
            () =>
                playTone(
                    1000,
                    0.1,
                    0.025
                ),
            70
        );
    }
}


/* ============================================================
   AMBIENTES
============================================================ */

function playAmbient(type) {

    if (!soundEnabled)
        return;


    createAudio();

    if (!audioContext)
        return;


    stopAmbient();


    currentSound = type;


    const status =
        document.getElementById(
            "soundStatus"
        );


    if (status) {

        status.textContent =
            "🔊 Reproduciendo: " +
            type;

    }


    let baseFrequency = 180;


    if (type === "ocean")
        baseFrequency = 120;


    if (type === "forest")
        baseFrequency = 220;


    if (type === "night")
        baseFrequency = 80;


    if (type === "rain")
        baseFrequency = 150;


    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();


    oscillator.type =
        "sine";

    oscillator.frequency.value =
        baseFrequency;


    gain.gain.value =
        0.012;


    oscillator.connect(gain);

    gain.connect(
        audioContext.destination
    );


    oscillator.start();


    soundTimer =
        setInterval(() => {

            if (!soundEnabled)
                return;

            oscillator.frequency.value =
                baseFrequency +
                Math.random() * 25;

        }, 1500);


    window.mindGlowOscillator =
        oscillator;

    window.mindGlowGain =
        gain;


    showToast(
        "Ambiente " +
        type +
        " activado 🎧"
    );
}


function stopAmbient() {

    if (soundTimer) {

        clearInterval(
            soundTimer
        );

        soundTimer = null;
    }


    if (
        window.mindGlowOscillator
    ) {

        try {

            window
                .mindGlowOscillator
                .stop();

        } catch (error) {}

        window.mindGlowOscillator =
            null;
    }


    currentSound = null;


    const status =
        document.getElementById(
            "soundStatus"
        );


    if (status) {

        status.textContent =
            "🔇 Selecciona un ambiente";

    }


    document
        .querySelectorAll(
            ".sound-card"
        )
        .forEach(card => {

            card.classList.remove(
                "active"
            );

        });
}


/* ============================================================
   TARJETAS DE SONIDO
============================================================ */

document
    .querySelectorAll(".sound-card")
    .forEach(card => {

        card.addEventListener(
            "click",
            () => {

                if (!soundEnabled) {

                    showToast(
                        "🔇 El sonido está silenciado"
                    );

                    return;
                }


                const sound =
                    card.dataset.sound;


                document
                    .querySelectorAll(
                        ".sound-card"
                    )
                    .forEach(c =>
                        c.classList.remove(
                            "active"
                        )
                    );


                card.classList.add(
                    "active"
                );


                playAmbient(sound);
            }
        );

    });


/* ============================================================
   BOTÓN GLOBAL MUTE
============================================================ */

const soundToggle =
    document.getElementById(
        "soundToggle"
    );


function updateSoundButton() {

    if (!soundToggle)
        return;


    const icon =
        soundToggle.querySelector(
            "i"
        );


    if (!icon)
        return;


    if (soundEnabled) {

        icon.className =
            "ph ph-speaker-high";

        soundToggle.title =
            "Silenciar sonidos";

    } else {

        icon.className =
            "ph ph-speaker-slash";

        soundToggle.title =
            "Activar sonidos";

    }
}


function setSoundEnabled(enabled) {

    soundEnabled = enabled;


    localStorage.setItem(
        "mindGlowSound",
        enabled
            ? "on"
            : "off"
    );


    if (!enabled) {

        stopAmbient();

        showToast(
            "🔇 Sonidos silenciados"
        );

    } else {

        showToast(
            "🔊 Sonidos activados"
        );

    }


    updateSoundButton();
}


soundToggle?.addEventListener(
    "click",
    () => {

        setSoundEnabled(
            !soundEnabled
        );

    }
);


updateSoundButton();


/* ============================================================
   7. RESPIRACIÓN
============================================================ */

let breathingRunning =
    false;

let breathingInterval =
    null;

let breathingSeconds =
    60;


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
    .getElementById(
        "breathingStart"
    )
    ?.addEventListener(
        "click",
        startBreathing
    );


function startBreathing() {

    if (breathingRunning)
        return;


    breathingRunning =
        true;

    breathingSeconds =
        60;


    playUISound(
        "click"
    );


    breathingInterval =
        setInterval(() => {

            breathingSeconds--;


            if (breathingTimer)
                breathingTimer.textContent =
                    breathingSeconds +
                    " s";


            const elapsed =
                60 -
                breathingSeconds;


            const phase =
                elapsed % 8;


            if (phase < 4) {

                breathingCircle
                    ?.classList
                    .add("breathe");


                if (breathingText)
                    breathingText.textContent =
                        "INHALA";

            } else {

                breathingCircle
                    ?.classList
                    .remove(
                        "breathe"
                    );


                if (breathingText)
                    breathingText.textContent =
                        "EXHALA";
            }


            if (
                breathingSeconds <=
                0
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

                playUISound(
                    "success"
                );
            }

        }, 1000);
}


/* ============================================================
   8. BUBBLE CALM
   AHORA NO DA XP POR HACER CLICK.
   SOLO DA XP AL COMPLETAR LA PARTIDA.
============================================================ */

let bubbleScore = 0;

let bubbleHits = 0;

let bubbleGameRunning =
    false;

let bubbleStartTime = 0;

const bubbleGame =
    document.getElementById(
        "bubbleGame"
    );


bubbleGame?.addEventListener(
    "click",
    event => {

        if (!bubbleGameRunning) {

            bubbleGameRunning =
                true;

            bubbleStartTime =
                Date.now();

            bubbleScore = 0;

            bubbleHits = 0;

            showToast(
                "🫧 ¡Comenzaste Bubble Calm!"
            );
        }


        bubbleHits++;


        bubbleScore +=
            Math.floor(
                Math.random() * 10
            ) + 1;


        const score =
            document.getElementById(
                "bubbleScore"
            );


        if (score)
            score.textContent =
                bubbleScore;


        playUISound(
            "success"
        );


        /*
           10 interacciones = partida completada
        */

        if (bubbleHits >= 10) {

            bubbleGameRunning =
                false;


            addXP(15);


            showToast(
                "🫧 ¡Bubble Calm completado! +15 XP"
            );


            playUISound(
                "success"
            );
        }

    }
);


/* ============================================================
   9. FOCUS TAP
============================================================ */

let focusScore = 0;

let focusHits = 0;

let focusGameRunning =
    false;


const focusGame =
    document.getElementById(
        "focusGame"
    );


focusGame?.addEventListener(
    "click",
    event => {

        if (!focusGameRunning) {

            focusGameRunning =
                true;

            focusScore = 0;

            focusHits = 0;

            showToast(
                "⚡ ¡Focus Tap iniciado!"
            );
        }


        focusHits++;

        focusScore++;


        const score =
            document.getElementById(
                "focusScore"
            );


        if (score)
            score.textContent =
                focusScore;


        playUISound(
            "success"
        );


        /*
           10 aciertos = victoria
        */

        if (focusHits >= 10) {

            focusGameRunning =
                false;


            addXP(20);


            showToast(
                "⚡ ¡Excelente enfoque! +20 XP"
            );


            playUISound(
                "success"
            );
        }

    }
);


/* ============================================================
   10. MEMORY GLOW
============================================================ */

let memoryLevel = 1;

let memoryClicks = 0;

let memoryGameRunning =
    false;


const memoryGame =
    document.getElementById(
        "memoryGame"
    );


memoryGame?.addEventListener(
    "click",
    () => {

        if (!memoryGameRunning) {

            memoryGameRunning =
                true;

            memoryClicks = 0;

            memoryLevel = 1;

            showToast(
                "🧠 ¡Memory Glow iniciado!"
            );
        }


        memoryClicks++;

        memoryLevel =
            Math.min(
                memoryLevel + 1,
                5
            );


        const level =
            document.getElementById(
                "memoryLevel"
            );


        if (level)
            level.textContent =
                memoryLevel;


        playUISound(
            "click"
        );


        /*
           5 niveles = completado
        */

        if (memoryClicks >= 5) {

            memoryGameRunning =
                false;


            addXP(25);


            showToast(
                "🧠 ¡Memoria completada! +25 XP"
            );


            playUISound(
                "success"
            );
        }

    }
);


/* ============================================================
   11. FOCUS TIMER
   XP SOLO AL FINAL
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
        String(
            focusMinutes
        ).padStart(2, "0");


    const seconds =
        String(
            focusSeconds
        ).padStart(2, "0");


    if (focusTimer) {

        focusTimer.textContent =
            minutes +
            ":" +
            seconds;

    }
}


document
    .getElementById(
        "focusStart"
    )
    ?.addEventListener(
        "click",
        () => {

            if (focusRunning)
                return;


            focusRunning =
                true;


            showToast(
                "🎯 Sesión de enfoque iniciada"
            );


            playUISound(
                "click"
            );


            focusInterval =
                setInterval(() => {

                    if (
                        focusSeconds ===
                        0
                    ) {

                        if (
                            focusMinutes ===
                            0
                        ) {

                            clearInterval(
                                focusInterval
                            );


                            focusRunning =
                                false;


                            showToast(
                                "🎉 Sesión completada"
                            );


                            /*
                               XP SOLO AQUÍ
                            */

                            addXP(30);


                            playUISound(
                                "success"
                            );


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
    .getElementById(
        "focusReset"
    )
    ?.addEventListener(
        "click",
        () => {

            clearInterval(
                focusInterval
            );


            focusRunning =
                false;


            focusMinutes =
                25;

            focusSeconds =
                0;


            renderFocusTimer();


            showToast(
                "Temporizador reiniciado"
            );


            playUISound(
                "click"
            );
        }
    );


renderFocusTimer();


/* ============================================================
   12. TARJETAS DEL COLEGIO
   ESTUDIANTES / INNOVACIÓN / BIENESTAR
============================================================ */

const schoolCards =
    document.querySelectorAll(
        ".school-grid .info-card"
    );


schoolCards.forEach(
    (card, index) => {

        card.style.cursor =
            "pointer";


        card.setAttribute(
            "role",
            "button"
        );


        card.addEventListener(
            "click",
            () => {

                const titles = [
                    "👨‍🎓 Estudiantes",
                    "💡 Innovación",
                    "💚 Bienestar"
                ];


                const messages = [

                    "Un espacio creado para acompañar a los estudiantes en su día a día escolar.",

                    "Mind Glow combina tecnología e innovación para crear herramientas digitales de bienestar.",

                    "El bienestar es el centro de Mind Glow: pausas, respiración, sonidos, juegos y acompañamiento."
                ];


                showToast(
                    titles[index] +
                    " — " +
                    messages[index]
                );


                playUISound(
                    "click"
                );

            }
        );

    }
);


/* ============================================================
   13. ATAJOS DE TECLADO
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        /*
           M = mute
        */

        if (
            event.key.toLowerCase() ===
            "m"
        ) {

            setSoundEnabled(
                !soundEnabled
            );

        }

    }
);


/* ============================================================
   14. INICIO
============================================================ */

openSection(
    "home"
);


console.log(
    "✨ Mind Glow Ultra Premium iniciado correctamente."
);