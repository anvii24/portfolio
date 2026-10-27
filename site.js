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

  // Ambient pad, made in the browser (no audio files). Starts only when the visitor presses play.
  var audio = null;
  function startAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!audio) {
      var ac = new AC();
      var master = ac.createGain(); master.gain.value = 0;
      var filter = ac.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 900;
      var delay = ac.createDelay(); delay.delayTime.value = 0.45;
      var fb = ac.createGain(); fb.gain.value = 0.35;
      filter.connect(master); filter.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
      master.connect(ac.destination);
      // A soft Fmaj9 chord, slowly breathing
      [174.61, 220.0, 261.63, 329.63, 392.0].forEach(function (f, i) {
        var o = ac.createOscillator(); o.type = i % 2 ? "sine" : "triangle"; o.frequency.value = f;
        o.detune.value = (i - 2) * 4;
        var g = ac.createGain(); g.gain.value = 0.05;
        var lfo = ac.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03;
        var lg = ac.createGain(); lg.gain.value = 0.035;
        lfo.connect(lg); lg.connect(g.gain);
        o.connect(g); g.connect(filter); o.start(); lfo.start();
      });
      audio = { ac: ac, master: master };
    }
    audio.ac.resume();
    audio.master.gain.cancelScheduledValues(audio.ac.currentTime);
    audio.master.gain.setTargetAtTime(0.5, audio.ac.currentTime, 0.8);
    return true;
  }
  function stopAudio() {
    if (!audio) return;
    audio.master.gain.setTargetAtTime(0, audio.ac.currentTime, 0.4);
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
