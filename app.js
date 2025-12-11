/* ============================================================
   Colorful Custom Hand AI Project
   COCO-SSD version + ARCH Grip Logic
============================================================ */

/* ============================
   UI Elements
============================ */
const video = document.getElementById("video");
const overlayHud = document.getElementById("overlayHud");
const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");

const simNoneBtn = document.getElementById("simNone");
const simPenBtn = document.getElementById("simPen");
const simPhoneBtn = document.getElementById("simPhone");
const simKeyBtn = document.getElementById("simKey");
const simSaluteBtn = document.getElementById("simSalute");

const miniOpenBtn = document.getElementById("miniOpenBtn");
const lockBtn = document.getElementById("lockBtn");
const relaxBtn = document.getElementById("relaxBtn");

const startBtn = document.getElementById("startCameraBtn");

const menuToggle = document.getElementById("menuToggle");
const menuPanel = document.getElementById("menuPanel");

const cameraSelect = document.getElementById("cameraSelect");
const maxResultsSlider = document.getElementById("maxResults");
const maxResultsValue = document.getElementById("maxResultsValue");
const scoreSlider = document.getElementById("scoreSlider");
const scoreValue = document.getElementById("scoreValue");

/* ============================
   SVG Hands
============================ */
const handRelaxed = document.getElementById("handRelaxed");
const handPen = document.getElementById("handPen");
const handPhone = document.getElementById("handPhone");
const handKey = document.getElementById("handKey");
const handSalute = document.getElementById("handSalute");

const penFingers = document.getElementById("penFingers");
const phoneFingers = document.getElementById("phoneFingers");
const keyFingers = document.getElementById("keyFingers");

/* ============================
   GLOBAL STATE
============================ */
let stream = null;
let detector = null;
let analyzing = false;

let lockActive = false;
let freezeUntil = 0;

let lastDetections = [];  
let detectionHistory = []; // 5-frame buffer

let logicalState = "none";

/* ============================
   MENU TOGGLE
============================ */
menuToggle.addEventListener("click", () => {
  menuPanel.classList.toggle("hidden");
});

/* ============================
   Helper: Activate Hand
============================ */
function allHands() {
  return [handRelaxed, handPen, handPhone, handKey, handSalute];
}
function activateHand(target) {
  allHands().forEach(h => h.classList.remove("active"));
  target.classList.add("active");
}

/* ============================
   Reset visuals
============================ */
function resetAllVisuals() {
  handRelaxed.classList.remove("relaxed-locked");
  [penFingers, phoneFingers, keyFingers].forEach(grp => {
    if (grp) grp.classList.remove("locked-fingers");
  });
}

/* ============================
   Show states
============================ */
function showRelaxed() {
  logicalState = "none";
  activateHand(handRelaxed);
  resultEl.textContent = "State: RELAXED";
}

function showPen() {
  logicalState = "pen";
  activateHand(handPen);
  resultEl.textContent = "State: PEN detected";
}

function showPhone() {
  logicalState = "phone";
  activateHand(handPhone);
  resultEl.textContent = "State: PHONE detected";
}

function showKey() {
  logicalState = "key";
  activateHand(handKey);
  resultEl.textContent = "State: KEY detected";
}

function showSalute() {
  logicalState = "salute";
  activateHand(handSalute);
  resultEl.textContent = "State: Salute (simulation)";
}

/* ============================
   SIMULATION BUTTONS
============================ */

simNoneBtn.onclick = () => { resetAllVisuals(); freezeUntil=0; showRelaxed(); };
simPenBtn.onclick = () => { resetAllVisuals(); freezeUntil = performance.now()+1000; showPen(); };
simPhoneBtn.onclick=()=>{ resetAllVisuals(); freezeUntil = performance.now()+1000; showPhone(); };
simKeyBtn.onclick  =()=>{ resetAllVisuals(); freezeUntil = performance.now()+1000; showKey(); };
simSaluteBtn.onclick=()=>{ resetAllVisuals(); freezeUntil = performance.now()+1000; showSalute(); };

/* ============================
   Lock / Mini-open / Relax
============================ */

lockBtn.onclick = () => {
  lockActive = true;
  lockBtn.textContent = "Lock (ON)";
  statusEl.textContent = "Lock active: recognition paused.";

  if (logicalState === "pen") penFingers.classList.add("locked-fingers");
  else if (logicalState === "phone") phoneFingers.classList.add("locked-fingers");
  else if (logicalState === "key") keyFingers.classList.add("locked-fingers");
  else if (logicalState === "none") handRelaxed.classList.add("relaxed-locked");
};

miniOpenBtn.onclick = () => {
  if (!lockActive) return;
  resetAllVisuals();
  statusEl.textContent = "Mini-open: thickness reset.";
};

relaxBtn.onclick = () => {
  lockActive = false;
  lockBtn.textContent = "Lock";
  resetAllVisuals();
  showRelaxed();
  freezeUntil = 0;
  statusEl.textContent = "Relax: unlocked.";
};

/* ============================
   CAMERA START
============================ */

async function startCamera() {
  if (stream) stream.getTracks().forEach(t=>t.stop());

  let facingMode = "user";  
  const val = cameraSelect.value;
  if (val.startsWith("back")) facingMode = { exact: "environment" };

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode }
  });

  video.srcObject = stream;
  await video.play();

  statusEl.textContent = "Camera started.";
  if (!analyzing) {
    analyzing = true;
    detectLoop();
  }
}

startBtn.onclick = startCamera;

/* ============================
   Load COCO Detector
============================ */
async function loadModel() {
  statusEl.textContent = "Loading COCO model...";
  detector = await cocoSsd.load({ base: "lite_mobilenet_v2" });
  statusEl.textContent = "COCO model loaded.";
  overlayHud.textContent = "COCO-SSD loaded.";
}
loadModel();

/* ============================
   Detection categories
============================ */
function mapCategory(name) {
  name = name.toLowerCase();

  if (["pencil","pen","toothbrush"].includes(name)) return "pen";
  if (["cell phone","mobile phone","phone"].includes(name)) return "phone";
  if (["key","remote","coin"].includes(name)) return "key";

  return "none"; 
}

/* ============================
   Main Detection Loop
============================ */
async function detectLoop() {
  const now = performance.now();

  if (lockActive || now < freezeUntil) {
    overlayHud.textContent = "Frozen...";
    requestAnimationFrame(detectLoop);
    return;
  }

  if (!video.videoWidth) {
    requestAnimationFrame(detectLoop);
    return;
  }

  /* Detection */
  const preds = await detector.detect(video);
  const scoreThresh = Number(scoreSlider.value) / 100;
  const maxRes = Number(maxResultsSlider.value);

  const filtered = preds
    .filter(p => p.score >= scoreThresh)
    .slice(0, maxRes);

  let label = "none";

  for (const p of filtered) {
    const mapped = mapCategory(p.class);
    if (mapped !== "none") {
      label = mapped;
      break;
    }
  }

  detectionHistory.push(label);
  if (detectionHistory.length > 5) detectionHistory.shift();

  const countSame = detectionHistory.filter(x => x === label).length;

  if (countSame >= 3 && label !== "none") {
    if (label === "pen") showPen();
    else if (label === "phone") showPhone();
    else if (label === "key") showKey();

    freezeUntil = performance.now() + 2000;
  } else if (label === "none") {
    showRelaxed();
  }

  overlayHud.textContent = `Detections: ${label}`;
  requestAnimationFrame(detectLoop);
}

/* ============================
   UI Sync
============================ */
maxResultsSlider.oninput = () => {
  maxResultsValue.textContent = maxResultsSlider.value;
};
scoreSlider.oninput = () => {
  scoreValue.textContent = scoreSlider.value + " %";
};
