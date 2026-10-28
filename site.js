/* Shared script: starfield background + "now playing" bar with an optional ambient sound. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Starfield ----------
  var canvas = document.getElementById("stars");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var stars = [], shooting = null, w = 0, h = 0, dpr = 1, last = 0, running = true;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round((w * h) / 4200);
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() < 0.08 ? 1.4 + Math.random() * 0.8 : 0.4 + Math.random() * 0.8,
          a: 0.3 + Math.random() * 0.7, s: 0.2 + Math.random() * 1.2, p: Math.random() * Math.PI * 2,
          tint: Math.random() < 0.15 ? "201,184,255" : (Math.random() < 0.1 ? "242,184,212" : "236,235,245"),
          v: 0.02 + Math.random() * 0.05
        });
      }
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var tw = reduce ? st.a : st.a * (0.55 + 0.45 * Math.sin(t / 1000 * st.s + st.p));
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + st.tint + "," + tw.toFixed(3) + ")";
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
        if (st.r > 1.4) {
          ctx.fillStyle = "rgba(" + st.tint + "," + (tw * 0.15).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (shooting) {
        var sh = shooting, k = (t - sh.t0) / sh.d;
        if (k > 1) { shooting = null; }
        else {
          var x = sh.x + sh.dx * k, y = sh.y + sh.dy * k;
          var g = ctx.createLinearGradient(x, y, x - sh.dx * 0.18, y - sh.dy * 0.18);
          g.addColorStop(0, "rgba(255,255,255," + (1 - k).toFixed(2) + ")");
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.strokeStyle = g; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sh.dx * 0.18, y - sh.dy * 0.18); ctx.stroke();
        }
      }
    }
    function loop(t) {
      if (!running) return;
      var dt = last ? t - last : 16; last = t;
      for (var i = 0; i < stars.length; i++) {
        stars[i].y -= stars[i].v * dt / 16;
        if (stars[i].y < -4) { stars[i].y = h + 4; stars[i].x = Math.random() * w; }
      }
      if (!shooting && Math.random() < 0.0016) {
        shooting = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.4, dx: 240 + Math.random() * 200, dy: 110 + Math.random() * 80, t0: t, d: 900 };
      }
      draw(t);
      requestAnimationFrame(loop);
    }
    window.addEventListener("resize", resize);
    resize();
    if (!reduce) {
      requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", function () {
        running = !document.hidden; last = 0;
        if (running) requestAnimationFrame(loop);
      });
    }
  }

  // ---------- Now playing ----------
  var player = document.getElementById("player");
  if (!player) return;
  var titleEl = player.querySelector(".title");
  var bar = player.querySelector(".progress i");
  var btn = player.querySelector("button");
  var sections = document.querySelectorAll("[data-track]");
  function update() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.width = (pct * 100).toFixed(1) + "%";
    var current = sections[0];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top < window.innerHeight * 0.45) current = sections[i];
    }
    if (current) {
      var t = current.getAttribute("data-track");
      if (titleEl.getAttribute("data-now") !== t) {
        titleEl.setAttribute("data-now", t);
        titleEl.innerHTML = "";
        titleEl.appendChild(document.createTextNode(t + " "));
        var by = document.createElement("span"); by.textContent = "· Anvi Gupta"; titleEl.appendChild(by);
      }
    }
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  // "Midnight Pages": a soft lo-fi loop composed in code (no audio files, nothing downloaded).
  // Chords Fmaj7 - Em7 - Dm7 - Cmaj7 at 72 bpm, with a music-box melody, warm pad, bass,
  // brushed hi-hats and a little vinyl crackle. Starts only when the visitor presses play.
  var audio = null;
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var CHORDS = [
    { root: 41, tones: [53, 57, 60, 64] },  // Fmaj7
    { root: 40, tones: [52, 55, 59, 62] },  // Em7
    { root: 38, tones: [50, 53, 57, 60] },  // Dm7
    { root: 36, tones: [48, 52, 55, 59] }   // Cmaj7
  ];
  // melody: one bar of eighth notes per chord, as indexes into the chord tones (+12 = octave up); -1 = rest
  var MELODY = [
    [3, 12, 14, -1, 13, 12, 3, -1],
    [12, -1, 13, 14, 13, -1, 3, 2],
    [14, 13, 12, -1, 3, -1, 12, 13],
    [12, -1, 3, 2, 3, -1, -1, -1]
  ];
  function buildAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ac = new AC();
    var master = ac.createGain(); master.gain.value = 0;
    var tone = ac.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 3200; // warm, lo-fi top end
    tone.connect(master); master.connect(ac.destination);
    var echo = ac.createDelay(); echo.delayTime.value = 60 / 72 * 0.75;
    var echoFb = ac.createGain(); echoFb.gain.value = 0.32;
    var echoOut = ac.createGain(); echoOut.gain.value = 0.35;
    echo.connect(echoFb); echoFb.connect(echo); echo.connect(echoOut); echoOut.connect(tone);

    // noise buffer for hats and crackle
    var nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // vinyl crackle: sparse clicks over a quiet hiss
    var cb = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate), cd = cb.getChannelData(0);
    for (var j = 0; j < cd.length; j++) cd[j] = (Math.random() * 2 - 1) * 0.012 + (Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.5 : 0);
    var crackle = ac.createBufferSource(); crackle.buffer = cb; crackle.loop = true;
    var cg = ac.createGain(); cg.gain.value = 0.5;
    var chp = ac.createBiquadFilter(); chp.type = "highpass"; chp.frequency.value = 1200;
    crackle.connect(chp); chp.connect(cg); cg.connect(tone); crackle.start();

    function pluck(t, m, vol) {          // music box
      var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = hz(m);
      o2.type = "sine"; o2.frequency.value = hz(m) * 2.01;
      var g2 = ac.createGain(); g2.gain.value = 0.18;
      o.connect(g); o2.connect(g2); g2.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      g.connect(tone); g.connect(echo);
      o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
    }
    function pad(t, notes, dur) {
      var f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; f.connect(tone);
      notes.forEach(function (m, k) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "triangle"; o.frequency.value = hz(m); o.detune.value = (k - 1.5) * 5;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.028, t + 0.8);
        g.gain.setValueAtTime(0.028, t + dur - 0.6);
        g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
        o.connect(g); g.connect(f); o.start(t); o.stop(t + dur + 0.3);
      });
    }
    function bass(t, m, dur) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = hz(m);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(tone); o.start(t); o.stop(t + dur + 0.05);
    }
    function kick(t) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(tone); o.start(t); o.stop(t + 0.32);
    }
    function hat(t, vol) {
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = nb; f.type = "highpass"; f.frequency.value = 7000;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      s.connect(f); f.connect(g); g.connect(tone); s.start(t, Math.random()); s.stop(t + 0.08);
    }

    var beat = 60 / 72, bar = beat * 4, step = beat / 2;
    var state = { next: 0, i: 0, timer: null };
    function schedule() {
      while (state.next < ac.currentTime + 0.4) {
        var t = state.next, i = state.i;
        var barN = Math.floor(i / 8), s8 = i % 8, chord = CHORDS[barN % 4];
        var swing = (s8 % 2) ? step * 0.12 : 0;   // a little lazy swing on the off-beats
        if (s8 === 0) { pad(t, chord.tones, bar); bass(t, chord.root, beat * 1.8); kick(t); }
        if (s8 === 4) { bass(t, chord.root + 7, beat * 1.6); }
        if (s8 === 5 && barN % 2) kick(t + swing);
        hat(t + swing, s8 % 2 ? 0.035 : 0.02);
        if (barN >= 4) {                         // melody enters after the intro
          var n = MELODY[barN % 4][s8];
          if (n >= 0) {
            var m = n >= 12 ? chord.tones[n - 12] + 12 : chord.tones[n];
            pluck(t + swing, m + 12, 0.07 + Math.random() * 0.02);
          }
        }
        state.next += step; state.i++;
      }
    }
    return {
      ac: ac, master: master,
      start: function () {
        state.next = ac.currentTime + 0.1;
        if (!state.timer) state.timer = setInterval(schedule, 100);
        schedule();
      },
      stop: function () { clearInterval(state.timer); state.timer = null; }
    };
  }
  function startAudio() {
    if (!audio) audio = buildAudio();
    if (!audio) return false;
    audio.ac.resume();
    audio.start();
    audio.master.gain.cancelScheduledValues(audio.ac.currentTime);
    audio.master.gain.setTargetAtTime(0.75, audio.ac.currentTime, 0.6);
    return true;
  }
  function stopAudio() {
    if (!audio) return;
    audio.master.gain.cancelScheduledValues(audio.ac.currentTime);
    audio.master.gain.setTargetAtTime(0, audio.ac.currentTime, 0.3);
    var a = audio;
    setTimeout(function () { if (!player.classList.contains("playing")) { a.stop(); a.ac.suspend(); } }, 1500);
  }
  var playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  var pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
  btn.innerHTML = playIcon;
  btn.addEventListener("click", function () {
    var on = !player.classList.contains("playing");
    if (on) { try { startAudio(); } catch (e) {} } else { stopAudio(); }
    player.classList.toggle("playing", on);
    btn.innerHTML = on ? pauseIcon : playIcon;
    btn.setAttribute("aria-label", on ? "Pause ambient sound" : "Play ambient sound");
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
})();
