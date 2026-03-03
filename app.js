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

});
