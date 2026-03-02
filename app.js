document.addEventListener("DOMContentLoaded", () => {

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

  const WORKER = "https://pantoan.ariadishut.workers.dev";
  const SECRET = "MANTO_SUPER_SECRET_2026";

    const APP_VERSION = "1.0.0"; // 🔥 Ganti saat build APK baru
  const VERSION_API = WORKER + "/version";

  /* ================================
     VERSION CHECK (ANTI CACHE)
  ================================== */

  async function checkVersion() {
    try {
      const res = await fetch(
        VERSION_API + "?t=" + Date.now(),
        { cache: "no-store" }
      );

      if (!res.ok) return;

      const data = await res.json();

      console.log("Server:", data.version);
      console.log("App:", APP_VERSION);

      if (data.version !== APP_VERSION) {
        showUpdateToast(data.force, data.message);
      }

    } catch (err) {
      console.log("Version check failed:", err);
    }
  }

  /* ================================
     UPDATE TOAST (FIX TOTAL)
  ================================== */

  function showUpdateToast(force, message) {

    let toast = document.getElementById("serverUpdateToast");

    // Jika belum ada → buat
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "serverUpdateToast";

      toast.style.position = "fixed";
      toast.style.bottom = "20px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.background = "#222";
      toast.style.color = "#fff";
      toast.style.padding = "12px 20px";
      toast.style.borderRadius = "8px";
      toast.style.zIndex = "9999";
      toast.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
      toast.style.fontSize = "14px";

      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span>${message || "Versi baru tersedia 🚀"}</span>
      <button id="updateNowBtn" style="
        margin-left:15px;
        padding:6px 12px;
        border:none;
        border-radius:6px;
        background:${force ? "red" : "#4CAF50"};
        color:white;
        cursor:pointer;">
        ${force ? "Update Sekarang" : "Refresh"}
      </button>
    `;

    document.getElementById("updateNowBtn").onclick = () => {
      window.location.reload();
    };
  }
  
  let hls = null;
  let allChannels = [];
  let activeCategory = "all";
  let currentChannelId = null;

  /* ==== RESET ORIENTATION === */
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch (e) {
    console.log("Orientation unlock not supported");
  }

  /* === TOKEN === */
  async function generateToken(id){
    const exp = Math.floor(Date.now()/1000) + 3600;
    const raw = id + exp + SECRET;

    const buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(raw)
    );

    const sig = Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2,"0"))
      .join("");

    return `${WORKER}/stream?id=${id}&exp=${exp}&sig=${sig}`;
  }

  /* === PLAY === */
  async function playTV(id){

    if(!id || id === currentChannelId) return;
    currentChannelId = id;

    if (hls) {
      hls.destroy();
      hls = null;
    }

    try {
      const secureUrl = await generateToken(id);

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        });

        hls.loadSource(secureUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(()=>{});
        });

      } else {
        video.src = secureUrl;
        video.play().catch(()=>{});
      }

    } catch(err){
      console.error("Gagal play:", err);
    }
  }

  /* === LOAD CHANNEL === */
  async function loadChannels(){
    try{
      const res = await fetch(`${WORKER}/channels`);
      if(!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      if(!Array.isArray(data)) throw new Error("Format bukan array");

      allChannels = data.map(ch => ({
        ...ch,
        category: (
          Array.isArray(ch.category)
            ? ch.category
            : [ch.category]
        ).map(cat => cat.toString().trim().toLowerCase())
      }));

      renderCategories();
      renderChannels();

      if(allChannels.length > 0){
        playTV(allChannels[0].id);
      }

    }catch(err){
      console.error("LOAD ERROR:", err);
      channelListEl.innerHTML =
        "<div style='padding:10px'>Gagal memuat channel</div>";
    }
  }

  /* === RENDER CATEGORY === */
  function renderCategories(){

    const categories = new Set(["all"]);
    allChannels.forEach(ch => {
      ch.category.forEach(cat => categories.add(cat));
    });

    categoryBar.innerHTML = "";

    categories.forEach(cat => {

      const btn = document.createElement("button");
      btn.className = "cat";
      btn.dataset.cat = cat;

      btn.textContent =
        cat === "all"
          ? "Semua"
          : cat.charAt(0).toUpperCase() + cat.slice(1);

      if(cat === activeCategory){
        btn.classList.add("active");
      }

      btn.addEventListener("click", () => {

        activeCategory = cat;

        document.querySelectorAll(".cat")
          .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");
        renderChannels();
      });

      categoryBar.appendChild(btn);
    });
  }

  /* === RENDER CHANNEL === */
  function renderChannels() {

  channelListEl.innerHTML = "";
  const keyword = searchInput.value.toLowerCase();

  const filtered = allChannels.filter(ch => {

    const matchCategory =
      activeCategory === "all" ||
      ch.category.includes(activeCategory);

    const matchSearch =
      ch.name.toLowerCase().includes(keyword);

    return matchCategory && matchSearch;
  });

  if(filtered.length === 0){
    channelListEl.innerHTML =
      "<div style='padding:10px'>Channel tidak ditemukan</div>";
    return;
  }

  filtered.forEach(ch => {

    const div = document.createElement("div");
    div.className = "channel";

    // Gunakan logo jika ada, jika tidak pakai default "No Image"
    const logoSrc = (ch.logo && ch.logo.trim() !== "")
      ? ch.logo
      : "./no-image.svg";   // <-- pastikan file ini ada di folder project

    div.innerHTML = `
      <img src="${logoSrc}" alt="${ch.name}" class="channel-logo" onerror="this.src='./no-image.svg'">
      <span class="channel-name">${ch.name}</span>
    `;

    if(ch.id === currentChannelId)
      div.classList.add("active");

    div.onclick = () => {
      playTV(ch.id);
      renderChannels();
    };

    channelListEl.appendChild(div);
  });
}
  /* === SEARCH === */
  searchInput.addEventListener("input", renderChannels);

  /* === TICKER === */
  async function loadTicker(){
    try{
      const res = await fetch("https://ticker.ariadishut.workers.dev");
      if(!res.ok) return;

      const data = await res.json();
      if(Array.isArray(data) && data.length){
        tickerText.textContent =
          data.map(x => "📰 " + x.title).join(" ✦✦✦ ");
      }
    }catch(e){}
  }

  loadTicker();
  setInterval(loadTicker, 30000);

  ticker.onclick = () =>
    ticker.classList.toggle("paused");

  /* === THEME === */
  themeToggle.onclick = ()=>{
    document.body.classList.toggle("light");
    themeToggle.textContent =
      document.body.classList.contains("light")
        ? "☀️"
        : "🌙";
  };

  /* === CLOCK === */
  setInterval(()=>{
    clock.textContent =
      new Date().toLocaleTimeString("id-ID");
  },1000);

  /* === FULLSCREEN === */
  fullscreenBtn.addEventListener("click", async () => {

    try {

      if (!document.fullscreenElement) {

        await playerBox.requestFullscreen();

        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock("landscape");
        }

      } else {

        await document.exitFullscreen();

        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }

      }

    } catch (err) {
      console.log("Fullscreen error:", err);
    }
  });

  /* START */
  loadChannels();
  checkVersion(); // 🔥 cek versi saat aplikasi dibuka
  setInterval(checkVersion, 60000);  
});
