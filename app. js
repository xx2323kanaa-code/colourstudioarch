/* ============================================================
   Colorful Custom Hand AI Project
   app.js  ——  MediaPipe + ARCH 統合版

   田村さん専用：
   - 5Hz 推論
   - 3/5 確定ルール
   - Freeze（2秒）
   - Lock / MiniOpen / Relax
   - Simulation
   - Pen / Phone / Key / Egg / Basic 分類
   - ARCH 手ポーズ切り替え
============================================================ */

let video = document.getElementById("video");
let resultEl = document.getElementById("result");
let statusEl = document.getElementById("status");

let startBtn = document.getElementById("startCameraBtn");

// ====== 手SVG（ARCH） ======
const handRelaxed = document.getElementById("handRelaxed");
const handPen     = document.getElementById("handPen");
const handPhone   = document.getElementById("handPhone");
const handKey     = document.getElementById("handKey");
const handSalute  = document.getElementById("handSalute");

const penFingers   = document.getElementById("penFingers");
const phoneFingers = document.getElementById("phoneFingers");
const keyFingers   = document.getElementById("keyFingers");
const phoneRect    = document.getElementById("phoneRect");

// ====== Simulation Buttons ======
const simNoneBtn   = document.getElementById("simNone");
const simPenBtn    = document.getElementById("simPen");
const simPhoneBtn  = document.getElementById("simPhone");
const simKeyBtn    = document.getElementById("simKey");
const simSaluteBtn = document.getElementById("simSalute");

// ====== Action Buttons ======
const miniOpenBtn  = document.getElementById("miniOpenBtn");
const lockBtn      = document.getElementById("lockBtn");
const relaxBtn     = document.getElementById("relaxBtn");

// ====== Studio-style UI ======
const cameraSelect     = document.getElementById("cameraSelect");
const maxResultsSlider = document.getElementById("maxResults");
const scoreSlider      = document.getElementById("scoreSlider");
const scoreValue       = document.getElementById("scoreValue");
const maxResultsValue  = document.getElementById("maxResultsValue");

let detector = null;

// ====== Camera Handling ======
let currentStream = null;
let deviceIds = {
  front: null,
  back0: null,
  back1: null,
  back2: null,
  back3: null
};

// ====== Processing parameters ======
const FRAME_INTERVAL = 200;   // 5Hz
const FREEZE_MS = 2000;

// 推論履歴（直近5フレーム）
let history = [];
const HISTORY_SIZE = 5;

// freeze管理
let freezeUntil = 0;

// ロック
let lockActive = false;

// ====== 初期化：MediaPipe ObjectDetector をロード ======

async function initDetector() {
  if (detector) return;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.5/wasm"
  );

  detector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/object_detector/object_detector/float16/1/object_detector.tflite"
    },
    maxResults: 1,
    scoreThreshold: 0.15
  });

  statusEl.textContent = "Model loaded.";
}

// ============================================================
// カメラ切替
// ============================================================

async function enumerateCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  let backs = [];

  devices.forEach(d => {
    if (d.kind === "videoinput") {
      if (d.label.toLowerCase().includes("front")) {
        if (!deviceIds.front) deviceIds.front = d.deviceId;
      } else if (d.label.toLowerCase().includes("back")) {
        backs.push(d.deviceId);
      } else {
        backs.push(d.deviceId);
      }
    }
  });

  deviceIds.back0 = backs[0] || null;
  deviceIds.back1 = backs[1] || null;
  deviceIds.back2 = backs[2] || null;
  deviceIds.back3 = backs[3] || null;
}

async function startCamera() {
  try {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
    }

    statusEl.textContent = "Requesting camera...";

    let selected = cameraSelect.value;
    let devId = deviceIds[selected];

    let constraints = devId
      ? { video: { deviceId: { exact: devId } } }
      : { video: true };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;

    statusEl.textContent = "Camera started.";
  } catch (e) {
    statusEl.textContent = "Camera error: " + e;
  }
}

// ============================================================
// ARCH 手の切替
// ============================================================

function activateHand(el) {
  [handRelaxed, handPen, handPhone, handKey, handSalute].forEach(h =>
    h.classList.remove("active")
  );
  el.classList.add("active");
}

function showRelaxed() {
  if (!lockActive) {
    activateHand(handRelaxed);
    resultEl.textContent = "State: RELAXED";
  }
}

function showPen() {
  if (!lockActive) {
    activateHand(handPen);
    resultEl.textContent = "State: PEN";
  }
}

function showPhone() {
  if (!lockActive) {
    activateHand(handPhone);
    resultEl.textContent = "State: PHONE";
  }
}

function showKey() {
  if (!lockActive) {
    activateHand(handKey);
    resultEl.textContent = "State: KEY";
  }
}

function showSalute() {
  activateHand(handSalute);
  resultEl.textContent = "State: SALUTE";
}

// ============================================================
// ロック・MiniOpen・Relax
// ============================================================

lockBtn.addEventListener("click", () => {
  lockActive = true;
  lockBtn.textContent = "Lock (ON)";
  resultEl.textContent += " [LOCKED]";

  if (handPen.classList.contains("active")) penFingers.classList.add("locked-fingers");
  if (handPhone.classList.contains("active")) phoneFingers.classList.add("locked-fingers");
  if (handKey.classList.contains("active")) keyFingers.classList.add("locked-fingers");
  if (handRelaxed.classList.contains("active"))
    handRelaxed.classList.add("relaxed-locked");
});

miniOpenBtn.addEventListener("click", () => {
  if (!lockActive) return;

  penFingers.classList.remove("locked-fingers");
  phoneFingers.classList.remove("locked-fingers");
  keyFingers.classList.remove("locked-fingers");
  handRelaxed.classList.remove("relaxed-locked");
});

relaxBtn.addEventListener("click", () => {
  lockActive = false;
  lockBtn.textContent = "Lock";

  penFingers.classList.remove("locked-fingers");
  phoneFingers.classList.remove("locked-fingers");
  keyFingers.classList.remove("locked-fingers");
  handRelaxed.classList.remove("relaxed-locked");

  showRelaxed();
});

// ============================================================
// シミュレーション
// ============================================================

simNoneBtn.addEventListener("click", () => showRelaxed());
simPenBtn.addEventListener("click", () => showPen());
simPhoneBtn.addEventListener("click", () => showPhone());
simKeyBtn.addEventListener("click", () => showKey());
simSaluteBtn.addEventListener("click", () => showSalute());

// ============================================================
// MediaPipe 推論 → 5クラスへ統合
// ============================================================

function classify(label) {
  label = label.toLowerCase();

  if (label.includes("pen") || label.includes("pencil") || label.includes("scissors") ||
      label.includes("marker") || label.includes("tooth") || label.includes("spoon"))
    return "pen";

  if (label.includes("phone") || label.includes("cell") || label.includes("remote"))
    return "phone";

  if (label.includes("key"))
    return "key";

  if (label.includes("egg") || label.includes("orange"))
    return "egg";

  return "basic";
}

// ============================================================
// 推論ループ（5Hz）
// ============================================================

async function processFrame() {

  let now = performance.now();
  if (now < freezeUntil) {
    setTimeout(processFrame, FRAME_INTERVAL);
    return;
  }

  if (!detector || !video.videoWidth) {
    setTimeout(processFrame, FRAME_INTERVAL);
    return;
  }

  let detections;
  try {
    detections = await detector.detect(video);
  } catch (e) {
    setTimeout(processFrame, FRAME_INTERVAL);
    return;
  }

  let cls = "none";

  if (detections.detections.length > 0) {
    let best = detections.detections[0];
    if (best.categories[0].score * 100 >= scoreSlider.value) {
      cls = classify(best.categories[0].categoryName);
    }
  }

  // push to history
  history.push(cls);
  if (history.length > HISTORY_SIZE) history.shift();

  // 3-of-5 rule
  let counts = {};
  history.forEach(c => {
    counts[c] = (counts[c] || 0) + 1;
  });

  let winner = null;
  for (let k in counts) {
    if (counts[k] >= 3) winner = k;
  }

  if (!lockActive && winner) {
    if (winner === "pen") showPen();
    else if (winner === "phone") showPhone();
    else if (winner === "key") showKey();
    else if (winner === "egg") showRelaxed();
    else if (winner === "basic") showRelaxed();
    freezeUntil = now + FREEZE_MS;
  }

  setTimeout(processFrame, FRAME_INTERVAL);
}

// ============================================================
// Start Camera Button
// ============================================================

startBtn.addEventListener("click", async () => {
  await initDetector();
  await enumerateCameras();
  await startCamera();
  processFrame();
});

// Slider UI
scoreSlider.addEventListener("input", () => {
  scoreValue.textContent = scoreSlider.value + "%";
});
maxResultsSlider.addEventListener("input", () => {
  maxResultsValue.textContent = maxResultsSlider.value;
});
