(function () {
  var roles = ["surgeon", "nurse", "purchasing", "finance"];
  var labels = { surgeon: "Surgeon", nurse: "OR Nurse", purchasing: "Purchasing", finance: "Finance / Accounting" };
  var STORE = "brief-demo-input-v1";
  var params = new URLSearchParams(location.search);
  var current = params.get("role");
  if (roles.indexOf(current) === -1) current = "surgeon";

  var tabs = document.querySelectorAll(".tab");
  var whoLabel = document.getElementById("whoLabel");
  var comment = document.getElementById("comment");
  var savedList = document.getElementById("savedList");
  var recBtn = document.getElementById("recBtn");
  var hint = document.getElementById("voiceHint");
  var recording = false;
  var activeRecognizer = null;
  var activeRecorder = null;

  function show(role) {
    current = role;
    tabs.forEach(function (t) { t.classList.toggle("active", t.dataset.role === role); });
    roles.forEach(function (r) {
      var el = document.getElementById("role-" + r);
      if (el) el.classList.toggle("active", r === role);
    });
    whoLabel.textContent = "You are viewing: " + labels[role];
    comment.value = "";
    renderSaved();
    try { history.replaceState(null, "", "?role=" + role); } catch (e) {}
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; }
  }
  function save(obj) {
    try { localStorage.setItem(STORE, JSON.stringify(obj)); } catch (e) {}
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderSaved() {
    var all = load();
    var rows = all[current] || [];
    if (!rows.length) { savedList.textContent = "Nothing yet."; return; }
    savedList.innerHTML = "";
    rows.slice().reverse().forEach(function (r) {
      var d = document.createElement("div");
      d.className = "item";
      d.innerHTML = '<div class="meta">' + escapeHtml(r.time || "") + " · " + escapeHtml(r.via || "text") + "</div>" + escapeHtml(r.text);
      savedList.appendChild(d);
    });
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function appendText(text) {
    if (!text) return;
    comment.value = (comment.value ? comment.value.trim() + "\n" : "") + text.trim();
  }

  function setRecording(on) {
    recording = on;
    recBtn.classList.toggle("on", on);
    recBtn.textContent = on ? "⏹ Stop" : "🎙 Speak";
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { show(t.dataset.role); });
  });

  document.getElementById("sendBtn").addEventListener("click", function () {
    var text = comment.value.trim();
    if (!text) { toast("Write or speak something first."); return; }
    var all = load();
    (all[current] = all[current] || []).push({ text: text, time: new Date().toLocaleString(), via: "text" });
    save(all);
    comment.value = "";
    renderSaved();
    toast("Saved. In the real product this would go to the client's record.");
  });

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      var role = btn.dataset.copy;
      var url = location.origin + location.pathname + "?role=" + role;
      try { await navigator.clipboard.writeText(url); toast("Link copied: " + role); }
      catch (e) { prompt("Copy this link:", url); }
    });
  });

  // ---- voice input -------------------------------------------------------
  // Path A (default on the public site): the browser's built-in speech
  // recognition. No backend needed; audio is handled by the browser vendor.
  // Path B (fallback, only useful when this page runs on the machine with
  // the local Whisper service): record and POST to 127.0.0.1:8766.
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var hasSR = !!SR;

  function startWebSpeech() {
    var rec = new SR();
    activeRecognizer = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = function (e) {
      var text = "";
      for (var i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      appendText(text);
      hint.textContent = "Transcribed. Edit if needed, then submit.";
    };
    rec.onerror = function (e) {
      hint.textContent = "Microphone error: " + (e.error || "unknown") + ". You can type instead.";
    };
    rec.onend = function () {
      activeRecognizer = null;
      setRecording(false);
    };
    try {
      rec.start();
      setRecording(true);
      hint.textContent = "Listening… speak now, then click Stop.";
    } catch (err) {
      hint.textContent = "Could not start voice input: " + err.message;
      setRecording(false);
    }
  }

  async function startLocalWhisper() {
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var recorder = new MediaRecorder(stream);
      var chunks = [];
      activeRecorder = recorder;
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = async function () {
        setRecording(false);
        stream.getTracks().forEach(function (t) { t.stop(); });
        var blob = new Blob(chunks, { type: "audio/webm" });
        hint.textContent = "Transcribing…";
        try {
          var fd = new FormData();
          fd.append("file", blob, "speech.webm");
          fd.append("model", "large-v3");
          fd.append("language", "en");
          var r = await fetch("http://127.0.0.1:8766/v1/audio/transcriptions", { method: "POST", body: fd });
          if (!r.ok) throw new Error("HTTP " + r.status);
          var j = await r.json();
          appendText(j.text || "");
          hint.textContent = "Transcribed. Edit if needed, then submit.";
        } catch (err) {
          hint.textContent = "Voice service not reachable. You can type instead.";
        }
      };
      recorder.start();
      setRecording(true);
      hint.textContent = "Recording… click Stop when done.";
    } catch (err) {
      hint.textContent = "Microphone unavailable: " + err.message + ". You can type instead.";
      setRecording(false);
    }
  }

  recBtn.addEventListener("click", function () {
    if (recording) {
      if (activeRecognizer) { try { activeRecognizer.stop(); } catch (e) {} }
      if (activeRecorder && activeRecorder.state === "recording") { try { activeRecorder.stop(); } catch (e) {} }
      return;
    }
    if (hasSR) startWebSpeech();
    else if (navigator.mediaDevices && window.MediaRecorder) startLocalWhisper();
    else hint.textContent = "Voice input is not supported in this browser — please type instead.";
  });

  if (!hasSR) {
    hint.textContent = "Voice uses the local speech service when available; otherwise please type.";
  } else {
    hint.textContent = "Voice input uses your browser's speech engine. Speak, then click Stop.";
  }

  show(current);
})();
