const video = document.getElementById("video");
const channels = document.querySelectorAll(".channel");
const playerBox = document.getElementById("playerBox");
const themeToggle = document.getElementById("themeToggle");
const clock = document.getElementById("clock");
const ticker = document.querySelector(".ticker");
const tickerText = document.getElementById("tickerText");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const WORKER = "https://pantoan.ariadishut.workers.dev";
const SECRET = "MANTO_SUPER_SECRET_2026";

let hls;

/* TOKEN */
async function generateToken(id){
const exp = Math.floor(Date.now()/1000)+3600;
const raw = id+exp+SECRET;

const buffer = await crypto.subtle.digest(
"SHA-256",
new TextEncoder().encode(raw)
);

const sig = Array.from(new Uint8Array(buffer))
.map(b=>b.toString(16).padStart(2,"0"))
.join("");

return `${WORKER}/stream?id=${id}&exp=${exp}&sig=${sig}`;
}

/* PLAY */
async function playTV(id){

if(hls)hls.destroy();

const secureUrl = await generateToken(id);

if(Hls.isSupported()){
hls=new Hls();
hls.loadSource(secureUrl);
hls.attachMedia(video);
}else{
video.src=secureUrl;
}
video.play().catch(()=>{});
}

channels.forEach(ch=>{
ch.onclick=()=>{
channels.forEach(c=>c.classList.remove("active"));
ch.classList.add("active");
playTV(ch.dataset.id);
};
});

playTV(channels[0].dataset.id);

/* TICKER */
async function loadTicker(){
try{
const res=await fetch("https://ticker.ariadishut.workers.dev");
const data=await res.json();
if(data&&data.length){
tickerText.textContent=
data.map(x=>"📰 "+x.title).join(" ✦✦✦ ");
}
}catch(e){}
}
loadTicker();
setInterval(loadTicker,30000);
ticker.onclick=()=>ticker.classList.toggle("paused");

/* THEME */
themeToggle.onclick=()=>{
document.body.classList.toggle("light");
themeToggle.textContent=
document.body.classList.contains("light")?"☀️":"🌙";
};

/* CLOCK */
setInterval(()=>{
clock.textContent=new Date().toLocaleTimeString("id-ID");
},1000);

/* FULLSCREEN */
fullscreenBtn.onclick=()=>{
if(!document.fullscreenElement){
playerBox.requestFullscreen();
screen.orientation?.lock("landscape").catch(()=>{});
}else{
document.exitFullscreen();
screen.orientation?.unlock();
}
};
