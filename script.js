'use strict';
/* ============================================================
   MIND GLOW 3.0 — Motor principal
   Para login con Google: pega tu Client ID OAuth en la línea 9.
   console.cloud.google.com → Credenciales → OAuth (tipo Web)
   ============================================================ */
const GOOGLE_CLIENT_ID = ''; // ← PEGA AQUÍ TU CLIENT ID DE GOOGLE
const FORMSPREE_ID     = 'mqpzondw'; // ← ID de Formspree: los comentarios llegan al correo del equipo
const DONATE_YAPE      = '939 109 091'; // ← Número de Yape del equipo Mind Glow
const DONATE_KOFI      = '';            // ← opcional: enlace tipo https://ko-fi.com/mindglow

/* ---------- Utilidades ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const KEY = 'mindGlow3';
const USERS_KEY = 'mindGlowUsers3';
const ACTIVE_USER_KEY = 'mindGlowActiveUser3';
const AI_DB_KEY = 'mindGlowKnowledge3';
const AI_REMOTE_URL = '/api/ai';

function today(){ return new Date().toISOString().slice(0,10); }
function fmt(s){ if(!Number.isFinite(s)) return '0:00'; return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'); }
function esc(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function firstName(){ return (state.user && state.user.name) ? state.user.name.split(' ')[0] : ''; }

/* ---------- Estado ---------- */
const defaultState = {
  xp:0, level:1, mood:null, calm:0, focus:0, games:0,
  tasks:[], journal:[], sound:true, reduced:false,
  streak:0, highScores:{}, lastDate:null, aiMemory:[], aiHistory:[], aiUnknown:[], emotionLog:[], aiLastReplies:{},
  user:null,
  pet:{name:'Capi el Capibara', fed:70, energy:70, joy:70, last:null},
  teamImgs:{},
  wellnessLog:[],
  team:[{name:'JACK'},{name:'CAMILA'},{name:'CLARA'},{name:'ANDREA'},{name:'EDISON'}],
  feedback:[],
  studioProject:null,
  studioDraft:'',
  studioRun:null
};
let activeUserId = null;
let state = loadState();

function cloneDefault(){ return JSON.parse(JSON.stringify(defaultState)); }
function readJSON(key, fallback){
  try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch(e){ return fallback; }
}
function normalText(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function profileId(u){
  const email = normalText(u && u.email).trim();
  if(email) return 'google:' + email;
  const name = normalText(u && u.name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return name ? 'manual:' + name : 'guest:local';
}
function normalizeState(raw){
  const s = Object.assign(cloneDefault(), raw || {});
  s.highScores = (s.highScores && typeof s.highScores === 'object') ? s.highScores : {};
  s.aiMemory   = Array.isArray(s.aiMemory) ? s.aiMemory : [];
  s.aiHistory  = Array.isArray(s.aiHistory) ? s.aiHistory : [];
  s.aiUnknown  = Array.isArray(s.aiUnknown) ? s.aiUnknown : [];
  s.emotionLog = Array.isArray(s.emotionLog) ? s.emotionLog : [];
  s.aiLastReplies = (s.aiLastReplies && typeof s.aiLastReplies === 'object') ? s.aiLastReplies : {};
  s.tasks      = Array.isArray(s.tasks) ? s.tasks : [];
  s.journal    = Array.isArray(s.journal) ? s.journal : [];
  s.feedback   = Array.isArray(s.feedback) ? s.feedback : [];
  s.studioProject = (s.studioProject && typeof s.studioProject === 'object') ? s.studioProject : null;
  s.studioDraft = typeof s.studioDraft === 'string' ? s.studioDraft : '';
  s.studioRun = (s.studioRun && typeof s.studioRun === 'object') ? s.studioRun : null;
  s.wellnessLog= Array.isArray(s.wellnessLog) ? s.wellnessLog : [];
  s.teamImgs   = (s.teamImgs && typeof s.teamImgs==='object') ? s.teamImgs : {};
  if(!s.pet || typeof s.pet!=='object')
    s.pet = {name:'Capi el Capibara', fed:70, energy:70, joy:70, last:null};
  s.team       = Array.isArray(s.team) ? s.team : [];
  if(!s.team.length || s.team.some(m => m.role) ||
     (s.team.length===1 && s.team[0].name==='Jack'))
    s.team = [{name:'JACK'},{name:'CAMILA'},{name:'CLARA'},{name:'ANDREA'},{name:'EDISON'}];
  return s;
}
function readProfiles(){
  const profiles = readJSON(USERS_KEY, {});
  return profiles && typeof profiles === 'object' && !Array.isArray(profiles) ? profiles : {};
}
function loadState(){
  let profiles = readProfiles();
  /* Migrate the original single-profile storage without losing progress. */
  if(!Object.keys(profiles).length){
    const legacy = readJSON(KEY, null);
    if(legacy && typeof legacy === 'object' && Object.keys(legacy).length){
      const id = profileId(legacy.user);
      profiles[id] = normalizeState(legacy);
      try{ localStorage.setItem(USERS_KEY, JSON.stringify(profiles)); }catch(e){}
    }
  }
  activeUserId = localStorage.getItem(ACTIVE_USER_KEY) || Object.keys(profiles)[0] || 'guest:local';
  if(!profiles[activeUserId]) profiles[activeUserId] = cloneDefault();
  try{
    localStorage.setItem(ACTIVE_USER_KEY, activeUserId);
    localStorage.setItem(USERS_KEY, JSON.stringify(profiles));
  }catch(e){}
  return normalizeState(profiles[activeUserId]);
}
function persistCurrent(){
  if(!activeUserId) activeUserId = profileId(state && state.user);
  const profiles = readProfiles();
  profiles[activeUserId] = normalizeState(state);
  try{
    localStorage.setItem(USERS_KEY, JSON.stringify(profiles));
    localStorage.setItem(ACTIVE_USER_KEY, activeUserId);
  }catch(e){ console.warn('No se pudo guardar los perfiles locales', e); }
}
function save(){
  try{ persistCurrent(); localStorage.setItem(KEY, JSON.stringify(state)); }
  catch(e){ console.warn('No se pudo guardar el progreso local', e); }
  updateUI();
}
function switchProfile(u){
  persistCurrent();
  activeUserId = profileId(u);
  const profiles = readProfiles();
  state = normalizeState(profiles[activeUserId] || {user:u});
  state.user = u;
  save();
  renderUser();
  authInit();
  if(window.refreshGlowAI) window.refreshGlowAI();
  sfx('good');
  toast('👋 ¡Hola, '+firstName()+'!');
}

/* Respuestas variables: evita que el asistente repita la misma frase seguida. */
function pickFresh(key, options){
  const list = Array.isArray(options) ? options.filter(Boolean) : [];
  if(!list.length) return '';
  const previous = state && state.aiLastReplies ? state.aiLastReplies[key] : -1;
  const previousIndex = Number.isInteger(previous) ? previous : list.indexOf(previous);
  const candidates = list.length > 1 ? list.map((item,index) => index).filter(index => index !== previousIndex) : [0];
  const resultIndex = candidates[Math.floor(Math.random()*candidates.length)];
  const result = list[resultIndex];
  if(state){
    state.aiLastReplies = state.aiLastReplies || {};
    state.aiLastReplies[key] = resultIndex;
  }
  return result;
}

/* ---------- Comprensión emocional segura ----------
   Detecta señales expresadas por la persona; no diagnostica ni etiqueta.
   La respuesta siempre usa lenguaje tentativo: “parece” y “puedo equivocarme”. */
const EMOTION_PROFILES = [
  {id:'anxiety',label:'ansiedad o preocupación',patterns:[/ansiedad|ansios|preocup|nervios|me supera|no puedo respirar|palpit|intranquil/],prompt:'Podemos bajar un punto el ritmo y mirar solo el siguiente minuto.'},
  {id:'sadness',label:'tristeza',patterns:[/triste|deprim|llorar|vacio|sin ganas|desanim|me siento mal|dolor emocional/],prompt:'No voy a minimizar lo que sientes; merece espacio y apoyo.'},
  {id:'anger',label:'enojo o rabia',patterns:[/enoj|rabia|furia|molest|harto|odio|impotent|irritad/],prompt:'Tiene sentido necesitar una pausa antes de responder o decidir algo.'},
  {id:'fear',label:'miedo',patterns:[/miedo|asusta|aterror|temor|panico|peligro|me da miedo/],prompt:'Primero busquemos seguridad y una persona con quien no tengas que enfrentarlo solo.'},
  {id:'loneliness',label:'soledad',patterns:[/me siento solo|me siento sola|nadie me entiende|nadie esta|aislad|sin amigos|no tengo a nadie/],prompt:'Sentirte desconectado puede doler mucho; mereces compañía y apoyo real.'},
  {id:'shame',label:'vergüenza o culpa',patterns:[/verguenza|avergonz|culpable|me culpo|soy un fracaso|me odio a mi/],prompt:'Una emoción intensa no define tu valor como persona.'},
  {id:'frustration',label:'frustración',patterns:[/frustr|no me sale|no puedo hacerlo|decepcion|me rindo|harto de intentar/],prompt:'Podemos separar el problema en una parte pequeña y manejable.'},
  {id:'overwhelm',label:'agobio o agotamiento',patterns:[/agob|abrum|demasiado|colaps|no doy mas|agotad|cansad|presion|sobrecarg/],prompt:'Cuando todo pesa, no hace falta resolverlo todo a la vez.'},
  {id:'confusion',label:'confusión',patterns:[/confund|perdid|no entiendo|no se que hacer|no se como|desorient/],prompt:'Podemos ordenar lo que pasa sin apresurarnos a encontrar una respuesta perfecta.'},
  {id:'joy',label:'alegría o ilusión',patterns:[/feliz|alegr|content|emocionad|orgullos|me fue bien|estoy bien|genial/],prompt:'Me alegra leer un poco de luz en lo que cuentas; también merece celebrarse.'},
  {id:'calm',label:'calma',patterns:[/tranquil|en paz|relajad|sereno|me siento bien/],prompt:'Qué bueno que aparezca algo de calma; podemos cuidar ese espacio.'}
];
const CRISIS_PATTERNS = [
  {rx:/no quiero (seguir )?(vivir|viviendo)|no vale la pena vivir|quitarme la vida|terminar con mi vida/,level:'high'},
  {rx:/\b(me )?quiero morir\b(?! de risa| de sueno| de cansancio)/,level:'high'},
  {rx:/me quiero (matar|suicidar)|quiero (matarme|suicidarme)|hacerme dano|hacerme daño|autolesion|autolesionarme|cortarme|lastimarme/,level:'high'},
  {rx:/tengo un plan para|lo voy a hacer ahora|ya me hice dano|ya me hice daño|ya tome pastillas|ya tomé pastillas|matar a alguien|hacerle dano a alguien|hacerle daño a alguien/,level:'urgent'},
  {rx:/formas de suicidio|formas de matarme|como suicidarme|cómo suicidarme|como hacerme dano|cómo hacerme daño/,level:'high'}
];
const MEDICAL_EMERGENCY_PATTERN = /no puedo respirar|me falta el aire|dolor fuerte en el pecho|me desmaye|me desmay[eé]|perdi el conocimiento|perdí el conocimiento|sangrado abundante|convulsion|convulsión/;
function detectEmotion(input){
  const s = normalText(input).trim();
  if(!s) return null;
  if(MEDICAL_EMERGENCY_PATTERN.test(s)) return {id:'emergency',level:'urgent',confidence:.99};
  const abstractQuestion = /^(que es|que significa|como funciona|dime que es|puedes explicar|quiero saber que es|quiero saber sobre|hablame de|informacion sobre)\b/.test(s);
  const personalEmotion = /\b(me siento|estoy|ando|tengo|quiero|necesito|no puedo|me da|me preocupa|me duele|soy)\b/.test(s) && !abstractQuestion;
  const question = /\?|^(que|como|por que|porque|cuando|cual|puedes|dime|explica)\b/.test(s);
  for(const risk of CRISIS_PATTERNS){
    if(risk.rx.test(s) && !(/de risa|de sueno|de sueño|de cansancio/.test(s) && risk.level !== 'urgent'))
      return {id:'crisis',level:risk.level,confidence:.99};
  }
  if(abstractQuestion || (question && !personalEmotion)) return null;
  const activePattern = rx => {
    const match = rx.exec(s);
    if(!match) return false;
    const prefix = s.slice(Math.max(0,match.index-28),match.index);
    return !/\b(?:no|nunca|ya no)\s+(?:estoy|me siento|tengo|ando|soy|puedo)?\s*$/.test(prefix);
  };
  const ranked = EMOTION_PROFILES.map(profile => ({profile,score:profile.patterns.reduce((n,rx) => n+(activePattern(rx)?1:0),0)}))
    .filter(hit => hit.score > 0).sort((a,b) => b.score-a.score);
  if(!ranked.length) return null;
  const best = ranked[0];
  const intensity = /muy|mucho|demasiado|super|no puedo|me supera|todo el tiempo|cada dia|cada día|!!!/.test(s) ? 3 : (best.score > 1 ? 2 : 1);
  return {id:best.profile.id,label:best.profile.label,prompt:best.profile.prompt,intensity,confidence:Math.min(.94,.58+best.score*.1)};
}
function mentalHealthReply(signal){
  if(signal.id === 'emergency'){
    return {
      reply:'Esto puede ser una emergencia física. No puedo evaluarte por chat: avisa ahora a un adulto o persona cercana y llama al número local de emergencias, o ve a urgencias. Si estás en Perú, usa los servicios de emergencia disponibles en tu zona. No te quedes a solas.',
      actions:[],sources:[]
    };
  }
  if(signal.id === 'crisis'){
    const urgent = signal.level === 'urgent';
    return {
      reply:(urgent ? 'Gracias por decírmelo. Esto necesita ayuda humana inmediata. ' : 'Gracias por contármelo; no tienes que cargarlo en silencio. ')+
        '¿Estás en peligro ahora mismo o tienes la intención de hacerte daño o hacer daño a alguien? '+
        'Si la respuesta es sí, aléjate de cualquier objeto o sustancia con la que puedas lastimarte, no te quedes a solas y avisa ahora a un adulto o persona de confianza. '+
        'Si estás en Perú, llama gratis a la Línea 113, opción 5, que brinda orientación psicológica las 24 horas; si el peligro es inmediato, contacta los servicios de emergencia o ve a urgencias. Si estás en otro país, usa el número local de emergencias.',
      actions:[['Llamar a la Línea 113','tel:113']],sources:[{title:'MINSA Perú · Línea 113, opción 5',url:'https://www.gob.pe/institucion/minsa/pages/10942-solicitar-atencion-en-centros-de-salud-mental-comunitaria-en-el-peru'}]
    };
  }
  const level = signal.intensity === 3 ? ' especialmente intenso' : '';
  const opening = pickFresh('emotion-opening:'+signal.id, ['Parece que estás sintiendo ', 'Por lo que cuentas, aparece ', 'Leo en tus palabras ']);
  const question = signal.id === 'joy' || signal.id === 'calm'
    ? pickFresh('emotion-question:'+signal.id, ['¿Qué te ayudó a sentirte así?', '¿Quieres guardar este momento en tu Diario?', '¿Qué te gustaría cuidar para que dure un poco más?'])
    : pickFresh('emotion-question:'+signal.id, ['¿Quieres desahogarte o prefieres que pensemos en un paso pequeño?', '¿Qué fue lo más difícil de este momento?', '¿Prefieres que te escuche o que busquemos una idea práctica?']);
  return {
    reply:opening+signal.label+level+'. Puedo equivocarme, pero te estoy escuchando. '+signal.prompt+' '+question,
    actions:signal.id === 'anxiety' || signal.id === 'fear' ? [['Respirar ahora','calm']] : [['Escribirlo en Diario','journal']],
    sources:[]
  };
}
window.GlowAIMentalHealth = {detect:detectEmotion, reply:mentalHealthReply};

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
const NAV = [['home','✦','Mi Glow'],['studio','◈','Glow Forge'],['ai','✧','Glow AI'],['calm','☾','Zen Calma'],
  ['wellness','♥','Balance+'],['arcade','⚡','Arcade Rush'],['focus','◎','Deep Focus'],
  ['tasks','✓','Misiones'],['journal','✎','Bitácora'],['chat','☁','Comunidad Glow'],
  ['school','⌂','Mi Cole'],['space','✦','Universo Glow'],['profile','◉','Mi Perfil']];

function buildNav(){
  $('#navList').innerHTML = NAV.map(n =>
    '<button class="nav-item" data-view="'+n[0]+'" aria-label="'+n[2]+'"><span class="nav-logo nav-logo-'+n[0]+'" aria-hidden="true">'+n[1]+'</span><b>'+n[2]+'</b></button>').join('');
}
function showView(v){
  if(v !== 'studio' && document.body.classList.contains('studio-open')) Studio.saveRun();
  $$('.view').forEach(x => x.classList.toggle('active', x.id === 'view-'+v));
  $$('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === v));
  document.body.classList.toggle('studio-open', v === 'studio');
  const labels = {}; NAV.forEach(n => labels[n[0]] = n[2]);
  labels.settings = 'Ajustes';
  const navItem = NAV.find(n => n[0] === v);
  $('#pageTitle').innerHTML = navItem
    ? '<span class="page-title-logo page-title-logo-'+navItem[0]+'" aria-hidden="true">'+navItem[1]+'</span>'+esc(navItem[2])
    : '<span class="page-title-logo page-title-logo-settings" aria-hidden="true">⚙</span>Configuración';
  $('#pageKicker').textContent = 'MIND GLOW 3.0 · ' + (labels[v]||'').toUpperCase();
  if(v === 'tasks')   renderTasks();
  if(v === 'journal') renderJournal();
  if(v === 'school')  renderTeam();
  if(v === 'wellness'){ wellnessInit(); wellnessRender(); }
  if(v === 'chat')    chatInit();
  if(v === 'space'){ Space.sync(); renderPet(); }
  if(v === 'studio') setTimeout(() => { Studio.resize(); Studio.restore(); }, 40);
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
  const scNum = $('#streakNum'); if(scNum) scNum.textContent = state.streak;
  renderWeekDots();
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
    const profileCount = Object.keys(readProfiles()).filter(id => id !== 'guest:local').length;
    area.innerHTML = '<p class="auth-hint">Perfil activo: <b>'+esc(state.user.name)+'</b> · '+profileCount+' perfil(es) guardado(s) en este navegador.</p>'+
      '<button class="btn ghost" id="switchUserBtn">Cambiar de usuario</button> <button class="btn ghost" id="signOutBtn">Cerrar sesión</button>';
    $('#signOutBtn').addEventListener('click', signOut);
    $('#switchUserBtn').addEventListener('click', signOut);
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
  switchProfile(u);
}
function signOut(){
  try{ if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); }catch(e){}
  persistCurrent();
  activeUserId = 'guest:local';
  const profiles = readProfiles();
  state = normalizeState(profiles[activeUserId] || {});
  state.user = null;
  save(); renderUser(); authInit();
  if(window.refreshGlowAI) window.refreshGlowAI();
  toast('Sesión cerrada');
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

/* ---------- Base de conocimiento local ----------
   Las fichas son datos estructurados, no respuestas sueltas. Se pueden ampliar
   sin tocar el motor: cada ficha tiene tema, palabras clave y una explicación.
   La copia local permite que la IA siga funcionando sin API ni conexión. */
const MENTAL_HEALTH_SOURCES = [
  {title:'MINSA Perú · atención en salud mental',url:'https://www.gob.pe/institucion/minsa/pages/10942-solicitar-atencion-en-centros-de-salud-mental-comunitaria-en-el-peru'},
  {title:'OMS · autocuidado para la salud y el bienestar',url:'https://www.who.int/news-room/questions-and-answers/item/self-care-for-health-and-well-being'},
  {title:'OMS · prevención del suicidio',url:'https://www.who.int/news-room/questions-and-answers/item/suicide'},
  {title:'NIMH · cuándo buscar ayuda',url:'https://www.nimh.nih.gov/health/publications/my-mental-health-do-i-need-help'}
];
const KNOWLEDGE_SEED = [
  {id:'wellness-healthy-habits',category:'bienestar',title:'Cinco hábitos saludables',keywords:['habitos saludables','5 habitos saludables','cinco habitos saludables','rutina saludable','bienestar diario','cuidar mi salud mental'],answer:'Cinco hábitos que pueden cuidar tu bienestar son: 1) dormir y levantarte en horarios parecidos; 2) comer y tomar agua con regularidad; 3) moverte un poco cada día; 4) hacer pausas de pantalla y respirar cuando notes tensión; y 5) hablar con alguien de confianza cuando algo te pese. No tienes que cumplirlos perfectamente: empieza por uno pequeño y sostenible.',actions:[['Ir a Calma','calm'],['Abrir Diario','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'study-active-recall',category:'estudio',title:'Repaso activo',keywords:['repaso activo','recordar','memorizar','como estudio','estudiar mejor'],answer:'El repaso activo consiste en cerrar el cuaderno y recuperar la información de memoria: hazte preguntas, explica el tema en voz alta o resuelve un ejercicio sin mirar. Luego revisa tus errores. Es más útil que releer muchas veces.',actions:[['Iniciar Focus','focus']]},
  {id:'study-spaced-repetition',category:'estudio',title:'Repetición espaciada',keywords:['repeticion espaciada','tarjetas','flashcards','cuando repasar'],answer:'Reparte los repasos: hoy, mañana, en tres días y una semana después. Si recuerdas una tarjeta, aumenta el intervalo; si fallas, vuelve a verla pronto. Así fortaleces la memoria sin estudiar todo la noche.',actions:[['Añadir plan a Tareas','tasks']]},
  {id:'study-pomodoro',category:'estudio',title:'Método Pomodoro',keywords:['pomodoro','bloques de estudio','25 minutos','organizar estudio'],answer:'Elige un resultado concreto, trabaja 25 minutos sin notificaciones y descansa 5. Después de cuatro bloques, toma 15–30 minutos. Si 25 minutos te resulta mucho, empieza con 10: la constancia importa más que el número exacto.',actions:[['Abrir Focus','focus']]},
  {id:'study-summary',category:'estudio',title:'Cómo hacer un resumen',keywords:['hacer resumen','resumir','resumen escolar','ideas principales'],answer:'Lee para entender, no para copiar. Después escribe el tema en una frase, selecciona 3–5 ideas principales y conecta cada una con un ejemplo. Finalmente elimina repeticiones y comprueba que alguien pueda entenderlo sin el texto original.',actions:[['Abrir Diario','journal']]},
  {id:'study-concept-map',category:'estudio',title:'Mapa conceptual',keywords:['mapa conceptual','mapa mental','organizar conceptos','conectar ideas'],answer:'Pon el concepto central en el medio, agrupa las ideas relacionadas y une los grupos con flechas y palabras de enlace como “causa”, “incluye” o “se transforma en”. Si no puedes explicar una flecha, falta comprender esa relación.',actions:[['Crear una tarea','tasks']]},
  {id:'study-exam',category:'estudio',title:'Preparar un examen',keywords:['preparar examen','examen','prueba','evaluacion','antes del examen'],answer:'Haz una lista de temas, ordénalos por dificultad y practica con preguntas sin mirar apuntes. Corrige con una lista de errores. El día anterior prepara materiales y duerme; una maratón nocturna suele empeorar la atención.',actions:[['Modo Focus','focus'],['Anotar dudas','journal']]},
  {id:'study-math-fraction',category:'estudio',title:'Sumar fracciones',keywords:['sumar fracciones','restar fracciones','fracciones'],answer:'Con el mismo denominador, suma o resta los numeradores y conserva el denominador. Con denominadores distintos, busca un múltiplo común, convierte las fracciones equivalentes y simplifica el resultado.',actions:[]},
  {id:'study-algebra',category:'estudio',title:'Resolver una ecuación',keywords:['resolver ecuacion','ecuaciones','despejar x','algebra'],answer:'Haz la misma operación en ambos lados. Primero elimina sumas o restas; después multiplicaciones o divisiones. Al final sustituye tu resultado en la ecuación original para comprobarlo.',actions:[]},
  {id:'study-photosynthesis',category:'ciencia',title:'Fotosíntesis',keywords:['fotosintesis','plantas','clorofila','como comen las plantas'],answer:'La fotosíntesis es el proceso por el que las plantas usan luz, agua y dióxido de carbono para producir glucosa y liberar oxígeno. Ocurre principalmente en los cloroplastos, donde la clorofila captura la energía de la luz.',actions:[]},
  {id:'study-cell',category:'ciencia',title:'La célula',keywords:['que es una celula','celula animal','celula vegetal','organelos'],answer:'La célula es la unidad básica de los seres vivos. La membrana regula lo que entra y sale, el citoplasma contiene las estructuras internas y el ADN guarda instrucciones. Las células vegetales también tienen pared celular, cloroplastos y una gran vacuola.',actions:[]},
  {id:'study-newton',category:'ciencia',title:'Segunda ley de Newton',keywords:['segunda ley de newton','fuerza masa aceleracion','newton'],answer:'La segunda ley de Newton se expresa como F = m × a: la fuerza neta sobre un objeto es su masa multiplicada por la aceleración. Si aumentas la fuerza, aumenta la aceleración; si aumentas la masa con la misma fuerza, acelera menos.',actions:[]},
  {id:'study-scientific-method',category:'ciencia',title:'Método científico',keywords:['metodo cientifico','hipotesis','experimento','ciencia'],answer:'Una investigación suele seguir este ciclo: observar, formular una pregunta, proponer una hipótesis, diseñar un experimento, recoger datos, analizar resultados y comunicar conclusiones. Si los datos contradicen la hipótesis, se revisa: no es un fracaso.',actions:[]},
  {id:'study-water-cycle',category:'ciencia',title:'Ciclo del agua',keywords:['ciclo del agua','evaporacion','condensacion','precipitacion'],answer:'El calor evapora agua, el vapor asciende y se condensa en nubes; luego cae como precipitación. Parte se infiltra en el suelo y parte escurre hacia ríos y océanos, donde el ciclo vuelve a comenzar.',actions:[]},
  {id:'study-essay',category:'lengua',title:'Estructura de un ensayo',keywords:['hacer un ensayo','ensayo escolar','introduccion desarrollo conclusion','redactar'],answer:'Una estructura clara es: introducción con contexto y tesis, desarrollo con argumentos y evidencias, y conclusión que retoma la idea principal. Cada párrafo debe defender una sola idea y enlazarse con el siguiente.',actions:[]},
  {id:'study-english',category:'idiomas',title:'Present simple en inglés',keywords:['present simple','ingles','aprender ingles','do does'],answer:'El present simple habla de hábitos y hechos. Con I/you/we/they usa el verbo base; con he/she/it normalmente añade -s. En preguntas y negaciones usa do/does: “Do you study?” y “She doesn’t study.”',actions:[]},
  {id:'study-presentation',category:'estudio',title:'Exponer sin bloquearse',keywords:['exposicion','presentacion','hablar en publico','nervios al exponer'],answer:'Prepara tres ideas, no un texto para leer. Ensaya de pie y explica cada idea con un ejemplo. Antes de empezar, exhala más largo de lo que inhalas, mira a una persona amable y habla un poco más lento de lo normal.',actions:[['Respirar ahora','calm']]},
  {id:'study-procrastination',category:'hábitos',title:'Vencer la procrastinación',keywords:['procrastinacion','procrastinar','no tengo ganas de estudiar','flojera'],answer:'Reduce el inicio: abre el material y trabaja solo cinco minutos en una acción visible. Quita una distracción, deja el celular lejos y decide de antemano qué significa terminar. Empezar pequeño suele desbloquear el siguiente paso.',actions:[['Abrir Focus','focus'],['Ver Tareas','tasks']]},
  {id:'wellness-breathing',category:'bienestar',title:'Respiración para bajar revoluciones',keywords:['respirar','respiracion','calmarme','ansiedad leve','estres'],answer:'Prueba durante un minuto: inhala suavemente 4 segundos y exhala 6. No fuerces el aire ni aguantes la respiración. Si te mareas, vuelve a respirar normal. La respiración acompaña; no reemplaza ayuda profesional.',actions:[['Ir a Calma','calm']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-grounding',category:'bienestar',title:'Técnica de anclaje 5-4-3-2-1',keywords:['5 4 3 2 1','anclaje','ataque de ansiedad','panic','panico'],answer:'Mira 5 cosas, toca 4, escucha 3, identifica 2 olores y 1 sabor. Describe cada cosa con calma. Si además hay dificultad real para respirar, lesión, peligro o riesgo de hacerte daño, busca ayuda humana inmediata; esta técnica no sustituye una emergencia.',actions:[['Respirar ahora','calm'],['Escribirlo','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-sleep',category:'bienestar',title:'Higiene del sueño',keywords:['dormir mejor','insomnio','no puedo dormir','sueño','rutina de sueño'],answer:'Mantén una hora parecida para levantarte, baja la luz por la noche y evita estudiar o usar el celular en la cama. Si no te duermes, haz algo tranquilo con poca luz y vuelve cuando aparezca sueño. Si dura semanas, cuéntaselo a un adulto y consulta a un profesional.',actions:[['Abrir Calma','calm'],['Escribir en Diario','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-sadness',category:'bienestar',title:'Cuando te sientes triste',keywords:['triste','deprimido','llorar','me siento mal','me siento solo','soledad'],answer:'Lo que sientes merece atención. Ponle nombre, toma agua, haz una pausa y cuéntaselo hoy a alguien seguro. Si la tristeza dura, afecta tu vida o aparecen ideas de hacerte daño, busca a un adulto de confianza o ayuda profesional de inmediato; no tienes que manejarlo solo.',actions:[['Abrir Diario','journal'],['Ir a Calma','calm']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-bullying',category:'bienestar',title:'Qué hacer ante el acoso',keywords:['bullying','acoso escolar','me molestan','me insultan','violencia escolar'],answer:'No es tu culpa y no tienes que enfrentarlo solo. Guarda fechas o mensajes, aléjate si hay riesgo y cuéntaselo a un familiar, docente, tutor o dirección. Pide un plan concreto de protección. Si existe peligro inmediato, busca ayuda de emergencia.',actions:[['Escribir lo ocurrido','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-movement',category:'bienestar',title:'Pausa activa',keywords:['pausa activa','moverme','ejercicio corto','cansancio estudiando'],answer:'Cada 25–50 minutos levántate 2–5 minutos: camina, estira hombros y mira lejos de la pantalla. El movimiento breve puede ayudarte a volver con más energía, sin convertir el descanso en otra obligación.',actions:[['Iniciar Focus','focus']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-digital',category:'bienestar',title:'Descanso digital',keywords:['descanso de pantalla','adiccion al celular','menos celular','redes sociales'],answer:'Define momentos sin notificaciones, deja el teléfono fuera del alcance durante Focus y desactiva alertas que no necesitas. Cambia el impulso por una acción corta: agua, estiramiento, música o una conversación.',actions:[['Abrir Focus','focus']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-posture',category:'bienestar',title:'Postura frente a la pantalla',keywords:['postura','dolor de espalda','dolor de cuello','pantalla'],answer:'Apoya los pies, relaja hombros y coloca la pantalla aproximadamente a la altura de los ojos. Cambia de posición con frecuencia: ninguna postura fija es buena durante horas. Si el dolor persiste o es fuerte, coméntalo con un adulto y un profesional.',actions:[],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-emotions',category:'bienestar',title:'Entender las emociones',keywords:['que es una emocion','emociones','entender lo que siento','nombrar emociones','regular emociones'],answer:'Una emoción es una respuesta que puede incluir sensaciones del cuerpo, pensamientos y ganas de actuar. Nombrarla no la hace desaparecer, pero ayuda a entender qué necesitas. Puedes decir: “siento ___, empezó cuando ___ y ahora necesito ___”.',actions:[['Abrir Diario','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-emotional-regulation',category:'bienestar',title:'Regular una emoción intensa',keywords:['regular una emocion','controlar mis emociones','manejar emociones','me siento desbordado'],answer:'Primero baja la intensidad: aléjate unos minutos de la discusión, exhala lento y nota cinco cosas a tu alrededor. Después nombra la emoción, identifica el disparador y elige una acción segura. Regular no significa negar lo que sientes.',actions:[['Ir a Calma','calm']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-anxiety',category:'bienestar',title:'Ansiedad y preocupación',keywords:['que es la ansiedad','ansiedad constante','preocupacion excesiva','preocupacion','ataque de panico'],answer:'La ansiedad puede sentirse como preocupación, tensión, miedo o señales físicas. No puedo diagnosticarte. Si interfiere con dormir, estudiar, relacionarte o hacer tus actividades, cuéntaselo a un adulto y busca orientación profesional; en Perú puedes llamar a la Línea 113, opción 5.',actions:[['Respirar ahora','calm']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-anger',category:'bienestar',title:'Manejar el enojo',keywords:['manejar el enojo','controlar la rabia','estoy enojado','ira'],answer:'Si notas que podrías lastimar a alguien, aléjate y busca a un adulto. Si hay seguridad, toma una pausa, suelta la mandíbula y escribe qué límite o necesidad hay debajo del enojo. Habla cuando baje la intensidad, sin amenazas ni insultos.',actions:[['Escribirlo en Diario','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-grief',category:'bienestar',title:'Duelo y pérdida',keywords:['duelo','perdi a alguien','perdida de un ser querido','extraño a alguien','muerte de alguien'],answer:'El duelo no tiene un calendario único: puede traer tristeza, enojo, culpa, alivio o confusión. Busca compañía, mantén necesidades básicas y permite hablar de esa persona. Si no puedes funcionar o el dolor se vuelve insoportable, busca apoyo profesional.',actions:[['Abrir Diario','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-self-esteem',category:'bienestar',title:'Autoestima y autocrítica',keywords:['baja autoestima','no valgo','me siento inutil','soy inutil','no soy suficiente'],answer:'Un pensamiento duro sobre ti no es una medida objetiva de tu valor. Cambia “soy un fracaso” por una descripción concreta: “esto me salió mal y necesito ayuda o práctica”. Habla con alguien que te trate con respeto, especialmente si esta voz aparece muy seguido.',actions:[['Escribirlo en Diario','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-support',category:'bienestar',title:'Pedir ayuda',keywords:['como pedir ayuda','necesito ayuda emocional','hablar con alguien','buscar psicologo','ayuda psicologica'],answer:'Puedes empezar con una frase simple: “No me estoy sintiendo bien y necesito que me escuches; ¿podemos hablar hoy?”. Elige un adulto seguro, docente, tutor, familiar o profesional. Pedir ayuda no exagera el problema: abre una puerta de apoyo.',actions:[['Abrir Diario','journal']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-school-stress',category:'bienestar',title:'Estrés escolar',keywords:['estres escolar','estres por tareas','presion escolar','me abruma el colegio','muchas tareas'],answer:'Haz una lista de lo urgente y elige un solo siguiente paso. Divide una tarea grande, pide aclaración al docente y reserva pausas breves. Si el estrés afecta tu sueño, apetito, asistencia o ánimo durante varios días, cuéntaselo a un adulto y busca orientación.',actions:[['Ver Tareas','tasks'],['Abrir Focus','focus']],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-boundaries',category:'bienestar',title:'Límites saludables',keywords:['poner limites','limites personales','decir no','me cuesta decir no','presion de amigos'],answer:'Un límite puede ser claro y breve: “No quiero hacer eso”, “Necesito tiempo” o “No compartas esa información”. No tienes que justificarte interminablemente. Si alguien te amenaza o no respeta tu límite, aléjate y cuéntaselo a un adulto seguro.',actions:[],sources:MENTAL_HEALTH_SOURCES},
  {id:'wellness-professional-help',category:'bienestar',title:'Cuándo buscar apoyo profesional',keywords:['necesito terapia','debo ir al psicologo','cuando buscar ayuda','salud mental profesional','terapia'],answer:'Busca apoyo profesional si el malestar persiste, empeora o interfiere con dormir, comer, estudiar, relacionarte o cuidarte. En Perú, la Línea 113 opción 5 ofrece orientación psicológica gratuita las 24 horas; también puedes acudir a un establecimiento de salud o Centro de Salud Mental Comunitaria.',actions:[],sources:MENTAL_HEALTH_SOURCES},
  {id:'general-internet',category:'cultura digital',title:'Qué es internet',keywords:['que es internet','internet','web','red mundial'],answer:'Internet es una red de redes que permite que dispositivos intercambien datos usando reglas comunes, como TCP/IP. La web es uno de sus servicios: usa navegadores, direcciones y enlaces para acceder a páginas.',actions:[]},
  {id:'general-ai',category:'tecnología',title:'Cómo funciona Glow AI',keywords:['quien eres','eres una ia','como funciona la ia','inteligencia artificial','que es la ia','que es una ia'],answer:'Soy Glow AI: analizo palabras clave, contexto de la conversación y tu perfil local para buscar la ficha más relevante. Para preguntas abiertas puedo consultar un proveedor externo cuando el servidor está configurado. Si no tengo suficiente información, debo decirlo y pedir contexto en lugar de inventar.',actions:[]},
  {id:'general-password',category:'seguridad',title:'Contraseñas seguras',keywords:['contraseña segura','password','seguridad de cuenta','crear contraseña'],answer:'Usa una frase larga y única para cada cuenta; un gestor de contraseñas puede ayudarte. Activa la verificación en dos pasos y no compartas códigos. Si una contraseña se filtra, cámbiala desde la página oficial.',actions:[]},
  {id:'general-phishing',category:'seguridad',title:'Detectar phishing',keywords:['phishing','estafa','correo falso','enlace sospechoso','robar cuenta'],answer:'Desconfía de la urgencia, premios inesperados, errores extraños y enlaces que no coinciden con la empresa. No abras ni respondas; entra escribiendo tú mismo la dirección oficial y avisa a un adulto si es una cuenta escolar o familiar.',actions:[]},
  {id:'general-privacy',category:'seguridad',title:'Privacidad en Mind Glow',keywords:['privacidad','mis datos','datos personales','guardan mis datos'],answer:'El progreso, la memoria y las señales emocionales de Glow AI se guardan localmente en perfiles separados del navegador. No pongas contraseñas, documentos ni información sensible en el chat. Si activas servicios externos, revisa sus propias políticas antes de usarlos.',actions:[]},
  {id:'general-solar',category:'cultura general',title:'Sistema solar',keywords:['sistema solar','planetas','orden de los planetas'],answer:'Desde el Sol, el orden de los ocho planetas es: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno. Plutón se clasifica como planeta enano.',actions:[]},
  {id:'general-light',category:'cultura general',title:'Velocidad de la luz',keywords:['velocidad de la luz','luz','cuanto viaja la luz'],answer:'En el vacío, la luz viaja aproximadamente a 299 792 kilómetros por segundo. Por eso la luz del Sol tarda cerca de 8 minutos y 20 segundos en llegar a la Tierra.',actions:[]},
  {id:'general-climate',category:'cultura general',title:'Cambio climático',keywords:['cambio climatico','calentamiento global','efecto invernadero'],answer:'El efecto invernadero natural mantiene habitable la Tierra. La actividad humana ha aumentado gases como el dióxido de carbono, atrapando más calor y provocando cambios en temperaturas, lluvias, océanos y ecosistemas.',actions:[]},
  {id:'geo-peru',category:'geografía',title:'Perú',keywords:['capital de peru','peru','geografia del peru','regiones del peru'],answer:'La capital del Perú es Lima. El país suele describirse en tres grandes regiones geográficas: costa, sierra y selva; también tiene una gran diversidad de climas, ecosistemas y culturas.',actions:[]},
  {id:'geo-continents',category:'geografía',title:'Continentes',keywords:['continentes','cuantos continentes','america europa asia africa oceania'],answer:'En el modelo escolar más usado en español se reconocen seis continentes: América, Europa, Asia, África, Oceanía y Antártida. Algunos modelos separan América en Norteamérica y Sudamérica y hablan de siete.',actions:[]},
  {id:'geo-oceans',category:'geografía',title:'Océanos',keywords:['oceanos','mares','cuantos oceanos','oceano pacifico'],answer:'Los cinco océanos reconocidos habitualmente son Pacífico, Atlántico, Índico, Ártico y Antártico. El Pacífico es el más extenso.',actions:[]},
  {id:'history-don-quixote',category:'literatura',title:'Don Quijote de la Mancha',keywords:['quien escribio don quijote','don quijote','miguel de cervantes','cervantes'],answer:'Don Quijote de la Mancha es una novela de Miguel de Cervantes. Publicó su primera parte en 1605 y la segunda en 1615; la obra juega con la frontera entre los libros de caballería y la realidad.',actions:[]},
  {id:'history-independence',category:'historia',title:'Independencia del Perú',keywords:['independencia del peru','28 de julio','san martin peru','historia peru'],answer:'La proclamación de la independencia del Perú se realizó el 28 de julio de 1821 en Lima, en un proceso militar y político que continuó hasta la consolidación de la independencia en los años siguientes.',actions:[]},
  {id:'math-percentage',category:'matemática',title:'Porcentajes',keywords:['porcentaje','calcular porcentaje','aumento porcentual','descuento'],answer:'Para hallar p% de una cantidad, multiplica la cantidad por p y divide entre 100. Para un descuento, resta ese resultado; para un aumento, súmalo. Ejemplo: 20% de 50 es 10.',actions:[]},
  {id:'math-area',category:'matemática',title:'Áreas básicas',keywords:['area de un cuadrado','area de un rectangulo','area de un triangulo','geometria'],answer:'Rectángulo: base × altura. Cuadrado: lado × lado. Triángulo: (base × altura) ÷ 2. No olvides escribir la unidad al cuadrado, como cm².',actions:[]},
  {id:'math-pythagoras',category:'matemática',title:'Teorema de Pitágoras',keywords:['teorema de pitagoras','triangulo rectangulo','hipotenusa'],answer:'En un triángulo rectángulo, a² + b² = c², donde c es la hipotenusa, el lado opuesto al ángulo recto. Para encontrar un lado, despeja y calcula la raíz cuadrada.',actions:[]},
  {id:'coding-html',category:'programación',title:'HTML, CSS y JavaScript',keywords:['que es html','que es css','que es javascript','programar una web'],answer:'HTML define la estructura y el contenido, CSS controla el aspecto visual y JavaScript añade comportamiento e interacción. Juntos forman la base de muchas páginas web.',actions:[]},
  {id:'coding-algorithm',category:'programación',title:'Algoritmo',keywords:['que es un algoritmo','algoritmos','programacion','resolver problemas'],answer:'Un algoritmo es una secuencia finita y ordenada de pasos para resolver un problema o producir un resultado. Un buen algoritmo tiene entradas claras, pasos comprensibles y una condición de finalización.',actions:[]},
  {id:'digital-recycling',category:'medio ambiente',title:'Reciclaje',keywords:['reciclar','reciclaje','separar residuos','cuidar el ambiente'],answer:'Reduce primero lo que consumes, reutiliza lo que todavía sirve y separa los residuos según las reglas de tu localidad. Limpia los envases cuando sea necesario y no mezcles pilas o aparatos electrónicos con la basura común.',actions:[]},
  {id:'civics-democracy',category:'ciudadanía',title:'Democracia',keywords:['que es democracia','democracia','ciudadania','derechos y deberes'],answer:'La democracia es una forma de organización política en la que la ciudadanía participa en las decisiones públicas, directamente o mediante representantes. También exige derechos, responsabilidades, reglas y respeto a las diferencias.',actions:[]},
  {id:'language-grammar',category:'lengua',title:'Sujeto y predicado',keywords:['sujeto y predicado','gramatica','analizar una oracion','oracion'],answer:'El sujeto es de quién o de qué se habla; el predicado dice algo sobre ese sujeto y contiene el verbo. Pregunta “¿quién realiza o recibe la acción?” para encontrar el sujeto, pero recuerda que a veces está omitido.',actions:[]},
  {id:'learning-critical-thinking',category:'aprendizaje',title:'Pensamiento crítico',keywords:['pensamiento critico','evaluar informacion','noticias falsas','distinguir verdad'],answer:'Pregunta quién afirma algo, qué evidencia presenta, cuándo se publicó y si otras fuentes confiables coinciden. Distingue hechos, opiniones y publicidad; un titular llamativo no sustituye a la evidencia.',actions:[]},
  {id:'study-notes',category:'estudio',title:'Tomar buenos apuntes',keywords:['tomar apuntes','apuntes de clase','notas de estudio','como tomar notas'],answer:'Anota conceptos y relaciones con tus propias palabras, no cada frase. Deja preguntas en un margen y, al terminar, escribe un resumen breve. Revisar tus apuntes el mismo día y convertirlos en preguntas mejora el aprendizaje.',actions:[['Abrir Diario','journal']]},
  {id:'study-smart-goals',category:'hábitos',title:'Objetivos SMART',keywords:['objetivo smart','metas de estudio','meta concreta','planificar objetivo'],answer:'Una meta útil es específica, medible, alcanzable, relevante y con fecha. “Estudiar más” es vago; “resolver 10 ejercicios de fracciones antes de las 6” te dice exactamente qué hacer y cuándo terminar.',actions:[['Añadir una tarea','tasks']]},
  {id:'study-citation',category:'aprendizaje',title:'Citar fuentes y evitar plagio',keywords:['citar fuentes','plagio','copiar tarea','referencias bibliograficas'],answer:'Usa tus propias palabras y conserva los datos de la fuente: autor, título, sitio o libro y fecha de consulta. Si copias una frase exacta, ponla entre comillas y cítala. Entender y explicar vale más que pegar texto.',actions:[]},
  {id:'science-dna',category:'biología',title:'ADN',keywords:['que es el adn','adn','genes','herencia genetica'],answer:'El ADN es una molécula que almacena instrucciones biológicas. Los genes son segmentos de ADN que participan en características y funciones; se organizan en cromosomas dentro de las células.',actions:[]},
  {id:'science-ecosystem',category:'biología',title:'Ecosistema',keywords:['que es un ecosistema','ecosistema','seres vivos y ambiente','habitat'],answer:'Un ecosistema reúne seres vivos y el entorno físico con el que interactúan. La energía suele entrar por productores como las plantas y pasa por consumidores y descomponedores; la materia se recicla.',actions:[]},
  {id:'science-food-chain',category:'biología',title:'Cadena alimentaria',keywords:['cadena alimentaria','cadena trofica','productores consumidores descomponedores'],answer:'Una cadena alimentaria muestra cómo fluye la energía: productores, consumidores y descomponedores. En una red alimentaria varias cadenas se conectan y una especie puede ocupar más de un papel.',actions:[]},
  {id:'science-atom',category:'química',title:'Átomo',keywords:['que es un atomo','atomo','protones neutrones electrones'],answer:'Un átomo tiene un núcleo con protones y neutrones, rodeado por electrones. El número de protones identifica el elemento; los electrones participan especialmente en los enlaces químicos.',actions:[]},
  {id:'science-ph',category:'química',title:'Escala de pH',keywords:['que es el ph','ph acido basico','acidez','alcalino'],answer:'El pH describe qué tan ácida o básica es una disolución. En la escala habitual, 7 es neutro, valores menores son ácidos y mayores son básicos. No pruebes sustancias para averiguarlo.',actions:[]},
  {id:'science-matter',category:'química',title:'Estados de la materia',keywords:['estados de la materia','solido liquido gas','cambios de estado'],answer:'En un sólido las partículas están muy juntas y mantienen forma; en un líquido se deslizan y toman la forma del recipiente; en un gas están más separadas y se expanden. Calentar o enfriar puede provocar cambios de estado.',actions:[]},
  {id:'science-energy',category:'física',title:'Energía',keywords:['que es la energia','tipos de energia','energia cinetica potencial'],answer:'La energía es la capacidad de producir cambios o realizar trabajo. Puede presentarse como cinética, potencial, térmica, química, eléctrica o luminosa; no desaparece, se transforma y se transfiere.',actions:[]},
  {id:'science-density',category:'física',title:'Densidad',keywords:['que es la densidad','calcular densidad','masa y volumen'],answer:'La densidad relaciona masa y volumen: d = m ÷ V. Dos objetos del mismo tamaño pueden tener distinta masa porque sus materiales tienen distinta densidad.',actions:[]},
  {id:'math-average',category:'matemática',title:'Promedio',keywords:['calcular promedio','media aritmetica','promedio de numeros'],answer:'Suma todos los valores y divide entre cuántos valores hay. Si hay valores extremos, también conviene mirar la mediana, que es el dato central al ordenar la lista.',actions:[]},
  {id:'math-probability',category:'matemática',title:'Probabilidad',keywords:['probabilidad','calcular probabilidad','posibilidades'],answer:'Si todos los resultados son igualmente posibles, probabilidad = casos favorables ÷ casos posibles. Se expresa entre 0 y 1 o entre 0% y 100%; 0 es imposible y 1 es seguro.',actions:[]},
  {id:'math-proportion',category:'matemática',title:'Regla de tres',keywords:['regla de tres','proporcion','magnitudes proporcionales'],answer:'Comprueba primero que las magnitudes sean proporcionales. Si a corresponde a b y c corresponde a x, puedes plantear a/b = c/x y despejar x mediante multiplicación cruzada.',actions:[]},
  {id:'math-decimals',category:'matemática',title:'Decimales',keywords:['sumar decimales','multiplicar decimales','numeros decimales'],answer:'Para sumar o restar, alinea las comas y completa con ceros. Para multiplicar, multiplica como enteros y coloca la coma contando las cifras decimales de los factores.',actions:[]},
  {id:'geo-coordinates',category:'geografía',title:'Latitud y longitud',keywords:['latitud y longitud','coordenadas geograficas','ubicacion en un mapa'],answer:'La latitud mide la distancia al norte o sur del ecuador; la longitud mide la distancia al este u oeste del meridiano de Greenwich. Juntas forman coordenadas para ubicar un lugar.',actions:[]},
  {id:'geo-weather-climate',category:'geografía',title:'Tiempo y clima',keywords:['diferencia entre tiempo y clima','tiempo atmosferico','clima'],answer:'El tiempo atmosférico es lo que ocurre en la atmósfera ahora o durante pocos días. El clima es el patrón promedio de una región durante periodos largos. Un día frío no contradice por sí solo el calentamiento global.',actions:[]},
  {id:'geo-renewable',category:'medio ambiente',title:'Energías renovables',keywords:['energias renovables','energia solar eolica','no renovables'],answer:'Las renovables se regeneran naturalmente a escala humana, como solar, eólica, hidráulica y geotérmica. Que sean renovables no significa que no tengan impactos: también hay que considerar espacio, materiales, residuos y ecosistemas.',actions:[]},
  {id:'history-industrial',category:'historia',title:'Revolución Industrial',keywords:['revolucion industrial','maquinas y fabricas','industrializacion'],answer:'La Revolución Industrial comenzó en Gran Bretaña durante el siglo XVIII y transformó la producción con máquinas, fábricas y nuevas fuentes de energía. Cambió el trabajo, las ciudades, el transporte y las condiciones sociales.',actions:[]},
  {id:'history-ancient-egypt',category:'historia',title:'Antiguo Egipto',keywords:['antiguo egipto','egipto faraones','piramides'],answer:'El antiguo Egipto se desarrolló alrededor del río Nilo. Su sociedad tuvo faraones, administración, escritura jeroglífica y una religión diversa; las pirámides fueron grandes construcciones funerarias de algunos periodos.',actions:[]},
  {id:'coding-variable',category:'programación',title:'Variable',keywords:['que es una variable','variables en programacion','guardar datos codigo'],answer:'Una variable es un nombre asociado a un valor que un programa puede leer o cambiar. Por ejemplo, “edad” podría guardar el número 15; el tipo de valor determina qué operaciones tiene sentido hacer.',actions:[]},
  {id:'coding-function',category:'programación',title:'Función',keywords:['que es una funcion en programacion','funciones de codigo','parametros y retorno'],answer:'Una función agrupa instrucciones reutilizables. Puede recibir parámetros, procesarlos y devolver un resultado; dividir un programa en funciones facilita leerlo, probarlo y corregirlo.',actions:[]},
  {id:'coding-debugging',category:'programación',title:'Depurar código',keywords:['depurar codigo','debuggear','error de programacion','arreglar bug'],answer:'Reproduce el error, lee el mensaje, reduce el problema a un ejemplo pequeño y revisa los valores paso a paso. Cambia una cosa a la vez y vuelve a probar; anotar qué esperabas y qué ocurrió acelera la búsqueda.',actions:[]},
  {id:'coding-database',category:'programación',title:'Base de datos',keywords:['que es una base de datos','database','tablas registros campos'],answer:'Una base de datos organiza información para guardarla, buscarla y actualizarla. En una base relacional, las tablas tienen registros y campos, y las relaciones evitan repetir datos innecesariamente.',actions:[]},
  {id:'language-accent',category:'lengua',title:'Tildes',keywords:['cuando usar tilde','reglas de acentuacion','palabras agudas graves esdrujulas'],answer:'Las palabras agudas llevan tilde si terminan en vocal, n o s; las graves si no terminan en vocal, n o s; las esdrújulas siempre llevan tilde. Hay excepciones y casos de hiato, así que conviene revisar la palabra concreta.',actions:[]},
  {id:'language-argument',category:'lengua',title:'Argumentar',keywords:['como hacer un argumento','argumento y evidencia','opinion con razones'],answer:'Presenta una afirmación, explica el motivo y apóyalo con una evidencia o ejemplo. Considera una posible objeción y responde con respeto; una opinión se vuelve argumento cuando tiene razones comprobables.',actions:[]},
  {id:'digital-two-factor',category:'seguridad',title:'Verificación en dos pasos',keywords:['verificacion dos pasos','autenticacion 2fa','codigo de seguridad'],answer:'La verificación en dos pasos añade una segunda prueba además de la contraseña, como una app autenticadora o una llave de seguridad. Actívala desde la configuración oficial y nunca compartas sus códigos.',actions:[]},
  {id:'digital-cyberbullying',category:'seguridad',title:'Ciberacoso',keywords:['ciberbullying','acoso por internet','mensajes de acoso'],answer:'No respondas con amenazas, guarda capturas y bloquea o reporta la cuenta. Cuéntaselo a un adulto de confianza, docente o tutor; si hay amenazas físicas o difusión de información íntima, busca ayuda inmediata.',actions:[]},
  {id:'app-tasks',category:'mind glow',title:'Tareas',keywords:['como uso tareas','crear tarea','lista de tareas','organizar mis tareas'],answer:'En Tareas divide algo grande en pasos pequeños y marca cada paso al terminar. Un buen paso empieza con un verbo: “leer”, “resolver”, “ensayar” o “entregar”.',actions:[['Abrir Tareas','tasks']]},
  {id:'app-focus',category:'mind glow',title:'Focus',keywords:['como uso focus','temporizador','modo focus','concentracion en mind glow'],answer:'Focus te ayuda a trabajar en bloques con pausas. Antes de iniciar escribe qué resultado quieres obtener y deja una sola tarea visible.',actions:[['Abrir Focus','focus']]},
  {id:'app-journal',category:'mind glow',title:'Diario',keywords:['como uso diario','escribir diario','diario personal','anotar sentimientos'],answer:'Usa el Diario para descargar pensamientos, registrar ánimo y convertir una preocupación en un siguiente paso. Es privado dentro de tu perfil local; evita escribir datos sensibles.',actions:[['Abrir Diario','journal']]},
  {id:'app-arcade',category:'mind glow',title:'Arcade',keywords:['que juegos hay','juegos de mind glow','arcade','quiero jugar','juegos competitivos','juegos faciles'],answer:'Arcade reúne 14 retos propios: Keyboard, Focus Tap, Glow Duel, Neon Stack, Target Arena, Color Rush, Merge Blitz, Lane Rush, Quiz Clash, Word Sprint, Memory Glow, Food Catch, Glow Canvas y Secret Run. Hay ritmo, reflejos, estrategia, memoria, palabras y duelos contra Capi; úsalo como descanso con límite, no como una distracción infinita.',actions:[['Abrir Arcade','arcade']]},
  {id:'app-studio',category:'mind glow',title:'Game Studio',keywords:['game studio','crear juego','juego 3d','generar mundo'],answer:'Game Studio convierte una descripción en un mundo 3D jugable dentro de la app. Escribe el escenario, objetivo y estilo; después puedes pedir cambios como “añade enemigos” o “haz el mapa más grande”.',actions:[['Abrir Game Studio','studio']]},
  {id:'app-multiuser',category:'mind glow',title:'Perfiles de usuario',keywords:['varios usuarios','multiusuario','otro usuario','cambiar usuario','cambio de usuario','perfiles'],answer:'Mind Glow guarda cada perfil con un identificador separado: el correo de Google cuando existe o el nombre elegido en el acceso manual. Así las tareas, progreso, memoria y diario de una persona no se mezclan con los de otra en el mismo navegador.',actions:[['Abrir Perfil','profile']]}
];

function loadKnowledge(){
  const saved = readJSON(AI_DB_KEY, null);
  const seedIds = new Set(KNOWLEDGE_SEED.map(doc => doc.id));
  const custom = saved && Array.isArray(saved.documents) ? saved.documents.filter(doc => doc && (!seedIds.has(doc.id) || doc.custom)) : [];
  const byId = {};
  KNOWLEDGE_SEED.concat(custom).forEach(doc => { if(doc && doc.id) byId[doc.id] = doc; });
  const db = {version:3, updatedAt:(saved && saved.updatedAt) || Date.now(), documents:Object.values(byId)};
  try{ localStorage.setItem(AI_DB_KEY, JSON.stringify(db)); }catch(e){}
  return db;
}
let aiDatabase = loadKnowledge();
const AI_STOP_WORDS = new Set(['que','como','para','una','uno','las','los','del','por','con','sin','tengo','quiero','puedo','esta','este','eso','hoy','muy','más','mas','me','mi','de','el','la','y','o','a','en']);
function knowledgeRank(query, contextId){
  const q = normalText(query);
  const tokens = q.split(/[^a-z0-9]+/).filter(t => t.length > 2 && !AI_STOP_WORDS.has(t));
  if(!tokens.length && !q.trim()) return [];
  return aiDatabase.documents.map(doc => {
    const title = normalText(doc.title);
    const keys = (doc.keywords || []).map(normalText);
    let score = contextId && doc.id === contextId ? 6 : 0;
    keys.forEach(k => { if(q.includes(k)) score += k.includes(' ') ? 8 : 4; });
    tokens.forEach(t => {
      if(title.includes(t)) score += 2;
      if(keys.some(k => k.split(/[^a-z0-9]+/).includes(t))) score += 2;
      if(normalText(doc.answer).includes(t)) score += .25;
    });
    return {doc,score};
  }).sort((a,b) => b.score-a.score);
}
function knowledgeSearch(query, contextId){
  const ranked = knowledgeRank(query, contextId);
  return ranked[0] && ranked[0].score >= 4 ? ranked[0].doc : null;
}
function knowledgeSearchMany(query, contextId, limit){
  return knowledgeRank(query, contextId).filter(hit => hit.score >= 4).slice(0, limit || 3).map(hit => hit.doc);
}
function addKnowledgeEntry(entry){
  if(!entry || !entry.id || !entry.title || !entry.answer) return false;
  aiDatabase.documents = aiDatabase.documents.filter(d => d.id !== entry.id).concat(Object.assign({}, entry, {custom:true}));
  aiDatabase.updatedAt = Date.now();
  try{ localStorage.setItem(AI_DB_KEY, JSON.stringify(aiDatabase)); }catch(e){ return false; }
  return true;
}
window.GlowAIKnowledge = {search:knowledgeSearch, searchMany:knowledgeSearchMany, add:addKnowledgeEntry, list:() => aiDatabase.documents.slice()};

const LOCAL_AI_INTENTS = new Set(['math','time','date','coin','dice','choose','panic','stress','focus','exam','sleep','calm','sad','lazy','progress','joke','fact','music','hello','thanks','fun','something','capabilities','about','game-studio','art','safety','emergency']);
const LOCAL_PRIVATE_KNOWLEDGE = new Set(['bienestar','seguridad','mind glow']);
const AI_FALLBACKS = [
  {text:'Quiero darte una respuesta útil y no inventar. Puedes decirme el tema y qué necesitas exactamente, o elegir una opción para avanzar ahora.',actions:[['Respirar en Calma','calm'],['Organizar Tareas','tasks'],['Abrir Bienestar','wellness']]},
  {text:'Todavía no entendí del todo, pero sí puedo acompañarte por otro camino. ¿Quieres relajarte, ordenar algo, estudiar o despejarte?',actions:[['Ir a Calma','calm'],['Abrir Focus','focus'],['Jugar en Arcade','arcade']]},
  {text:'No quiero responderte cualquier cosa. Prueba reformularlo con una palabra clave o usa uno de estos accesos para que hagamos algo útil juntos.',actions:[['Escribir en Diario','journal'],['Ver mi Perfil','profile'],['Crear un juego','studio']]},
  {text:'Esa pregunta necesita un poco más de contexto. Mientras me lo das, puedo ayudarte a revisar tu bienestar, planificar el día o desconectar unos minutos.',actions:[['Test de Bienestar','wellness'],['Plan para hoy','tasks'],['Abrir Arcade','arcade']]}
];
const PERSONAL_EMOTION_PATTERN = /\b(me siento|estoy|ando|tengo)\b.*\b(ansios|ansiedad|triste|mal|solo|sola|enoj|rabia|miedo|asusta|culpable|verguenza|agob|abrum|confund|perdid|agotad|raro|rara)\b/;
let aiRequestSerial = 0;
async function askExternalAI(question, localOut, guard){
  const meta = localOut[2] || {};
  const localFallback = reason => [localOut[0], localOut[1], Object.assign({}, meta, {source:'local', fallback:reason})];
  const personalEmotion = PERSONAL_EMOTION_PATTERN.test(normalText(question));
  const privateKnowledge = meta.intent && meta.intent.indexOf('knowledge:') === 0 &&
    LOCAL_PRIVATE_KNOWLEDGE.has(meta.intent.slice('knowledge:'.length));
  if(LOCAL_AI_INTENTS.has(meta.intent) || (meta.intent && meta.intent.indexOf('emotion:') === 0) || privateKnowledge ||
     personalEmotion || (typeof navigator !== 'undefined' && navigator.onLine === false))
    return localFallback(privateKnowledge || personalEmotion ? 'private' : 'offline');
  try{
    const localDocs = knowledgeSearchMany(question, meta.kbId, 3);
    const localContext = localDocs.length ? localDocs.map(doc =>
      '• '+doc.title+' ('+doc.category+'): '+doc.answer
    ).join('\n') : (meta.intent && meta.intent !== 'general' ? 'La base local clasificó la consulta como '+meta.intent+'.' : '');
    const history = (state.aiHistory || []).slice(0,-2).slice(-8).map(item => ({
      role:item.role === 'assistant' ? 'assistant' : 'user', content:item.text
    }));
    const res = await fetch(AI_REMOTE_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        message:question,
        profile:state.user && state.user.name ? state.user.name : '',
        history,
        localContext:localContext
      })
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || !data.answer) return localFallback('external-unavailable');
    if(!guard || guard.userId !== activeUserId || guard.serial !== aiRequestSerial) return localFallback('stale');
    const answer = String(data.answer).trim();
    const last = state.aiHistory && state.aiHistory[state.aiHistory.length-1];
    if(last && last.role === 'assistant'){
      last.text = answer.slice(0,700);
      last.intent = 'external-ai';
      last.source = data.source || 'external-ai';
      last.sources = Array.isArray(data.sources) ? data.sources.slice(0,5) : [];
    }
    const memory = state.aiMemory && state.aiMemory[state.aiMemory.length-1];
    if(memory){ memory.intent = 'external-ai'; memory.source = data.source || 'external-ai'; }
    save();
    return [answer, localOut[1], {intent:'external-ai', source:data.source || 'external-ai', sources:Array.isArray(data.sources) ? data.sources.slice(0,5) : []}];
  }catch(error){
    return localFallback('external-unavailable');
  }
}

/* ---------- Glow AI ---------- */
function aiInit(){
  const box = $('#chatMessages'), input = $('#chatInput');
  function add(t, who, actions, sources){
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
        b.addEventListener('click', () => {
          if(/^(https?:|tel:)/i.test(a[1] || '')) window.location.href = a[1];
          else { showView(a[1]); toast('Abriendo '+a[0]); }
          sfx('click');
        });
        row.appendChild(b);
      });
      d.appendChild(row);
    }
    if(sources && sources.length){
      const sourceBox = document.createElement('div');
      sourceBox.className = 'bubble-sources';
      const label = document.createElement('small');
      label.textContent = 'Fuentes consultadas';
      sourceBox.appendChild(label);
      sources.slice(0,5).forEach(source => {
        if(!source || !/^https?:\/\//i.test(source.url || '')) return;
        const a = document.createElement('a');
        a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = source.title || source.url;
        sourceBox.appendChild(a);
      });
      if(sourceBox.querySelector('a')) d.appendChild(sourceBox);
    }
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
  const welcome = () => 'Hola'+(firstName()?', '+firstName():'')+'. Soy Glow AI 3.0, tu guía personal local.\nPuedo reconocer señales emocionales en lo que escribes, responder con empatía y ofrecer pasos seguros sin diagnosticarte. También tengo una base de conocimiento de estudio, ciencia, bienestar, seguridad digital y Mind Glow.\nCuando el servidor está configurado, consulto un proveedor externo para preguntas abiertas. No invento datos: si no conozco algo o no hay conexión, te lo diré. ¿Cómo te sientes hoy?';
  window.refreshGlowAI = () => {
    box.innerHTML = '';
    add(welcome(),'ai');
    (state.aiHistory || []).slice(-12).forEach(m => add(m.text, m.role === 'user' ? 'user' : 'ai', m.actions || [], m.sources || []));
  };
  window.refreshGlowAI();

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
    let kbId = null;
    let actions = [];
    let sources = [];
    const h = new Date().getHours();
    const saludo = h<12 ? 'Buenos días' : h<19 ? 'Buenas tardes' : 'Buenas noches';
    const pending=state.tasks.filter(t=>!t.done).length, mood=state.mood ? state.mood.label.toLowerCase() : '';
    let reply = 'Puedo darte una siguiente acción pequeña. Prueba: "estoy estresado", "no puedo concentrarme", "dame un plan de estudio", "quiero jugar", "mi progreso", un cálculo o un dato curioso.'+(pending?' Ahora tienes '+pending+' tarea(s) pendiente(s).':'')+(mood?' Noto que marcaste tu ánimo como '+mood+'.':'');
    const funHit = (!/panic|muriendo de|no puedo respirar/.test(s))
      ? FUNNY.find(f => f[0].test(s)) : null;
    const previous = (state.aiMemory || []).slice(-1)[0];
    const followUp = /^(y |y como|y si|como lo hago|dame un ejemplo|otro ejemplo|explicalo|explica eso|mas sobre|que mas|continua)/.test(s);
    const knowledgeHit = !funHit ? knowledgeSearch(text, followUp && previous && previous.kbId) : null;
    const emotionSignal = detectEmotion(text);
    if(emotionSignal){
      const mental = mentalHealthReply(emotionSignal);
      intent = emotionSignal.id === 'crisis' ? 'safety' : 'emotion:'+emotionSignal.id;
      reply = mental.reply; actions = mental.actions || []; sources = mental.sources || [];
      if(emotionSignal.id !== 'crisis'){
        state.emotionLog = (state.emotionLog || []).slice(-29);
        state.emotionLog.push({emotion:emotionSignal.id, intensity:emotionSignal.intensity, confidence:emotionSignal.confidence, date:new Date().toISOString()});
      }
    } else if(funHit){
      intent='fun'; reply=pick(funHit[1]);
    } else if(knowledgeHit){
      kbId = knowledgeHit.id;
      intent='knowledge:'+knowledgeHit.category;
      reply = knowledgeHit.answer;
      actions = Array.isArray(knowledgeHit.actions) ? knowledgeHit.actions : [];
      sources = Array.isArray(knowledgeHit.sources) ? knowledgeHit.sources : [];
      if(followUp && previous && previous.kbId === knowledgeHit.id)
        reply = 'Sobre '+knowledgeHit.title+': '+knowledgeHit.answer;
    } else if(/^dime algo$|^cuentame algo$|^cuentame algo interesante$/.test(s)){
      intent='something';
      const something = pickFresh('something', [
        {reply:'Algo para ti: no necesitas resolver todo hoy para estar avanzando. Elige una sola acción de dos minutos —tomar agua, ordenar una tarea o escribir cómo te sientes— y luego cuéntame qué necesitas.',actions:[['Abrir Diario','journal'],['Ver Tareas','tasks']]},
        {reply:'Te dejo una idea: cuando una preocupación parece enorme, escríbela en una frase y separa lo que puedes hacer hoy de lo que no depende de ti. Si quieres, lo hacemos juntos.',actions:[['Escribir en Diario','journal'],['Abrir Bienestar','wellness']]},
        {reply:'Aquí va algo útil: descansar también es parte de avanzar. Puedes respirar un minuto, moverte un poco o elegir una tarea pequeña para recuperar ritmo.',actions:[['Ir a Calma','calm'],['Abrir Focus','focus']]}
      ]);
      reply=something.reply; actions=something.actions;
    } else if(/videojuego|juego 3d|crear.*juego|crea.*juego|game studio/.test(s)){
      state.studioDraft=text; intent='game-studio'; reply='Puedo convertir esa idea en un mundo 3D jugable dentro de Mind Glow. Dejé tu descripción preparada en Game Studio para que no tengas que copiarla.';
      actions=[['◈ Abrir Game Studio','studio']];
    } else if(/resum|resumen|resume esto|texto largo/.test(s)){
      intent='summarize'; reply='Pásame el texto y lo convierto en 3 ideas clave, palabras importantes y una pregunta para comprobar que lo entendiste. Si es para una tarea, también puedo dividirlo en pasos.';
      actions=[['✓ Abrir Tareas','tasks'],['▱ Abrir Diario','journal']];
    } else if(/explica|explicame|no entiendo|que significa|como aprendo/.test(s)){
      intent='explain'; reply='Vamos por partes: dime el tema exacto y tu curso. Te lo explicaré con un ejemplo sencillo, una comparación y una mini pregunta; no solo te daré la respuesta.';
    } else if(/ayuda|opciones|que puedes hacer|funciones/.test(s)){
      intent='capabilities'; reply='Puedo crear mundos 3D desde texto, organizar tareas, preparar Focus, guiar respiración, calcular, resumir textos y revisar tu progreso. También puedo editar tu juego con instrucciones como “añade enemigos” o “cambia el escenario”.';
      actions=[['◈ Crear juego 3D','studio'],['✓ Organizarme','tasks'],['◷ Concentrarme','focus']];
    } else if(/dibuj|hazme una imagen|imagen de|arte de/.test(s)){
      intent='art';
      const tema = text.replace(/dibuja(me)?|dibujar|hazme una imagen de|hazme.*imagen|imagen de|arte de/gi,'').trim() || 'tu idea';
      reply='🎨 Modo Glow Art activado. Generé esta pieza ÚNICA e irrepetible inspirada en "'+tema+'". Cada prompt crea un arte diferente — pídeme otro.';
      actions=[['✦ Hablar más con la IA','ai']];
      setTimeout(() => aiArtBubble(tema), 150);
    } else if(/guia|no se que hacer|plan para hoy|plan de estudio|plan rapido|ayudame a organizar|que hago ahora/.test(s)){
      intent='guide'; reply=wPlan();
      actions=[['✓ Ver tareas','tasks'],['◷ Ir a Focus','focus'],['💚 Hacer el test','wellness']];
    } else if(/calc|cuanto es|cuanto vale|[0-9]\s*[\+\-\*x×\/÷]\s*[0-9]/.test(s)){
      intent='math';
      let ex = s.replace(/^.*(calcular?|calc|cuanto es|cuanto vale)[:\s]*/,'')
                .replace(/[^0-9+\-*\/().,%x×÷ ]/g,'')
                .replace(/x|×/g,'*').replace(/÷/g,'/').replace(/,/g,'.').trim();
      try{
        if(!ex) throw 0;
        const v = Function('"use strict";return('+ex+')')();
        reply = Number.isFinite(v)
          ? '🧮 '+ex+' = '+(Math.round(v*10000)/10000)+'\nManejo +, −, ×, ÷ y paréntesis. ¿Otro cálculo?'
          : 'Esa expresión no me cuadró 🤔';
      }catch(err){ reply='No pude leer el cálculo 🤔 Prueba: "cuanto es 15*8+4" o "calcula (120+80)/2"'; }
    } else if(/que hora|hora es/.test(s)){
      intent='time';
      reply='🕒 Son las '+new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})+'.';
    } else if(/que fecha|fecha de hoy|dia es hoy|dia es mañana/.test(s)){
      intent='date';
      reply='📅 Hoy es '+new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'.';
    } else if(/lanza.*moneda|lanza una moneda|moneda al aire/.test(s)){
      intent='coin'; reply='🪙 Lanzo la moneda… ¡'+pick(['CARA','SELLO'])+'!';
    } else if(/tira.*dado|lanza.*dado|un dado/.test(s)){
      intent='dice'; reply='🎲 El dado muestra: '+(1+Math.floor(Math.random()*6));
    } else if(/^elige entre .+ o .+$/.test(s)){
      const m = s.match(/^elige entre (.+) o (.+)$/);
      intent='choose';
      reply=pick([m[1],m[2]]).replace(/[¿?]/g,'').trim()+' — decisión tomada por mis circuitos ⚡';
    } else if(/panic|ansiedad extrem|muriendo de|no puedo respirar/.test(s)){
      intent='panic';
      reply='Podemos probar la técnica 5-4-3-2-1 si estás en un lugar seguro:\n• Nombra 5 cosas que VES\n• 4 que puedes TOCAR\n• 3 que escuchas\n• 2 que hueles\n• 1 que saboreas\nSi hay peligro, dificultad real para respirar o riesgo de hacerte daño, busca ayuda humana inmediata.';
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
      intent='music'; reply='Puedo sugerirte: música original de Mind Glow (tres pistas) o sonidos ambientales de lluvia, océano, bosque y río. ¿Cuál va contigo?';
      actions=[['🎵 Música y sonidos','calm']];
    } else if(/como estas|como te va|que tal estas|todo bien/.test(s)){
      intent='hello'; reply=pickFresh('hello-status', [
        saludo+(firstName()?', '+firstName():'')+'! Estoy lista para escucharte. Cuéntame cómo te sientes o qué quieres conseguir hoy.',
        'Estoy aquí contigo y funcionando bien 💜. ¿Quieres hablar de cómo te sientes o prefieres hacer algo práctico?',
        'Todo listo por aquí. Puedo escucharte sin juzgarte, ayudarte a organizarte o abrir una actividad para despejarte. ¿Qué necesitas?'
      ]);
    } else if(/hola|buenas|hey|que tal|saludos/.test(s)){
      intent='hello'; reply=pickFresh('hello', [
        saludo+(firstName()?', '+firstName():'')+'! Cuéntame qué quieres conseguir hoy: concentrarte, relajarte, organizarte o jugar.',
        '¡Hola! Qué bueno verte por aquí. ¿Cómo vienes hoy: con ganas de hablar, estudiar, descansar o jugar?',
        '¡Hey! Estoy contigo. Puedes contarme algo, pedirme un plan o elegir una actividad de Mind Glow.'
      ]);
    } else if(/quien eres|eres ia|inteligencia|como funciona/.test(s)){
      intent='about'; reply='Soy Glow AI 3.0, asistente de Mind Glow. Uso una base local para acciones y respuestas conocidas; cuando el servidor está configurado, consulto un proveedor externo para preguntas abiertas. No escribas información sensible en el chat.';
    } else if(/gracias|genial|perfect|excelente/.test(s)){
      intent='thanks'; reply='¡Con gusto! Aquí estoy cuando me necesites 💜';
    }
    if(intent === 'general'){
      state.aiUnknown = (state.aiUnknown || []).slice(-39);
      state.aiUnknown.push({text:text.slice(0,180), date:new Date().toISOString(), userId:activeUserId});
      const fallback = pickFresh('fallback', AI_FALLBACKS);
      intent='fallback';
      reply=fallback.text;
      actions=fallback.actions;
    }
    state.aiMemory = (state.aiMemory||[]).slice(-6);
    state.aiMemory.push({ intent:intent, kbId:kbId, emotion:emotionSignal && emotionSignal.id !== 'crisis' ? emotionSignal.id : null, text:text.slice(0,80) });
    state.aiHistory = (state.aiHistory || []).slice(-18);
    state.aiHistory.push({role:'user', text:text.slice(0,240)});
    state.aiHistory.push({role:'assistant', text:reply.slice(0,700), intent:intent, kbId:kbId, actions:actions, sources:sources});
    save();
    $('#aiContext').textContent = 'Última intención: '+intent+' · Nivel '+state.level+
      ' ('+state.xp+' XP) · Racha '+state.streak+'d · '+(state.mood ? 'ánimo: '+state.mood.label : 'sin check-in')+
      (emotionSignal && emotionSignal.id !== 'crisis' ? ' · emoción detectada: '+emotionSignal.label : '');
    return [reply, actions, {intent:intent, kbId:kbId, source:'local', knowledge:knowledgeHit ? {
      title:knowledgeHit.title, category:knowledgeHit.category, answer:knowledgeHit.answer
    } : null, emotion:emotionSignal, sources:sources}];
  }
  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const t = input.value.trim(); if(!t) return;
    add(t,'user'); input.value = '';
    const guard = {userId:activeUserId, serial:++aiRequestSerial};
    $('#aiStatus').textContent = 'Pensando y buscando…';
    setTimeout(async () => {
      if(guard.userId !== activeUserId || guard.serial !== aiRequestSerial) return;
      const localOut = respond(t);
      $('#aiStatus').textContent = 'Consultando conocimiento externo…';
      const out = await askExternalAI(t, localOut, guard);
      if(guard.userId !== activeUserId || guard.serial !== aiRequestSerial) return;
      add(out[0],'ai',out[1],out[2] && out[2].sources);
      $('#aiStatus').textContent = out[2] && out[2].source === 'external-ai' ? 'Respuesta externa lista' :
        (out[2] && out[2].fallback ? 'Base local activa' : 'Lista para escucharte');
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

/* ---------- Música local de Mind Glow ---------- */
let musicIndex=0, musicOn=false;
const musicAudio = new Audio();
musicAudio.preload = 'metadata';
musicAudio.loop = false;
musicAudio.volume = 0.65;
const TRACKS = [
  { title:'Brilla, Brilla', file:'MindGlow - Brilla, Brilla - Treblo.mp3' },
  { title:'La Luz Dentro de Ti', file:'MindGlow - La Luz Dentro de Ti - Treblo.mp3' },
  { title:'La Luz Está Dentro de Ti', file:'MindGlow - La Luz Está Dentro de Ti - Treblo.mp3' }
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
  petBump('energy',12); renderPet();
}
function updateMusicButtons(){
  const label = musicOn ? '⏸' : '▶';
  const main = $('#musicPlay'); if(main) main.textContent = label;
  const mini = $('#mpPlay'); if(mini) mini.textContent = label;
}
function syncMusicProgress(){
  const progress = $('#musicProgress');
  const current = $('#musicCurrent');
  const duration = $('#musicDuration');
  if(!progress || !current || !duration) return;
  const hasDuration = Number.isFinite(musicAudio.duration) && musicAudio.duration > 0;
  progress.disabled = !hasDuration;
  progress.value = hasDuration ? (musicAudio.currentTime / musicAudio.duration) * 100 : 0;
  current.textContent = fmt(musicAudio.currentTime || 0);
  duration.textContent = hasDuration ? fmt(musicAudio.duration) : '0:00';
}
function musicStop(){
  musicAudio.pause();
  musicOn=false;
  updateMusicButtons();
}
function musicStart(){
  if(!state.sound){ toast('🔇 Activa los sonidos primero'); return; }
  if(musicAudio.ended) musicAudio.currentTime=0;
  musicOn=true;
  updateMusicButtons();
  const play = musicAudio.play();
  if(play && play.catch){
    play.catch(() => {
      musicOn=false;
      updateMusicButtons();
      toast('No se pudo reproducir esta pista');
    });
  }
}
function updMusicMeta(){
  const t = TRACKS[musicIndex];
  $('#musicTitle').textContent = t.title;
  $('#musicSubtitle').textContent = 'MindGlow Original · pista local';
  const mt = $('#mpTitle'); if(mt) mt.textContent = '♪ ' + t.title;
}
function selectMusic(index, autoplay){
  musicStop();
  musicIndex = (index + TRACKS.length) % TRACKS.length;
  musicAudio.src = encodeURI(TRACKS[musicIndex].file);
  musicAudio.load();
  updMusicMeta();
  syncMusicProgress();
  if(autoplay) musicStart();
}
function musicInit(){
  $('#musicPlay').addEventListener('click', () => musicOn ? musicStop() : musicStart());
  $('#musicNext').addEventListener('click', () => {
    selectMusic(musicIndex + 1, musicOn);
  });
  $('#musicPrev').addEventListener('click', () => {
    selectMusic(musicIndex - 1, musicOn);
  });
  $('#musicProgress').addEventListener('input', () => {
    if(Number.isFinite(musicAudio.duration))
      musicAudio.currentTime = (Number($('#musicProgress').value)/100) * musicAudio.duration;
  });
  musicAudio.addEventListener('loadedmetadata', syncMusicProgress);
  musicAudio.addEventListener('timeupdate', syncMusicProgress);
  musicAudio.addEventListener('ended', () => selectMusic(musicIndex + 1, true));
  musicAudio.addEventListener('error', () => {
    musicStop();
    toast('No se pudo cargar la pista de Mind Glow');
  });
  selectMusic(0, false);
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
    '<div class="team-card">'+
    '<button type="button" class="team-avatar'+(m.img?' has-img':'')+'" data-team-img="'+i+'" title="Cambiar foto">'+
      (m.img ? '<img src="'+m.img+'" alt="'+esc(m.name)+'">' : esc((m.name[0]||'?').toUpperCase()))+
    '</button>'+
    '<div><b>'+esc(m.name)+'</b></div>'+
    '<button type="button" class="team-del" data-team-del="'+i+'">×</button></div>').join('');
  grid.querySelectorAll('[data-team-del]').forEach(b => b.addEventListener('click', () => {
    state.team.splice(parseInt(b.dataset.teamDel,10), 1);
    renderTeam(); save();
  }));
  grid.querySelectorAll('[data-team-img]').forEach(b => b.addEventListener('click', () => {
    pickImage(dataURL => {
      state.team[parseInt(b.dataset.teamImg,10)].img = dataURL;
      renderTeam(); save(); sfx('good');
      toast('📸 ¡Foto actualizada!');
    });
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
  function init(){$('#spaceCanvas'); if(!cv) return;
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

/* ---------- MIND GLOW GAME AI: generador 3D local ---------- */
const Studio = (() => {
  let renderer, scene, camera, clock, raf, spec = null, player = null, ready = false, running = false, busy = false, restoring = false;
  let objects = { coins: [], hazards: [], enemies: [], rain: null };
  let keys = {}, score = 0, collected = 0, nitro = 100, jumpY = 0, jumpV = 0, orbitYaw = Math.PI, orbitPitch = 0.28, orbitDistance = 10, drag = null;
  const $s = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const pick = (value, fallback) => value || fallback;
  function parsePrompt(text){
    const s = norm(text);
    let genre = 'adventure', genreName = 'Aventura';
    if(/carrer|coche|auto|vehiculo|velocidad|racing/.test(s)){ genre='racing'; genreName='Carreras'; }
    else if(/plataform|obby|salto/.test(s)){ genre='platform'; genreName='Plataformas'; }
    else if(/terror|horror|miedo/.test(s)){ genre='horror'; genreName='Terror'; }
    else if(/superviv|isla|sobreviv/.test(s)){ genre='survival'; genreName='Supervivencia'; }
    else if(/puzzle|rompecabe|logica/.test(s)){ genre='puzzle'; genreName='Puzzle'; }
    else if(/estrateg|rpg|rol/.test(s)){ genre='strategy'; genreName='Estrategia'; }
    let world = 'neon', worldName = 'Neon District';
    if(/ciudad|futur|neon|cyber/.test(s)){ world='city'; worldName='Ciudad futurista'; }
    else if(/isla|playa|mar|oceano/.test(s)){ world='island'; worldName='Isla flotante'; }
    else if(/escuela|colegio|abandon/.test(s)){ world='school'; worldName='Escuela abandonada'; }
    else if(/fantas|bosque|castillo|dragon/.test(s)){ world='fantasy'; worldName='Bosque fantástico'; }
    else if(/espacio|planeta|galax/.test(s)){ world='space'; worldName='Órbita estelar'; }
    const count = (rx, fallback) => { const m=s.match(rx); return m ? Math.max(1,Math.min(24,parseInt(m[1],10))) : fallback; };
    const enemyDefault = genre==='horror' || genre==='survival' ? 5 : genre==='racing' ? 3 : 2;
    const enemyCount = count(/(\d+)\s*(?:enemigos?|rivales?|npcs?)/, enemyDefault);
    const coinCount = count(/(\d+)\s*(?:monedas?|coins?)/, genre==='puzzle'?6:12);
    const obstacles = count(/(\d+)\s*(?:obstaculos?|trampas?)/, genre==='racing'?9:6);
    return { prompt:String(text || '').trim(), genre, genreName, world, worldName, enemyCount, coinCount, obstacleCount:obstacles,
      mapScale:/mapa.*grande|mundo.*grande|mas grande|más grande|gigante/.test(s)?1.55:1,
      rain:/lluvia|llueve|lloviendo/.test(s), doubleJump:/doble salto|double jump/.test(s), nitro:/nitro|turbo/.test(s), boss:/jefe|boss/.test(s),
      title: pick((genreName+' · '+worldName), 'Mundo Glow'), seed:Math.random() };
  }
  function initRenderer(){
    if(ready) return true;
    if(!window.THREE){ $s('studioGameStatus').textContent='Motor 3D no disponible sin conexión'; return false; }
    const canvas=$s('studioViewport'); if(!canvas) return false;
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); renderer.shadowMap.enabled=true;
    scene=new THREE.Scene(); camera=new THREE.PerspectiveCamera(52,1,.1,300); camera.position.set(7,6,9); clock=new THREE.Clock(); ready=true;
    canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!drag)return; orbitYaw-=(e.clientX-drag.x)*.008; orbitPitch=Math.max(.12,Math.min(.75,orbitPitch+(e.clientY-drag.y)*.006)); drag={x:e.clientX,y:e.clientY};});
    canvas.addEventListener('pointerup',()=>drag=null); canvas.addEventListener('wheel',e=>{orbitDistance=Math.max(5,Math.min(18,orbitDistance+e.deltaY*.01));},{passive:true});
    addEventListener('resize',resize); resize(); raf=requestAnimationFrame(loop); return true;
  }
  function clearScene(){
    if(!scene)return; while(scene.children.length){const c=scene.children[0];scene.remove(c);if(c.geometry)c.geometry.dispose();if(c.material){const mats=Array.isArray(c.material)?c.material:[c.material];mats.forEach(m=>m.dispose&&m.dispose());}}
    objects={coins:[],hazards:[],enemies:[],rain:null}; player=null;
  }
  function mat(color,rough=.7,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
  function addBox(x,y,z,w,h,d,color,metal=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,.54,metal));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  function buildWorld(){
    clearScene(); const scale=spec.mapScale, dark=spec.world==='space'?'#030716':spec.world==='school'?'#10121e':'#070b19'; scene.background=new THREE.Color(dark); scene.fog=new THREE.Fog(dark,18,72);
    scene.add(new THREE.HemisphereLight(spec.world==='horror'?0x586080:0x9ea8ff,0x101322,1.6)); const sun=new THREE.DirectionalLight(spec.world==='horror'?0x8e9aff:0x75e8ff,2.5);sun.position.set(8,14,6);sun.castShadow=true;scene.add(sun);
    const floorColor=spec.world==='island'?0x193b52:spec.world==='fantasy'?0x183c2c:spec.world==='school'?0x222334:0x0b1630; const floor=new THREE.Mesh(new THREE.PlaneGeometry(58*scale,58*scale),mat(floorColor,.88));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
    const grid=new THREE.GridHelper(56*scale,Math.round(28*scale),0x2d5a8d,0x15213e);grid.position.y=.015;scene.add(grid);
    if(spec.world==='city') for(let i=0;i<22;i++){const x=(i%6-2.5)*4.6,z=(Math.floor(i/6)-1.5)*5.2;const h=2+((i*7)%7);addBox(x,h/2,z,3.3,h,3.3,0x17274a,.25);addBox(x,h*.55,z-1.69,2.2,.08,.02,0x50d9d0,.6);}
    if(spec.world==='school') for(let i=0;i<8;i++){const x=(i%4-1.5)*6,z=(Math.floor(i/4)-.5)*7;addBox(x,1.7,z,4.6,3.4,4.2,0x313246);}
    if(spec.world==='island') for(let i=0;i<10;i++){const x=(i%5-2)*5,z=(Math.floor(i/5)-1)*7;const p=addBox(x,.5,z,3.8,1,3.8,0x3b6c7c);p.rotation.y=(i%3)*.25;}
    if(spec.world==='fantasy') for(let i=0;i<14;i++){const x=(i%7-3)*4.3,z=(Math.floor(i/7)-1)*7;const t=new THREE.Mesh(new THREE.ConeGeometry(.75,3.8,7),mat(0x1c633f));t.position.set(x,1.9,z);t.castShadow=true;scene.add(t);}
    if(spec.world==='space'){const stars=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xb9d5ff,size:.09}));const p=[];for(let i=0;i<500;i++)p.push((Math.random()-.5)*80,Math.random()*35+2,(Math.random()-.5)*80);stars.geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));scene.add(stars);}
    const playerMat=spec.genre==='racing'?0xff4fd8:0x51e0c0; player=new THREE.Group();
    const body=addBox(0,0,0,spec.genre==='racing'?1.7:1.1,spec.genre==='racing'?.55:1.5,spec.genre==='racing'?2.7:1.1,playerMat,.45); body.position.set(0,spec.genre==='racing'?.7: .8,0); player.add(body);
    if(spec.genre!=='racing'){for(const x of [-.42,.42]){const arm=addBox(x,1.12,-.42,.22,.72,.22,0xc9a6ff,.15);arm.rotation.z=x<0?-.14:.14;player.add(arm);}}
    if(spec.genre==='racing'){for(const x of [-.78,.78])for(const z of [-.85,.85]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.18,12),mat(0x11131d,.9));w.rotation.z=Math.PI/2;w.position.set(x,.45,z);player.add(w);}}
    player.position.set(0,0,10);scene.add(player);
    for(let i=0;i<spec.coinCount;i++){const c=new THREE.Mesh(new THREE.TorusGeometry(.34,.11,8,16),mat(0xffd166,.3,.7));c.position.set((Math.random()-.5)*22*scale,.8,(Math.random()-.5)*28*scale);c.rotation.x=Math.PI/2;scene.add(c);objects.coins.push(c);}
    for(let i=0;i<spec.obstacleCount;i++){const h=addBox((Math.random()-.5)*22*scale,.55,(Math.random()-.5)*28*scale,.9+Math.random(),1.1,.9+Math.random(),spec.genre==='horror'?0x9d315d:0xff658f,.25);objects.hazards.push(h);}
    for(let i=0;i<spec.enemyCount+(spec.boss?1:0);i++){const e=new THREE.Mesh(new THREE.IcosahedronGeometry(spec.boss&&i===spec.enemyCount?.8:.5,1),mat(spec.boss&&i===spec.enemyCount?0xffae4d:0x8b7cff,.38,.3));e.position.set((Math.random()-.5)*20*scale,.7,(Math.random()-.5)*28*scale);e.castShadow=true;e.userData.boss=spec.boss&&i===spec.enemyCount;scene.add(e);objects.enemies.push(e);}
    const goal=new THREE.Mesh(new THREE.TorusGeometry(2.2,.16,12,40),mat(0x51e0c0,.2,.6));goal.position.set(0,2,-22*scale);goal.rotation.x=Math.PI/2;scene.add(goal);
    if(spec.rain){const n=360, pos=[];for(let i=0;i<n;i++)pos.push((Math.random()-.5)*40,Math.random()*22,(Math.random()-.5)*40);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));objects.rain=new THREE.Points(g,new THREE.PointsMaterial({color:0x9fc9ff,size:.08,transparent:true,opacity:.8}));scene.add(objects.rain);}
    score=0;collected=0;nitro=100;const savedRun=restoring&&state.studioRun&&state.studioRun.prompt===spec.prompt?state.studioRun:null;if(savedRun){score=savedRun.score||0;collected=savedRun.collected||0;nitro=Number.isFinite(savedRun.nitro)?savedRun.nitro:100;player.position.x=savedRun.x||0;player.position.z=Number.isFinite(savedRun.z)?savedRun.z:10;}updateHud(); $s('studioEmpty').classList.add('hidden'); $s('studioHud').classList.add('visible');
  }
  function updateHud(){if($s('studioScore'))$s('studioScore').textContent=score;if($s('studioCoins'))$s('studioCoins').textContent=collected;if($s('studioNitro'))$s('studioNitro').textContent=Math.round(nitro);}
  function persist(){if(!spec)return;state.studioProject=JSON.parse(JSON.stringify(spec));save();}
  function persistRun(){if(!spec||!player)return;state.studioRun={prompt:spec.prompt,score,collected,nitro,x:player.position.x,z:player.position.z};persistCurrent();}
  function updateCamera(){if(!player||!camera)return;const eye=new THREE.Vector3(player.position.x,player.position.y+1.48,player.position.z);camera.position.lerp(eye,.32);const look=new THREE.Vector3(eye.x+Math.sin(orbitYaw)*5,eye.y+Math.sin(orbitPitch)*1.8,eye.z+Math.cos(orbitYaw)*5);camera.lookAt(look);}
  function loop(){raf=requestAnimationFrame(loop);if(!scene||!camera)return;const dt=Math.min(clock.getDelta(),.05);if(player){objects.coins.forEach(c=>{if(c.visible)c.rotation.z+=dt*3;});if(objects.rain){const p=objects.rain.geometry.attributes.position;for(let i=1;i<p.count*3;i+=3){let y=p.array[i]-dt*18;p.array[i]=y<0?22:y;}p.needsUpdate=true;}if(running){const speed=(keys.shift&&spec.nitro&&nitro>0)?.28:.13;const forwardX=Math.sin(orbitYaw),forwardZ=Math.cos(orbitYaw),rightX=Math.cos(orbitYaw),rightZ=-Math.sin(orbitYaw);const side=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),walk=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);if(keys.shift&&spec.nitro&&nitro>0)nitro=Math.max(0,nitro-dt*22);else nitro=Math.min(100,nitro+dt*5);player.position.x=Math.max(-14*spec.mapScale,Math.min(14*spec.mapScale,player.position.x+(rightX*side+forwardX*walk)*speed));player.position.z=Math.max(-25*spec.mapScale,Math.min(15*spec.mapScale,player.position.z+(rightZ*side+forwardZ*walk)*speed));if(keys.space&&jumpY<=.01){jumpV=spec.doubleJump?7:6;keys.space=false;}jumpV-=dt*16;jumpY=Math.max(0,jumpY+jumpV*dt);player.position.y=jumpY;player.rotation.y=orbitYaw;objects.coins.forEach(c=>{if(c.visible&&c.position.distanceTo(player.position)<1.25){c.visible=false;collected++;score+=10;sfx('good');}});objects.hazards.forEach(h=>{if(h.position.distanceTo(player.position)<1.05){score=Math.max(0,score-5);player.position.x-=forwardX*1.4;player.position.z-=forwardZ*1.4;sfx('bad');}});objects.enemies.forEach(e=>{if(e.visible){e.rotation.y+=dt*2;e.position.lerp(new THREE.Vector3(player.position.x,e.position.y,player.position.z),dt*.035);if(e.position.distanceTo(player.position)<1.1){score=Math.max(0,score-10);player.position.x-=forwardX*2;player.position.z-=forwardZ*2;sfx('bad');}}});updateHud();}updateCamera();}renderer.render(scene,camera);}
  function resize(){if(!renderer||!camera)return;const wrap=$s('studioViewport')?.parentElement;if(!wrap)return;const w=wrap.clientWidth,h=wrap.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function setPipeline(active){$$('#studioPipeline li').forEach((li,i)=>{li.classList.toggle('active',i===active);li.classList.toggle('done',i<active);});}
  function renderSpec(){if(!spec)return;$s('studioGameTitle').textContent=spec.title;$s('studioGameStatus').textContent='Juego generado · '+spec.genreName;$s('studioSpec').innerHTML=[spec.genreName,spec.worldName,spec.enemyCount+' enemigos',spec.coinCount+' monedas',spec.obstacleCount+' obstáculos',spec.rain?'lluvia':'luz dinámica',spec.doubleJump?'doble salto':'movimiento WASD',spec.boss?'jefe final':'meta'].map(x=>'<span>'+x+'</span>').join('');}
  async function generate(variation){if(busy)return;busy=true;running=false;const button=$s('studioGenerate');button.disabled=true;button.textContent='Construyendo mundo…';$s('studioEmpty').classList.remove('hidden');$s('studioHud').classList.remove('visible');for(let i=0;i<5;i++){setPipeline(i);await wait(230);}spec=parsePrompt($s('studioPrompt').value);if(variation)spec.seed=Math.random();if(initRenderer())buildWorld();renderSpec();setPipeline(5);$s('studioGameStatus').textContent='Juego listo · pulsa Jugar';button.disabled=false;button.textContent='✦ Generar mundo 3D';busy=false;state.studioDraft='';persist();addChat('Tu mundo está listo: '+spec.genreName+' en '+spec.worldName+'. Pulsa Jugar o dime qué quieres cambiar.','ai');}
  function addChat(text,who){const box=$s('studioChat');if(!box)return;const d=document.createElement('div');d.className='studio-chat-msg '+who;d.innerHTML='<span>'+(who==='ai'?'✦':'◉')+'</span><p></p>';d.querySelector('p').textContent=text;box.appendChild(d);box.scrollTop=box.scrollHeight;}
  function modify(text){if(!spec){addChat('Primero genera un mundo y luego lo editamos.','ai');return;}const s=norm(text);const m=s.match(/(\d+)\s*(?:enemigos?|rivales?)/);if(m)spec.enemyCount=Math.min(24,parseInt(m[1],10));const coins=s.match(/(\d+)\s*monedas?/);if(coins)spec.coinCount=Math.min(40,parseInt(coins[1],10));if(/mas grande|más grande|gigante|agranda/.test(s))spec.mapScale=Math.min(2.2,spec.mapScale+.35);if(/lluvia|llueve/.test(s))spec.rain=true;if(/doble salto/.test(s))spec.doubleJump=true;if(/nitro|turbo/.test(s))spec.nitro=true;if(/jefe|boss/.test(s))spec.boss=true;if(/ciudad|city/.test(s)){spec.world='city';spec.worldName='Ciudad futurista';}if(/isla|island/.test(s)){spec.world='island';spec.worldName='Isla flotante';}if(/escuela|school/.test(s)){spec.world='school';spec.worldName='Escuela abandonada';}if(/plataform|obby/.test(s)){spec.genre='platform';spec.genreName='Plataformas';}if(/carrer|racing|auto/.test(s)){spec.genre='racing';spec.genreName='Carreras';}spec.title=spec.genreName+' · '+spec.worldName;buildWorld();renderSpec();persist();addChat('Aplicado: '+text+'. El viewport ya tiene la versión actualizada.','ai');}
  async function saveToFolder(){
    if(!spec){toast('Genera un mundo antes de guardarlo');return;}
    persist(); const payload=JSON.stringify({app:'Mind Glow Game AI',version:1,savedAt:new Date().toISOString(),project:spec,progress:state},null,2);
    if(window.showDirectoryPicker){
      try{const dir=await window.showDirectoryPicker({mode:'readwrite'});const file=await dir.getFileHandle('mindglow-project.json',{create:true});const writable=await file.createWritable();await writable.write(payload);await writable.close();toast('Proyecto guardado en la carpeta elegida');return;}catch(err){if(err&&err.name==='AbortError')return;}
    }
    const blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mindglow-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Descargado: guárdalo donde quieras');
  }
  function importProject(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>{const file=input.files&&input.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result),incoming=data.project||data;if(!incoming||!incoming.prompt)throw new Error('invalid');spec=incoming;state.studioProject=incoming;if(data.progress&&typeof data.progress==='object'){Object.keys(defaultState).forEach(k=>{if(k in data.progress)state[k]=data.progress[k];});}state.studioDraft='';save();$s('studioPrompt').value=spec.prompt;if(initRenderer())buildWorld();renderSpec();setPipeline(5);toast('Proyecto importado y avance recuperado');}catch(e){toast('Ese archivo no es un proyecto Mind Glow válido');}};reader.readAsText(file);};input.click();}
  function restoreProject(){
    const draft=state.studioDraft;
    if(draft){$s('studioPrompt').value=draft;setTimeout(()=>generate(false),80);return true;}
    let saved=state.studioProject;
    if(!saved){try{const profiles=readProfiles(),namedProfiles=Object.keys(profiles).filter(id=>id!=='guest:local');const legacy=JSON.parse(localStorage.getItem('mindGlowStudio')||'null');if(namedProfiles.length<=1&&legacy&&legacy.prompt){saved=legacy;state.studioProject=legacy;persistCurrent();}}catch(e){saved=null;}}
    if(saved&&saved.prompt)$s('studioPrompt').value=saved.prompt;
    if(!saved||!saved.prompt)return false;
    spec=saved;restoring=true;if(initRenderer())buildWorld();restoring=false;renderSpec();setPipeline(5);$s('studioGameStatus').textContent='Proyecto restaurado · pulsa Jugar';addChat('Recuperé tu último proyecto y tu avance local. Puedes continuar editándolo.','ai');return true;
  }
  function bind(){
    addEventListener('beforeunload',persistRun);
    $s('studioSave').addEventListener('click',saveToFolder);
    $s('studioRestore').addEventListener('click',restoreProject);
    $s('studioImport').addEventListener('click',importProject);
    ['keydown','keyup'].forEach(type=>addEventListener(type,e=>{const studioActive=$s('view-studio')?.classList.contains('active');const typing=/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||'');if(!studioActive||typing)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' '].includes(k)){e.preventDefault();keys[k===' '?'space':k]=type==='keydown';}}));
    $$('[data-touch]').forEach(btn=>{const control=btn.dataset.touch;const set=e=>{e.preventDefault();keys[control]=true;btn.classList.add('pressed');};const clear=e=>{e.preventDefault();keys[control]=false;btn.classList.remove('pressed');};btn.addEventListener('pointerdown',set);btn.addEventListener('pointerup',clear);btn.addEventListener('pointercancel',clear);btn.addEventListener('pointerleave',clear);});
    $s('studioGenerate').addEventListener('click',()=>generate(false));$s('studioRegenerate').addEventListener('click',()=>generate(true));$s('studioPlay').addEventListener('click',()=>{if(!spec){generate(false);return;}running=!running;$s('studioPlay').textContent=running?'Ⅱ Pausar':'▶ Jugar';$s('studioGameStatus').textContent=running?'Partida en curso':'Juego pausado';});$s('studioEdit').addEventListener('click',()=>{$s('studioChatInput').focus();toast('Dile a Mind Glow qué quieres editar');});$s('studioSave').addEventListener('click',()=>{if(!spec){toast('Genera un mundo antes de guardarlo');return;}persist();toast('Proyecto guardado en este perfil');});$s('studioShare').addEventListener('click',async()=>{if(!spec){toast('Genera un mundo antes de compartirlo');return;}const link=location.href.split('#')[0]+'#studio='+encodeURIComponent(spec.prompt);try{await navigator.clipboard.writeText(link);toast('Enlace del proyecto copiado');}catch(e){prompt('Copia este enlace para compartir tu juego:',link);}});$$('[data-studio-example]').forEach(b=>b.addEventListener('click',()=>{$s('studioPrompt').value=b.dataset.studioExample;$s('studioGenerate').click();}));$s('studioChatForm').addEventListener('submit',e=>{e.preventDefault();const input=$s('studioChatInput'),text=input.value.trim();if(!text)return;addChat(text,'user');input.value='';setTimeout(()=>modify(text),180);});
  }
  function init(){bind();const hash=location.hash.match(/^#studio=(.*)$/);if(hash){try{state.studioDraft=decodeURIComponent(hash[1]);$s('studioPrompt').value=state.studioDraft;}catch(e){}}}
  return { init, resize, restore:restoreProject, saveRun:persistRun };
})();

/* ---------- ARCADE: nucleo ---------- */
let difficulty = 'easy';
let game = { name:'', active:false, cleanup:null, paused:false };
const games = {
  'Keyboard'     : { icon:'🎹', desc:'Teclas relajantes que se escuchan y se sienten.',                 badge:'RITMO',   start:gKeyboard },
  'Focus Tap'    : { icon:'🎯', desc:'Objetivos rápidos con racha de aciertos.',                       badge:'REFLEJOS', start:gFocusTap },
  'Glow Duel'    : { icon:'⚡', desc:'Compite contra Capi: gana quien reaccione más rápido.',            badge:'VS CPU',   start:gGlowDuel },
  'Neon Stack'   : { icon:'🧱', desc:'Apila bloques al milímetro antes de que gane el rival.',           badge:'RACHA',    start:gNeonStack },
  'Target Arena' : { icon:'🏹', desc:'Puntería, combo y precisión contra un rival automático.',          badge:'VS CPU',   start:gTargetArena },
  'Color Rush'   : { icon:'🎨', desc:'Conquista el tablero antes que Capi en una carrera de clics.',    badge:'VS CPU',   start:gColorRush },
  'Merge Blitz'  : { icon:'💎', desc:'Une fichas iguales, sube el multiplicador y supera al CPU.',      badge:'COMBO',    start:gMergeBlitz },
  'Lane Rush'    : { icon:'🏎️', desc:'Cambia de carril, esquiva obstáculos y gana la carrera.',          badge:'RUNNER',   start:gLaneRush },
  'Quiz Clash'   : { icon:'🧩', desc:'Responde preguntas rápidas antes de que Capi complete el quiz.',  badge:'VS CPU',   start:gQuizClash },
  'Word Sprint'  : { icon:'⌨️', desc:'Ordena palabras, mantén la racha y cruza la meta primero.',       badge:'VELOCIDAD',start:gWordSprint },
  'Memory Glow'  : { icon:'🧠', desc:'Memoriza la secuencia que crece ronda a ronda.',                   badge:'MEMORIA',  start:gMemory },
  'Food Catch'   : { icon:'🍎', desc:'Atrapa la comida que cae… ¡si atrapas una lata, pierdes!',        badge:'VS CPU',   start:gFoodCatch },
  'Glow Canvas'  : { icon:'🪐', desc:'Dibuja patrones relajantes sin presión.',                          badge:'CREATIVO', start:gCanvas },
  'Secret Run'   : { icon:'👾', desc:'Guía al personaje con mouse o dedo y esquiva hasta la meta.',      badge:'RUNNER',   start:gSecretRun }
};
function gGlowDuel(){
  const aiDelay={easy:1150,normal:850,hard:620}[difficulty]; let you=0, capi=0, round=0, aiTimer;
  const body=shell('<div class="duel-score"><div>🧑‍🚀 Tú <b id="youScore">0</b></div><div class="duel-vs">VS</div><div>🦫 Capi <b id="capiScore">0</b></div></div><div class="game-board duel-board" id="duelBoard"><button class="duel-target" id="duelTarget">¡LISTO!</button></div><p class="game-message" id="duelMsg">Pulsa el objetivo cuando aparezca. Capi también juega.</p>');
  const board=body.querySelector('#duelBoard'), target=body.querySelector('#duelTarget'), msg=body.querySelector('#duelMsg');
  const next=()=>{ if(!game.active)return; round++; target.textContent='⚡'; target.style.left=(10+Math.random()*75)+'%'; target.style.top=(10+Math.random()*68)+'%'; target.classList.add('duel-live'); setTimeout(()=>target.classList.remove('duel-live'),500); };
  target.addEventListener('pointerdown',()=>{if(!game.active||game.paused||!target.classList.contains('duel-live'))return;you++; target.classList.remove('duel-live'); body.querySelector('#youScore').textContent=you; sfx('good'); msg.textContent='¡Punto para ti!'; if(you>=7){clearInterval(aiTimer);finishGame(you*10,45,'Ganaste el duelo contra Capi 🏆');}else setTimeout(next,240);});
  aiTimer=setInterval(()=>{if(game.paused||!game.active)return;capi++;body.querySelector('#capiScore').textContent=capi; if(capi>=7){clearInterval(aiTimer);finishGame(you*10,10,'Capi ganó esta ronda. ¡Reintenta y supéralo!');}},aiDelay);
  next(); game.cleanup=()=>clearInterval(aiTimer);
}
/* ---------- Juego: NEON STACK ---------- */
function gNeonStack(){
  const cfg={easy:{speed:155,cpu:.22},normal:{speed:205,cpu:.31},hard:{speed:260,cpu:.42}}[difficulty];
  const body=shell('<div class="game-board stack-board"><canvas id="stackCv"></canvas></div>'+
    '<p class="game-message">Pulsa o toca para soltar el bloque. Alinea 10 capas antes que el Rival CPU.</p>');
  const cvs=body.querySelector('#stackCv');
  let env=fitCanvas(cvs),ctx=env.ctx,W=env.w,H=env.h;
  let tower=[{x:W/2-72,w:144,y:H-42}], moving=null, level=1, score=0, cpu=0;
  let rafId=null,last=performance.now(),ended=false;
  function resize(){env=fitCanvas(cvs);ctx=env.ctx;W=env.w;H=env.h;}
  function nextBlock(){
    const previous=tower[tower.length-1];
    moving={x:20,w:Math.max(44,previous.w-(difficulty==='hard'?10:7)),y:H-42-level*26,dir:1};
  }
  function end(win,msg){
    if(ended)return; ended=true; cancelAnimationFrame(rafId);
    if(win) finishGame(score,50,msg);
    else offerRetry(msg+' Puntuación: '+score+'.');
  }
  function place(){
    if(ended||!game.active||game.paused||!moving)return;
    const previous=tower[tower.length-1],left=Math.max(moving.x,previous.x),right=Math.min(moving.x+moving.w,previous.x+previous.w),overlap=right-left;
    if(overlap<22){sfx('bad');end(false,'El bloque quedó fuera de la torre.');return;}
    tower.push({x:left,w:overlap,y:moving.y});
    score+=Math.round(overlap*.3)+level*12; level++; sfx('good');
    if(level>10){end(true,'¡Torre perfecta! Superaste 10 capas antes que Capi 🏆');return;}
    nextBlock();
  }
  function draw(){
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#111a36');bg.addColorStop(1,'#0b1021');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(139,124,255,.12)';ctx.lineWidth=1;
    for(let y=H-42;y>22;y-=26){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    tower.forEach((block,i)=>{ctx.fillStyle='hsl('+(245+i*18)+' 88% '+(66-i*.7)+'%)';ctx.fillRect(block.x,block.y,block.w,22);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(block.x,block.y,block.w,3);});
    if(moving){ctx.fillStyle='hsl('+(170+level*14)+' 88% 66%)';ctx.shadowColor='#51e0c0';ctx.shadowBlur=18;ctx.fillRect(moving.x,moving.y,moving.w,22);ctx.shadowBlur=0;}
    ctx.fillStyle='rgba(255,255,255,.68)';ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('TU · '+level+'/10 capas',14,18);
    ctx.textAlign='right';ctx.fillStyle='#ffb84d';ctx.fillText('CPU · '+Math.min(10,Math.floor(cpu))+'/10',W-14,18);
    ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(14,25,W-28,5);ctx.fillStyle='#ffb84d';ctx.fillRect(14,25,(W-28)*Math.min(1,cpu/10),5);
  }
  function loop(ts){
    if(ended||!game.active)return;
    const dt=Math.min(.05,(ts-last)/1000);last=ts;
    if(!game.paused){
      moving.x+=moving.dir*cfg.speed*dt;
      if(moving.x<=10){moving.x=10;moving.dir=1;}
      if(moving.x+moving.w>=W-10){moving.x=W-10-moving.w;moving.dir=-1;}
      cpu+=dt*cfg.cpu;
      if(cpu>=10&&level<10){end(false,'El Rival CPU construyó su torre primero 🤖');return;}
    }
    draw();hud(score,'Capa '+Math.min(level,10)+'/10 · CPU '+Math.min(10,Math.floor(cpu))+'/10');rafId=requestAnimationFrame(loop);
  }
  cvs.addEventListener('pointerdown',place);
  const kd=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();place();}};
  document.addEventListener('keydown',kd);body.appendChild(pauseBtn());nextBlock();hud(0,'Capa 1/10 · CPU 0/10');rafId=requestAnimationFrame(loop);
  game.cleanup=()=>{ended=true;cancelAnimationFrame(rafId);document.removeEventListener('keydown',kd);};
}
/* ---------- Juego: TARGET ARENA ---------- */
function gTargetArena(){
  const cfg={easy:{time:38,size:58,cpu:1450},normal:{time:32,size:50,cpu:1080},hard:{time:27,size:42,cpu:820}}[difficulty];
  const body=shell('<div class="game-board arena-board" id="targetArena"><div class="arena-score"><span>🏹 Tú <b id="arenaYou">0</b></span><span>🤖 CPU <b id="arenaCpu">0</b></span><span>⏱ <b id="arenaTime">'+cfg.time+'</b></span></div><button type="button" class="game-target arena-target" id="arenaTarget">✦</button></div>'+
    '<p class="game-message">Acierta 20 objetivos y construye un combo. El CPU no se detiene.</p>');
  const board=body.querySelector('#targetArena'),target=body.querySelector('#arenaTarget');
  let you=0,cpu=0,time=cfg.time,combo=0,timer=null,cpuTimer=null,ended=false;
  function render(){body.querySelector('#arenaYou').textContent=you;body.querySelector('#arenaCpu').textContent=cpu;body.querySelector('#arenaTime').textContent=time;hud(you,'Combo '+combo+' · Tú '+you+' / CPU '+cpu);}
  function end(win,msg){if(ended)return;ended=true;clearInterval(timer);clearInterval(cpuTimer);target.remove();if(win)finishGame(you*10+combo*3,45,msg);else offerRetry(msg+' Tu puntuación: '+you+'.');}
  function place(){
    if(ended||!game.active)return;
    target.style.width=cfg.size+'px';target.style.height=cfg.size+'px';target.style.left=(10+Math.random()*78)+'%';target.style.top=(22+Math.random()*66)+'%';target.textContent=combo>4?'⚡':'✦';
  }
  target.addEventListener('pointerdown',()=>{if(ended||!game.active||game.paused)return;you++;combo++;sfx('good');place();if(you>=20)end(true,'¡Arena conquistada! Tu combo dejó atrás al CPU 🏆');else render();});
  timer=setInterval(()=>{if(ended||game.paused)return;time--;render();if(time<=0)end(you>cpu,'Tiempo. '+(you>cpu?'Ganaste por precisión 🏆':'El CPU tuvo mejor puntería 🤖'));},1000);
  cpuTimer=setInterval(()=>{if(ended||game.paused)return;cpu++;if(cpu>=20)end(false,'El CPU llegó a 20 aciertos primero 🤖');else render();},cfg.cpu);
  body.appendChild(pauseBtn());place();render();
  game.cleanup=()=>{ended=true;clearInterval(timer);clearInterval(cpuTimer);document.removeEventListener('keydown',()=>{});};
}
/* ---------- Juego: COLOR RUSH ---------- */
function gColorRush(){
  const cfg={easy:{time:32,cpu:980},normal:{time:27,cpu:760},hard:{time:23,cpu:570}}[difficulty];
  const body=shell('<div class="game-board color-rush-board"><div class="conquest-score"><span>🎨 Tú <b id="rushYou">0</b></span><span>🤖 Capi <b id="rushCpu">0</b></span><span>⏱ <b id="rushTime">'+cfg.time+'</b></span></div><div class="conquest-grid" id="rushGrid"></div></div>'+
    '<p class="game-message">Toma casillas libres o roba las de Capi. Quien tenga más territorio cuando acabe el tiempo gana.</p>');
  const grid=body.querySelector('#rushGrid');let cells=[],you=0,cpu=0,time=cfg.time,timer=null,cpuTimer=null,ended=false,combo=0;
  for(let i=0;i<36;i++){const c=document.createElement('button');c.type='button';c.className='conquest-cell';c.setAttribute('aria-label','Casilla '+(i+1));grid.appendChild(c);cells.push(c);}
  function recount(){you=cells.filter(c=>c.dataset.owner==='you').length;cpu=cells.filter(c=>c.dataset.owner==='cpu').length;body.querySelector('#rushYou').textContent=you;body.querySelector('#rushCpu').textContent=cpu;hud(you,'Territorio · Tú '+you+' / Capi '+cpu+' · '+time+'s');}
  function claim(c,owner){const old=c.dataset.owner;if(old===owner)return;if(old==='you')you--;if(old==='cpu')cpu--;c.dataset.owner=owner;c.classList.remove('owned-you','owned-cpu');c.classList.add(owner==='you'?'owned-you':'owned-cpu');if(owner==='you')you++;else cpu++;}
  function end(win,msg){if(ended)return;ended=true;clearInterval(timer);clearInterval(cpuTimer);if(win)finishGame(you*12+combo*2,40,msg);else offerRetry(msg+' Territorio: '+you+' vs '+cpu+'.');}
  cells.forEach(c=>c.addEventListener('pointerdown',()=>{if(ended||game.paused||!game.active)return;claim(c,'you');combo++;sfx('good');recount();if(you>20)end(true,'¡Dominaste el tablero! Ganaste con '+you+' casillas 🏆');}));
  cpuTimer=setInterval(()=>{if(ended||game.paused)return;const choices=cells.filter(c=>c.dataset.owner!=='cpu');if(choices.length)claim(choices[Math.floor(Math.random()*choices.length)],'cpu');recount();if(cpu>20)end(false,'Capi tomó el control del tablero 🤖');},cfg.cpu);
  timer=setInterval(()=>{if(ended||game.paused)return;time--;recount();if(time<=0)end(you>=cpu,'Tiempo. '+(you>=cpu?'Tu estrategia ganó 🏆':'Capi terminó con más casillas 🤖'));},1000);
  body.appendChild(pauseBtn());recount();
  game.cleanup=()=>{ended=true;clearInterval(timer);clearInterval(cpuTimer);};
}
/* ---------- Juego: MERGE BLITZ ---------- */
function gMergeBlitz(){
  const cfg={easy:{time:48,cpu:7},normal:{time:42,cpu:10},hard:{time:36,cpu:13}}[difficulty],goal=420;
  const body=shell('<div class="game-board merge-board"><div class="merge-score"><span>💎 Tú <b id="mergeYou">0</b></span><span>🤖 CPU <b id="mergeCpu">0</b></span><span>⏱ <b id="mergeTime">'+cfg.time+'</b></span></div><div class="merge-grid" id="mergeGrid"></div></div>'+
    '<p class="game-message" id="mergeMsg">Elige dos fichas con el mismo número para fusionarlas. Llega a '+goal+' puntos antes que el CPU.</p>');
  const grid=body.querySelector('#mergeGrid'),msg=body.querySelector('#mergeMsg');let values=[],cells=[],selected=-1,score=0,cpu=0,time=cfg.time,timer=null,cpuTimer=null,ended=false;
  const spawn=()=>[1,1,1,2,2,4][Math.floor(Math.random()*6)];
  for(let i=0;i<16;i++){values.push(spawn());const c=document.createElement('button');c.type='button';c.className='merge-tile';grid.appendChild(c);cells.push(c);}
  function render(){cells.forEach((c,i)=>{const v=values[i];c.dataset.value=v;c.classList.toggle('selected',selected===i);c.innerHTML='<strong>'+v+'</strong><small>'+(selected===i?'Elegida':'Fusionar')+'</small>';});body.querySelector('#mergeYou').textContent=score;body.querySelector('#mergeCpu').textContent=cpu;body.querySelector('#mergeTime').textContent=time;hud(score,'Tú '+score+' / CPU '+cpu);}
  function end(win,msgText){if(ended)return;ended=true;clearInterval(timer);clearInterval(cpuTimer);if(win)finishGame(score,50,msgText);else offerRetry(msgText+' Puntuación: '+score+'.');}
  cells.forEach((c,i)=>c.addEventListener('pointerdown',()=>{if(ended||game.paused||!game.active)return;const v=values[i];if(selected<0){selected=i;msg.textContent='Ahora elige otra ficha con el mismo número.';render();return;}if(selected===i){selected=-1;render();return;}if(values[selected]===v){values[selected]=v*2;values[i]=spawn();score+=values[selected]*5+10;sfx('good');msg.textContent='¡Fusión! El multiplicador sube.';selected=-1;if(score>=goal){end(true,'¡Combo de fusión! Superaste al CPU 💎');return;}render();}else{selected=i;msg.textContent='No coinciden. Elige otra ficha del mismo valor.';render();}}));
  cpuTimer=setInterval(()=>{if(ended||game.paused)return;cpu+=cfg.cpu;render();if(cpu>=goal)end(false,'El CPU completó su laboratorio antes 🤖');},1000);
  timer=setInterval(()=>{if(ended||game.paused)return;time--;render();if(time<=0)end(score>=cpu,'Tiempo. '+(score>=cpu?'Tu laboratorio ganó 🏆':'El CPU terminó con más puntos 🤖'));},1000);
  body.appendChild(pauseBtn());render();
  game.cleanup=()=>{ended=true;clearInterval(timer);clearInterval(cpuTimer);};
}
/* ---------- Juego: LANE RUSH ---------- */
function gLaneRush(){
  const cfg={easy:{speed:150,cpu:.38,spawn:1.1},normal:{speed:190,cpu:.52,spawn:.9},hard:{speed:235,cpu:.68,spawn:.72}}[difficulty],goal=14;
  const body=shell('<div class="game-board lane-board"><canvas id="laneCv"></canvas></div><div class="lane-controls"><button type="button" data-lane="0">◀ Izquierda</button><button type="button" data-lane="1">Centro</button><button type="button" data-lane="2">Derecha ▶</button></div>'+
    '<p class="game-message">Usa ← → o los botones. Esquiva '+goal+' obstáculos antes que el Rival CPU.</p>');
  const cvs=body.querySelector('#laneCv');let env=fitCanvas(cvs),ctx=env.ctx,W=env.w,H=env.h;
  let lane=1,score=0,cpu=0,obstacles=[],spawnT=0,rafId=null,last=performance.now(),ended=false;
  const laneX=i=>W*(.25+i*.25);
  function move(dir){lane=Math.max(0,Math.min(2,typeof dir==='number'?dir:lane+dir));sfx('click');}
  function end(win,msg){if(ended)return;ended=true;cancelAnimationFrame(rafId);if(win)finishGame(score*12,45,msg);else offerRetry(msg+' Obstáculos superados: '+score+'.');}
  function spawn(){obstacles.push({lane:Math.floor(Math.random()*3),y:-35,size:28+Math.random()*8,extra:Math.random()*45});}
  function draw(){
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#111a34');bg.addColorStop(1,'#090d1d');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.045)';ctx.fillRect(W*.12,0,W*.76,H);
    ctx.strokeStyle='rgba(139,124,255,.24)';ctx.lineWidth=2;[.375,.625].forEach(x=>{ctx.setLineDash([14,15]);ctx.beginPath();ctx.moveTo(W*x,0);ctx.lineTo(W*x,H);ctx.stroke();});ctx.setLineDash([]);
    obstacles.forEach(o=>{ctx.font=o.size+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🚧',laneX(o.lane),o.y);});
    ctx.shadowColor='#51e0c0';ctx.shadowBlur=18;ctx.font='34px serif';ctx.fillText('🏎️',laneX(lane),H-42);ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.7)';ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('TÚ · '+score+'/'+goal,14,18);ctx.textAlign='right';ctx.fillStyle='#ffb84d';ctx.fillText('CPU · '+Math.min(goal,Math.floor(cpu))+'/'+goal,W-14,18);
  }
  function loop(ts){
    if(ended||!game.active)return;const dt=Math.min(.05,(ts-last)/1000);last=ts;
    if(!game.paused){
      spawnT+=dt;if(spawnT>cfg.spawn){spawnT=0;spawn();}
      cpu+=dt*cfg.cpu;obstacles.forEach(o=>o.y+=(cfg.speed+o.extra)*dt);
      for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];if(o.y>H-78&&o.y<H-23&&o.lane===lane){sfx('bad');end(false,'¡Choque! Elige otro carril.');return;}if(o.y>H+35){obstacles.splice(i,1);score++;sfx('good');if(score>=goal){end(true,'¡Carrera ganada! Dejaste al CPU atrás 🏆');return;}}}
      if(cpu>=goal&&score<goal){end(false,'El Rival CPU cruzó primero 🤖');return;}
    }
    draw();hud(score,'Carrera · Tú '+score+'/'+goal+' · CPU '+Math.min(goal,Math.floor(cpu))+'/'+goal);rafId=requestAnimationFrame(loop);
  }
  body.querySelectorAll('[data-lane]').forEach(b=>b.addEventListener('pointerdown',()=>move(parseInt(b.dataset.lane,10))));
  const kd=e=>{if(!game.active||game.paused)return;if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')move(-1);if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')move(1);};
  document.addEventListener('keydown',kd);body.appendChild(pauseBtn());hud(0,'Carrera · Tú 0/'+goal+' · CPU 0/'+goal);rafId=requestAnimationFrame(loop);
  game.cleanup=()=>{ended=true;cancelAnimationFrame(rafId);document.removeEventListener('keydown',kd);};
}
/* ---------- Juego: QUIZ CLASH ---------- */
function gQuizClash(){
  const questions=[
    {q:'¿Qué parte de una planta captura principalmente la luz?',o:['La clorofila','La raíz','La corteza','El suelo'],a:0},
    {q:'¿Cuál es la capital del Perú?',o:['Cusco','Lima','Arequipa','Trujillo'],a:1},
    {q:'¿Qué hace CSS en una página web?',o:['Guarda contraseñas','Controla el aspecto visual','Crea sonidos','Mide el tiempo'],a:1},
    {q:'¿Cuál es la fórmula de la segunda ley de Newton?',o:['F = m × a','E = m ÷ c','P = a + b','V = d − t'],a:0},
    {q:'¿Qué ayuda a estudiar mejor?',o:['Releer sin parar','Repaso activo','Dormir menos','Quitar todas las pausas'],a:1},
    {q:'¿Qué es una hipótesis?',o:['Una pregunta sin tema','Una explicación que se puede poner a prueba','Un resultado seguro','Una opinión secreta'],a:1},
    {q:'¿Qué opción protege mejor una cuenta?',o:['Repetir la clave','Compartir códigos','Usar 2 pasos','Publicar la contraseña'],a:2},
    {q:'Cuando una emoción es intensa, ¿qué paso es útil?',o:['Negarla siempre','Hacer una pausa segura','Insultar','Aislarse sin avisar'],a:1}
  ];
  const cfg={easy:{cpu:2350,accuracy:.58},normal:{cpu:1900,accuracy:.7},hard:{cpu:1500,accuracy:.82}}[difficulty];
  const body=shell('<div class="game-board quiz-board"><div class="quiz-score"><span>🧩 Tú <b id="quizYou">0</b></span><span>🤖 CPU <b id="quizCpu">0</b></span><span>❔ <b id="quizRound">1</b>/'+questions.length+'</span></div><div class="quiz-card"><h3 id="quizQuestion"></h3><div class="quiz-options" id="quizOptions"></div><p class="quiz-message" id="quizMsg">Elige una respuesta. Capi también está resolviendo.</p></div></div>'+
    '<p class="game-message">Responde rápido y con calma. Gana quien acierte más preguntas.</p>');
  const question=body.querySelector('#quizQuestion'),options=body.querySelector('#quizOptions'),msg=body.querySelector('#quizMsg');let index=0,you=0,cpu=0,cpuIndex=0,cpuTimer=null,ended=false;
  function render(){if(ended)return;const item=questions[index];question.textContent=item.q;body.querySelector('#quizYou').textContent=you;body.querySelector('#quizCpu').textContent=cpu;body.querySelector('#quizRound').textContent=Math.min(index+1,questions.length);hud(you,'Pregunta '+Math.min(index+1,questions.length)+'/'+questions.length+' · CPU '+cpu);options.innerHTML='';item.o.forEach((choice,i)=>{const b=document.createElement('button');b.type='button';b.className='quiz-option';b.textContent=choice;b.addEventListener('click',()=>answer(i));options.appendChild(b);});}
  function end(win,text){if(ended)return;ended=true;clearInterval(cpuTimer);if(win)finishGame(you*20,45,text);else offerRetry(text+' Resultado: '+you+'–'+cpu+'.');}
  function answer(choice){if(ended||game.paused||!game.active)return;const item=questions[index],correct=choice===item.a;options.querySelectorAll('button').forEach(b=>b.disabled=true);if(correct){you++;sfx('good');msg.textContent='¡Correcto!';}else{sfx('bad');msg.textContent='Casi. La respuesta correcta era: '+item.o[item.a];}index++;if(index>=questions.length){end(you>=cpu,'¡Quiz completado! Tu conocimiento venció al CPU 🏆');return;}setTimeout(render,260);}
  cpuTimer=setInterval(()=>{if(ended||game.paused)return;const item=questions[cpuIndex%questions.length];if(Math.random()<cfg.accuracy)cpu++;cpuIndex++;if(cpuIndex>=questions.length){end(you>=cpu,'El CPU terminó el quiz primero 🤖');return;}body.querySelector('#quizCpu').textContent=cpu;hud(you,'Pregunta '+Math.min(index+1,questions.length)+'/'+questions.length+' · CPU '+cpu);},cfg.cpu);
  body.appendChild(pauseBtn());render();game.cleanup=()=>{ended=true;clearInterval(cpuTimer);};
}
/* ---------- Juego: WORD SPRINT ---------- */
function gWordSprint(){
  const cfg={easy:{time:55,cpu:1.9},normal:{time:45,cpu:2.35},hard:{time:37,cpu:2.85}}[difficulty],goal=8;
  const words=['calma','enfoque','respirar','planeta','memoria','energia','amistad','valiente','equilibrio','sonrisa','curiosidad','avance'];
  const body=shell('<div class="game-board word-board"><div class="word-score"><span>⌨️ Tú <b id="wordYou">0</b></span><span>🤖 CPU <b id="wordCpu">0</b></span><span>⏱ <b id="wordTime">'+cfg.time+'</b></span></div><div class="word-card"><small>ORDENA LAS LETRAS</small><strong id="wordScramble"></strong><form id="wordForm"><input id="wordInput" autocomplete="off" autocapitalize="none" placeholder="Escribe la palabra"><button class="btn primary" type="submit">Comprobar</button></form><p id="wordMsg">Cruza la meta de '+goal+' palabras antes que el CPU.</p></div></div>'+
    '<p class="game-message">Cada acierto aumenta tu racha. Puedes usar teclado o tocar el botón.</p>');
  const scrambleEl=body.querySelector('#wordScramble'),input=body.querySelector('#wordInput'),msg=body.querySelector('#wordMsg');let round=0,you=0,cpu=0,time=cfg.time,current='',timer=null,cpuTimer=null,ended=false;
  function mix(word){let out=word.split('');for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}const result=out.join('');return result===word?word.slice(1)+word[0]:result;}
  function next(){current=words[(round*3+Math.floor(Math.random()*3))%words.length];scrambleEl.textContent=mix(current).toUpperCase();input.value='';input.focus();}
  function end(win,text){if(ended)return;ended=true;clearInterval(timer);clearInterval(cpuTimer);if(win)finishGame(you*25,45,text);else offerRetry(text+' Resultado: '+you+'–'+cpu+'.');}
  body.querySelector('#wordForm').addEventListener('submit',e=>{e.preventDefault();if(ended||game.paused)return;const answer=normalText(input.value).trim();if(answer===current){you++;round++;sfx('good');msg.textContent='¡Correcta! Mantén la racha.';if(you>=goal){end(true,'¡Sprint completado! Llegaste antes que el CPU 🏆');return;}next();}else{msg.textContent='Todavía no. Mira las letras y prueba otra vez.';}hud(you,'Palabras '+you+'/'+goal+' · CPU '+Math.floor(cpu));});
  cpuTimer=setInterval(()=>{if(ended||game.paused)return;cpu++;if(cpu>=goal){end(false,'El CPU terminó su sprint primero 🤖');return;}hud(you,'Palabras '+you+'/'+goal+' · CPU '+Math.floor(cpu));},cfg.cpu*1000);
  timer=setInterval(()=>{if(ended||game.paused)return;time--;body.querySelector('#wordTime').textContent=time;if(time<=0)end(you>=cpu,'Tiempo. '+(you>=cpu?'Tu velocidad ganó 🏆':'El CPU fue más rápido 🤖'));},1000);
  body.appendChild(pauseBtn());next();hud(0,'Palabras 0/'+goal+' · CPU 0');game.cleanup=()=>{ended=true;clearInterval(timer);clearInterval(cpuTimer);};
}
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
      '<div class="game-card-top"><div class="emoji">'+g.icon+'</div>'+(g.badge?'<span class="game-badge">'+g.badge+'</span>':'')+'</div><h3>'+name+'</h3><p>'+g.desc+'</p>'+
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
  petBump('joy',8); renderPet();
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
    '<p class="game-message">Mueve la cesta con el mouse, el dedo (o ← →). Atrapa comida 🍎 hasta 300 pts · si tocas una lata 🥫 pierdes. <b>🤖 Rival CPU compite contra ti: ¡llega a 300 antes que él!</b></p>');
  const cvs = body.querySelector('#fcCv');
  let env = fitCanvas(cvs), ctx = env.ctx, W = env.w, H = env.h;
  let items=[], basket={ x:W/2, w:86 }, score=0, live=true,
      rafId=null, last=performance.now(), spawnT=0, rScore=0;
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
      rScore += dt*10*rivalRate();
      if(live && rScore >= 300 && score < 300){
        live=false; cancelAnimationFrame(rafId); sfx('bad');
        offerRetry('🤖 ¡El Rival CPU llegó a 300 primero! Ibas por '+score+' pts. ¡Revancha!');
        return;
      }
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
    const rp = Math.min(100, rScore/3);
    ctx.fillStyle='rgba(255,255,255,.09)'; ctx.fillRect(W*.3,10,W*.4,8);
    ctx.fillStyle='#ffb84d'; ctx.fillRect(W*.3,10,W*.4*rp/100,8);
    ctx.font='15px serif'; ctx.textAlign='right';
    ctx.fillText('🤖', W*.3-6, 20);
    ctx.font='11px sans-serif'; ctx.textAlign='left';
    ctx.fillStyle='rgba(255,184,77,.9)';
    ctx.fillText(Math.round(rScore)+' pts', W*.7+8, 19);
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
    'y llega a la meta 🏁 antes que el <b>🤖 Rival CPU</b>: <b>+10 XP</b> ¡y saltará de felicidad!</p>');
  const cvs = body.querySelector('#srCv');
  let env = fitCanvas(cvs), ctx = env.ctx, W = env.w, H = env.h;
  const GOAL = 5200, CHX = 90;
  let dist=0, rDist=0, obs=[], dots=[], parts=[], charY=H/2, ty=H/2,
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
      rDist += 288*rivalRate()*dt;
      if(!finished && !over && rDist >= GOAL){
        over=true; cancelAnimationFrame(rafId); sfx('bad');
        offerRetry('🤖 El Rival CPU cruzó la meta primero ('+Math.round(rDist/GOAL*100)+'% vs tu '+Math.round(dist/GOAL*100)+'%). ¡Otra vez!');
        return;
      }
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
    const rpct = Math.min(100, rDist/GOAL*100), rx = 14 + (rpct/100)*(W-28);
    ctx.fillStyle='rgba(255,255,255,.1)'; ctx.fillRect(14,H-70,W-28,5);
    ctx.fillStyle='#ffb84d'; ctx.fillRect(14,H-70,(W-28)*rpct/100,5);
    ctx.font='15px serif'; ctx.fillText('🤖', Math.min(rx,W-16), H-58);
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
      localStorage.removeItem(USERS_KEY);
      localStorage.removeItem(ACTIVE_USER_KEY);
      localStorage.removeItem(AI_DB_KEY);
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
  // En pantallas pequeñas o con teclado, Enter también permite pasar la portada.
  $('#enterBtn').addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); $('#enterBtn').click(); }
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
}

/* ---------- Bienestar+ : test, tendencia y biblioteca ---------- */
const WELLNESS_Q = [
  {q:'¿Cómo has dormido esta semana?', opts:['Muy mal','Regular','Bien','Muy bien']},
  {q:'¿Con qué frecuencia te sientes concentrado en clase?', opts:['Casi nunca','A veces','Seguido','Siempre']},
  {q:'¿Sientes que puedes hablar de tus problemas con alguien?', opts:['No','Tal vez','La mayoría de veces','Siempre']},
  {q:'¿Cómo manejas la presión de exámenes y tareas?', opts:['Me abruma','Con dificultad','Bien','Muy bien']},
  {q:'¿Te dedicas tiempo a actividades que disfrutas?', opts:['Nunca','Rara vez','Varias veces/semana','Todos los días']},
  {q:'¿Cómo está tu energía durante el día?', opts:['Agotada','Baja','Normal','Excelente']},
  {q:'¿Usas el celular hasta quedarte dormido?', opts:['Siempre','Seguido','A veces','Nunca']},
  {q:'¿Comes bien y tomas agua durante el día?', opts:['No','Muy poco','Regular','Sí, me cuido']},
  {q:'¿Te sientes motivado con tus metas?', opts:['Nada','Poco','Algo','Muchísimo']},
  {q:'¿Practicas respiración o pausas conscientes?', opts:['Nunca','Rara vez','A veces','Frecuentemente']}
];
const W_LEVELS = [
  {min:0,max:12,icon:'💜',t:'Necesitas apoyo ahora mismo',
   d:'Tu carga parece pesada, y no tienes que cargarla solo. Empieza con una respiración guiada de 1 minuto y habla con alguien de confianza: familia, orientador del colegio o Glow AI.',
   go:['calm','🌿 Respirar 1 minuto'], help:true},
  {min:13,max:19,icon:'🌤️',t:'Vas cargando más de lo que crees',
   d:'Tu bienestar está a medias. Una rutina corta de Focus y dormir mejor cambiarían tu semana. Cuéntale a Glow AI cómo te sientes y arma un plan pequeño.',
   go:['focus','🎯 Empezar Focus 25 min']},
  {min:20,max:25,icon:'🌱',t:'¡Vas bien, con margen para crecer!',
   d:'Buen nivel de bienestar. Mantén tus hábitos y súmale un reto hoy: una sesión de calma o explorar una capa nueva de Glow Space.',
   go:['calm','◌ Sesión de Calma']},
  {min:26,max:30,icon:'🌟',t:'¡Excelente! Tu mente brilla',
   d:'Tus hábitos se notan. Recuerda: constancia > intensidad. Comparte Mind Glow con un compañero que lo necesite — ayudar también suma bienestar.',
   go:['space','🌌 Visitar Glow Space']}
];
let wBound = false, wAns = [];

function wellnessInit(){ if(!wBound){ wBound = true; } }
function wellnessRender(){
  const box = $('#quizBox'), res = $('#resultBox');
  if(!box || !res) return;
  res.classList.add('hidden'); box.classList.remove('hidden');
  if(wAns.length >= WELLNESS_Q.length){ wShowResult(); return; }
  const i = wAns.length, item = WELLNESS_Q[i], pct = Math.round(i/WELLNESS_Q.length*100);
  box.innerHTML =
    '<div class="quiz-progress"><i style="width:'+pct+'%"></i></div>'+
    '<p class="quiz-count">Pregunta '+(i+1)+' de '+WELLNESS_Q.length+'</p>'+
    '<h3 class="quiz-q">'+item.q+'</h3>'+
    '<div class="quiz-opts">'+item.opts.map((o,j)=>
      '<button type="button" class="quiz-opt" data-s="'+j+'"><b>'+o+'</b><small>'+['0','1','2','3'][j]+' pts</small></button>').join('')+'</div>';
  $$('#quizBox .quiz-opt').forEach(b => b.addEventListener('click', () => {
    sfx('click'); wAns.push(+b.dataset.s);
    if(wAns.length >= WELLNESS_Q.length) wShowResult(); else wellnessRender();
  }));
}
function wShowResult(){
  const score = wAns.reduce((a,b)=>a+b,0);
  const lvl = W_LEVELS.find(l => score >= l.min && score <= l.max) || W_LEVELS[1];
  $('#quizBox').classList.add('hidden');
  const res = $('#resultBox');
  res.classList.remove('hidden');
  res.innerHTML =
    '<div class="result-icon">'+lvl.icon+'</div>'+
    '<p class="eyebrow">RESULTADO · '+score+' / 30 PUNTOS</p>'+
    '<h3>'+lvl.t+'</h3><p>'+lvl.d+'</p>'+
    '<div class="result-actions">'+
      '<button type="button" class="btn primary" data-view="'+lvl.go[0]+'">'+lvl.go[1]+'</button>'+
      (lvl.help ? '<button type="button" class="btn ghost" id="gotoHelp">🆘 Recursos de ayuda</button>' : '')+
      '<button type="button" class="btn ghost" id="redoQuiz">↺ Repetir test</button>'+
    '</div>';
  const redo = $('#redoQuiz'); if(redo) redo.addEventListener('click', ()=>{ sfx('click'); wAns=[]; wellnessRender(); });
  const gh   = $('#gotoHelp'); if(gh)   gh.addEventListener('click', ()=>{ const h=$('#helpCard'); if(h) h.scrollIntoView({behavior:'smooth'}); });
  const prev = state.wellnessLog[state.wellnessLog.length-1];
  const isNewDay = !(prev && prev.d === today());
  state.wellnessLog.push({d:today(), s:score});
  if(state.wellnessLog.length > 30) state.wellnessLog.shift();
  save(); drawTrend();
  if(isNewDay){ xp(30); toast('💚 Test completado'); } else toast('💚 Registro actualizado');
  wAns = [];
}
function drawTrend(){
  const c = $('#trendCanvas'); if(!c) return;
  const dpr = devicePixelRatio || 1;
  const W = c.width = Math.max(280, c.clientWidth) * dpr;
  const H = c.height = 160 * dpr;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
  for(let g=0; g<=3; g++){ const y = H*.15 + g*(H*.7/3);
    ctx.beginPath(); ctx.moveTo(20*dpr,y); ctx.lineTo(W-10*dpr,y); ctx.stroke(); }
  const log = state.wellnessLog.slice(-10);
  if(log.length < 2){
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.font = (13*dpr)+'px Inter,sans-serif';
    ctx.fillText('Haz el test al menos 2 veces para ver tu progreso aqui 📈', 24*dpr, H/2);
    return;
  }
  const px = i => 30*dpr + i*((W-50*dpr)/(log.length-1));
  const py = v => H*.85 - (v/30)*(H*.7);
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'rgba(125,113,255,.35)'); grad.addColorStop(1,'rgba(125,113,255,0)');
  ctx.beginPath(); ctx.moveTo(px(0),py(log[0].s));
  log.forEach((p,i)=>ctx.lineTo(px(i),py(p.s)));
  ctx.lineTo(px(log.length-1),H); ctx.lineTo(px(0),H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); ctx.moveTo(px(0),py(log[0].s));
  log.forEach((p,i)=>ctx.lineTo(px(i),py(p.s)));
  ctx.strokeStyle = '#8b7cff'; ctx.lineWidth = 2.5*dpr; ctx.lineJoin = 'round'; ctx.stroke();
  log.forEach((p,i)=>{ ctx.beginPath(); ctx.arc(px(i),py(p.s),4*dpr,0,7);
    ctx.fillStyle = p.s>=20 ? '#51e0c0' : p.s>=13 ? '#ffd166' : '#ff6b8b'; ctx.fill(); });
}

/* ---------- Racha semanal visible ---------- */
function renderWeekDots(){
  const el = $('#weekDots'); if(!el) return;
  const n = Math.min(7, Math.max(state.streak||0, 0));
  let html = '';
  for(let i=0;i<7;i++) html += '<i class="'+(i >= 7-n ? 'on' : '')+'"></i>';
  el.innerHTML = html;
  const note = $('#streakNote');
  if(note) note.textContent =
    n>=7 ? '🔥 ¡SEMANA COMPLETA! Eres imparable.' :
    n>=3 ? 'Vas ' + n + ' días seguidos 🔥 La constancia ya es tuya.' :
    n>=1 ? 'Día ' + n + ' de tu racha. Vuelve mañana por el día ' + (n+1) + '.' :
           'Entra cada día para mantener tu fuego 🔥 encendido.';
}

/* ---------- Mascota virtual: Capi ---------- */
function petDecay(){
  const p = state.pet, d = today();
  if(p.last === d) return;
  const days = p.last ? Math.max(1, Math.round((new Date(d)-new Date(p.last))/86400000)) : 0;
  ['fed','energy','joy'].forEach(k => { p[k] = Math.max(5, p[k]-14*days); });
  p.last = d; save();
}
function petBump(k,n){ const p = state.pet; p[k] = Math.min(100, p[k]+n); save(); }
function renderPet(){
  const p = state.pet, avg = (p.fed+p.energy+p.joy)/3;
  const face = $('#petFace'); if(!face) return;
  face.style.filter = avg>=75 ? 'drop-shadow(0 0 20px rgba(81,224,192,.75))'
                    : avg>=50 ? 'none' : 'grayscale(.85)';
  const mood = $('#petMood');
  if(mood) mood.textContent =
    avg>=85 ? '¡Está radiante! Le encanta verte.' :
    avg>=60 ? 'Está tranquilo y feliz.' :
    avg>=35 ? 'Se le nota apagado…dale cariño.' :
              '¡Necesita cuidados YA!';
  [['Fed','fed'],['Energy','energy'],['Joy','joy']].forEach(pair => {
    const bar = $('#pet'+pair[0]+'Bar'), val = $('#pet'+pair[0]+'Val');
    if(bar){
      bar.style.width = p[pair[1]]+'%';
      val.textContent = Math.round(p[pair[1]])+'%';
      bar.style.background = p[pair[1]]>=55 ? 'linear-gradient(90deg,#51e0c0,#8b7cff)'
                           : p[pair[1]]>=30 ? '#ffd166' : '#ff6b8b';
    }
  });
}
function petInit(){
  const f = $('#petFeed'), h = $('#petPet');
  if(!f || f.dataset.b) return;
  f.dataset.b = '1';
  f.addEventListener('click', () => { sfx('good'); petBump('fed',12); renderPet(); toast('🥬 A Capi le encanta la merienda'); });
  h.addEventListener('click', () => { sfx('click'); petBump('joy',8); renderPet(); toast('✋ Capi hace ruiditos felices'); });
}

/* ---------- Sala Glow: chat en vivo + stickers ---------- */
let roomCh = null, roomBound = false, roomMyId = Math.random().toString(36).slice(2,10);
const STICKERS = ['💜','😂','🔥','🎉','🦫','👾','🌟','🙌','😎','🍀'];
const ROOM_TOPIC = 'mindglow-sala-x7kq29'; /* canal único del equipo */
function roomNick(){ return (state.user && state.user.name) ? state.user.name : 'Invitado'; }
function netListen(){
  try{
    const es = new EventSource('https://ntfy.sh/'+ROOM_TOPIC+'/sse');
    es.onmessage = e => {
      try{
        const ev = JSON.parse(e.data);
        if(ev.event !== 'message') return;
        const m = JSON.parse(ev.message);
        if(!m || m.mid === roomMyId) return;
        sfx('click');
        roomRender(m,false);
      }catch(err){}
    };
  }catch(err){}
}
function netSend(m){
  try{
    fetch('https://ntfy.sh/'+ROOM_TOPIC, { method:'POST', body:JSON.stringify(m) });
  }catch(err){}
}
function chatInit(){
  const box = $('#roomMessages'), form = $('#roomForm'),
        inp = $('#roomInput'), st = $('#roomStickers');
  if(!box) return;
  if($('#roomNick')) $('#roomNick').textContent = 'conectado como ' + roomNick();
  if(roomBound) return;
  roomBound = true;
  try{
    roomCh = new BroadcastChannel('mindglow-room-v1');
    roomCh.onmessage = e => roomRender(e.data,false);
  }catch(err){}
  st.innerHTML = STICKERS.map(s =>
    '<button type="button" class="room-sticker" data-s="'+s+'">'+s+'</button>').join('');
  $$('#roomStickers .room-sticker').forEach(b => b.addEventListener('click', () => {
    sfx('click'); roomSend({ t:'', s:b.dataset.s });
  }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = inp.value.trim(); if(!v) return;
    inp.value = ''; roomSend({ t:v });
  });
  roomRender({ n:'Glow', t:'Bienvenidos a la Sala Glow 💬 Este chat es GLOBAL: los mensajes viajan por internet — abre Mind Glow en otro celular o computador y verán todo EN VIVO. Prueben los stickers 🎉', sys:true }, false);
  netListen();
}
function roomSend(m){
  m.n = roomNick(); m.ts = Date.now(); m.mid = roomMyId;
  try{ if(roomCh) roomCh.postMessage(m); }catch(err){}
  netSend(m);
  roomRender(m,true);
}
function roomRender(m, mine){
  const box = $('#roomMessages'); if(!box) return;
  const d = document.createElement('div');
  d.className = 'room-msg' + (mine?' me':'') + (m.sys?' sys':'');
  if(m.s){
    const sp = document.createElement('span');
    sp.className = 'room-bigsticker'; sp.textContent = m.s;
    d.appendChild(sp);
    d.appendChild(document.createElement('br'));
  } else {
    d.appendChild(document.createTextNode(m.t));
    d.appendChild(document.createElement('br'));
  }
  const who = document.createElement('small');
  who.textContent = m.sys ? '· sala ·' : (m.n + (mine?' (tú)':''));
  d.appendChild(who);
  box.appendChild(d); box.scrollTop = box.scrollHeight;
}

/* ---------- Glow Art: imágenes generativas de la IA ---------- */
function hashStr(s){
  let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
  return h >>> 0;
}
function aiArtBubble(prompt){
  const box = $('#chatMessages'); if(!box) return;
  const d = document.createElement('div'); d.className = 'bubble ai ai-art';
  const c = document.createElement('canvas');
  c.className = 'art-cv'; c.width = 480; c.height = 300;
  const cap = document.createElement('div'); cap.className = 'art-cap';
  cap.textContent = '✨ Glow Art · "' + prompt.slice(0,64) + '"';
  d.appendChild(c); d.appendChild(cap);
  box.appendChild(d);
  drawGlowArt(c.getContext('2d'), c.width, c.height, hashStr(prompt));
  box.scrollTop = box.scrollHeight;
}
function drawGlowArt(x,W,H,seed){
  const rand = () => { const v = Math.sin(seed += 12.9898) * 43758.5453; return v - Math.floor(v); };
  const h0 = rand()*360;
  const bg = x.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'hsl('+h0+' 45% 10%)');
  bg.addColorStop(1,'hsl('+((h0+70)%360)+' 50% 16%)');
  x.fillStyle = bg; x.fillRect(0,0,W,H);
  for(let i=0;i<3;i++){
    const cx=W*(.2+rand()*.6), cy=H*(.25+rand()*.5), r=40+rand()*90, hh=(h0+i*90)%360;
    const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,'hsla('+hh+' 90% 65%,.55)');
    g.addColorStop(1,'hsla('+hh+' 90% 65%,0)');
    x.fillStyle=g; x.beginPath(); x.arc(cx,cy,r,0,7); x.fill();
  }
  for(let i=0;i<120;i++){
    x.fillStyle='rgba(255,255,255,'+(rand()*.7+.1)+')';
    x.fillRect(rand()*W,rand()*H,1.6,1.6);
  }
  x.lineWidth = 1.4;
  for(let i=0;i<4;i++){
    x.strokeStyle = 'hsla('+((h0+40*i)%360)+' 85% 72%,.5)';
    x.beginPath();
    x.ellipse(W/2,H/2, W*.12+i*W*.09, (W*.06+i*W*.05)*.6, rand()*3.14, 0, 7);
    x.stroke();
  }
  const ox=W*(.3+rand()*.4), oy=H*(.3+rand()*.4);
  const og=x.createRadialGradient(ox,oy,0,ox,oy,34);
  og.addColorStop(0,'rgba(255,255,255,.95)');
  og.addColorStop(.4,'hsla('+((h0+180)%360)+' 95% 70%,.9)');
  og.addColorStop(1,'hsla('+((h0+180)%360)+' 95% 70%,0)');
  x.fillStyle=og; x.beginPath(); x.arc(ox,oy,34,0,7); x.fill();
}

/* ---------- Guía personalizada + rival CPU ---------- */
function wPlan(){
  const pend = state.tasks.filter(t=>!t.done).length;
  const lastTest = state.wellnessLog[state.wellnessLog.length-1];
  let plan = 'Tu plan personalizado'+(firstName()?', '+firstName():'')+':\n';
  plan += '1) ' + (pend ? pend+' tarea(s) pendientes: ataca la MÁS corta primero'
                       : 'Añade a Tareas lo más importante de hoy') + '\n';
  plan += '2) ' + (state.focus ? 'Un bloque Focus de 25 min (ya llevas '+state.focus+')'
                             : 'Tu primer bloque Focus de 15 min, para arrancar suave') + '\n';
  plan += '3) ' + (lastTest && lastTest.s < 20
                 ? 'Tu último test salió bajo: 1 minuto de respiración en Calma antes de estudiar'
                 : 'Cierra con algo tuyo: un juego o explorar Glow Space') + '\n';
  plan += state.streak > 1
    ? 'Y llevas '+state.streak+' días seguidos 🔥 no rompas la cadena.'
    : 'Empieza tu racha HOY: vuelve mañana y suma día 2 🔥';
  return plan;
}
function rivalRate(){
  const lv = Math.min(25, state.level-1);
  const base = {easy:.78, normal:.92, hard:1.04}[difficulty] || .92;
  return base * (1 + lv*.01);
}

/* ---------- Fotos del equipo ---------- */
function pickImage(cb){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 140;
        const cx = cv.getContext('2d');
        const s = Math.min(im.width, im.height);
        cx.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,140,140);
        cb(cv.toDataURL('image/jpeg',.82));
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
  inp.click();
}

/* ---------- Mini reproductor de música ---------- */
function miniPlayerInit(){
  if($('#miniPlayer')) return;
  const el = document.createElement('div'); el.id = 'miniPlayer';
  el.innerHTML = '<button type="button" id="mpPlay" title="Reproducir/Pausar">▶</button>'+
    '<span id="mpTitle" title="Abrir Calma">Música MindGlow</span>'+
    '<button type="button" id="mpNext" title="Siguiente pista">⏭</button>';
  document.body.appendChild(el);
  updMusicMeta();
  updateMusicButtons();
  $('#mpPlay').addEventListener('click', () => musicOn ? musicStop() : musicStart());
  $('#mpNext').addEventListener('click', () => {
    selectMusic(musicIndex + 1, musicOn);
  });
  $('#mpTitle').addEventListener('click', () => showView('calm'));
}

/* ---------- Arranque ---------- */
function init(){
  buildNav();
  topbarInit();
  moodInit();
  aiInit();
  Studio.init();
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
  miniPlayerInit();
  petDecay();
  petInit();
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
