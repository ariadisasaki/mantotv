document.addEventListener("DOMContentLoaded", () => {

  /* ================= ELEMENT ================= */
  const video = document.getElementById("video");
  const playerBox = document.getElementById("playerBox");
  const themeToggle = document.getElementById("themeToggle");
  const clock = document.getElementById("clock");
  const ticker = document.querySelector(".ticker");
  const tickerText = document.getElementById("tickerText");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const searchInput = document.getElementById("searchInput");
  const categoryBar = document.getElementById("categoryContainer");
  const channelListEl = document.getElementById("channelList");

  /* ================= CONFIG ================= */
  const WORKER = "https://pantoan.ariadishut.workers.dev";
  const APP_VERSION = "1.0.0";
  const REFRESH_CHANNEL_INTERVAL = 5 * 60 * 1000; // 5 menit
  const DEFAULT_LOGO = "https://via.placeholder.com/80x50?text=No+Image";

  let hls = null;
  let allChannels = [];
  let activeCategory = "all";
  let currentChannelId = null;

  /* ================= UPDATE CHECK ================= */
  async function checkUpdate() {
    const lastCheck = localStorage.getItem("lastVersionCheck");
    const now = Date.now();
    if (lastCheck && now - lastCheck < 60000) return;
    localStorage.setItem("lastVersionCheck", now);

    try {
      const res = await fetch(`${WORKER}/version`);
      const data = await res.json();
      if (data.version !== APP_VERSION) showUpdateToast(data.message);
    } catch (e) {
      console.log("Update check failed:", e);
    }
  }

  function showUpdateToast(message) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position:fixed;
      bottom:20px;
      left:50%;
      transform:translateX(-50%);
      background:#111;
      color:#fff;
      padding:15px 20px;
      border-radius:12px;
      box-shadow:0 0 20px rgba(0,0,0,0.5);
      z-index:9999;
      display:flex;
      gap:15px;
      align-items:center;
      font-family:sans-serif;
    `;
    toast.innerHTML = `
      <span>${message}</span>
      <button style="
        background:#ff4444;
        border:none;
        color:white;
        padding:6px 12px;
        border-radius:8px;
        cursor:pointer;
      ">Update</button>
    `;
    document.body.appendChild(toast);
    toast.querySelector("button").onclick = () => location.reload();
  }

  /* ================= TOKEN REQUEST ================= */
  async function generateToken(id) {
    const res = await fetch(`${WORKER}/token?id=${id}`);
    if (!res.ok) throw new Error("Token error");
    const data = await res.json();
    return data.url;
  }

  /* ================= PLAY STREAM ================= */
  async function playTV(id) {
    if (!id || id === currentChannelId) return;
    currentChannelId = id;

    if (hls) {
      hls.stopLoad?.();
      hls.destroy();
      hls = null;
    }

    try {
      const secureUrl = await generateToken(id);

      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(secureUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      } else {
        video.src = secureUrl;
        video.play().catch(() => {});
      }
    } catch (err) {
      console.error("Gagal play:", err);
    }
  }

  /* ================= LOAD CHANNEL ================= */
  async function loadChannels() {
    try {
      const res = await fetch(`${WORKER}/channels`, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Format bukan array");

      allChannels = data.map(ch => ({
        ...ch,
        category: (Array.isArray(ch.category) ? ch.category : [ch.category])
          .map(cat => cat.toString().trim().toLowerCase())
      }));

      renderCategories();
      renderChannels();

      if (allChannels.length > 0 && !currentChannelId) playTV(allChannels[0].id);

    } catch (err) {
      console.error("LOAD ERROR:", err);
      channelListEl.innerHTML = "<div style='padding:10px'>Gagal memuat channel</div>";
    }
  }

  /* ================= RENDER CATEGORY ================= */
  function renderCategories() {
    const categories = new Set(["all"]);
    allChannels.forEach(ch => ch.category.forEach(cat => categories.add(cat)));
    categoryBar.innerHTML = "";

    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "cat";
      btn.dataset.cat = cat;
      btn.textContent = cat === "all" ? "Semua" : cat.charAt(0).toUpperCase() + cat.slice(1);
      if (cat === activeCategory) btn.classList.add("active");

      btn.addEventListener("click", () => {
        activeCategory = cat;
        document.querySelectorAll(".cat").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderChannels();
      });

      categoryBar.appendChild(btn);
    });
  }

  /* ================= RENDER CHANNEL ================= */
  function renderChannels() {
    channelListEl.innerHTML = "";
    const keyword = searchInput.value.toLowerCase();

    const filtered = allChannels.filter(ch => 
      (activeCategory === "all" || ch.category.includes(activeCategory)) &&
      ch.name.toLowerCase().includes(keyword)
    );

    if (filtered.length === 0) {
      channelListEl.innerHTML = "<div style='padding:10px'>Channel tidak ditemukan</div>";
      return;
    }

    filtered.forEach(ch => {
      const div = document.createElement("div");
      div.className = "channel";

      const logoSrc = ch.logo?.trim() || DEFAULT_LOGO;
      div.innerHTML = `
        <img src="${logoSrc}" class="channel-logo" onerror="this.src='${DEFAULT_LOGO}'">
        <span class="channel-name">${ch.name}</span>
      `;
      if (ch.id === currentChannelId) div.classList.add("active");
      div.onclick = () => { playTV(ch.id); renderChannels(); };

      channelListEl.appendChild(div);
    });
  }

  /* ================= SEARCH ================= */
  searchInput.addEventListener("input", renderChannels);

  /* ================= TICKER ================= */
  async function loadTicker() {
    try {
      const res = await fetch("https://ticker.ariadishut.workers.dev");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        tickerText.textContent = data.map(x => "📰 " + x.title).join(" ✦✦✦ ");
      }
    } catch (e) {
      console.error("Ticker error:", e);
    }
  }

  loadTicker();
  setInterval(loadTicker, 30000);
  ticker.onclick = () => ticker.classList.toggle("paused");

  /* ================= THEME ================= */
  themeToggle.onclick = () => {
    document.body.classList.toggle("light");
    themeToggle.textContent = document.body.classList.contains("light") ? "☀️" : "🌙";
  };

  /* ================= CLOCK ================= */
  setInterval(() => {
    clock.textContent = new Date().toLocaleTimeString("id-ID");
  }, 1000);

  /* ================= FULLSCREEN ================= */
  fullscreenBtn.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await playerBox.requestFullscreen();
        await screen.orientation?.lock?.("landscape");
      } else {
        await document.exitFullscreen();
        await screen.orientation?.unlock?.();
      }
    } catch (err) {
      console.log("Fullscreen error:", err);
    }
  });

  /* ================= START ================= */
  checkUpdate();
  loadChannels();
  setInterval(loadChannels, REFRESH_CHANNEL_INTERVAL); // auto-refresh channel

});
