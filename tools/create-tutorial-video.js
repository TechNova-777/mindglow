/* Genera el video educativo estático que acompaña a Mind Glow.
   Se ejecuta fuera de Vercel: node tools/create-tutorial-video.js */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/JACK PC/AppData/Local/Temp/mindglow-video-tools/node_modules/sharp');
const ffmpeg = 'C:/Users/JACK PC/AppData/Local/Temp/mindglow-video-tools/node_modules/ffmpeg-static/ffmpeg.exe';

const root = path.resolve(__dirname, '..');
const framesDir = path.join(root, 'tutorial-frames');
fs.mkdirSync(framesDir, { recursive: true });

const W = 1280, H = 720;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const lines = (items, x, y, size = 24, color = '#b5bdd0', weight = 500, gap = 36) =>
  items.map((item, i) => `<text x="${x}" y="${y + i * gap}" fill="${color}" font-size="${size}" font-family="Segoe UI,Arial,sans-serif" font-weight="${weight}">${esc(item)}</text>`).join('');

const slides = [
  {tag:'MIND GLOW 3.0 · GUÍA EDUCATIVA', title:['De una idea','a una experiencia.'], body:['Un recorrido breve por la app, el creador de juegos','3D, los controles y el guardado de tu progreso.'], accent:'#9b8cff', label:'Calma · Focus · Juegos · Glow AI · Game Studio'},
  {tag:'01 · PRIMER PASO', title:['Entra y','oriéntate.'], body:['Pulsa “Entrar a Mind Glow” para abrir el panel.','Desde Inicio puedes saltar a cualquier herramienta.'], accent:'#8c7cff', label:'1  Entrar     2  Elegir sección     3  Volver a Inicio'},
  {tag:'02 · TU GUÍA LOCAL', title:['Habla con','Glow AI.'], body:['Escribe una petición con tus propias palabras.','Organiza sesiones, pide ideas o prepara un juego 3D.'], accent:'#51e0c0', label:'Sin API key · tus mensajes permanecen en este dispositivo'},
  {tag:'03 · GAME STUDIO', title:['Describe.','Genera. Juega.'], body:['Cuenta qué quieres crear y pulsa “Generar mundo 3D”.','El motor local monta la escena, los objetos y la meta.'], accent:'#ffb86b', label:'Idea → Mundo 3D → Mecánicas → Juego listo'},
  {tag:'04 · CONTROLES', title:['Muévete en','primera persona.'], body:['PC: WASD o flechas · arrastra para mirar · ESPACIO para saltar.','Móvil o tablet: usa el D-pad y el botón de salto.'], accent:'#6ee3c9', label:'FLECHAS / WASD     ESPACIO     ARRASTRA'},
  {tag:'05 · PROGRESO', title:['Guarda tu','avance.'], body:['La app guarda tu estado en el navegador automáticamente.','“Guardar carpeta” exporta un proyecto; “Importar” lo recupera.'], accent:'#ff86b5', label:'Auto-guardado · Recuperar · Importar · Compartir'},
  {tag:'06 · PUBLICACIÓN', title:['Comparte','Mind Glow.'], body:['La web está publicada y lista para cualquier dispositivo.','Abre el enlace corto y empieza tu siguiente sesión.'], accent:'#51e0c0', label:'mindglow.vercel.app'},
];

function svgFor(slide, index) {
  const n = String(index + 1).padStart(2, '0');
  const progress = ((index + 1) / slides.length) * 100;
  const accent = slide.accent;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#090b18"/><stop offset="0.55" stop-color="#11152b"/><stop offset="1" stop-color="#07131b"/></linearGradient>
      <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${accent}"/><stop offset="1" stop-color="#b65cff"/></linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="55"/></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="1040" cy="80" r="240" fill="${accent}" opacity=".12" filter="url(#blur)"/>
    <circle cx="120" cy="650" r="210" fill="#6f5bff" opacity=".11" filter="url(#blur)"/>
    <path d="M0 110 H1280" stroke="#ffffff" stroke-opacity=".07"/>
    <text x="74" y="77" fill="#a9b2c8" font-size="17" font-family="Segoe UI,Arial,sans-serif" font-weight="700" letter-spacing="3">${esc(slide.tag)}</text>
    <text x="1168" y="77" fill="${accent}" font-size="17" font-family="Segoe UI,Arial,sans-serif" font-weight="700">${n} / ${slides.length}</text>
    <rect x="74" y="132" width="7" height="265" rx="4" fill="url(#shine)"/>
    ${lines(slide.title, 112, 220, 68, '#f1f3fa', 800, 78)}
    ${lines(slide.body, 116, 422, 24, '#b8c0d3', 500, 38)}
    <rect x="112" y="566" width="1056" height="72" rx="20" fill="#ffffff" fill-opacity=".06" stroke="#ffffff" stroke-opacity=".10"/>
    <circle cx="148" cy="602" r="17" fill="${accent}" opacity=".9"/>
    <text x="182" y="610" fill="#ecf0fb" font-size="22" font-family="Segoe UI,Arial,sans-serif" font-weight="700">${esc(slide.label)}</text>
    <rect x="74" y="681" width="1132" height="4" rx="2" fill="#ffffff" fill-opacity=".10"/>
    <rect x="74" y="681" width="${1132 * progress / 100}" height="4" rx="2" fill="url(#shine)"/>
  </svg>`;
}

async function renderFrames() {
  const logo = path.join(root, 'mindglow-logo.png');
  for (let i = 0; i < slides.length; i++) {
    const target = path.join(framesDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
    const image = sharp(Buffer.from(svgFor(slides[i], i)));
    if (i === 0 && fs.existsSync(logo)) {
      await image.composite([{ input: await sharp(logo).resize(170, 94, { fit: 'cover' }).png().toBuffer(), left: 1030, top: 160 }]).png().toFile(target);
    } else {
      await image.png().toFile(target);
    }
  }
}

function makeConcat() {
  const list = slides.map((_, i) => `file '${path.join(framesDir, `slide-${String(i + 1).padStart(2, '0')}.png`).replace(/\\/g, '/')}'\nduration 3.1`).join('\n');
  const last = path.join(framesDir, `slide-${String(slides.length).padStart(2, '0')}.png`).replace(/\\/g, '/');
  const concat = `${list}\nfile '${last}'`;
  const file = path.join(framesDir, 'slides.txt');
  fs.writeFileSync(file, concat, 'utf8');
  return file;
}

function writeSubtitles() {
  let out = '';
  slides.forEach((slide, i) => {
    const start = i * 3.1, end = start + 3.1;
    const ts = seconds => {
      const ms = Math.round((seconds % 1) * 1000);
      const total = Math.floor(seconds);
      const s = total % 60, m = Math.floor(total / 60);
      return `00:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
    };
    out += `${i + 1}\n${ts(start)} --> ${ts(end)}\n${slide.tag}\n${slide.title.join(' ')}\n${slide.body.join(' ')}\n\n`;
  });
  fs.writeFileSync(path.join(root, 'tutorial-mindglow.srt'), out, 'utf8');
}

async function main() {
  await renderFrames();
  const concat = makeConcat();
  writeSubtitles();
  const output = path.join(root, 'tutorial-mindglow.mp4');
  const music = path.join(root, 'MindGlow - La Luz Dentro de Ti - Treblo.mp3');
  const args = ['-y', '-f', 'concat', '-safe', '0', '-i', concat];
  if (fs.existsSync(music)) args.push('-stream_loop', '-1', '-i', music);
  args.push('-t', '21.7', '-vf', 'format=yuv420p', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23');
  if (fs.existsSync(music)) args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  args.push('-movflags', '+faststart', output);
  const { spawn } = require('child_process');
  await new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg terminó con código ${code}`)));
  });
  console.log(`Video creado: ${output}`);
  console.log(`Subtítulos creados: ${path.join(root, 'tutorial-mindglow.srt')}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
