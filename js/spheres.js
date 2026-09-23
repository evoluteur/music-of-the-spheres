/* Music of the Spheres: a top-down orrery where every planet sings a tone
   that follows its angular speed around the Sun, as Kepler imagined in
   Harmonices Mundi (1619). Faster near perihelion means higher; slower near
   aphelion, lower. Plain JS and Web Audio, no dependencies.
   Data: spheres-data.js. */

const $ = (id) => document.getElementById(id);

const SPEEDS = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "1 week" },
  { days: 15, label: "2 weeks" },
  { days: 30, label: "1 month" },
  { days: 91, label: "3 months" },
  { days: 365.25, label: "1 year" },
  { days: 1826, label: "5 years" },
  { days: 7305, label: "20 years" },
];
const VOICES = [
  { id: "pure", label: "Pure" },
  { id: "organ", label: "Organ" },
  { id: "soft", label: "Soft" },
];
const SCALES = [
  { id: "sqrt", label: "Compressed" },
  { id: "linear", label: "True scale" },
];

const DEFAULTS = {
  speed: 4, // index into SPEEDS, per second
  voice: "organ",
  volume: 50,
  scale: "sqrt",
  labels: true,
  apsides: false,
  on: { mercury: true, venus: true, earth: true, mars: true, jupiter: true, saturn: true, uranus: false, neptune: false },
};
let S = JSON.parse(JSON.stringify(DEFAULTS));
try {
  const saved = JSON.parse(localStorage.getItem("spheres-settings") || "{}");
  Object.assign(S, saved, { on: { ...DEFAULTS.on, ...(saved.on || {}) } });
} catch (e) {}
const save = () => {
  try {
    localStorage.setItem("spheres-settings", JSON.stringify(S));
  } catch (e) {}
};

const D2R = Math.PI / 180;
const J2000 = Date.UTC(2000, 0, 1, 12);
const DAY = 86400000;
const YEAR_DAYS = 365.25;

// ---------------------------------------------------------------- orbits

const solveKepler = (M, e) => {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
};

// Position and song of a planet at a date (ms since the epoch)
const stateAt = (p, t) => {
  const years = (t - J2000) / DAY / YEAR_DAYS;
  const M = ((p.L0 - p.peri + (360 * years) / p.P) % 360) * D2R;
  const E = solveKepler(M, p.e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
  const r = p.a * (1 - p.e * Math.cos(E));
  const lon = nu + p.peri * D2R;
  // angular speed relative to its geometric mean between aphelion and perihelion
  const k = (1 + p.e * Math.cos(nu)) ** 2 / (1 - p.e * p.e);
  return { r, lon, nu, k, f: p.note * k };
};
const ratioOf = (p) => ((1 + p.e) / (1 - p.e)) ** 2; // fastest / slowest

const nearestInterval = (x) => {
  let best = INTERVALS[0], err = Infinity;
  INTERVALS.forEach((iv) => {
    const cents = Math.abs(1200 * Math.log2(x / (iv[0] / iv[1])));
    if (cents < err) {
      err = cents;
      best = iv;
    }
  });
  return { iv: best, cents: err };
};

const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const noteName = (f) => {
  const m = 69 + 12 * Math.log2(f / 440);
  const k = Math.round(m);
  const cents = Math.round((m - k) * 100);
  const name = NOTE_NAMES[((k % 12) + 12) % 12] + (Math.floor(k / 12) - 1);
  return { name, cents };
};

// ---------------------------------------------------------------- drawing

const active = () => PLANETS.filter((p) => S.on[p.id]);
const VIEW = 300;
let scaleR = (r) => r;

const setScale = () => {
  const list = active();
  const maxA = Math.max(...(list.length ? list : PLANETS.slice(0, 6)).map((p) => p.a * (1 + p.e)));
  const inner = 22; // keep the Sun visible
  if (S.scale === "linear") {
    scaleR = (r) => inner * 0.4 + (r / maxA) * (VIEW - 26 - inner * 0.4);
  } else {
    scaleR = (r) => inner + (Math.sqrt(r) / Math.sqrt(maxA)) * (VIEW - 26 - inner);
  }
};
const xy = (r, lon) => [scaleR(r) * Math.cos(lon), -scaleR(r) * Math.sin(lon)];

const orbitPath = (p) => {
  let d = "";
  for (let i = 0; i <= 180; i++) {
    const nu = (i / 180) * 2 * Math.PI;
    const r = (p.a * (1 - p.e * p.e)) / (1 + p.e * Math.cos(nu));
    const [x, y] = xy(r, nu + p.peri * D2R);
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + "Z";
};

const staticSVG = () => {
  setScale();
  const V = VIEW;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-V} ${-V} ${2 * V} ${2 * V}" class="plain" role="img" aria-label="Orrery of the planets">`;
  o += `<defs><radialGradient id="sun"><stop offset="0" stop-color="#fff6c8"/><stop offset="0.45" stop-color="#ffc940"/><stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/></radialGradient>`;
  o += `<radialGradient id="halo"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  o += `<rect x="${-V}" y="${-V}" width="${2 * V}" height="${2 * V}" fill="#0b0e1a"/>`;
  // a few fixed stars
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    o += `<circle cx="${(rnd() * 2 - 1) * V}" cy="${(rnd() * 2 - 1) * V}" r="${(rnd() * 0.9 + 0.2).toFixed(2)}" fill="#fff" opacity="${(rnd() * 0.5 + 0.15).toFixed(2)}"/>`;
  }
  active().forEach((p) => {
    o += `<path d="${orbitPath(p)}" fill="none" stroke="${p.color}" stroke-opacity="0.35" stroke-width="1"/>`;
    if (S.apsides) {
      const rp = p.a * (1 - p.e), ra = p.a * (1 + p.e);
      const [px, py] = xy(rp, p.peri * D2R);
      const [ax, ay] = xy(ra, p.peri * D2R + Math.PI);
      o += `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="${p.color}" stroke-opacity="0.25" stroke-dasharray="2 3"/>`;
      o += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2" fill="${p.color}"/>`;
      o += `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2" fill="none" stroke="${p.color}"/>`;
    }
  });
  o += `<circle r="20" fill="url(#sun)"/><circle r="7" fill="#ffe27a"/>`;
  active().forEach((p) => {
    o += `<g id="pl-${p.id}">`;
    o += `<circle class="halo" r="${p.size * 2.6}" fill="url(#halo)" opacity="0.4"/>`;
    o += `<circle r="${p.size}" fill="${p.color}"/>`;
    if (S.labels) {
      o += `<text x="${p.size + 4}" y="4" font-size="11" fill="#e8e6f0" font-family="Georgia, serif">${p.name}</text>`;
    }
    o += `</g>`;
  });
  return o + "</svg>";
};

// ---------------------------------------------------------------- audio

let ctx = null, master = null;
const voices = {}; // planet id -> { osc, gain }

const makeWave = (kind) => {
  if (kind === "organ") {
    // fundamental plus a few soft octaves and a fifth, like a flue stop
    const re = new Float32Array([0, 1, 0.5, 0.18, 0.25, 0.06, 0.08, 0, 0.05]);
    return ctx.createPeriodicWave(re.map(() => 0), re);
  }
  return null;
};

const startAudio = () => {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4000;
    master.connect(lp).connect(comp).connect(ctx.destination);
  }
  ctx.resume();
  master.gain.setTargetAtTime((S.volume / 100) * 0.9, ctx.currentTime, 0.3);
  syncVoices();
};
const stopAudio = () => {
  if (!ctx) return;
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
};

const syncVoices = () => {
  if (!ctx) return;
  const list = active();
  // drop voices for planets turned off, or all of them when the timbre changes
  Object.keys(voices).forEach((id) => {
    const v = voices[id];
    if (!S.on[id] || v.voice !== S.voice) {
      v.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      v.osc.stop(ctx.currentTime + 0.4);
      delete voices[id];
    }
  });
  list.forEach((p) => {
    if (voices[p.id]) return;
    const osc = ctx.createOscillator();
    const wave = makeWave(S.voice);
    if (wave) osc.setPeriodicWave(wave);
    else osc.type = S.voice === "soft" ? "triangle" : "sine";
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(master);
    osc.frequency.value = stateAt(p, now).f;
    osc.start();
    voices[p.id] = { osc, gain, voice: S.voice };
  });
  // quieter per voice as the chord grows, and a little quieter up high
  Object.entries(voices).forEach(([id, v]) => {
    const p = PLANETS.find((q) => q.id === id);
    const g = (0.5 / Math.sqrt(Math.max(1, list.length))) * Math.pow(220 / p.note, 0.35);
    v.gain.gain.setTargetAtTime(g, ctx.currentTime, 0.2);
  });
};

// ---------------------------------------------------------------- animation

let now = Date.now();
let running = true;
let soundOn = false;
let lastFrame = null;

const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

const frame = (ts) => {
  if (lastFrame != null && running) {
    const dt = Math.min(0.1, (ts - lastFrame) / 1000);
    now += dt * SPEEDS[S.speed].days * DAY;
  }
  lastFrame = ts;
  update();
  requestAnimationFrame(frame);
};

const update = () => {
  $("date").textContent = dateFmt.format(new Date(now));
  active().forEach((p) => {
    const st = stateAt(p, now);
    const g = document.getElementById("pl-" + p.id);
    if (g) {
      const [x, y] = xy(st.r, st.lon);
      g.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      // brighter halo when the planet is fast
      const kMin = (1 - p.e) ** 2 / (1 - p.e * p.e), kMax = (1 + p.e) ** 2 / (1 - p.e * p.e);
      const t = kMax > kMin ? (st.k - kMin) / (kMax - kMin) : 0.5;
      g.firstChild.setAttribute("opacity", (0.2 + 0.6 * t).toFixed(2));
    }
    const row = document.getElementById("vo-" + p.id);
    if (row) {
      const n = noteName(st.f);
      row.querySelector(".hz").textContent = st.f.toFixed(1) + " Hz";
      row.querySelector(".nn").textContent = n.name + (n.cents ? ` ${n.cents > 0 ? "+" : "−"}${Math.abs(n.cents)}¢` : "");
      const kMin = (1 - p.e) ** 2 / (1 - p.e * p.e), kMax = (1 + p.e) ** 2 / (1 - p.e * p.e);
      const t = kMax > kMin ? (st.k - kMin) / (kMax - kMin) : 0.5;
      row.querySelector(".bar i").style.left = (t * 100).toFixed(1) + "%";
    }
    if (soundOn && voices[p.id]) {
      voices[p.id].osc.frequency.setTargetAtTime(st.f, ctx.currentTime, 0.04);
    }
  });
};

// ---------------------------------------------------------------- UI

const setPressed = (id, items, cur) => {
  document.querySelectorAll(`#${id} button`).forEach((b, i) => {
    const on = items[i].id === cur;
    b.className = on ? "selected" : "";
    b.setAttribute("aria-pressed", on);
  });
};

const renderStatic = () => {
  $("orrery").innerHTML = staticSVG();
  setPressed("voice-chips", VOICES, S.voice);
  setPressed("scale-chips", SCALES, S.scale);
  $("speed-val").textContent = SPEEDS[S.speed].label + " per second";
  $("volume-val").textContent = S.volume + "%";
  document.querySelectorAll("#planet-chips button").forEach((b) => {
    const on = !!S.on[b.dataset.id];
    b.className = on ? "selected" : "";
    b.setAttribute("aria-pressed", on);
  });
  $("voices").innerHTML = active()
    .map(
      (p) => `<div class="voice" id="vo-${p.id}">
        <span class="dot" style="background:${p.color}"></span>
        <span class="pn">${p.name}</span>
        <span class="nn"></span><span class="hz"></span>
        <span class="bar" title="Slowest (aphelion) to fastest (perihelion)"><i style="background:${p.color}"></i></span>
      </div>`
    )
    .join("") || `<p class="note">Turn on a planet to hear it.</p>`;
  update();
};

const tableHTML = () =>
  PLANETS.map((p) => {
    const x = ratioOf(p);
    const near = nearestInterval(x);
    const kep = p.kepler ? `${p.kepler[0]}:${p.kepler[1]}, ${p.keplerName}` : `<span class="dimmed">${p.keplerName}</span>`;
    return `<tr><td><span class="dot" style="background:${p.color}"></span> ${p.name}</td>
      <td>${p.e.toFixed(4)}</td>
      <td>${x.toFixed(3)}</td>
      <td>${near.iv[0]}:${near.iv[1]}, ${near.iv[2]} <span class="dimmed">(${near.cents < 1 ? "exact" : (1200 * Math.log2(x / (near.iv[0] / near.iv[1])) > 0 ? "+" : "−") + Math.round(near.cents) + "¢"})</span></td>
      <td>${kep}</td></tr>`;
  }).join("");

const setSound = (on) => {
  soundOn = on;
  const b = $("sound");
  b.textContent = on ? "Silence" : "Listen";
  b.setAttribute("aria-pressed", on);
  if (on) startAudio();
  else stopAudio();
};
const setRunning = (on) => {
  running = on;
  $("pause").textContent = on ? "Pause" : "Play";
};

const initSpheres = () => {
  if (!(S.speed >= 0 && S.speed < SPEEDS.length)) S.speed = DEFAULTS.speed;
  if (!VOICES.some((v) => v.id === S.voice)) S.voice = DEFAULTS.voice;

  const pc = $("planet-chips");
  PLANETS.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.id = p.id;
    b.innerHTML = `<span class="dot" style="background:${p.color}"></span>${p.name}`;
    b.onclick = () => {
      S.on[p.id] = !S.on[p.id];
      save();
      renderStatic();
      syncVoices();
    };
    pc.appendChild(b);
  });
  const chips = (id, items, pick) => {
    const box = $(id);
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = it.label;
      b.onclick = () => pick(it);
      box.appendChild(b);
    });
  };
  chips("voice-chips", VOICES, (v) => { S.voice = v.id; save(); renderStatic(); syncVoices(); });
  chips("scale-chips", SCALES, (s) => { S.scale = s.id; save(); renderStatic(); });

  const sp = $("speed");
  sp.max = SPEEDS.length - 1;
  sp.value = S.speed;
  sp.oninput = () => { S.speed = +sp.value; save(); $("speed-val").textContent = SPEEDS[S.speed].label + " per second"; };
  const vol = $("volume");
  vol.value = S.volume;
  vol.oninput = () => {
    S.volume = +vol.value;
    save();
    $("volume-val").textContent = S.volume + "%";
    if (soundOn) master.gain.setTargetAtTime((S.volume / 100) * 0.9, ctx.currentTime, 0.1);
  };
  ["labels", "apsides"].forEach((k) => {
    const el = $("l-" + k);
    el.checked = !!S[k];
    el.onchange = () => { S[k] = el.checked; save(); renderStatic(); };
  });
  $("sound").onclick = () => setSound(!soundOn);
  $("pause").onclick = () => setRunning(!running);
  $("today").onclick = () => { now = Date.now(); update(); };
  $("kepler-body").innerHTML = tableHTML();

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) setRunning(false);
  renderStatic();
  requestAnimationFrame(frame);
};
