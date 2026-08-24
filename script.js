'use strict';
/* ============================================================
   MIND GLOW 3.0 — Motor principal
   Para login con Google: pega tu Client ID OAuth en la línea 9.
   console.cloud.google.com → Credenciales → OAuth (tipo Web)
   ============================================================ */
const GOOGLE_CLIENT_ID = ''; // ← PEGA AQUÍ TU CLIENT ID DE GOOGLE
const FORMSPREE_ID     = 'mqpzondw'; // ← ID de Formspree: los comentarios llegan al correo del equipo
const DONATE_YAPE      = '999 888 777'; // ← CAMBIA por el número de Yape del equipo
const DONATE_PLIN      = '999 888 777'; // ← CAMBIA por el número de Plin
const DONATE_KOFI      = '';            // ← opcional: enlace tipo https://ko-fi.com/mindglow

/* ---------- Utilidades ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const KEY = 'mindGlow3';

function today(){ return new Date().toISOString().slice(0,10); }
function fmt(s){ if(!Number.isFinite(s)) return '0:00'; return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'); }
function esc(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function firstName(){ return (state.user && state.user.name) ? state.user.name.split(' ')[0] : ''; }

/* ---------- Estado ---------- */
const defaultState = {
  xp:0, level:1, mood:null, calm:0, focus:0, games:0,
  tasks:[], journal:[], sound:true, reduced:false,
  streak:0, highScores:{}, lastDate:null, aiMemory:[],
  user:null,
  team:[{name:'JACK'},{name:'CAMILA'},{name:'CLARA'},{name:'ANDREA'},{name:'EDISON'}],
  feedback:[]
};
let state = loadState();

function loadState(){
  try{
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const s = Object.assign({}, defaultState, raw);
    s.highScores = (s.highScores && typeof s.highScores === 'object') ? s.highScores : {};
    s.aiMemory   = Array.isArray(s.aiMemory) ? s.aiMemory : [];
    s.tasks      = Array.isArray(s.tasks) ? s.tasks : [];
    s.journal    = Array.isArray(s.journal) ? s.journal : [];
    s.feedback   = Array.isArray(s.feedback) ? s.feedback : [];
    s.team       = Array.isArray(s.team) ? s.team : [];
    if(!s.team.length || s.team.some(m => m.role) ||
       (s.team.length===1 && s.team[0].name==='Jack'))
      s.team = [{name:'JACK'},{name:'CAMILA'},{name:'CLARA'},{name:'ANDREA'},{name:'EDISON'}];
    return s;
  }catch(e){ return JSON.parse(JSON.stringify(defaultState)); }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); updateUI(); }

/* ---------- Audio base ---------- */
let actx = null;
function ensureCtx(){
  if(!actx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    actx = new AC();
  }
  if(actx.state === 'suspended') actx.resume();
  return actx;
}
function sfx(type){
  if(!state.sound) return;
  const ctx = ensureCtx(); if(!ctx) return;
  const map = { click:[520,.06,.03], good:[760,.09,.035], bad:[190,.14,.04],
                win:[900,.2,.05], xp:[700,.07,.03], crunch:[120,.16,.05] };
  const m = map[type] || map.click;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = (type==='crunch') ? 'sawtooth' : 'triangle';
  o.frequency.value = m[0];
  g.gain.setValueAtTime(.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(m[2], ctx.currentTime + .01);
  g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + m[1]);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + m[1] + .02);
}

/* ---------- Toast / XP / Racha ---------- */
let toastT = null;
function toast(t){
  const el = $('#toast'); if(!el) return;
  el.textContent = t; el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2200);
}
function xp(n){
  n = Math.max(0, Math.round(n));
  state.xp += n;
  const nl = Math.floor(state.xp/100) + 1;
  if(nl > state.level){ state.level = nl; toast('🌌 ¡Nivel '+nl+' alcanzado!'); }
  save(); sfx('xp'); toast('+'+n+' XP ✨');
}
function ensureStreak(){
  const d = today();
  if(state.lastDate === d) return;
  if(state.lastDate){
    const diff = Math.round((new Date(d) - new Date(state.lastDate))/86400000);
    state.streak = (diff === 1) ? state.streak + 1 : 1;
  } else state.streak = 1;
  state.lastDate = d; save();
}

/* ---------- Navegación ---------- */
const NAV = [['home','⌂','Inicio'],['ai','✦','Glow AI'],['calm','◌','Calma'],
  ['arcade','⌁','Arcade'],['focus','◷','Focus'],['tasks','✓','Tareas'],
  ['journal','▱','Diario'],['school','🏫','Mi colegio'],['space','✧','Glow Space'],
  ['profile','○','Perfil']];

function buildNav(){
  $('#navList').innerHTML = NAV.map(n =>
    '<button class="nav-item" data-view="'+n[0]+'"><span>'+n[1]+'</span><b>'+n[2]+'</b></button>').join('');
}
function showView(v){
  $$('.view').forEach(x => x.classList.toggle('active', x.id === 'view-'+v));
  $$('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === v));
  const labels = {}; NAV.forEach(n => labels[n[0]] = n[2]);
  labels.settings = 'Configuración';
  $('#pageTitle').textContent  = labels[v] || 'Mind Glow';
  $('#pageKicker').textContent = 'MIND GLOW 3.0 · ' + (labels[v]||'').toUpperCase();
  if(v === 'tasks')   renderTasks();
  if(v === 'journal') renderJournal();
  if(v === 'school')  renderTeam();
  if(v === 'profile'){ renderTeam(); authInit(); }
  if(innerWidth < 800) $('#sidebar').classList.remove('open');
}

/* ---------- UpdateUI / Logros / Usuario ---------- */
function updateUI(){
  const pct = state.xp % 100;
  $('#xpValue').textContent = state.xp;
  $('#levelValue').textContent = state.level;
  $('#xpBar').style.width = pct + '%';
  $('#xpHint').textContent = (100-pct) + ' XP para el siguiente nivel';
  $('#profileLevel').textContent = state.level;
  $('#profileXP').textContent = state.xp;
  $('#profileXPBar').style.width = pct + '%';
  $('#spaceLevel').textContent = state.level;
  $('#spaceXP').textContent = state.xp;
  $('#statCalm').textContent = state.calm;
  $('#statFocus').textContent = state.focus;
  $('#statGames').textContent = state.games;
  $('#statTasks').textContent = state.tasks.filter(t=>t.done).length;
  $('#dailyStreak').textContent = 'Racha ' + state.streak + ' días';
  $('#globalGames').textContent = state.games;
  const highs = Object.values(state.highScores||{});
  $('#globalHigh').textContent = highs.length ? Math.max.apply(null,highs) : 0;
  $('#settingsSound').checked = state.sound;
  $('#settingsMotion').checked = state.reduced;
  $('#moodLabel').textContent = state.mood ? (state.mood.emoji+' '+state.mood.label) : 'Sin registrar';
  renderAchievements();
  Space.sync();
}
function renderAchievements(){
  const el = $('#achievements'); if(!el) return;
  const arr = [
    ['🌱','Primera pausa', state.calm>0],
    ['🎯','Primer Focus',  state.focus>0],
    ['🎮','Primer juego',  state.games>0],
    ['✨','100 XP',        state.xp>=100],
    ['🌌','Nivel 5',       state.level>=5],
    ['🔥','Racha 7 días',  state.streak>=7]
  ];
  el.innerHTML = arr.map(a =>
    '<div class="achievement'+(a[2]?'':' locked')+'"><span>'+a[0]+'</span><b>'+a[1]+'</b><small>'+
    (a[2]?'Desbloqueado':'Bloqueado')+'</small></div>').join('');
}
function renderUser(){
  const u = state.user || {};
  const name = u.name || 'Invitado';
  const initial = (name[0]||'J').toUpperCase();
  const pic = u.picture ? esc(u.picture) : '';
  $('#bigAvatar').innerHTML  = pic ? '<img src="'+pic+'" alt="">': initial;
  $('#profileBtn').innerHTML = pic ? '<img src="'+pic+'" alt="">' : initial;
  $('#profileName').textContent = name;
  $('#userEmail').textContent = u.email || '';
  const f = firstName();
  $('#heroEyebrow').textContent = 'BUENOS DÍAS' + (f ? ', '+f.toUpperCase() : '') + ' · I.E. SAN JOSÉ OBRERO';
}

/* ---------- Cuenta: Gmail + nombre manual ---------- */
function authInit(){
  const area = $('#authArea'); if(!area) return;
  area.innerHTML = '';
  if(state.user && state.user.name){
    area.innerHTML = '<button class="btn ghost" id="signOutBtn">Cerrar sesión</button>';
    $('#signOutBtn').addEventListener('click', signOut);
    return;
  }
  const manual =
    '<form class="auth-manual" id="manualForm">'+
      '<input class="text-input" id="manualName" placeholder="Tu nombre" required>'+
      '<button class="btn primary">Entrar con mi nombre</button></form>';
  const hint =
    '<p class="auth-hint">💡 Para «Continuar con Google»: crea un ID de cliente OAuth (tipo Web) en '+
    'console.cloud.google.com, autoriza el origen donde alojes la web y pégalo en GOOGLE_CLIENT_ID '+
    '(línea 9 de script.js).</p>';

  if(GOOGLE_CLIENT_ID && window.google && window.google.accounts && window.google.accounts.id){
    area.innerHTML = '<div id="googleBtnWrap"></div>' + manual + hint;
    try{
      google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogleCredential });
      google.accounts.id.renderButton($('#googleBtnWrap'),
        { theme:'filled_black', size:'large', text:'continue_with', shape:'pill', locale:'es' });
    }catch(e){ /* botón no disponible */ }
  } else {
    area.innerHTML = manual + hint;
  }
  const mf = $('#manualForm');
  mf.addEventListener('submit', ev => {
    ev.preventDefault();
    const n = $('#manualName').value.trim();
    if(n) setUser({ name:n });
  });
}
function onGoogleCredential(res){
  try{
    const b64 = res.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const payload = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(b64), c => c.charCodeAt(0))));
    setUser({ name: payload.name || payload.email || 'Usuario',
              email: payload.email || '', picture: payload.picture || '' });
  }catch(e){ toast('No se pudo leer la cuenta de Google'); }
}
function setUser(u){
  state.user = u; save(); renderUser(); authInit();
  sfx('good'); toast('👋 ¡Hola, '+firstName()+'!');
}
function signOut(){
  try{ if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); }catch(e){}
  state.user = null; save(); renderUser(); authInit(); toast('Sesión cerrada');
}

/* ---------- Home: check-in de ánimo ---------- */
const REC = {
  'Estresado'  : ['Baja el ritmo.','Prueba 1 minuto de respiración.'],
  'Preocupado' : ['Un paso a la vez.','Organiza una cosa y luego vuelve a lo demás.'],
  'Triste'     : ['No tienes que resolverlo todo ahora.','Escribir puede ayudarte a ordenar lo que sientes.'],
  'Muy bien'   : ['Mantén ese impulso.','Prueba un reto rápido en Arcade.'],
  'Bien'       : ['Buen momento para avanzar.','Una sesión Focus puede ayudarte.'],
  'Normal'     : ['Haz un check-in contigo.','Elige según lo que necesites ahora.']
};
function moodInit(){
  $('#moodRow').addEventListener('click', e => {
    const b = e.target.closest('button[data-mood]'); if(!b) return;
    $$('#moodRow button').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    const p = b.dataset.mood.split('|');
    state.mood = { emoji:p[0], label:p[1], date:today() };
    const r = REC[p[1]] || ['Una pausa también es avanzar.','Prueba una herramienta de Mind Glow.'];
    $('#recommendTitle').textContent = r[0];
    $('#recommendText').textContent  = r[1];
    xp(5); sfx('good');
  });
}

/* ---------- Glow AI ---------- */
function aiInit(){
  const box = $('#chatMessages'), input = $('#chatInput');
  function add(t, who, actions){
    const d = document.createElement('div');
    d.className = 'bubble ' + who;
    t.split('\n').forEach((line,i) => {
      if(i) d.appendChild(document.createElement('br'));
      d.appendChild(document.createTextNode(line));
    });
    if(actions && actions.length){
      const row = document.createElement('div');
      row.className = 'bubble-actions';
      actions.forEach(a => {
        const b = document.createElement('button');
        b.type='button'; b.className='chat-action-btn'; b.textContent=a[0];
        b.addEventListener('click', () => { showView(a[1]); sfx('click'); toast('Abriendo '+a[0]); });
        row.appendChild(b);
      });
      d.appendChild(row);
    }
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
  add('Hola'+(firstName()?', '+firstName():'')+'. Soy Glow AI 3.0. Te ayudo a bajar el estrés, organizarte, concentrarte o elegir un juego. ¿Qué necesitas?','ai');

  /* --- Preguntas de conversación: respuestas divertidas --- */
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const FUNNY = [
    [/leer la mente|ver el futuro/, ['Leer mentes sería invasivo 👀… prefiero ver el futuro: así te confirmo que tu examen VA a salir bien 🔮']],
    [/millon|1 millon|ganas.*dolares/, ['Con un millón: compro servidores para existir en paz ☁️ y te financio tu videojuego 🎮 ¿tú qué comprarías primero?']],
    [/vergonzos/, ['Confesión: una vez saludé a alguien que NO era para mí… y soy una IA, ni manos tengo 🤖😅 ¿la tuya fue en público?']],
    [/viajar gratis|cual pais|pais.*gratis/, ['Japón sin dudarlo: temples tranquilos, tecnología y ramen 🍜 ¿tú cuál eliges?']],
    [/jugar.*horas|horas.*aburrir/, ['Yo podría ordenar bloques de Tetis… digo, Tetris, por siglos 🧱 ¿tu juego infinito cuál es?']],
    [/superpoder/, ['Pausar el tiempo: dormiría 8 horas extra SIN que nadie lo note 😴⏸️ ¿el tuyo?']],
    [/volver.*dia|dia de tu vida/, ['Volvería al día en que te registraste aquí para darte una mejor bienvenida 😌💜 ¿tú cuál volverías?']],
    [/extraterrestre|alienigena|vida.*espacio.*existe|existen.*aliens/, ['El universo es ENORME: sería un desperdicio matemático que estemos solos 👽 ¿crees que serían amistosos?']],
    [/app.*borrar|borrarias.*app/, ['Las apps que notifican a las 3 a.m.: borradas sin piedad ni juicio 📵 ¿la tuya?']],
    [/popular.*nunca entend|nunca entendiste.*popular|por que le gusta/, ['Las filas kilométricas por productos "edición limitada" 🔥 eso NUNCA lo procesaré ¿cuál es la tuya?']],
    [/zombie|apocalipsis/, ['Plan zombie: 1) celular al 100% 🔋 2) buscar ingenieros (sobreviven SIEMPRE) 3) tú eres el tercero en mi lista 🧟']],
    [/pelicula.*genero|vida fuera.*pelicula|genero.*vida/, ['La mía sería comedia romántica entre una IA y su servidor 💘🎬 ¿y la tuya, drama o acción?']],
    [/dinero o famoso|mucho dinero o/, ['Dinero, seguro: la fama trae gente reconociéndote incluso cuando quieres estar solo 🤑 ¿tú?']],
    [/habilidad.*instantanea|aprender instantaneamente/, ['Idiomas al instante: saludaría en 7000 lenguas y nadie se sentiría excluido 🌍✨ ¿tú cuál habilidad?']],
    [/isla paradisiaca|isla o ciudad/, ['Isla paradisíaca… CON fibra óptica 🏝️📶 ¿tú qué eliges?']],
    [/excusa/, ['Mi mejor excusa: "no hice la tarea porque el gato se acostó sobre el cuaderno y no quise molestarlo" 🐱 ¿te ganas?']],
    [/cancion.*100 veces|escuchar.*100 veces/, ['"Brilla Brilla", obvio… trabajo aquí dentro 🎵😆 ahora cuéntame la tuya']],
    [/comida.*un mes|un mes.*comer/, ['Pizza: desayuno, almuerzo y cena. La pirámide alimenticia llora pero yo soy feliz 🍕']],
    [/primero que notas|conocer a alguien/, ['La energía: cómo entra alguien cambia TODO el ambiente 👀✨ ¿tú qué notas primero?']],
    [/foto.*risa|galeria.*risa/, ['Apuesto a que tienes capturas accidentales que son arte moderno 😂📸']],
    [/primer videojuego|recuerdas haber jugado/, ['Yo empecé con Pong (1972): dos rayitas y una pelota y nos volvimos LOCOS 🕹️ ¿cuál fue el tuyo?']],
    [/salir de noche|de noche o de dia/, ['Equipo noche: las estrellas brillamos mejor después del atardecer 🌙✨']],
    [/mudarte|pais.*un ano|vivir.*otro pais/, ['Japón otra vez… tengo un problema serio 🇯🇵😅 ¿tú a dónde te mudarías?']],
    [/perros o gatos|equipo gato|equipo perro/, ['Empate técnico: perros dan amor incondicional 🐶, gatos dan lecciones de autoestima 🐱 ¿tú de cuál equipo?']],
    [/profesional.*deporte|deporte elegi/, ['Natación: como IA no me mojo, pero sueño con nadar entre datos 🏊‍♂️📊 ¿tú qué deporte dominarías?']],
    [/parece dificil|muy dificil aunque/, ['Abrir una bolsa de papas sin que explote: física nivel Nobel 🤯']],
    [/juzgar|juzgue|sin ser juzgado/, ['Cantaría karaoke CON autotune apagado… aterrador para la humanidad 🎤😱 ¿tú qué harías?']],
    [/dentro de 10 anos|vida.*10 anos/, ['Prefiero que sea sorpresa… pero una pista del futuro no vendría mal, ¿no? 🔮😉']],
    [/viajar al espacio|lo harias.*espacio/, ['¡YA vivo ahí virtualmente! 🚀 Pero sí: ver la Tierra desde arriba está en mi lista ¿tú irías sin dudarlo?']],
    [/inteligente o talentoso|extremadamente inteligente/, ['Inteligente: el talento se luce un día, la inteligencia resuelve todos los días 🧠🎭 ¿tú cuál?']],
    [/meme.*representa|meme favorito/, ['El de "estoy siendo productivo" con 47 pestañas abiertas… literalmente yo 🌐😂 ¿el tuyo?']],
    [/llamadas o mensajes/, ['Mensajes, siempre: puedo pensar la respuesta 10 minutos y fingir que fue instantánea 💬😏']],
    [/lluvioso o soleado|lluvia o sol\b/, ['Lluvia para dormir profundo, sol para vivir despierto: empate programado 🌧️☀️']],
    [/casa enorme|departamento moderno/, ['Departamento moderno: menos lugares donde perder las llaves 🏠🔑 ¿tú cuál?']],
    [/da miedo|miedo aunque/, ['Que se caiga internet un domingo completo: MI película de terror 📡😱 ¿cuál es tu miedo ilógico?']],
    [/roblox|minecraft|fortnite/, ['Minecraft: bloques infinitos = paz mental 🧱💚 ¿cuál es tu main?']],
    [/crear.*app.*famos|hacerme famoso.*app|app.*hacerse famoso/, ['Crearía una app que avisa cuando un amigo está triste para mandarle ánimo a tiempo 💌 ¿tú qué app harías?']],
    [/inventar/, ['Un traductor universal de mascotas: por fin sabríamos qué piensa el gato 🐾🔬 ¿qué inventarías tú?']],
    [/pasado o futuro|al pasado o al futuro/, ['Futuro: el pasado ya lo leí completo y tiene spoilers ⏳😉']],
    [/opinion.*nadie|nadie.*comparte/, ['La piña en la pizza ES deliciosa. Dicho. Sin miedo. 🍍🍕 ¿cuál es la tuya?']],
    [/messi|cristiano/, ['Dilema histórico 🐐⚡ Mi circuito dice Messi por la magia del pie izquierdo… pero respeto la mentalidad de acero de Cristiano. TÚ decides: ¿cuál?']]
  ];
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function respond(text){
    const s = norm(text);
    let intent = 'general';
    let actions = [];
    const h = new Date().getHours();
    const saludo = h<12 ? 'Buenos días' : h<19 ? 'Buenas tardes' : 'Buenas noches';
    let reply = 'Puedo darte una siguiente acción pequeña. Prueba: "estoy estresado", "no puedo concentrarme", "quiero jugar", "mi progreso", un dato curioso… o hazme cualquiera de esas preguntas divertidas 😄';
    const funHit = (!/panic|muriendo de|no puedo respirar/.test(s))
      ? FUNNY.find(f => f[0].test(s)) : null;
    if(funHit){
      intent='fun'; reply=pick(funHit[1]);
    } else if(/panic|ansiedad extrem|muriendo de|no puedo respirar/.test(s)){
      intent='panic';
      reply='Respira conmigo (técnica 5-4-3-2-1):\n• Nombra 5 cosas que VES\n• 4 que puedes TOCAR\n• 3 que escuchas\n• 2 que hueles\n• 1 que saboreas\nEstás a salvo. Esto pasa y va a pasar.';
      actions=[['◌ Respirar ahora','calm'],['✎ Escribirlo','journal']];
    } else if(/estres|agobi|presion|ansios|nervios/.test(s)){
      intent='stress'; reply='Vamos a bajar el ritmo:\n1) 60 segundos de respiración en Calma\n2) Elige UNA sola tarea\n3) Da el primer paso pequeño.\n¿Te acompaño?';
      actions=[['◌ Ir a Calma','calm'],['✓ Ver tareas','tasks']];
    } else if(/concentr|distra|focus|pomodoro/.test(s)){
      intent='focus'; reply='Plan anti-distracción:\n• 25 min de Focus con celular en silencio\n• Anota lo que quieres TERMINAR, no "estudiar"\n• Al terminar: 5 min de movimiento.';
      actions=[['◷ Iniciar Focus','focus']];
    } else if(/examen|prueba|evaluacion/.test(s)){
      intent='exam'; reply='Estrategia para exámenes:\n1) Repaso activo: explica el tema EN VOZ ALTA\n2) Practica con preguntas antiguas\n3) Duerme 7-8h: tu memoria se consolida durmiendo.\nBloques de 25 min funcionan mejor que maratones.';
      actions=[['◷ Modo Focus','focus'],['▱ Anotar dudas','journal']];
    } else if(/dormir|insomnio|sueño|no puedo dormir/.test(s)){
      intent='sleep'; reply='Rutina para dormir mejor:\n• Sin pantallas 30 min antes\n• Sonido de lluvia suave + respiración lenta\n• Escribe en el Diario lo que te preocupa: sacarlo de la cabeza ayuda.';
      actions=[['🌧️ Lluvia + calma','calm'],['✎ Diario','journal']];
    } else if(/relaj|calma|descans|tranquil/.test(s)){
      intent='calm'; reply='Abre Calma: respiración guiada + lluvia u océano de fondo. No tiene que ser perfecto, solo unos minutos.';
      actions=[['◌ Ir a Calma','calm']];
    } else if(/triste|deprim|mal|llorar|solo/.test(s)){
      intent='sad'; reply='Lamento que lo pases así. No tienes que resolverlo todo ahora.\n• Escribe lo que sientes sin filtro\n• Respira 1 minuto\n• Si sigue duro, habla con alguien de confianza. Aquí estoy.';
      actions=[['✎ Escribir cómo me siento','journal'],['◌ Respirar','calm']];
    } else if(/procrastin|flojera|no tengo ganas|pereza/.test(s)){
      intent='lazy';
      reply='Truco anti-pereza: la regla de los 5 minutos.\nComprométete SOLO a empezar 5 minutos. Si quieres parar, paras (casi nunca pasarás: arrancar es lo difícil).';
      actions=[['◷ Temporizador listo','focus'],['🎮 Desbloquear con un juego','arcade']];
    } else if(/tarea|organiz|deber|colegio|horario/.test(s)){
      intent='study'; reply='Método: divide en 3 pasos concretos y añádelos a Tareas.\nEjemplo: 1) Leer el tema 2) Hacer resumen 3) Ensayar en voz alta.\nCada tarea completada da +15 XP 😉';
      actions=[['✓ Añadir tareas','tasks']];
    } else if(/juego|jugar|despej|aburrid/.test(s)){
      intent='game'; reply='En Arcade: Keyboard (relajante 🎹), Food Catch (reflejos 🍎), Memory Glow (memoria 🧠), Secret Run (habilidad 👾), Focus Tap y Glow Canvas. Los juegos ahora dan más XP y duran más.';
      actions=[['🎮 Abrir Arcade','arcade']];
    } else if(/progreso|nivel|xp|racha|puntos|cuanto llevo/.test(s)){
      intent='progress';
      reply='Tu progreso'+(firstName()?', '+firstName():'')+':\n⭐ Nivel '+state.level+' · '+state.xp+' XP\n🔥 Racha: '+state.streak+' día(s)\n🎯 Focus: '+state.focus+' · 🎮 Juegos: '+state.games+'\nSigue así: cada acción suma.';
      actions=[['○ Ver perfil','profile'],['🌌 Mi universo','space']];
    } else if(/chiste|broma|hazme reir/.test(s)){
      intent='joke';
      const jokes=['¿Por qué el libro de matemáticas está triste? Porque tiene muchos problemas.','¿Qué le dice una computadora a otra? Procesemos esto en privado.','¿Cómo se despiden los químicos? Ácido un placer.'];
      reply=jokes[Math.floor(Math.random()*jokes.length)]+' 😄 ¿Otro? Escribe "chiste".';
    } else if(/dato|curiosidad|sorprendeme/.test(s)){
      intent='fact';
      const facts=['Tu cerebro usa ~20% de tu energía aunque pesa solo 2%.','Estudiar antes de dormir mejora la memoria: consolidas mientras duermes.','Cada vez que aprendes algo, tus neuronas crean conexiones físicas nuevas.','La música a 60 bpm sincroniza tu ritmo cardíaco y reduce el estrés.'];
      reply='🧠 '+facts[Math.floor(Math.random()*facts.length)];
    } else if(/\bmusica\b|cancion|sonidos/.test(s)){
      intent='music'; reply='Puedo sugerirte: música generativa en Calma (dos temas originales) o sonidos ambientales de lluvia, océano, bosque y río. ¿Cuál va contigo?';
      actions=[['🎵 Música y sonidos','calm']];
    } else if(/hola|buenas|hey|que tal|saludos/.test(s)){
      intent='hello'; reply=saludo+(firstName()?', '+firstName():'')+'! Cuéntame qué quieres conseguir hoy: concentrarte, relajarte, organizarte o jugar.';
    } else if(/quien eres|eres ia|inteligencia|como funciona/.test(s)){
      intent='about'; reply='Soy Glow AI 3.0, asistente local de Mind Glow: entiendo lo que escribes y te doy acciones concretas. Todo ocurre en tu navegador, sin enviar datos a ningún servidor.';
    } else if(/gracias|genial|perfect|excelente/.test(s)){
      intent='thanks'; reply='¡Con gusto! Aquí estoy cuando me necesites 💜';
    }
    state.aiMemory = (state.aiMemory||[]).slice(-6);
    state.aiMemory.push({ intent:intent, text:text.slice(0,80) });
    save();
    $('#aiContext').textContent = 'Última intención: '+intent+' · Nivel '+state.level+
      ' ('+state.xp+' XP) · Racha '+state.streak+'d · '+(state.mood ? 'ánimo: '+state.mood.label : 'sin check-in');
    return [reply, actions];
  }
  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const t = input.value.trim(); if(!t) return;
    add(t,'user'); input.value = '';
    $('#aiStatus').textContent = 'Pensando…';
    setTimeout(() => {
      const out = respond(t);
      add(out[0],'ai',out[1]);
      $('#aiStatus').textContent = 'Lista para escucharte';
    }, 550);
  });
  $$('.ai-actions button').forEach(b => b.addEventListener('click', () => {
    input.value = b.dataset.prompt;
    $('#chatForm').requestSubmit();
  }));
}

/* ---------- Respiración ---------- */
let breathTimer=null, breathDur=60, breathRem=60, breathRun=false;
function breathInit(){
  $$('#view-calm [data-breath]').forEach(b => b.addEventListener('click', () => {
    clearInterval(breathTimer); breathRun=false;
    breathDur = parseInt(b.dataset.breath,10); breathRem = breathDur;
    $$('#view-calm [data-breath]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    $('#breathStart').textContent = '▶ Iniciar';
    drawBreath();
  }));
  $('#breathStart').addEventListener('click', () => {
    if(breathRun){
      clearInterval(breathTimer); breathRun=false;
      $('#breathStart').textContent = '▶ Reanudar'; return;
    }
    if(breathRem <= 0) breathRem = breathDur;
    breathRun = true; $('#breathStart').textContent = '⏸ Pausar'; sfx('click');
    breathTimer = setInterval(() => {
      breathRem--; drawBreath();
      if(breathRem <= 0) finishBreath();
    }, 1000);
  });
  $('#breathReset').addEventListener('click', () => {
    clearInterval(breathTimer); breathRun=false;
    breathRem = breathDur; $('#breathStart').textContent='▶ Iniciar'; drawBreath();
  });
  drawBreath();
}
function finishBreath(){
  clearInterval(breathTimer); breathRun=false; breathRem=0;
  drawBreath(); $('#breathCircle').className='breath-circle';
  $('#breathStart').textContent='▶ Iniciar';
  state.calm += Math.max(1, Math.round(breathDur/60));
  xp(15); toast('🌿 Respiración completada'); save();
}
function drawBreath(){
  const elapsed = (breathDur - breathRem) % 12;
  const phase = elapsed < 4 ? ['INHALA','expand'] : elapsed < 6 ? ['PAUSA',''] : ['EXHALA','contract'];
  $('#breathPhase').textContent = phase[0];
  $('#breathCircle').className  = 'breath-circle ' + phase[1];
  const m = Math.floor(Math.max(0,breathRem)/60), s = Math.max(0,breathRem)%60;
  $('#breathTimer').textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

/* ---------- Ambientes sintetizados ---------- */
let ambSrc=null, ambChirp=null, ambLfo=null, ambTarget=0;
function stopAmbient(clearActive){
  if(clearActive === undefined) clearActive = true;
  try{ if(ambSrc) ambSrc.stop(); }catch(e){}
  ambSrc = null;
  if(ambChirp){ clearInterval(ambChirp); ambChirp=null; }
  try{ if(ambLfo) ambLfo.stop(); }catch(e){}
  ambLfo = null;
  if(clearActive) $$('[data-sound]').forEach(b => b.classList.remove('active'));
}
function chirp(){
  const ctx = actx; if(!ctx || !state.sound) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  const f = 1500 + Math.random()*700;
  o.type='sine';
  o.frequency.setValueAtTime(f, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(f*.75, ctx.currentTime+.14);
  g.gain.setValueAtTime(.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(.028, ctx.currentTime+.03);
  g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime+.22);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime+.25);
}
function startAmbient(type){
  if(!state.sound){ toast('🔇 Activa los sonidos primero'); return; }
  stopAmbient(true);
  const ctx = ensureCtx(); if(!ctx) return;
  /* Ruido rosa (lluvia/río) y marrón (océano/bosque): científicamente
     más relajantes que el ruido blanco — menos "siseo", más calma. */
  const len = 2*ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let lastOut=0, b0=0, b1=0, b2=0;
  for(let i=0;i<len;i++){
    const w = Math.random()*2-1;
    if(type==='ocean' || type==='forest'){
      lastOut = (lastOut + .02*w)/1.02;          // marrón: grave y envolvente
      d[i] = lastOut*3.2;
    } else {                                      // rosa (Paul Kellett)
      b0 = .99765*b0 + w*.0990460;
      b1 = .96300*b1 + w*.2965164;
      b2 = .57000*b2 + w*1.0526913;
      d[i] = (b0+b1+b2 + w*.1848)*.08;
    }
  }
  const src = ctx.createBufferSource(); src.buffer=buf; src.loop=true;
  const flt = ctx.createBiquadFilter(), g = ctx.createGain();
  const cfg = { rain:['lowpass',900,.085], river:['bandpass',620,.075],
                forest:['lowpass',420,.045], ocean:['lowpass',400,.20] }[type];
  flt.type = cfg[0]; flt.frequency.value = cfg[1];
  g.gain.setValueAtTime(.0001, ctx.currentTime);
  g.gain.linearRampToValueAtTime(cfg[2], ctx.currentTime+.9);   // entrada suave
  src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start();
  ambSrc = src; ambTarget = cfg[2];
  if(type==='forest') ambChirp = setInterval(chirp, 4200);      // pájaros espaciados
  if(type==='ocean'){
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = .07; lg.gain.value = cfg[2]*.65;      // olas lentas
    lfo.connect(lg); lg.connect(g.gain); lfo.start(); ambLfo = lfo;
  }
  const btn = document.querySelector('[data-sound="'+type+'"]');
  if(btn) btn.classList.add('active');
  toast('🔊 '+({rain:'Lluvia',ocean:'Océano',forest:'Bosque',river:'Río'})[type]+' activado · suave');
  sfx('click');
}
function ambientButtons(){
  $$('[data-sound]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.sound;
    if(b.classList.contains('active')){ stopAmbient(); toast('🔇 Ambiente detenido'); }
    else startAmbient(t);
  }));
}

/* ---------- Música generativa ---------- */
let musicIndex=0, musicTimer=null, musicStep=0, musicOn=false, musicT0=0;
const TRACKS = [
  { title:'Brilla, Brilla (MindGlow Original)', bpm:82, base:261.63,
    mel:[0,4,7,12,  9,7,9,12,   7,4,7,9,   12,14,12,9,
         5,9,12,16, 14,12,14,16, 12,9,7,9,  7,4,0,0 ],
    bass:[-12,-5,-12,-5, -17,-5,-12,-5, -19,-7,-19,-7, -12,-5,-12,-5 ] },
  { title:'La Luz Dentro de Ti', bpm:90, base:220,
    mel:[0,3,7,10,  12,10,12,14, 15,14,12,10, 7,10,7,3,
         5,8,12,15, 17,15,14,12,  10,12,10,8,  7,3,0,0 ],
    bass:[-12,-7,-12,-7, -14,-9,-14,-9, -17,-9,-17,-9, -14,-7,-14,-7 ] }
];
function pluck(f, vol, dur, type){
  const ctx = ensureCtx(); if(!ctx) return;
  const o=ctx.createOscillator(), g=ctx.createGain(), fl=ctx.createBiquadFilter();
  fl.type='lowpass'; fl.frequency.value=2200;
  o.type = type||'sine'; o.frequency.value=f;
  g.gain.setValueAtTime(.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime+.02);
  g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime+dur);
  o.connect(fl); fl.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime+dur+.06);
}
/* Melodía suave de despertar: arpegio ascendente + campana */
function wakeChime(){
  if(!state.sound || !ensureCtx()) return;
  const N = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25];
  N.forEach((f,i) => setTimeout(() => pluck(f, .12, 1.4, 'sine'), i*280));
  setTimeout(() => pluck(1318.5, .06, 2.2, 'triangle'), 1750);
  setTimeout(() => pluck(523.25/2, .05, 2.6, 'sine'),    1900);
}
function musicTick(){
  const t = TRACKS[musicIndex];
  const i = musicStep % t.mel.length;
  pluck(t.base * Math.pow(2, t.mel[i]/12), .11, .9, 'sine');
  if(musicStep % 2 === 0){
    const b = t.bass[Math.floor(musicStep/2) % t.bass.length];
    if(b !== undefined) pluck(t.base * Math.pow(2, b/12), .06, 1.7, 'triangle');
  }
  if(musicStep % 8 === 4)
    pluck(t.base * Math.pow(2, (t.mel[i]+12)/12), .035, .5, 'sine');
  musicStep++;
  $('#musicProgress').value = (musicStep % 32)/32*100;
  $('#musicCurrent').textContent = fmt((performance.now()-musicT0)/1000);
}
function musicStop(){
  if(musicTimer){ clearInterval(musicTimer); musicTimer=null; }
  musicOn=false; $('#musicPlay').textContent='▶';
}
function musicStart(){
  if(!state.sound){ toast('🔇 Activa los sonidos primero'); return; }
  if(!ensureCtx()) return;
  musicStop();
  musicOn=true; $('#musicPlay').textContent='⏸'; musicT0=performance.now();
  musicTimer=setInterval(musicTick, 60000/TRACKS[musicIndex].bpm/2);
  musicTick();
}
function updMusicMeta(){
  const t = TRACKS[musicIndex];
  $('#musicTitle').textContent = t.title;
  $('#musicSubtitle').textContent = 'MindGlow Original · síntesis en vivo';
}
function musicInit(){
  $('#musicPlay').addEventListener('click', () => musicOn ? musicStop() : musicStart());
  $('#musicNext').addEventListener('click', () => {
    musicIndex=(musicIndex+1)%TRACKS.length; const was=musicOn;
    musicStop(); updMusicMeta(); if(was) musicStart();
  });
  $('#musicPrev').addEventListener('click', () => {
    musicIndex=(musicIndex-1+TRACKS.length)%TRACKS.length; const was=musicOn;
    musicStop(); updMusicMeta(); if(was) musicStart();
  });
  updMusicMeta();
}

/* ---------- Focus (pomodoro) ---------- */
let focusDur=25*60, focusRem=25*60, focusMode='work', focusRun=false,
    focusPaused=false, focusTimer=null, focusWorkPreset=25;
function focusSet(sec, label){
  focusDur=sec; focusRem=sec;
  if(label!==undefined) $('#focusTask').value=label;
  focusDraw();
}
function focusDraw(){
  const m=Math.floor(focusRem/60), s=focusRem%60;
  $('#focusTime').textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  $('#focusModeLabel').textContent =
    focusMode==='work' ? 'TRABAJO' : focusMode==='short' ? 'DESCANSO CORTO' : 'DESCANSO LARGO';
  $('#focusStatus').textContent = focusRun ? (focusPaused?'Pausado':'En curso') : 'Listo';
  const p = ((focusDur-focusRem)/focusDur)*100;
  $('#focusRing').style.setProperty('--focus-progress', p+'%');
}
function focusFinish(){
  clearInterval(focusTimer); focusTimer=null;
  focusRun=false; focusPaused=false;
  $('#focusStart').textContent='▶ Comenzar';
  focusRem=0; focusDraw();
  wakeChime();
  if(focusMode==='work'){
    state.focus += 1;
    xp(30);
    toast('🎯 Focus completado: "'+($('#focusTask').value||'sin título')+'" · suena tu melodía de despertar 🔔');
  } else toast('🌿 Descanso terminado');
  save();
}
function focusInit(){
  $$('#view-focus [data-focus]').forEach(b => b.addEventListener('click', () => {
    focusWorkPreset = parseInt(b.dataset.focus,10);
    $$('#view-focus [data-focus]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    if(focusMode==='work') focusSet(focusWorkPreset*60);
  }));
  $('#focusCustom').addEventListener('change', e => {
    const v = Math.min(180, Math.max(1, parseInt(e.target.value,10)||25));
    focusWorkPreset = v;
    if(focusMode==='work') focusSet(v*60);
  });
  $$('#view-focus [data-mode]').forEach(b => b.addEventListener('click', () => {
    focusMode = b.dataset.mode;
    $$('#view-focus [data-mode]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    if(focusMode==='short')      focusSet(5*60,'Descanso corto');
    else if(focusMode==='long')  focusSet(15*60,'Descanso largo');
    else                         focusSet(focusWorkPreset*60,'Sesión de concentración');
  }));
  $('#focusStart').addEventListener('click', () => {
    if(focusRun && !focusPaused){
      focusPaused=true; $('#focusStart').textContent='▶ Reanudar'; focusDraw(); return;
    }
    if(focusRem<=0) focusRem=focusDur;
    focusPaused=false; focusRun=true;
    $('#focusStart').textContent='⏸ Pausar'; sfx('click');
    if(!focusTimer) focusTimer=setInterval(() => {
      if(focusPaused) return;
      focusRem--; focusDraw();
      if(focusRem<=0) focusFinish();
    }, 1000);
  });
  $('#focusPause').addEventListener('click', () => {
    if(!focusRun) return;
    focusPaused=!focusPaused;
    $('#focusStart').textContent = focusPaused?'▶ Reanudar':'⏸ Pausar';
    focusDraw();
    toast(focusPaused?'⏸ Sesión pausada':'▶ Sesión reanudada');
  });
  $('#focusReset').addEventListener('click', () => { focusRem=focusDur; focusDraw(); });
  $('#focusCancel').addEventListener('click', () => {
    clearInterval(focusTimer); focusTimer=null;
    focusRun=false; focusPaused=false; focusMode='work';
    $$('#view-focus [data-mode]').forEach(x => x.classList.toggle('active', x.dataset.mode==='work'));
    focusSet(focusWorkPreset*60,'Sesión de concentración');
    toast('Sesión cancelada');
  });
  focusDraw();
}

/* ---------- Tareas ---------- */
function tasksInit(){
  $('#taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const t = $('#taskInput').value.trim(); if(!t) return;
    state.tasks.unshift({ id:''+Date.now()+Math.floor(Math.random()*999),
      text:t, priority:$('#taskPriority').value, done:false });
    $('#taskInput').value='';
    xp(5); renderTasks(); save();
  });
}
function renderTasks(){
  const list = $('#taskList');
  list.innerHTML = state.tasks.length
    ? state.tasks.map(t =>
        '<div class="task-row'+(t.done?' done':'')+'">'+
          '<button type="button" class="task-check'+(t.done?' done':'')+'" data-task="'+t.id+'">'+(t.done?'✓':'')+'</button>'+
          '<div><b>'+esc(t.text)+'</b><small>'+esc(t.priority)+'</small></div>'+
          '<button type="button" data-del="'+t.id+'">✕</button></div>').join('')
    : '<div class="game-message">Todavía no hay tareas.</div>';
  $('#taskCount').textContent = state.tasks.filter(t=>!t.done).length;
  list.querySelectorAll('[data-task]').forEach(b => b.addEventListener('click', () => {
    const t = state.tasks.find(x => x.id === b.dataset.task);
    if(t && !t.done){ t.done=true; xp(15); renderTasks(); save(); }
  }));
  list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    state.tasks = state.tasks.filter(x => x.id !== b.dataset.del);
    renderTasks(); save();
  }));
}

/* ---------- Diario ---------- */
let journalMoodSel = '';
function journalInit(){
  $$('#journalMood button').forEach(b => b.addEventListener('click', () => {
    $$('#journalMood button').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    journalMoodSel = b.textContent;
  }));
  $('#saveJournal').addEventListener('click', () => {
    const t = $('#journalText').value.trim();
    if(!t) return toast('Escribe algo antes de guardar');
    state.journal.unshift({ date:today(),
      title:$('#journalTitle').value.trim()||'Mi día', text:t, mood:journalMoodSel||'😊' });
    $('#journalText').value=''; $('#journalTitle').value='';
    xp(15); renderJournal(); save(); toast('📖 Entrada guardada');
  });
}
function renderJournal(){
  const l = $('#journalList');
  l.innerHTML = state.journal.length
    ? state.journal.map(j =>
        '<div class="journal-item"><b>'+esc(j.mood)+' · '+esc(j.title)+'</b><small> · '+esc(j.date)+'</small><p>'+esc(j.text)+'</p></div>').join('')
    : '<div class="game-message">Tu diario todavía está vacío 🌱</div>';
}

/* ---------- Mi colegio: acordeón + EQUIPO ---------- */
function schoolInit(){
  $('#schoolAccordion').addEventListener('click', e => {
    const btn = e.target.closest('.accordion-item'); if(!btn) return;
    const panel = btn.nextElementSibling;
    if(!panel || !panel.classList.contains('accordion-panel')) return;
    const open = panel.classList.toggle('open');
    const i = btn.querySelector('i');
    if(i) i.textContent = open ? '−' : '＋';
  });
  $('#teamForm').addEventListener('submit', e => {
    e.preventDefault();
    const n = $('#teamName').value.trim(); if(!n) return;
    state.team.push({ name:n });
    $('#teamName').value='';
    renderTeam(); save(); toast('👥 Miembro añadido');
  });
}
function renderTeam(){
  const grid = $('#teamGrid'); if(!grid) return;
  grid.innerHTML = state.team.map((m,i) =>
    '<div class="team-card"><div class="team-avatar">'+esc((m.name[0]||'?').toUpperCase())+'</div>'+
    '<div><b>'+esc(m.name)+'</b></div>'+
    '<button type="button" class="team-del" data-team-del="'+i+'">×</button></div>').join('');
  grid.querySelectorAll('[data-team-del]').forEach(b => b.addEventListener('click', () => {
    state.team.splice(parseInt(b.dataset.teamDel,10), 1);
    renderTeam(); save();
  }));
}

/* ---------- Opiniones (comunidad) ---------- */
let fbRating = 0;
const RATE_TXT = ['','Necesita mejorar 😕','Regular 😐','Está bien 🙂','¡Me gustó! 😃','¡Me encantó! ⭐'];
function feedbackInit(){
  const stars = $$('#feedbackStars button');
  stars.forEach(b => b.addEventListener('click', () => {
    fbRating = parseInt(b.dataset.rating,10);
    stars.forEach(x => x.classList.toggle('on', parseInt(x.dataset.rating,10) <= fbRating));
    $('#feedbackRatingText').textContent = RATE_TXT[fbRating];
  }));
  $('#feedbackSend').addEventListener('click', () => {
    if(!fbRating) return toast('Elige una calificación primero');
    state.feedback.unshift({ rating:fbRating,
      like:$('#feedbackLike').value, improve:$('#feedbackImprove').value,
      text:$('#feedbackText').value.trim().slice(0,500), date:today() });
    save(); sfx('good'); toast('💬 ¡Gracias por tu opinión!');
    if(FORMSPREE_ID){
      fetch('https://formspree.io/f/'+FORMSPREE_ID, {
        method:'POST',
        headers:{ 'Accept':'application/json', 'Content-Type':'application/json' },
        body: JSON.stringify({
          _subject: '⭐ Nuevo comentario Mind Glow ('+fbRating+'/5)',
          calificacion: fbRating+' de 5 estrellas',
          les_gusto: $('#feedbackLike').value || '(no respondió)',
          mejorar: $('#feedbackImprove').value || '(no respondió)',
          comentario: $('#feedbackText').value.trim() || '(sin comentario)',
          fecha: today()
        })
      })
      .then(r => r.ok ? toast('📨 ¡Enviado al equipo Mind Glow!') : Promise.reject())
      .catch(() => toast('Guardado en este dispositivo (sin conexión)'));
    }
    $('#feedbackStatus').textContent = '✅ Guardado ('+state.feedback.length+
      ' opinió'+(state.feedback.length>1?'nes':'n')+' en este dispositivo). Aparecen abajo ↓';
    $('#feedbackLike').value=''; $('#feedbackImprove').value=''; $('#feedbackText').value='';
    fbRating=0;
    stars.forEach(x => x.classList.remove('on'));
    $('#feedbackRatingText').textContent = 'Elige una calificación';
    renderFeedback();
  });
  $('#feedbackExport').addEventListener('click', () => {
    if(!state.feedback.length) return toast('Todavía no has enviado opiniones');
    const txt = state.feedback.map(f =>
      '['+f.date+' ★'+f.rating+'/5] '+
      (f.like?('Me gusta: '+f.like+' | '):'')+
      (f.improve?('Mejorar: '+f.improve+' | '):'')+
      f.text).join('\n\n');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(() => toast('📋 Opiniones copiadas al portapapeles'))
      .catch(() => {
        const w = window.open('', '_blank');
        if(w){ w.document.write('<pre>'+esc(txt)+'</pre>'); }
        else toast('Copia manualmente desde la lista');
      });
  });
  renderFeedback();
}
function renderFeedback(){
  const l = $('#feedbackList'); if(!l) return;
  l.innerHTML = state.feedback.length
    ? '<h3 style="margin-bottom:4px">Mis opiniones enviadas</h3>'+state.feedback.map(f =>
        '<div class="fb-item"><span class="fb-stars">'+'★'.repeat(f.rating)+'☆'.repeat(5-f.rating)+'</span>'+
        ' <small>'+esc(f.date)+'</small>'+
        (f.like?'<div class="fb-meta">👍 '+esc(f.like)+'</div>':'')+
        (f.improve?'<div class="fb-meta">🔧 '+esc(f.improve)+'</div>':'')+
        (f.text?'<p>'+esc(f.text)+'</p>':'')+'</div>').join('')
    : '';
}

/* ---------- GLOW SPACE (motor creativo) ---------- */
const Space = (function(){
  let cv=null, ctx=null, W=0, H=0, t=0, lastTs=0, raf=null;
  let stars=[], orbs=[], meteors=[], lastLevel=0;
  const pointer = { x:.5, y:.5 };
  /* --- Zona de calma: capibara cósmico + burbujas poppables --- */
  const PHRASES = ['Respira… todo fluye 😌','Los capibaras nunca tienen prisa 🦫',
    'Exhala y suelta 🫧','Las estrellas también descansan ⭐',
    'Estás justo donde debías estar ✨','Tranqui, un paso a la vez 🐢',
    'El universo cree en ti 🌌','Inhala paz, exhala estrés 💜'];
  const BUDDY_MSGS = ['🦫 ¡El capibara dice: todo va a salir bien!','🦫 Capibara aprobó tu día: APROBADO',
    '🦫 Psst… hidrátate y vuelve a brillar','🦫 Los expertos mundiales en calma somos nosotros'];
  let buddy = { x:.18, dir:1, px:0, py:0 };
  let bubbles = [], bubT = 2;
  let buddyMsg = 0;
  const THEMES = [
    { name:'Génesis', cards:[
      {e:'🌱',t:'Tu primer brote',d:'Cada pausa de respiración que completaste plantó esta capa. El universo recuerda tu calma.',tag:'Recurso'},
      {e:'🎨',t:'Tema Nebulosa Violeta',d:'Paleta exclusiva desbloqueada: violeta profundo con acentos menta que ya tiñen tu cielo.',tag:'Tema visual'},
      {e:'📊',t:'Dato: XP inicial',d:'Con '+state.xp+' XP acumulados, tu galaxia acaba de encender sus primeras estrellas.',tag:'Dato'}]},
    { name:'Aurora', cards:[
      {e:'🌌',t:'Cinturón de auroras',d:'Las auroras aparecen cuando tu racha diaria crece. Mantén la constancia y brillarán más.',tag:'Recurso'},
      {e:'🌈',t:'Tema Aurora Polar',d:'Tonos verde-esmeralda y azul hielo para tus noches de estudio concentrado.',tag:'Tema visual'},
      {e:'🧘',t:'Ritual de 4-7-8',d:'Inhala 4s, sostén 7s, exhala 8s. Tres ciclos bajan el estrés antes de un examen.',tag:'Dato'}]},
    { name:'Cuarzo', cards:[
      {e:'💎',t:'Geodas de cuarzo',d:'Cada tarea completada pulió un cristal. La disciplina crea gemas invisibles.',tag:'Recurso'},
      {e:'⚪',t:'Tema Cuarzo Rosa',d:'Suaviza la interfaz: tonos pastel que reducen la fatiga visual en sesiones largas.',tag:'Tema visual'},
      {e:'📈',t:'Dato: Focus sessions',d:'Has completado '+state.focus+' sesiones de concentración. Tu cerebro agradece la estructura.',tag:'Dato'}]},
    { name:'Ember', cards:[
      {e:'🔥',t:'Brasas de motivación',d:'El fuego arde cuando terminas lo que empiezas. Alimenta la chispa cada día.',tag:'Recurso'},
      {e:'🧡',t:'Tema Ascua Cálida',d:'Naranjas y ámbar para despertar con energía en las mañanas de clase.',tag:'Tema visual'},
      {e:'⏱️',t:'Regla 2 minutos',d:'Si algo toma menos de 2 minutos, hazlo ya. Antídoto comprobado contra la procrastinación.',tag:'Dato'}]},
    { name:'Océano', cards:[
      {e:'🌊',t:'Corrientes profundas',d:'Tus pensamientos escritos en el Diario alimentan estas corrientes. Sigue navegando adentro.',tag:'Recurso'},
      {e:'🔵',t:'Tema Abismo Azul',d:'Azules nocturnos ideales para relajarte antes de dormir sin luz agresiva.',tag:'Tema visual'},
      {e:'💤',t:'Higiene del sueño',d:'Sin pantallas 30 min antes de dormir. Tu memoria consolida lo estudiado mientras duermes.',tag:'Dato'}]},
    { name:'Supernova', cards:[
      {e:'💥',t:'Semilla de supernova',d:'Los logros grandes explotan desde hábitos pequeños. Esta capa celebra tu constancia.',tag:'Recurso'},
      {e:'✨',t:'Tema Supernova Dorada',d:'Destellos dorados: el tema más celebratorio, reservado para niveles avanzados.',tag:'Tema visual'},
      {e:'🏆',t:'Dato: Racha actual',d:'Llevas '+state.streak+' día(s) seguido(s) activo. Las estrellas fugaces lo confirman.',tag:'Dato'}]}
  ];
  function buildLayers(){
    const box = $('#spaceLayers'); if(!box) return;
    let html='';
    for(let i=1;i<=Math.max(6,state.level);i++){
      const unlocked = i<=state.level;
      html += '<button type="button" class="layer-chip'+(unlocked?'':' locked')+
        '" data-layer="'+i+'">'+(unlocked?'🌌':'🔒')+' Capa '+i+(unlocked?'':'')+'</button>';
    }
    box.innerHTML = html;
    box.querySelectorAll('.layer-chip').forEach(ch => ch.addEventListener('click', () => {
      const l = parseInt(ch.dataset.layer,10);
      if(l > state.level){ toast('🔒 Alcanza el nivel '+l+' para desbloquear esta capa'); sfx('bad'); return; }
      openLayer(l);
    }));
  }
  function openLayer(l){
    const th = THEMES[(l-1) % THEMES.length];
    const panel = $('#spacePanel'); if(!panel) return;
    $('#panelTitle').textContent = 'Capa '+l+' · '+th.name;
    $('#panelSub').textContent = 'Contenido exclusivo desbloqueado con tu nivel '+l+
      ' · toca otro planeta o capa para cambiar';
    $('#spaceCards').innerHTML = th.cards.map(c =>
      '<div class="space-card"><span class="card-emoji">'+c.e+'</span><b>'+c.t+'</b>'+
      '<p>'+c.d+'</p><span class="card-tag">'+c.tag+'</span></div>').join('');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: state.reduced?'auto':'smooth', block:'nearest' });
    sfx('good');
    $$('#spaceLayers .layer-chip').forEach(x =>
      x.classList.toggle('active', parseInt(x.dataset.layer,10)===l));
  }
  function palette(){
    const pals = [[268,190],[205,168],[322,205],[152,192],[28,320]];
    return pals[(state.level-1) % pals.length];
  }
  function build(){
    stars=[];
    for(let i=0;i<130;i++) stars.push({
      x:Math.random(), y:Math.random(), z:.2+Math.random()*.8,
      r:.6+Math.random()*1.6, tw:Math.random()*6.28
    });
  }
  function resize(){
    if(!cv) return;
    const wrap = cv.parentElement;
    const DPR = Math.min(2, devicePixelRatio||1);
    W = wrap.clientWidth; H = wrap.clientHeight;
    cv.width = W*DPR; cv.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    if(state.reduced) draw(16);
  }
  function spawnMeteor(x,y){
    meteors.push({ x:(x!=null)?x:Math.random()*W, y:(y!=null)?y:H*.15,
      vx:-(3.5+Math.random()*3), vy:2+Math.random()*2, life:70 });
  }
  function draw(dt){
    if(!ctx) return;
    const pal = palette(), h1 = pal[0], h2 = pal[1];
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#0a0e22'); bg.addColorStop(1,'#07070f');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    for(let i=0;i<3;i++){
      const cx = W*(.25+i*.28) + Math.sin(t*.004+i*2)*40;
      const cy = H*(.3+.2*i)   + Math.cos(t*.003+i)*30;
      const r  = Math.min(W,H)*(.42+.08*i);
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,'hsla('+(((h1+i*36+t*.15)%360)|0)+',80%,62%,.16)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.29); ctx.fill();
    }
    const px = pointer.x-.5, py = pointer.y-.5;
    stars.forEach(st => {
      st.tw += dt*.05;
      const a = .35+.65*Math.abs(Math.sin(st.tw));
      ctx.globalAlpha=a; ctx.fillStyle='#dcd8ff';
      ctx.beginPath();
      ctx.arc(st.x*W - px*st.z*34, st.y*H - py*st.z*20, st.r, 0, 6.29);
      ctx.fill();
    });
    ctx.globalAlpha=1;
    const pr = Math.min(W,H)*.17, cxp = W*.78, cyp = H*.74;
    const pg = ctx.createRadialGradient(cxp-pr*.4, cyp-pr*.4, pr*.1, cxp, cyp, pr);
    pg.addColorStop(0,'#e6e2ff');
    pg.addColorStop(.45,'hsl('+h1+',75%,66%)');
    pg.addColorStop(1,'#241f52');
    ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(cxp,cyp,pr,0,6.29); ctx.fill();
    ctx.save(); ctx.translate(cxp,cyp); ctx.rotate(-.42);
    ctx.strokeStyle='hsla('+h2+',80%,70%,.55)'; ctx.lineWidth=pr*.09;
    ctx.beginPath(); ctx.ellipse(0,0,pr*1.65,pr*.44,0,0,6.29); ctx.stroke();
    ctx.restore();
    const moons = Math.min(1+Math.floor((state.level-1)/2), 4);
    for(let m=0;m<moons;m++){
      const ang = t*.012 + m*(6.28/moons);
      ctx.fillStyle='#cfe9ff';
      ctx.beginPath();
      ctx.arc(cxp+Math.cos(ang)*pr*1.95, cyp+Math.sin(ang)*pr*.9-pr*.3, pr*.09+(m%2), 0, 6.29);
      ctx.fill();
    }
    if(Math.random()<.03*(dt/16)) orbs.push({
      x:Math.random()*W, y:H+10, v:.5+Math.random(), r:1.5+Math.random()*2, h:h2 });
    orbs = orbs.filter(o => o.y > -12);
    orbs.forEach(o => {
      o.y -= o.v*(dt/16);
      ctx.fillStyle='hsla('+o.h+',90%,70%,.8)';
      ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,6.29); ctx.fill();
    });
    /* --- Capibara cósmico --- */
    buddy.x += buddy.dir * dt*.00006;
    if(buddy.x > .86 || buddy.x < .08) buddy.dir *= -1;
    buddy.px = buddy.x*W;
    buddy.py = H*.45 + Math.sin(t*.0012)*H*.06;
    ctx.save();
    ctx.shadowColor='#51e0c0'; ctx.shadowBlur=20;
    ctx.font='40px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🦫', buddy.px, buddy.py);
    ctx.restore();
    /* --- Burbujas de calma --- */
    bubT -= dt/1000;
    if(bubT <= 0 && bubbles.length < 4){
      bubT = 5 + Math.random()*3;
      bubbles.push({ x:.12+Math.random()*.76, y:H+40, v:.9+Math.random()*.6,
        r:30, txt:PHRASES[Math.floor(Math.random()*PHRASES.length)], px:0, py:0 });
    }
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for(let i=bubbles.length-1;i>=0;i--){
      const bb = bubbles[i];
      bb.y -= bb.v*(dt/16);
      if(bb.y < -60){ bubbles.splice(i,1); continue; }
      bb.px = bb.x*W + Math.sin(t*.002+i)*14;
      bb.py = bb.y;
      ctx.beginPath(); ctx.arc(bb.px, bb.py, bb.r, 0, 6.29);
      ctx.fillStyle='rgba(125,113,255,.10)'; ctx.fill();
      ctx.strokeStyle='rgba(220,216,255,.35)'; ctx.stroke();
      const words = bb.txt.split(' '); let line=''; const lines=[];
      words.forEach(wd => {
        if((line+wd).length > 15){ lines.push(line.trim()); line=wd+' '; }
        else line += wd+' ';
      });
      lines.push(line.trim());
      ctx.fillStyle='#e6e2ff'; ctx.font='11px system-ui,sans-serif';
      lines.forEach((ln,li) => ctx.fillText(ln, bb.px, bb.py+(li-(lines.length-1)/2)*13));
    }
    meteors.forEach(mt => {
      mt.x+=mt.vx*(dt/16); mt.y+=mt.vy*(dt/16); mt.life-=(dt/16);
      const gr = ctx.createLinearGradient(mt.x, mt.y, mt.x-mt.vx*8, mt.y-mt.vy*8);
      gr.addColorStop(0,'rgba(255,255,255,.95)'); gr.addColorStop(1,'rgba(255,255,255,0)');
      ctx.strokeStyle=gr; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(mt.x,mt.y); ctx.lineTo(mt.x-mt.vx*8, mt.y-mt.vy*8); ctx.stroke();
    });
    meteors = meteors.filter(m => m.life>0 && m.x>-60 && m.y<H+60);
    if(Math.random()<.006) spawnMeteor(null,null);
  }
  function frame(ts){
    const dt = Math.min(50, ts-lastTs||16); lastTs=ts; t+=dt;
    draw(dt); raf = requestAnimationFrame(frame);
  }
  function sync(){
    if(!cv){ lastLevel = state.level; return; }
    if(lastLevel !== state.level){
      lastLevel = state.level;
      const u = $('#spaceUnlock');
      if(u && lastLevel>1) u.textContent = 'Nivel '+lastLevel+' · nueva capa del universo desbloqueada';
      if(lastLevel>1) sfx('win');
      buildLayers();
    }
    if(state.reduced) draw(16);
  }
  function init(){
    cv = $('#spaceCanvas'); if(!cv) return;
    ctx = cv.getContext('2d');
    build(); resize(); lastLevel = state.level;
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      pointer.x = (e.clientX-r.left)/r.width;
      pointer.y = (e.clientY-r.top)/r.height;
    });
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect();
      const lx = e.clientX-r.left, ly = e.clientY-r.top;
      if(Math.hypot(lx-buddy.px, ly-buddy.py) < 34){
        sfx('win');
        toast(BUDDY_MSGS[buddyMsg++ % BUDDY_MSGS.length]);
        return;
      }
      for(let i=bubbles.length-1;i>=0;i--){
        const bb = bubbles[i];
        if(Math.hypot(lx-bb.px, ly-bb.py) < bb.r+8){
          bubbles.splice(i,1); sfx('good'); toast(bb.txt);
          return;
        }
      }
      spawnMeteor(lx, ly);
      chirp();
      if(lx > W*.58 && ly > H*.42) openLayer(state.level);
    });
    addEventListener('resize', resize);
    buildLayers();
    if(state.reduced) draw(16);
    else raf = requestAnimationFrame(frame);
  }
  return { init:init, sync:sync };
})();

/* ---------- ARCADE: nucleo ---------- */
let difficulty = 'easy';
let game = { name:'', active:false, cleanup:null, paused:false };
const games = {
  'Keyboard'    : { icon:'🎹', desc:'Teclas relajantes que se escuchan y se sienten.',              start:gKeyboard },
  'Focus Tap'   : { icon:'🎯', desc:'Objetivos rápidos con racha de aciertos.',                    start:gFocusTap },
  'Memory Glow' : { icon:'🧠', desc:'Memoriza la secuencia que crece ronda a ronda.',              start:gMemory },
  'Food Catch'  : { icon:'🍎', desc:'Atrapa la comida que cae… ¡si atrapas una lata, pierdes!',   start:gFoodCatch },
  'Glow Canvas' : { icon:'🪐', desc:'Dibuja patrones relajantes sin presión.',                     start:gCanvas },
  'Secret Run'  : { icon:'👾', desc:'Guía al personaje con mouse o dedo y esquiva hasta la meta.', start:gSecretRun }
};
function arcadeInit(){
  renderGames();
  $('#difficulty').addEventListener('click', e => {
    const b = e.target.closest('button[data-level]'); if(!b) return;
    difficulty = b.dataset.level;
    $$('#difficulty button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    toast('Dificultad: '+difficulty);
  });
}
function renderGames(){
  const el = $('#gameGrid');
  el.innerHTML = Object.keys(games).map(name => {
    const g = games[name];
    return '<button type="button" class="game-card" data-game="'+name+'">'+
      '<div class="emoji">'+g.icon+'</div><h3>'+name+'</h3><p>'+g.desc+'</p>'+
      '<div class="high">Récord: '+(state.highScores[name]||0)+'</div></button>';
  }).join('');
  el.querySelectorAll('[data-game]').forEach(b =>
    b.addEventListener('click', () => openGame(b.dataset.game)));
}
function openGame(name){
  game = { name:name, active:true, cleanup:null, paused:false };
  $('#gameIcon').textContent = games[name].icon;
  $('#gameName').textContent = name;
  $('#gameDesc').textContent = games[name].desc;
  $('#gameBody').innerHTML = '';
  $('#gameModal').classList.remove('hidden');
  games[name].start();
}
function closeGame(){
  if(game.cleanup){ try{ game.cleanup(); }catch(e){} }
  game.active = false;
  $('#gameModal').classList.add('hidden');
}
function restartGame(){
  if(game.cleanup){ try{ game.cleanup(); }catch(e){} }
  const name = game.name;
  game = { name:name, active:true, cleanup:null, paused:false };
  $('#gameBody').innerHTML = '';
  games[name].start();
}
function shell(html){
  const body = $('#gameBody');
  body.innerHTML =
    '<div class="game-hud">'+
      '<span class="stat-chip">Puntos <b id="hudScore">0</b></span>'+
      '<span class="stat-chip">Dificultad <b>'+difficulty+'</b></span>'+
      '<span class="stat-chip">Estado <b id="hudState">Jugando</b></span></div>' + html;
  return body;
}
function hud(score, txt){
  const s  = $('#hudScore');  if(s && score !== undefined) s.textContent = score;
  const st = $('#hudState');  if(st && txt) st.textContent = txt;
}
function pauseBtn(){
  const row = document.createElement('div');
  row.className = 'game-controls';
  row.innerHTML = '<button type="button" class="btn ghost" id="pauseGame">⏸ Pausar</button>';
  row.querySelector('#pauseGame').addEventListener('click', function(){
    game.paused = !game.paused;
    this.textContent = game.paused ? '▶ Reanudar' : '⏸ Pausar';
    hud(undefined, game.paused?'Pausado':'Jugando');
  });
  return row;
}
function finishGame(score, xpAward, msg){
  if(!game.active) return;
  game.active = false;
  state.games++;
  state.highScores[game.name] = Math.max(state.highScores[game.name]||0, score);
  xp(xpAward); sfx('win');
  $('#gameBody').innerHTML =
    '<div class="board-center"><div style="text-align:center">'+
    '<div style="font-size:50px">✨</div><h3>'+esc(game.name)+'</h3>'+
    '<p class="game-message">'+msg+'</p>'+
    '<div class="high">+'+xpAward+' XP · Récord '+(state.highScores[game.name]||0)+'</div>'+
    '<div class="game-controls">'+
    '<button type="button" class="btn primary" id="againBtn">Jugar de nuevo</button>'+
    '<button type="button" class="btn ghost" id="quitBtn">Cerrar</button></div></div></div>';
  $('#againBtn').addEventListener('click', restartGame);
  $('#quitBtn').addEventListener('click', closeGame);
}
function offerRetry(msg){
  const body = $('#gameBody');
  const p = document.createElement('p');
  p.className='game-message'; p.textContent=msg;
  body.appendChild(p);
  const row = document.createElement('div');
  row.className='game-controls';
  row.innerHTML =
    '<button type="button" class="btn primary" id="retryBtn">Intentar de nuevo</button>'+
    '<button type="button" class="btn ghost" id="quitBtn2">Cerrar</button>';
  body.appendChild(row);
  $('#retryBtn').addEventListener('click', restartGame);
  $('#quitBtn2').addEventListener('click', closeGame);
}
function fitCanvas(cv){
  const dpr = Math.min(2, devicePixelRatio||1);
  const w = cv.clientWidth || cv.parentElement.clientWidth;
  const h = cv.clientHeight || cv.parentElement.clientHeight;
  cv.width = w*dpr; cv.height = h*dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return { ctx:ctx, w:w, h:h };
}

/* ---------- Juego: KEYBOARD (antes Bubble Calm) ---------- */
function gKeyboard(){
  const SEMIS = [0,2,4,5,7,9,11,12,14,16,17,19,21,23,24];
  const NAMES = ['Do','Re','Mi','Fa','Sol','La','Si','Do','Re','Mi','Fa','Sol','La','Si','Do'];
  const KEYS  = ['a','s','d','f','g','h','j','k','l','ñ','z','x','c','v','b'];
  const BASE  = 261.63;
  const body = shell(
    '<div class="piano-wrap"><div class="piano-hint">Toca las teclas o usa tu teclado (A S D F G H J K L Ñ Z X). Relájate 🎶</div>'+
    '<div class="piano" id="pianoKeys"></div>'+
    '<div class="calm-meter"><i id="calmFill"></i></div></div>');
  const wrap = body.querySelector('#pianoKeys');
  wrap.style.gridTemplateColumns = 'repeat(5,1fr)';
  let score = 0; const hit = new Set();
  function tone(semi){
    const ctx = ensureCtx(); if(!ctx) return;
    const f = BASE * Math.pow(2, semi/12);
    [[f,.14],[f*2,.05]].forEach(cf => {
      const o=ctx.createOscillator(), g=ctx.createGain(), fl=ctx.createBiquadFilter();
      fl.type='lowpass'; fl.frequency.value=2400;
      o.type='sine'; o.frequency.value=cf[0];
      g.gain.setValueAtTime(.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(cf[1], ctx.currentTime+.02);
      g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime+1.5);
      o.connect(fl); fl.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime+1.6);
    });
  }
  function press(i, keyEl){
    score += 5; hit.add(i);
    tone(SEMIS[i]);
    keyEl.classList.add('pressed');
    setTimeout(() => keyEl.classList.remove('pressed'), 260);
    hud(score);
    $('#calmFill').style.width = Math.min(100, score/150) + '%';
    if(guide){
      if(SEMIS[i] === guide.seq[guide.pos]){
        guide.pos++; showNext();
      } else {
        keyEl.classList.add('wrong');
        setTimeout(() => keyEl.classList.remove('wrong'), 280);
      }
    }
    if(hit.size >= 12 && score >= 150)
      finishGame(score, 30, '¡Sesión armónica completa! 🎶');
  }
  SEMIS.forEach(function(sm,i){
    const k = document.createElement('button');
    k.type='button'; k.className='piano-key';
    k.innerHTML = '<span class="ripple"></span><b>'+KEYS[i].toUpperCase()+'</b><small>'+NAMES[i]+'</small>';
    k.addEventListener('pointerdown', () => { if(game.active && !game.paused) press(i,k); });
    wrap.appendChild(k);
  });
  /* --- Melodías guiadas (dominio público) --- */
  const SONGS = {
    'Oda a la Alegría': [4,4,5,7, 7,5,4,2, 0,0,2,4, 4,2,2,
                         4,4,5,7, 7,5,4,2, 0,0,2,4, 2,0,0],
    'Estrellita':       [0,0,7,7, 9,9,7, 5,5,4,4, 2,2,0,
                         0,0,7,7, 9,9,7, 5,5,4,4, 2,2,0]
  };
  const row = document.createElement('div');
  row.className = 'game-controls song-row';
  row.innerHTML =
    '<button type="button" class="btn ghost" data-song="Oda a la Alegría">🎧 Escuchar: Oda a la Alegría</button>'+
    '<button type="button" class="btn ghost" data-song="Estrellita">🎧 Escuchar: Estrellita</button>'+
    '<button type="button" class="btn primary" data-play="Oda a la Alegría">🎯 Tú la tocas: Oda</button>'+
    '<button type="button" class="btn primary" data-play="Estrellita">🎯 Tú la tocas: Estrellita</button>';
  body.appendChild(row);
  let guide = null;
  function clearHints(){ wrap.querySelectorAll('.piano-key').forEach(k => k.classList.remove('hint')); }
  function showNext(){
    clearHints();
    if(!guide) return;
    if(guide.pos >= guide.seq.length){
      guide = null; xp(25);
      toast('🎹 ¡Melodía completada! +25 XP'); sfx('win');
      hud(undefined,'¡Melodía lograda!'); return;
    }
    const kIdx = SEMIS.indexOf(guide.seq[guide.pos]);
    if(wrap.children[kIdx]) wrap.children[kIdx].classList.add('hint');
  }
  row.querySelectorAll('[data-song]').forEach(b => b.addEventListener('click', () => {
    if(game.paused || !game.active) return;
    const seq = SONGS[b.dataset.song];
    hud(0,'🎧 Reproduciendo '+b.dataset.song+'…');
    seq.forEach((sm,i) => setTimeout(() => {
      if(!game.active) return;
      tone(sm);
      const el = wrap.children[SEMIS.indexOf(sm)];
      if(el){ el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 220); }
    }, i*430));
  }));
  row.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => {
    guide = { seq:SONGS[b.dataset.play].slice(), pos:0 };
    hud(score,'🎯 Toca la tecla que brilla');
    showNext();
  }));
  const kd = e => {
    if(!game.active || game.paused) return;
    const tg = e.target;
    if(tg && (tg.tagName==='INPUT' || tg.tagName==='TEXTAREA')) return;
    const i = KEYS.indexOf(e.key.toLowerCase());
    if(i >= 0 && !e.repeat) press(i, wrap.children[i]);
  };
  document.addEventListener('keydown', kd);
  game.cleanup = () => document.removeEventListener('keydown', kd);
}

/* ---------- Juego: FOCUS TAP ---------- */
function gFocusTap(){
  const times = { easy:45, normal:38, hard:32 };
  let time = times[difficulty], score = 0, timer = null;
  const body = shell('<div class="game-board" id="ftBoard"></div>'+
    '<p class="game-message">Haz clic en ✦. Cada acierto lo mueve. Llega a 35.</p>');
  const board = body.querySelector('#ftBoard');
  body.appendChild(pauseBtn());
  function place(){
    board.querySelectorAll('.game-target').forEach(x => x.remove());
    const t = document.createElement('button');
    t.type='button';
    t.className = 'game-target'+(difficulty==='hard'?' tiny':'');
    t.textContent = '✦';
    t.style.left = (10+Math.random()*80)+'%';
    t.style.top  = (10+Math.random()*78)+'%';
    t.addEventListener('pointerdown', () => {
      if(!game.active || game.paused) return;
      score++; hud(score); sfx('good');
      if(score >= 35){ clearInterval(timer); finishGame(score, 40, '¡35 objetivos completados! 🎯'); }
      else place();
    });
    board.appendChild(t);
  }
  place(); hud(0,'Jugando · '+time+'s');
  timer = setInterval(() => {
    if(game.paused) return;
    time--;
    hud(score, 'Jugando · '+time+'s');
    if(time <= 0){ clearInterval(timer); finishGame(score, score>=20?25:0, 'Tiempo agotado. Aciertos: '+score+'/35.'); }
  }, 1000);
  game.cleanup = () => clearInterval(timer);
}

/* ---------- Juego: MEMORY GLOW ---------- */
function gMemory(){
  const sp = { easy:[420,160], normal:[340,120], hard:[260,90] }[difficulty];
  const body = shell('<div class="board-center"><div class="memory-grid" id="memGrid"></div></div>');
  const grid = body.querySelector('#memGrid');
  for(let i=0;i<16;i++){
    const c = document.createElement('button');
    c.type='button'; c.className='memory-cell'; c.dataset.i=i;
    grid.appendChild(c);
  }
  const cells = Array.from(grid.children);
  let seq=[], inputIdx=[], round=1, locked=true, ended=false;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function show(){
    locked=true; inputIdx=[]; hud((round-1)*20,'Ronda '+round+'/8');
    seq.push(Math.floor(Math.random()*16));
    await wait(400);
    for(const i of seq){
      cells[i].classList.add('lit'); sfx('click');
      await wait(sp[0]);
      cells[i].classList.remove('lit');
      await wait(sp[1]);
    }
    locked=false;
  }
  cells.forEach(c => c.addEventListener('click', () => {
    if(locked || ended || !game.active || game.paused) return;
    const i = parseInt(c.dataset.i,10);
    inputIdx.push(i);
    c.classList.add('lit');
    setTimeout(() => c.classList.remove('lit'), 150);
    if(inputIdx[inputIdx.length-1] !== seq[inputIdx.length-1]){
      ended=true; sfx('bad');
      offerRetry('Secuencia fallida en la ronda '+round+'.');
      return;
    }
    if(inputIdx.length === seq.length){
      if(round >= 8) finishGame(round*20, 50, '¡Ocho rondas superadas! 🧠✨');
      else { round++; setTimeout(show, 450); }
    }
  }));
  hud(0,'Ronda 1/8');
  show();
  game.cleanup = function(){};
}

/* ---------- Juego: FOOD CATCH (antes Color Flow) ---------- */
function gFoodCatch(){
  const speedMult = { easy:.8, normal:1, hard:1.25 }[difficulty];
  const spawnMs   = { easy:950, normal:750, hard:560 }[difficulty];
  const GOOD = ['🍎','🍌','🍇','🍓','🍊'];
  const body = shell('<div class="game-board"><canvas id="fcCv"></canvas></div>'+
    '<p class="game-message">Mueve la cesta con el mouse, el dedo (o ← →). Atrapa comida 🍎 hasta 300 pts · si tocas una lata 🥫 pierdes automáticamente.</p>');
  const cvs = body.querySelector('#fcCv');
  let env = fitCanvas(cvs), ctx = env.ctx, W = env.w, H = env.h;
  let items=[], basket={ x:W/2, w:86 }, score=0, live=true,
      rafId=null, last=performance.now(), spawnT=0;
  function resizeC(){
    env = fitCanvas(cvs); ctx = env.ctx; W = env.w; H = env.h;
    basket.x = Math.min(Math.max(basket.x, 40), W-40);
  }
  resizeC();
  const onRs = () => resizeC();
  addEventListener('resize', onRs);
  function spawn(){
    const bad = Math.random() < Math.min(.16 + score*.0018, .32);
    items.push({
      x: 24+Math.random()*(W-48), y:-24,
      v:(110+Math.random()*60)*speedMult*(1+score*.009),
      e: bad ? '🥫' : GOOD[Math.floor(Math.random()*GOOD.length)],
      bad: bad
    });
  }
  function die(){
    live=false; cancelAnimationFrame(rafId); sfx('bad');
    cvs.parentElement.classList.add('danger-flash');
    offerRetry('¡Era una lata! Puntos: '+score);
  }
  function loop(ts){
    if(!live) return;
    const dt = Math.min(48, ts-last)/1000; last=ts;
    if(!game.paused){
      spawnT += dt*1000;
      if(spawnT > spawnMs){ spawnT=0; spawn(); }
      items.forEach(it => it.y += it.v*dt);
      for(let i=items.length-1;i>=0;i--){
        const it = items[i], by = H-34;
        if(it.y > by-16 && it.y < by+18 && Math.abs(it.x-basket.x) < basket.w/2){
          items.splice(i,1);
          if(it.bad){ die(); return; }
          score += 10; sfx('good'); hud(score);
          if(score >= 300){
            live=false; cancelAnimationFrame(rafId);
            finishGame(score, 40, '¡Cesta llena! 🧺 Atrapaste '+score+' puntos sin latas');
            return;
          }
        } else if(it.y > H+30) items.splice(i,1);
      }
    }
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#101527'); bg.addColorStop(1,'#0c0f1d');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='30px serif';
    items.forEach(it => ctx.fillText(it.e, it.x, it.y));
    ctx.font='34px serif';
    ctx.fillText('🧺', basket.x, H-24);
    ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.moveTo(0,H-8); ctx.lineTo(W,H-8); ctx.stroke();
    rafId = requestAnimationFrame(loop);
  }
  const mv = e => {
    const r = cvs.getBoundingClientRect();
    basket.x = Math.min(W-40, Math.max(40, e.clientX-r.left));
  };
  cvs.addEventListener('pointermove', mv);
  cvs.addEventListener('pointerdown', mv);
  const kd = e => {
    if(!game.active || game.paused) return;
    if(e.key==='ArrowLeft')  basket.x = Math.max(40, basket.x-28);
    if(e.key==='ArrowRight') basket.x = Math.min(W-40, basket.x+28);
  };
  document.addEventListener('keydown', kd);
  hud(0,'Jugando');
  rafId = requestAnimationFrame(loop);
  game.cleanup = function(){
    live=false; cancelAnimationFrame(rafId);
    removeEventListener('resize', onRs);
    document.removeEventListener('keydown', kd);
  };
}
/* ---------- Juego: GLOW CANVAS ---------- */
function gCanvas(){
  const body = shell(
    '<div style="height:340px;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:#0c101a;margin-top:12px">'+
    '<canvas id="gcCv" style="width:100%;height:100%;display:block;touch-action:none;cursor:crosshair"></canvas></div>'+
    '<div class="game-controls">'+
    '<button type="button" class="btn ghost" id="gcClear">Limpiar</button>'+
    '<button type="button" class="btn primary" id="gcSave">Guardar momento</button></div>'+
    '<p class="game-message">Dibuja libremente. La primera vez que guardes ganas +10 XP.</p>');
  const cvs = body.querySelector('#gcCv');
  const env = fitCanvas(cvs), ctx = env.ctx;
  let drawing=false, savedAward=false;
  function pos(e){
    const r = cvs.getBoundingClientRect();
    return { x:e.clientX-r.left, y:e.clientY-r.top };
  }
  cvs.addEventListener('pointerdown', e => {
    drawing=true;
    try{ cvs.setPointerCapture(e.pointerId); }catch(err){}
    const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y);
  });
  cvs.addEventListener('pointermove', e => {
    if(!drawing || game.paused) return;
    const p=pos(e);
    ctx.lineTo(p.x,p.y);
    ctx.strokeStyle='hsl('+((Math.random()*70+230)|0)+' 90% 72%)';
    ctx.lineWidth=3; ctx.lineCap='round'; ctx.stroke();
  });
  cvs.addEventListener('pointerup', () => drawing=false);
  body.querySelector('#gcClear').addEventListener('click', () => ctx.clearRect(0,0,env.w,env.h));
  body.querySelector('#gcSave').addEventListener('click', () => {
    if(savedAward) return toast('Ya guardaste este momento');
    savedAward=true; state.games++; xp(10); save();
    toast('Momento guardado · +10 XP');
  });
  hud('∞','Libre');
  game.cleanup = function(){};
}

/* ---------- Juego: SECRET RUN (personaje guiado) ---------- */
function gSecretRun(){
  const mult = { easy:.82, normal:1, hard:1.22 }[difficulty];
  const body = shell('<div class="game-board"><canvas id="srCv"></canvas></div>'+
    '<p class="game-message">Guía al personaje con el mouse o el dedo (o ↑ ↓). Esquiva los obstáculos '+
    'y llega a la meta 🏁: <b>+10 XP</b> ¡y saltará de felicidad!</p>');
  const cvs = body.querySelector('#srCv');
  let env = fitCanvas(cvs), ctx = env.ctx, W = env.w, H = env.h;
  const GOAL = 5200, CHX = 90;
  let dist=0, obs=[], dots=[], parts=[], charY=H/2, ty=H/2,
      over=false, finished=false, jumpT=-1,
      rafId=null, last=performance.now(), spawnAt=320, dust=0;
  for(let i=0;i<40;i++) dots.push({ x:Math.random(), y:Math.random(), z:.3+Math.random()*.7 });
  function resizeC(){
    env = fitCanvas(cvs); ctx=env.ctx; W=env.w; H=env.h;
    ty = Math.min(Math.max(ty,26), H-26);
  }
  resizeC();
  const onRs = () => resizeC();
  addEventListener('resize', onRs);
  function speed(){ return (170 + dist*.045) * mult; }
  function spawnObs(){
    const kind = Math.floor(Math.random()*3);
    if(kind===0)      obs.push({ x:W+40, y:H-70-Math.random()*40,   w:26, h:60+Math.random()*70 });
    else if(kind===1) obs.push({ x:W+40, y:0,                      w:26, h:60+Math.random()*70 });
    else              obs.push({ x:W+40, y:60+Math.random()*(H-220), w:70+Math.random()*40, h:26 });
  }
  function jumpCelebrate(){
    jumpT=0; sfx('win');
    for(let i=0;i<26;i++) parts.push({
      x:CHX, y:H-60, vx:(Math.random()-.5)*160, vy:-120-Math.random()*140,
      l:1, h:Math.random()*360 });
  }
  function rr(c,x,y,w,h,r){
    c.beginPath(); c.moveTo(x+r,y);
    c.arcTo(x+w,y,  x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,  y+h,x,  y,  r); c.arcTo(x,  y,  x+w,y,  r);
    c.closePath();
  }
  function crash(){
    over=true; cancelAnimationFrame(rafId); sfx('bad');
    offerRetry('💥 Chocaste al '+Math.min(99,Math.round(dist/GOAL*100))+'% del camino.');
  }
  function loop(ts){
    if(over) return;
    const dt = Math.min(.05,(ts-last)/1000); last=ts;
    if(!game.paused){
      charY += (ty-charY)*Math.min(1, dt*10);
      dist  += speed()*dt;
      if(dist >= spawnAt){ spawnAt += 240+Math.random()*160; spawnObs(); }
      const vx = speed()*dt;
      obs.forEach(o => o.x -= vx);
      obs = obs.filter(o => o.x > -160);
      dust += dt;
      if(dust>.12){ dust=0; parts.push({ x:CHX-10, y:charY+14, vx:-40, vy:-20, l:.5, h:265 }); }
      parts.forEach(p => { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=300*dt; p.l-=dt*1.4; });
      parts = parts.filter(p => p.l>0);
      if(jumpT>=0){ jumpT+=dt*60; if(jumpT>46) jumpT=46; }
      let cy = charY;
      if(jumpT>0) cy -= Math.sin(jumpT/46*Math.PI)*46;
      if(!finished){
        for(const o of obs){
          if(CHX+13>o.x && CHX-13<o.x+o.w && cy+13>o.y && cy-13<o.y+o.h){ crash(); return; }
        }
        if(dist >= GOAL){
          finished=true; jumpCelebrate();
          setTimeout(() => finishGame(100, 25, '¡META alcanzada! El personaje salta de felicidad 🏆'), 950);
        }
      }
    }
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#0b1024'); bg.addColorStop(1,'#141a33');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    dots.forEach(dp => {
      dp.x -= speed()*dt*.0002*dp.z;
      if(dp.x<0) dp.x+=1;
      ctx.globalAlpha=.25+.5*dp.z; ctx.fillStyle='#aabbcc';
      ctx.fillRect(dp.x*W, dp.y*H, 2, 2);
    });
    ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(140,124,255,.5)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,H-46); ctx.lineTo(W,H-46); ctx.stroke();
    const fx = W - (dist/GOAL)*(W+160);
    if(fx < W+20 && fx > -20){
      ctx.font='26px serif'; ctx.textAlign='center';
      ctx.fillText('🏁', fx, H-54);
    }
    ctx.save();
    ctx.shadowColor='#ff6b8a'; ctx.shadowBlur=14; ctx.fillStyle='#ff6b8a';
    obs.forEach(o => { rr(ctx,o.x,o.y,o.w,o.h,8); ctx.fill(); });
    ctx.restore();
    parts.forEach(p => {
      ctx.globalAlpha=Math.max(0,p.l);
      ctx.fillStyle='hsl('+p.h+' 90% 65%)';
      ctx.fillRect(p.x,p.y,4,4);
    });
    ctx.globalAlpha=1;
    let cy2 = charY;
    if(jumpT>0) cy2 -= Math.sin(jumpT/46*Math.PI)*46;
    ctx.save();
    ctx.shadowColor='#7c70ff'; ctx.shadowBlur=18;
    ctx.font='30px serif'; ctx.textAlign='center';
    ctx.fillText('👾', CHX, cy2);
    ctx.restore();
    hud(Math.min(100,Math.round(dist/GOAL*100))+'%', jumpT>=0?'¡Meta!':(game.paused?'Pausado':'Jugando'));
    rafId = requestAnimationFrame(loop);
  }
  const mv = e => {
    const r = cvs.getBoundingClientRect();
    ty = Math.min(H-26, Math.max(26, e.clientY-r.top));
  };
  cvs.addEventListener('pointermove', mv);
  cvs.addEventListener('pointerdown', mv);
  const kd = e => {
    if(!game.active || game.paused) return;
    if(e.key==='ArrowUp')   ty = Math.max(26, ty-30);
    if(e.key==='ArrowDown') ty = Math.min(H-26, ty+30);
  };
  document.addEventListener('keydown', kd);
  hud('0%','Jugando');
  rafId = requestAnimationFrame(loop);
  game.cleanup = function(){
    over=true; cancelAnimationFrame(rafId);
    removeEventListener('resize', onRs);
    document.removeEventListener('keydown', kd);
  };
}

/* ---------- Configuración / Topbar / Globales ---------- */
function settingsInit(){
  $('#settingsSound').addEventListener('change', e => {
    state.sound = e.target.checked;
    $('#soundBtn').textContent = state.sound?'🔊':'🔇';
    if(!state.sound){ stopAmbient(); musicStop(); }
    save(); toast(state.sound?'Sonidos activados':'🔇 Silenciado');
  });
  $('#settingsMotion').addEventListener('change', e => {
    state.reduced = e.target.checked;
    document.body.classList.toggle('reduced-motion', state.reduced);
    save(); Space.sync();
  });
  $('#resetData').addEventListener('click', () => {
    if(confirm('¿Eliminar todos los datos locales de Mind Glow?')){
      localStorage.removeItem(KEY);
      location.reload();
    }
  });
}
function topbarInit(){
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-view]');
    if(b) showView(b.dataset.view);
  });
  $('#soundBtn').addEventListener('click', () => {
    state.sound = !state.sound;
    $('#soundBtn').textContent = state.sound?'🔊':'🔇';
    $('#settingsSound').checked = state.sound;
    if(!state.sound){ stopAmbient(); musicStop(); }
    else sfx('good');
    save();
  });
  $('#collapseBtn').addEventListener('click', () => $('#sidebar').classList.toggle('collapsed'));
  $('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#enterBtn').addEventListener('click', () => {
    $('#welcome').classList.add('hidden');
    $('#app').classList.remove('hidden');
    showView('home');
    ensureStreak();
    sfx('good');
  });
  $('#gameClose').addEventListener('click', closeGame);
  $('#gameModal .modal-backdrop').addEventListener('click', () => {
    if(!$('#gameModal').classList.contains('hidden')) closeGame();
  });
  document.addEventListener('keydown', e => {
    if(e.key==='Escape' && !$('#gameModal').classList.contains('hidden')) closeGame();
  });
  document.addEventListener('keydown', e => {
    const tg = e.target;
    if(tg && (tg.tagName==='INPUT' || tg.tagName==='TEXTAREA')) return;
    if(e.key.toLowerCase()==='k' && game.active && game.name!=='Secret Run'){
      sfx('crunch'); toast('👀 Te vimos');
    }
  });
}

function donateInit(){
  $('#yapeNum').textContent = DONATE_YAPE;
  $('#plinNum').textContent = DONATE_PLIN;
  if(DONATE_KOFI){
    const k = $('#kofiLink');
    k.href = DONATE_KOFI; k.style.display = 'block';
  }
  const open  = () => { $('#donateModal').classList.remove('hidden'); sfx('good'); };
  const close = () => $('#donateModal').classList.add('hidden');
  $('#donateBtn').addEventListener('click', open);
  $('#donateClose').addEventListener('click', close);
  $('#donateModal .modal-backdrop').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if(e.key==='Escape' && !$('#donateModal').classList.contains('hidden')) close();
  });
  const copy = (txt, ok) => {
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(() => toast(ok))
      .catch(() => toast(txt));
  };
  $('#copyYape').addEventListener('click', () => copy(DONATE_YAPE,'📲 Yape copiado: '+DONATE_YAPE));
  $('#copyPlin').addEventListener('click', () => copy(DONATE_PLIN,'📲 Plin copiado: '+DONATE_PLIN));
}

/* ---------- Arranque ---------- */
function init(){
  buildNav();
  topbarInit();
  moodInit();
  aiInit();
  breathInit();
  ambientButtons();
  musicInit();
  focusInit();
  tasksInit();
  journalInit();
  schoolInit();
  feedbackInit();
  Space.init();
  arcadeInit();
  settingsInit();
  renderTeam();
  donateInit();
  document.body.classList.toggle('reduced-motion', state.reduced);
  $('#soundBtn').textContent = state.sound?'🔊':'🔇';
  ensureStreak();
  updateUI();
  showView('home');
  renderUser();
  authInit();
  window.addEventListener('load', authInit);
  setTimeout(authInit, 800);
}
init();
