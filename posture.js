/*
  posture.js
  Yo-Ki-Hi 姿勢分析（4ビュー版）
  - MediaPipe Pose Landmarker（ブラウザ完結のオンデバイスAI）で骨格33点を検出
  - 正面 / 背面 / 側面左 / 側面右 の4方向の写真をアップして、ビュー別に指標を算出
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
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

const RAD = 180 / Math.PI;
const VIEWS = ["front", "back", "left", "right"];
const VIEW_LABELS = { front: "正面", back: "背面", left: "側面左", right: "側面右" };

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

// ------- helpers ----------
function tilt(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x) * RAD;
}
function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function innerAngle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (mag === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / mag));
  return Math.acos(cos) * RAD;
}
function classify(value, warn) {
  return Math.abs(value) >= warn ? "warn" : "ok";
}
function round(v) { return Math.round(v * 10) / 10; }

// ------- view-specific metrics ----------
function computeMetrics(lm, view) {
  if (view === "front" || view === "back") {
    const lSh = lm[LM.LEFT_SHOULDER];
    const rSh = lm[LM.RIGHT_SHOULDER];
    const lHip = lm[LM.LEFT_HIP];
    const rHip = lm[LM.RIGHT_HIP];
    const lEar = lm[LM.LEFT_EAR];
    const rEar = lm[LM.RIGHT_EAR];

    // 正面像では左右が画像と反転している → 符号調整で
    // 「正の値 = 患者の右側が下がっている」に統一
    const sign = view === "front" ? -1 : 1;
    const shoulderTilt = sign * tilt(lSh, rSh);
    const pelvicTilt = sign * tilt(lHip, rHip);
    const headTilt = sign * tilt(lEar, rEar);

    const midSh = midpoint(lSh, rSh);
    const midHip = midpoint(lHip, rHip);
    const shoulderWidth = Math.hypot(rSh.x - lSh.x, rSh.y - lSh.y) || 1;
    const lateralShift = sign * ((midSh.x - midHip.x) / shoulderWidth) * 100;

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
      { key: "lateral_shift", label: "上半身の左右シフト", value: round(lateralShift), unit: "%",
        hint: lateralShift > 0 ? "右へシフト" : "左へシフト",
        severity: classify(lateralShift, 5) },
    ];
  }

  // 側面（左 / 右）
  const isLeft = view === "left";
  const ear = isLeft ? lm[LM.LEFT_EAR] : lm[LM.RIGHT_EAR];
  const sh = isLeft ? lm[LM.LEFT_SHOULDER] : lm[LM.RIGHT_SHOULDER];
  const hip = isLeft ? lm[LM.LEFT_HIP] : lm[LM.RIGHT_HIP];
  const knee = isLeft ? lm[LM.LEFT_KNEE] : lm[LM.RIGHT_KNEE];
  const ankle = isLeft ? lm[LM.LEFT_ANKLE] : lm[LM.RIGHT_ANKLE];

  const torsoHeight = Math.abs(hip.y - sh.y) || 1;
  // 左面ビューは患者左がカメラ側 → 前方は -x。右面は +x。
  const facingSign = isLeft ? -1 : 1;
  const fhpRatio = ((ear.x - sh.x) * facingSign) / torsoHeight * 100;
  const shoulderForward = ((sh.x - hip.x) * facingSign) / torsoHeight * 100;
  const trunkAngle = Math.atan2(sh.x - hip.x, hip.y - sh.y) * RAD;
  const trunkAdjusted = trunkAngle * facingSign;
  const kneeAngle = innerAngle(hip, knee, ankle);

  return [
    { key: "forward_head", label: "頭部前方位 (FHP)", value: round(fhpRatio), unit: "%",
      hint: fhpRatio > 0 ? "頭が前方" : "頭が後方",
      severity: classify(fhpRatio, 10) },
    { key: "shoulder_forward", label: "肩の前方変位", value: round(shoulderForward), unit: "%",
      hint: shoulderForward > 0 ? "肩が前方（巻き肩傾向）" : "肩が後方",
      severity: classify(shoulderForward, 8) },
    { key: "trunk_lean", label: "体幹の前後傾", value: round(trunkAdjusted), unit: "°",
      hint: trunkAdjusted > 0 ? "前傾" : "後傾",
      severity: classify(trunkAdjusted, 5) },
    { key: "knee_angle", label: "膝の角度", value: round(kneeAngle), unit: "°",
      hint: kneeAngle >= 178 ? "過伸展傾向" : kneeAngle >= 170 ? "正常範囲" : "屈曲位",
      severity: kneeAngle >= 178 || kneeAngle < 165 ? "warn" : "ok" },
  ];
}

// ------- canvas drawing ---------
function drawPoseOnCanvas(canvas, image, landmarks, view) {
  const ctx = canvas.getContext("2d");
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, 0, 0, w, h);

  if (!landmarks) return;

  const px = (lm) => ({ x: lm.x * w, y: lm.y * h });

  const isFront = view === "front" || view === "back";
  const skeleton = isFront
    ? [
        [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
        [LM.LEFT_HIP, LM.RIGHT_HIP],
        [LM.LEFT_SHOULDER, LM.LEFT_HIP],
        [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
        [LM.LEFT_EAR, LM.RIGHT_EAR],
      ]
    : [
        [view === "left" ? LM.LEFT_EAR : LM.RIGHT_EAR,
         view === "left" ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER],
        [view === "left" ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER,
         view === "left" ? LM.LEFT_HIP : LM.RIGHT_HIP],
        [view === "left" ? LM.LEFT_HIP : LM.RIGHT_HIP,
         view === "left" ? LM.LEFT_KNEE : LM.RIGHT_KNEE],
        [view === "left" ? LM.LEFT_KNEE : LM.RIGHT_KNEE,
         view === "left" ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE],
      ];

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

  // 正面・背面 → 肩線をアクセント色、骨盤線をゴールドで
  if (isFront) {
    ctx.strokeStyle = "rgba(141, 79, 63, 0.95)";
    ctx.lineWidth = Math.max(4, w / 240);
    const ls = px(landmarks[LM.LEFT_SHOULDER]);
    const rs = px(landmarks[LM.RIGHT_SHOULDER]);
    ctx.beginPath(); ctx.moveTo(ls.x, ls.y); ctx.lineTo(rs.x, rs.y); ctx.stroke();
    ctx.strokeStyle = "rgba(133, 98, 42, 0.95)";
    const lh = px(landmarks[LM.LEFT_HIP]);
    const rh = px(landmarks[LM.RIGHT_HIP]);
    ctx.beginPath(); ctx.moveTo(lh.x, lh.y); ctx.lineTo(rh.x, rh.y); ctx.stroke();
  }

  // joints
  const dots = isFront
    ? [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_EAR, LM.RIGHT_EAR, LM.NOSE]
    : (view === "left"
        ? [LM.LEFT_EAR, LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE]
        : [LM.RIGHT_EAR, LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE]);
  ctx.fillStyle = "#fff7f2";
  for (const idx of dots) {
    const p = px(landmarks[idx]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(4, w / 220), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------- UI ---------
const state = Object.fromEntries(VIEWS.map((v) => [v, { metrics: null, image: null }]));
state.warmedUp = false;

const els = {
  status: document.getElementById("status-text"),
  statusDot: document.querySelector(".status-dot"),
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

async function processSlot(slot, file) {
  if (!file) return;
  setStatus(`${VIEW_LABELS[slot]} の写真を読み込み中…`, "loading");

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

  setStatus(`${VIEW_LABELS[slot]} の骨格を検出しています…`, "loading");

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
    setStatus(`${VIEW_LABELS[slot]} の写真から骨格を検出できませんでした。全身が映っているか確認してください。`, "error");
    URL.revokeObjectURL(imgUrl);
    return;
  }

  const empty = document.querySelector(`[data-empty="${slot}"]`);
  const wrap = document.querySelector(`[data-canvas-wrap="${slot}"]`);
  const canvas = document.querySelector(`[data-canvas="${slot}"]`);
  empty.hidden = true;
  wrap.hidden = false;
  drawPoseOnCanvas(canvas, img, detection, slot);

  const metrics = computeMetrics(detection, slot);
  renderMetricList(slot, metrics);
  state[slot] = { metrics, image: img };

  URL.revokeObjectURL(imgUrl);

  // 進捗を表示
  const filled = VIEWS.filter((v) => state[v].metrics).length;
  if (filled === VIEWS.length) {
    setStatus("4 方向すべての計測完了。レポート印刷でその場でお渡しできます。", "ok");
    els.printBtn.disabled = false;
  } else {
    const remaining = VIEWS.filter((v) => !state[v].metrics).map((v) => VIEW_LABELS[v]).join("・");
    setStatus(`${VIEW_LABELS[slot]} の計測完了（${filled}/${VIEWS.length}）。続けて ${remaining} の写真もアップしてください。`, "ok");
    els.printBtn.disabled = filled === 0;
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
  for (const v of VIEWS) {
    state[v] = { metrics: null, image: null };
    const empty = document.querySelector(`[data-empty="${v}"]`);
    const wrap = document.querySelector(`[data-canvas-wrap="${v}"]`);
    const list = document.querySelector(`[data-metrics="${v}"]`);
    const input = document.querySelector(`[data-upload="${v}"]`);
    empty.hidden = false;
    wrap.hidden = true;
    list.hidden = true;
    list.innerHTML = "";
    input.value = "";
  }
  els.printBtn.disabled = true;
  setStatus("クリアしました。新しい写真をアップロードしてください。", "idle");
}

// ------- init ---------
VIEWS.forEach(bindUpload);
els.resetBtn.addEventListener("click", reset);
els.printBtn.addEventListener("click", () => window.print());
