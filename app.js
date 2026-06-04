// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const S = {
  drawColor: [255, 0, 0],
  erasing:   false,
  brushSize: 4,
  eraserSize:40,
  xp: 0, yp: 0,
  running: false,
};

// ─────────────────────────────────────────────
// DOM REFERENCES
// ─────────────────────────────────────────────
const videoEl       = document.getElementById('videoEl');
const canvas        = document.getElementById('outputCanvas');
const ctx           = canvas.getContext('2d');
const welcome       = document.getElementById('welcome');
const startBtn      = document.getElementById('startBtn');
const stopBtn       = document.getElementById('stopBtn');
const clearBtn      = document.getElementById('clearBtn');
const saveBtn       = document.getElementById('saveBtn');
const modeBadge     = document.getElementById('modeBadge');
const statusDot     = document.getElementById('statusDot');
const statusTxt     = document.getElementById('statusTxt');
const brushSlider   = document.getElementById('brushSlider');
const brushValLabel = document.getElementById('brushValLabel');
const hud           = document.getElementById('hud');
const fpsEl         = document.getElementById('fpsEl');

// ─────────────────────────────────────────────
// PERSISTENT DRAW CANVAS (like imgCanvas in Python)
// ─────────────────────────────────────────────
let drawCanvas = document.createElement('canvas');
let dctx;

function resizeAll() {
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  canvas.width  = w;
  canvas.height = h;
  const old = document.createElement('canvas');
  old.width  = drawCanvas.width;
  old.height = drawCanvas.height;
  old.getContext('2d').drawImage(drawCanvas, 0, 0);
  drawCanvas.width  = w;
  drawCanvas.height = h;
  dctx = drawCanvas.getContext('2d');
  dctx.drawImage(old, 0, 0, w, h);
}
window.addEventListener('resize', resizeAll);

// ─────────────────────────────────────────────
// HELPER — updates active color button visually
// ─────────────────────────────────────────────
function updateActivePalette(colorValue) {
  document.querySelectorAll('.color-pick').forEach(b => b.classList.remove('active'));
  const target = document.querySelector(`.color-pick[data-color="${colorValue}"]`);
  if (target) target.classList.add('active');
}

// ─────────────────────────────────────────────
// COLOUR PALETTE — mouse click
// ─────────────────────────────────────────────
document.querySelectorAll('.color-pick').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-pick').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.color === 'erase') {
      S.erasing = true;
    } else {
      S.erasing   = false;
      S.drawColor = btn.dataset.color.split(',').map(Number);
    }
  });
});

// ─────────────────────────────────────────────
// BRUSH SLIDER
// ─────────────────────────────────────────────
brushSlider.addEventListener('input', () => {
  S.brushSize = +brushSlider.value;
  brushValLabel.textContent = S.brushSize;
});

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────
function clearCanvas() {
  if (dctx) dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

function saveDrawing() {
  const tmp = document.createElement('canvas');
  tmp.width  = drawCanvas.width;
  tmp.height = drawCanvas.height;
  const tc   = tmp.getContext('2d');
  tc.fillStyle = '#ffffff';
  tc.fillRect(0, 0, tmp.width, tmp.height);
  tc.drawImage(drawCanvas, 0, 0);
  const a    = document.createElement('a');
  a.download = 'airwrite_' + Date.now() + '.png';
  a.href     = tmp.toDataURL();
  a.click();
}

clearBtn.addEventListener('click', clearCanvas);
saveBtn.addEventListener('click', saveDrawing);
stopBtn.addEventListener('click', stopCamera);

// ─────────────────────────────────────────────
// MODE BADGE
// ─────────────────────────────────────────────
function setMode(m) {
  modeBadge.className   = 'mode-badge ' + m;
  modeBadge.textContent =
    m === 'draw'   ? '✏ DRAW'   :
    m === 'select' ? '✌ SELECT' : '● IDLE';
}

// ─────────────────────────────────────────────
// FINGER DETECTION — mirrors Python fingersUp()
// ─────────────────────────────────────────────
function fingersUp(lm) {
  const indexUp  = lm[8].y  < lm[6].y;
  const middleUp = lm[12].y < lm[10].y;
  return { indexUp, middleUp };
}

// ─────────────────────────────────────────────
// MEDIAPIPE RESULTS — exact port of Python while loop
// ─────────────────────────────────────────────
let lastT = 0;

function onResults(results) {
  const W = canvas.width;
  const H = canvas.height;

  // FPS counter
  const now = performance.now();
  if (lastT) fpsEl.textContent = Math.round(1000 / (now - lastT)) + ' fps';
  lastT = now;

  // 1. Draw mirrored camera feed
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(results.image, -W, 0, W, H);
  ctx.restore();

  // 2. Paste persistent draw canvas on top
  ctx.drawImage(drawCanvas, 0, 0, W, H);

  if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
    setMode('idle');
    S.xp = 0; S.yp = 0;
    return;
  }

  const lm = results.multiHandLandmarks[0];

  // Scale landmarks (0-1) to canvas pixels, mirror X
  const px = i => ({ x: (1 - lm[i].x) * W, y: lm[i].y * H });
  const index  = px(8);
  const middle = px(12);
  const { indexUp, middleUp } = fingersUp(lm);

  // ── SELECTION MODE: fingers[1]==1 and fingers[2]==1 ──
  if (indexUp && middleUp) {
    setMode('select');
    S.xp = 0; S.yp = 0;

    // ── GESTURE COLOR SELECTION ──────────────────────────
    // Same as Python:  if y1 < 125: if 250 < x1 < 450: ...
    // topbar height is ~56px in web, so check if finger is in that zone
    if (index.y < 56) {
      // Red — overlayList[0]
      if (index.x > 190 && index.x < 260) {
        S.erasing   = false;
        S.drawColor = [255, 0, 0];
        updateActivePalette('255,0,0');
      }
      // Blue — overlayList[1]
      else if (index.x > 265 && index.x < 335) {
        S.erasing   = false;
        S.drawColor = [0, 0, 255];
        updateActivePalette('0,0,255');
      }
      // Green — overlayList[2]
      else if (index.x > 340 && index.x < 410) {
        S.erasing   = false;
        S.drawColor = [0, 255, 0];
        updateActivePalette('0,255,0');
      }
      // Eraser — overlayList[3]
      else if (index.x > 415 && index.x < 465) {
        S.erasing = true;
        updateActivePalette('erase');
      }
    }
    // ── END GESTURE COLOR SELECTION ──────────────────────

    // Selection rectangle cursor
    const col = S.erasing ? '#888' : `rgb(${S.drawColor})`;
    ctx.strokeStyle = col;
    ctx.lineWidth   = 2;
    ctx.strokeRect(
      Math.min(index.x, middle.x) - 10,
      Math.min(index.y, middle.y) - 10,
      Math.abs(middle.x - index.x) + 20,
      Math.abs(middle.y - index.y) + 20
    );
    return;
  }

  // ── DRAWING MODE: fingers[1]==1 and fingers[2]==0 ──
  if (indexUp && !middleUp) {
    setMode('draw');
    const thickness = S.erasing ? S.eraserSize : S.brushSize;
    const color     = `rgb(${S.drawColor})`;

    // Cursor indicator
    if (!S.erasing) {
      ctx.fillStyle  = color;
      ctx.shadowBlur = 8; ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(index.x, index.y, thickness / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5;
      ctx.strokeRect(index.x - thickness / 2, index.y - thickness / 2, thickness, thickness);
    }

    if (S.xp === 0 && S.yp === 0) { S.xp = index.x; S.yp = index.y; }

    // Draw on persistent canvas
    if (S.erasing) {
      dctx.clearRect(index.x - thickness / 2, index.y - thickness / 2, thickness, thickness);
    } else {
      dctx.strokeStyle = color;
      dctx.lineWidth   = thickness;
      dctx.lineCap     = 'round';
      dctx.lineJoin    = 'round';
      dctx.shadowBlur  = 3; dctx.shadowColor = color;
      dctx.beginPath();
      dctx.moveTo(S.xp, S.yp);
      dctx.lineTo(index.x, index.y);
      dctx.stroke();
      dctx.shadowBlur = 0;
    }

    S.xp = index.x; S.yp = index.y;
    return;
  }

  // ── IDLE: fingers[1]==0 → xp,yp = 0,0 ──
  setMode('idle');
  S.xp = 0; S.yp = 0;
}

// ─────────────────────────────────────────────
// CAMERA START / STOP
// ─────────────────────────────────────────────
let hands, cam;

async function startCamera() {
  resizeAll();

  hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.80,
    minTrackingConfidence:  0.70,
  });
  hands.onResults(onResults);

  cam = new Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 1280, height: 720,
  });

  try {
    await cam.start();
    S.running = true;
    welcome.classList.add('hidden');
    statusDot.classList.add('live');
    statusTxt.textContent = 'LIVE';
    hud.classList.add('visible');
    fpsEl.classList.add('visible');
  } catch (e) {
    alert('Camera permission denied. Please allow camera access and try again.');
  }
}

function stopCamera() {
  if (cam) cam.stop();
  S.running = false;
  welcome.classList.remove('hidden');
  statusDot.classList.remove('live');
  statusTxt.textContent = 'OFF';
  hud.classList.remove('visible');
  fpsEl.classList.remove('visible');
  setMode('idle');
}

startBtn.addEventListener('click', startCamera);

// ─────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!S.running) return;
  if (e.key === 'c' || e.key === 'C') clearCanvas();
  if (e.key === 's' || e.key === 'S') saveDrawing();
  if (e.key === 'Escape') stopCamera();
});
