/*
  posture.js
  Yo-Ki-Hi 姿勢分析（β）
  - MediaPipe Pose Landmarker（ブラウザ完結のオンデバイスAI）で骨格33点を検出
  - Before/After の正面写真をアップして、肩・骨盤・頭部の傾き＋上半身シフトを比較
  - 写真は外部送信しない
*/

import {
  FilesetResolver,
  PoseLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

const LM = {
  NOSE: 0,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_HIP: 23, RIGHT_HIP: 24,
};

const RAD = 180 / Math.PI;

let landmarkerPromise = null;
async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });
    })();
  }
  return landmarkerPromise;
}

// ------- metrics ----------
function tilt(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x) * RAD;
}
function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function classify(value, warn) {
  return Math.abs(value) >= warn ? "warn" : "ok";
}
function round(v) {
  return Math.round(v * 10) / 10;
}

function computeFrontMetrics(lm) {
  const lSh = lm[LM.LEFT_SHOULDER];
  const rSh = lm[LM.RIGHT_SHOULDER];
  const lHip = lm[LM.LEFT_HIP];
  const rHip = lm[LM.RIGHT_HIP];
  const lEar = lm[LM.LEFT_EAR];
  const rEar = lm[LM.RIGHT_EAR];

  // 正面像では画像の左に被写体の右肩が映る → 符号を反転して
  // 「正の値 = 患者の右側が下がっている」という統一表現にする
  const shoulderTilt = -tilt(lSh, rSh);
  const pelvicTilt = -tilt(lHip, rHip);
  const headTilt = -tilt(lEar, rEar);

  const midSh = midpoint(lSh, rSh);
  const midHip = midpoint(lHip, rHip);
  const shoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y) || 1;
  const lateralShift = -((midSh.x - midHip.x) / shoulderWidth) * 100;

  return [
    { key: "shoulder_tilt", label: "肩の傾き", value: round(shoulderTilt), unit: "°",
      hint: shoulderTilt > 0 ? "右肩が下がり" : "左肩が下がり",
      severity: classify(shoulderTilt, 2) },
    { key: "pelvic_tilt", label: "骨盤の傾き", value: round(pelvicTilt), unit: "°",
      hint: pelvicTilt > 0 ? "右骨盤が下がり" : "左骨盤が下がり",
      severity: classify(pelvicTilt, 2) },
    { key: "head_tilt", label: "頭部の傾き", value: round(headTilt), unit: "°",
      hint: headTilt > 0 ? "右側へ傾斜" : "左側へ傾斜",
      severity: classify(headTilt, 3) },
    { key: "lateral_shift", label: "上半身の左右シフト", value: round(lateralShift), unit: "% (肩幅比)",
      hint: lateralShift > 0 ? "右へシフト" : "左へシフト",
      severity: classify(lateralShift, 5) },
  ];
}

// ------- canvas drawing ---------
function drawPoseOnCanvas(canvas, image, landmarks) {
  const ctx = canvas.getContext("2d");
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, 0, 0, w, h);

  if (!landmarks) return;

  const px = (lm) => ({ x: lm.x * w, y: lm.y * h });

  const skeleton = [
    [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
    [LM.LEFT_HIP, LM.RIGHT_HIP],
    [LM.LEFT_SHOULDER, LM.LEFT_HIP],
    [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
    [LM.LEFT_EAR, LM.RIGHT_EAR],
  ];

  // base bone color
  ctx.strokeStyle = "rgba(255, 247, 242, 0.85)";
  ctx.lineWidth = Math.max(3, w / 320);
  ctx.lineCap = "round";

  for (const [a, b] of skeleton) {
    const p1 = px(landmarks[a]);
    const p2 = px(landmarks[b]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // shoulder line — accent
  ctx.strokeStyle = "rgba(141, 79, 63, 0.95)";
  ctx.lineWidth = Math.max(4, w / 240);
  const ls = px(landmarks[LM.LEFT_SHOULDER]);
  const rs = px(landmarks[LM.RIGHT_SHOULDER]);
  ctx.beginPath(); ctx.moveTo(ls.x, ls.y); ctx.lineTo(rs.x, rs.y); ctx.stroke();

  // hip line — gold
  ctx.strokeStyle = "rgba(182, 141, 73, 0.95)";
  const lh = px(landmarks[LM.LEFT_HIP]);
  const rh = px(landmarks[LM.RIGHT_HIP]);
  ctx.beginPath(); ctx.moveTo(lh.x, lh.y); ctx.lineTo(rh.x, rh.y); ctx.stroke();

  // joints
  const dots = [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_HIP, LM.RIGHT_HIP,
    LM.LEFT_EAR, LM.RIGHT_EAR, LM.NOSE,
  ];
  ctx.fillStyle = "#fff7f2";
  for (const idx of dots) {
    const p = px(landmarks[idx]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(4, w / 220), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------- UI ---------
const state = {
  before: { metrics: null, image: null },
  after: { metrics: null, image: null },
  warmedUp: false,
};

const els = {
  status: document.getElementById("status-text"),
  statusDot: document.querySelector(".status-dot"),
  comparisonSection: document.getElementById("comparison"),
  comparisonGrid: document.getElementById("comparison-grid"),
  printBtn: document.getElementById("print-btn"),
  resetBtn: document.getElementById("reset-btn"),
};

function setStatus(text, mode = "idle") {
  els.status.textContent = text;
  els.statusDot.dataset.state = mode;
}

function severityFlag(severity) {
  return severity === "warn" ? "!" : "○";
}

function renderMetricList(slot, metrics) {
  const list = document.querySelector(`[data-metrics="${slot}"]`);
  list.hidden = false;
  list.innerHTML = "";
  for (const m of metrics) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="m-label">${m.label}</span>
      <span class="m-value">${m.value > 0 ? "+" : ""}${m.value}${m.unit}</span>
      <span class="m-flag" data-severity="${m.severity}" aria-label="${m.severity === "warn" ? "要観察" : "良好"}">${severityFlag(m.severity)}</span>
      <span class="m-hint">${m.hint}（${m.severity === "warn" ? "要観察" : "良好"}）</span>
    `;
    list.appendChild(li);
  }
}

function fmtValue(v, unit) {
  return `${v > 0 ? "+" : ""}${v}${unit}`;
}

function renderComparison() {
  if (!state.before.metrics || !state.after.metrics) {
    els.comparisonSection.hidden = true;
    return;
  }
  els.comparisonSection.hidden = false;
  els.comparisonGrid.innerHTML = "";

  const byKey = (arr, key) => arr.find((m) => m.key === key);

  for (const m of state.before.metrics) {
    const after = byKey(state.after.metrics, m.key);
    if (!after) continue;
    const beforeAbs = Math.abs(m.value);
    const afterAbs = Math.abs(after.value);
    const delta = round(afterAbs - beforeAbs); // 負ならゼロに近づいた = 改善
    const improved = delta < -0.05;
    const worsened = delta > 0.05;

    const cls = improved ? "is-improved" : worsened ? "is-worsened" : "";
    const verdict = improved
      ? `<strong>改善</strong>：絶対値が ${Math.abs(delta)}${m.unit.replace(/^\(.*?\)/, "").trim() || ""} 減少`
      : worsened
        ? `<strong>増加</strong>：絶対値が ${Math.abs(delta)}${m.unit.replace(/^\(.*?\)/, "").trim() || ""} 拡大`
        : `<strong>変化なし</strong>：差分 ${Math.abs(delta)}${m.unit.replace(/^\(.*?\)/, "").trim() || ""}`;

    const div = document.createElement("div");
    div.className = `compare-row ${cls}`.trim();
    div.innerHTML = `
      <p class="c-label">${m.label}</p>
      <div class="c-row">
        <span class="c-before">${fmtValue(m.value, m.unit)}</span>
        <span class="c-arrow" aria-hidden="true"></span>
        <span class="c-after">${fmtValue(after.value, after.unit)}</span>
      </div>
      <p class="c-delta">${verdict}</p>
    `;
    els.comparisonGrid.appendChild(div);
  }

  els.printBtn.disabled = false;
}

async function processSlot(slot, file) {
  if (!file) return;
  setStatus(`${slot === "before" ? "Before" : "After"} の写真を読み込み中…`, "loading");

  // load to image element
  const imgUrl = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imgUrl;
  });

  if (!state.warmedUp) {
    setStatus("姿勢検出モデルを初期化しています（初回のみ少し時間がかかります）…", "loading");
    try {
      await getLandmarker();
      state.warmedUp = true;
    } catch (e) {
      console.error(e);
      setStatus("モデルの読み込みに失敗しました。ネットワーク接続をご確認ください。", "error");
      URL.revokeObjectURL(imgUrl);
      return;
    }
  }

  setStatus("骨格を検出しています…", "loading");

  let detection = null;
  try {
    const detector = await getLandmarker();
    const result = detector.detect(img);
    if (result.landmarks && result.landmarks.length > 0) {
      detection = result.landmarks[0];
    }
  } catch (e) {
    console.error(e);
    setStatus("検出処理中にエラーが発生しました。別の写真でお試しください。", "error");
    URL.revokeObjectURL(imgUrl);
    return;
  }

  if (!detection) {
    setStatus(`${slot === "before" ? "Before" : "After"} の写真から骨格を検出できませんでした。全身が映っているか確認してください。`, "error");
    URL.revokeObjectURL(imgUrl);
    return;
  }

  // show canvas and draw
  const empty = document.querySelector(`[data-empty="${slot}"]`);
  const wrap = document.querySelector(`[data-canvas-wrap="${slot}"]`);
  const canvas = document.querySelector(`[data-canvas="${slot}"]`);
  empty.hidden = true;
  wrap.hidden = false;
  drawPoseOnCanvas(canvas, img, detection);

  const metrics = computeFrontMetrics(detection);
  renderMetricList(slot, metrics);
  state[slot] = { metrics, image: img };

  URL.revokeObjectURL(imgUrl);

  if (state.before.metrics && state.after.metrics) {
    setStatus("計測完了。Before / After の比較が下部に表示されています。", "ok");
    renderComparison();
  } else {
    const next = slot === "before" ? "After" : "Before";
    setStatus(`${slot === "before" ? "Before" : "After"} の計測完了。続けて ${next} の写真もアップロードしてください。`, "ok");
  }
}

function bindUpload(slot) {
  const input = document.querySelector(`[data-upload="${slot}"]`);
  const empty = document.querySelector(`[data-empty="${slot}"]`);
  const label = input.closest("label");

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) processSlot(slot, file);
  });

  // drag & drop
  ["dragenter", "dragover"].forEach((ev) => {
    label.addEventListener(ev, (e) => { e.preventDefault(); empty.classList.add("is-drag"); });
  });
  ["dragleave", "drop"].forEach((ev) => {
    label.addEventListener(ev, (e) => { e.preventDefault(); empty.classList.remove("is-drag"); });
  });
  label.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) processSlot(slot, file);
  });
}

function reset() {
  state.before = { metrics: null, image: null };
  state.after = { metrics: null, image: null };
  ["before", "after"].forEach((slot) => {
    const empty = document.querySelector(`[data-empty="${slot}"]`);
    const wrap = document.querySelector(`[data-canvas-wrap="${slot}"]`);
    const list = document.querySelector(`[data-metrics="${slot}"]`);
    const input = document.querySelector(`[data-upload="${slot}"]`);
    empty.hidden = false;
    wrap.hidden = true;
    list.hidden = true;
    list.innerHTML = "";
    input.value = "";
  });
  els.comparisonSection.hidden = true;
  els.comparisonGrid.innerHTML = "";
  els.printBtn.disabled = true;
  setStatus("クリアしました。新しい写真をアップロードしてください。", "idle");
}

// ------- init ---------
bindUpload("before");
bindUpload("after");
els.resetBtn.addEventListener("click", reset);
els.printBtn.addEventListener("click", () => window.print());
