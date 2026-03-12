document.addEventListener("DOMContentLoaded", () => {

const video = document.getElementById("video");
const playerBox = document.getElementById("playerBox");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const searchInput = document.getElementById("searchInput");
const categoryBar = document.getElementById("categoryContainer");
const channelListEl = document.getElementById("channelList");

const WORKER = "https://pantoan.ariadishut.workers.dev";

let hls = null;

let allChannels = [];
let visibleChannels = [];

let activeCategory = "all";
let currentChannelId = null;
let currentIndex = 0;


/* ================= PLAY TV ================= */

function playTV(id){

if(!id || id === currentChannelId) return;

currentChannelId = id;

if(hls){
hls.destroy();
hls = null;
}

const streamUrl = `${WORKER}/stream?id=${id}`;

try{

if(Hls.isSupported()){

hls = new Hls({
enableWorker:true,
lowLatencyMode:true
});

hls.loadSource(streamUrl);
hls.attachMedia(video);

hls.on(Hls.Events.MANIFEST_PARSED,()=>{
video.play().catch(()=>{});
});

}else{

video.src = streamUrl;
video.play().catch(()=>{});

}

}catch(err){
console.log(err);
}

}


/* ================= LOAD CHANNEL ================= */

async function loadChannels(){

try{

const res = await fetch(`${WORKER}/channels`);

if(!res.ok) throw new Error("HTTP "+res.status);

const data = await res.json();

allChannels = data.map(ch=>({

...ch,

category:(Array.isArray(ch.category)
? ch.category
: [ch.category]
).map(c=>c.toString().trim().toLowerCase())

}));

renderCategories();
renderChannels();

if(allChannels.length){
playTV(allChannels[0].id);
}

}catch(err){

channelListEl.innerHTML =
"<div style='padding:10px'>Gagal memuat channel</div>";

}

}


/* ================= CATEGORY ================= */

function renderCategories(){

const categories = new Set(["all"]);

allChannels.forEach(ch=>{
ch.category.forEach(cat=>categories.add(cat));
});

categoryBar.innerHTML="";

categories.forEach(cat=>{

const btn=document.createElement("button");

btn.className="cat";
btn.dataset.cat=cat;

btn.textContent =
cat==="all"
? "Semua"
: cat.charAt(0).toUpperCase()+cat.slice(1);

if(cat===activeCategory)
btn.classList.add("active");

btn.onclick=()=>{

activeCategory=cat;

document.querySelectorAll(".cat")
.forEach(b=>b.classList.remove("active"));

btn.classList.add("active");

renderChannels();

};

categoryBar.appendChild(btn);

});

}


/* ================= RENDER CHANNEL ================= */

function renderChannels(){

channelListEl.innerHTML="";

const keyword=searchInput.value.toLowerCase();

const filtered = allChannels.filter(ch=>{

const matchCategory =
activeCategory==="all" ||
ch.category.includes(activeCategory);

const matchSearch =
ch.name.toLowerCase().includes(keyword);

return matchCategory && matchSearch;

});

visibleChannels = filtered;

if(!filtered.length){

channelListEl.innerHTML =
"<div style='padding:10px'>Channel tidak ditemukan</div>";

return;

}

filtered.forEach((ch,i)=>{

const div=document.createElement("div");

div.className="channel";

const logoSrc =
(ch.logo && ch.logo.trim()!=="")
? ch.logo
: "./no-image.svg";

div.innerHTML=`

<img src="${logoSrc}"
class="channel-logo"
onerror="this.src='./no-image.svg'">

<span class="channel-name">${ch.name}</span>

`;

/* pointer hover → focus */

div.onmouseenter = ()=>{
currentIndex = i;
highlightChannel();
};

if(ch.id===currentChannelId){
div.classList.add("active");
currentIndex = i;
}

div.onclick=()=>{
playTV(ch.id);
currentIndex = i;
highlightChannel();
};

channelListEl.appendChild(div);

});

highlightChannel();

}


/* ================= HIGHLIGHT ================= */

function highlightChannel(){

const items = document.querySelectorAll(".channel");

items.forEach(el=>el.classList.remove("active"));

if(items[currentIndex]){

items[currentIndex].classList.add("active");

items[currentIndex].scrollIntoView({
block:"nearest"
});

}

}


/* ================= FULLSCREEN ================= */

function toggleFullscreen(){

try{

if(!document.fullscreenElement){

playerBox.requestFullscreen();

}else{

document.exitFullscreen();

}

}catch(e){}

}

fullscreenBtn.onclick = toggleFullscreen;


/* ================= REMOTE NAVIGATION ================= */

document.addEventListener("keydown",(e)=>{

const key = e.key || e.keyCode;

const items = document.querySelectorAll(".channel");

if(!items.length) return;


/* DOWN */

if(key==="ArrowDown" || key===40){

currentIndex++;

if(currentIndex>=items.length)
currentIndex=0;

highlightChannel();

}


/* UP */

if(key==="ArrowUp" || key===38){

currentIndex--;

if(currentIndex<0)
currentIndex=items.length-1;

highlightChannel();

}


/* OK / ENTER */

if(key==="Enter" || key===13){

if(visibleChannels[currentIndex]){

playTV(visibleChannels[currentIndex].id);

highlightChannel();

}

}


/* NEXT CHANNEL */

if(key==="ArrowRight" || key===39){

currentIndex++;

if(currentIndex>=visibleChannels.length)
currentIndex=0;

playTV(visibleChannels[currentIndex].id);

highlightChannel();

}


/* PREVIOUS CHANNEL */

if(key==="ArrowLeft" || key===37){

currentIndex--;

if(currentIndex<0)
currentIndex=visibleChannels.length-1;

playTV(visibleChannels[currentIndex].id);

highlightChannel();

}


/* FULLSCREEN REMOTE */

if(
key==="f" ||
key==="F" ||
key===70 ||
key==="0" ||
key===48
){

toggleFullscreen();

}


/* BACK BUTTON */

if(key==="Escape" || key===461 || key===10009){
video.pause();
}

});


/* ================= SEARCH ================= */

searchInput.addEventListener("input",renderChannels);


/* ================= START ================= */

loadChannels();

});
