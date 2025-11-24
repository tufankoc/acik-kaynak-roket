// Starfield Background
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

let width, height;
let stars = [];

function initStars() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    stars = [];
    const numStars = Math.floor(width * height / 1000); // Density

    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2,
            opacity: Math.random(),
            speed: Math.random() * 0.5
        });
    }
}

function animateStars() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';

    stars.forEach(star => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Twinkle effect
        star.opacity += (Math.random() - 0.5) * 0.1;
        if (star.opacity < 0) star.opacity = 0;
        if (star.opacity > 1) star.opacity = 1;
    });

    requestAnimationFrame(animateStars);
}

window.addEventListener('resize', initStars);
initStars();
animateStars();

// Navbar Scroll Effect
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Rocket Lab Simulation (Advanced Physics)
const fuelInput = document.getElementById('fuel-input');
const payloadInput = document.getElementById('payload-input');
const throttleInput = document.getElementById('throttle');
const launchBtn = document.getElementById('launch-btn');

const altDisplay = document.getElementById('altitude');
const velDisplay = document.getElementById('velocity');
const accDisplay = document.getElementById('acceleration');
const maxQDisplay = document.getElementById('max-q');
const fuelValDisplay = document.getElementById('fuel-val');
const fuelBar = document.getElementById('fuel-bar');
const statusDisplay = document.getElementById('status');
const missionTimer = document.getElementById('mission-timer');
const throttleVal = document.getElementById('throttle-val');

const rocket = document.getElementById('sim-rocket');
const altPath = document.getElementById('alt-path');
const velPath = document.getElementById('vel-path');

// Update Throttle UI
throttleInput.addEventListener('input', () => {
    throttleVal.textContent = `${throttleInput.value}%`;
});

// Physics Constants
const G0 = 9.80665;
const R_EARTH = 6371000; // m
const SEA_LEVEL_DENSITY = 1.225; // kg/m^3
const SCALE_HEIGHT = 8500; // m
const VISUAL_SCALE = 0.005; // 1px = 200m
const TIME_SCALE = 1.0; // Real-time for realism

let isLaunching = false;
let animationId = null;
let startTime = 0;
let flightData = { alt: [], vel: [] };

// Simulation State
let state = {
    altitude: 0,
    velocity: 0,
    acceleration: 0,
    fuel: 0,
    mass: 0,
    maxQ: 0,
    time: 0
};

function resetSimulation() {
    cancelAnimationFrame(animationId);
    isLaunching = false;
    state = { altitude: 0, velocity: 0, acceleration: 0, fuel: 0, mass: 0, maxQ: 0, time: 0 };

    rocket.style.bottom = '20px';
    rocket.classList.remove('launching', 'shake');
    rocket.style.transform = 'translateX(-50%) rotate(0deg)';

    statusDisplay.textContent = 'SİSTEM HAZIR';
    statusDisplay.style.color = '#888';

    launchBtn.classList.remove('abort');
    launchBtn.innerHTML = '<span class="btn-text">ATEŞLE</span><i class="fa-solid fa-rocket"></i>';

    // Reset Displays
    updateDisplays();
    missionTimer.textContent = "T- 00:00:00";

    // Reset Graphs
    flightData = { alt: [], vel: [] };
    updateGraph();
}

function updateDisplays() {
    altDisplay.textContent = Math.round(state.altitude).toString().padStart(5, '0');
    velDisplay.textContent = Math.round(state.velocity).toString().padStart(4, '0');
    accDisplay.textContent = (state.acceleration / G0).toFixed(1);
    maxQDisplay.textContent = Math.round(state.maxQ);

    const fuelPercent = (state.fuel / (parseFloat(fuelInput.value) * 1000)) * 100;
    fuelBar.style.width = `${Math.max(0, fuelPercent)}%`;
    fuelValDisplay.textContent = `${Math.round(Math.max(0, fuelPercent))}%`;
}

function updateGraph() {
    // Keep last 100 points
    if (flightData.alt.length > 100) {
        flightData.alt.shift();
        flightData.vel.shift();
    }

    flightData.alt.push(state.altitude);
    flightData.vel.push(state.velocity);

    const maxAlt = Math.max(1000, ...flightData.alt);
    const maxVel = Math.max(100, ...flightData.vel);

    // Map to SVG coordinates (300x100)
    const pointsAlt = flightData.alt.map((y, i) => {
        const x = (i / 100) * 300;
        const py = 100 - (y / maxAlt) * 100;
        return `${x},${py}`;
    }).join(' ');

    const pointsVel = flightData.vel.map((y, i) => {
        const x = (i / 100) * 300;
        const py = 100 - (y / maxVel) * 100;
        return `${x},${py}`;
    }).join(' ');

    altPath.setAttribute('d', `M0,100 ${pointsAlt ? 'L' + pointsAlt : ''}`);
    velPath.setAttribute('d', `M0,100 ${pointsVel ? 'L' + pointsVel : ''}`);
}

function startLaunch() {
    if (isLaunching) {
        // ABORT
        resetSimulation();
        statusDisplay.textContent = 'GÖREV İPTAL EDİLDİ';
        statusDisplay.style.color = '#ff0055';
        return;
    }

    // Initial Setup
    const fuelMass = parseFloat(fuelInput.value) * 1000;
    const payloadMass = parseFloat(payloadInput.value) * 1000;
    const structureMass = fuelMass * 0.1;
    // Max thrust is 5000kN (from old slider max), scaled by throttle
    const maxThrust = 5000 * 1000;

    state.fuel = fuelMass;
    state.mass = fuelMass + payloadMass + structureMass;
    state.maxFuel = fuelMass;
    state.maxThrust = maxThrust;

    isLaunching = true;
    startTime = Date.now();

    launchBtn.classList.add('abort');
    launchBtn.innerHTML = '<span class="btn-text">İPTAL ET</span><i class="fa-solid fa-ban"></i>';

    rocket.classList.add('launching');
    statusDisplay.textContent = 'LIFTOFF!';
    statusDisplay.style.color = '#00ff88';

    let lastTime = performance.now();

    function loop(currentTime) {
        if (!isLaunching) return;

        const dt = Math.min((currentTime - lastTime) / 1000, 0.1) * TIME_SCALE;
        lastTime = currentTime;
        state.time += dt;

        // --- PHYSICS ENGINE ---

        // 1. Gravity (Variable with altitude)
        const r = R_EARTH + state.altitude;
        const g = G0 * Math.pow(R_EARTH / r, 2);

        // 2. Atmosphere & Drag
        const density = SEA_LEVEL_DENSITY * Math.exp(-state.altitude / SCALE_HEIGHT);
        const dragCoeff = 0.5; // Cd * A simplified
        const drag = 0.5 * density * Math.pow(state.velocity, 2) * dragCoeff * Math.sign(state.velocity);

        // 3. Dynamic Pressure (Q)
        const q = 0.5 * density * Math.pow(state.velocity, 2);
        state.maxQ = Math.max(state.maxQ, q);

        // Visual Shake at high Q
        if (q > 5000) {
            rocket.classList.add('shake');
            statusDisplay.textContent = 'MAX Q (Yüksek Basınç)';
            statusDisplay.style.color = '#ffd700';
        } else {
            rocket.classList.remove('shake');
        }

        // 4. Thrust
        let thrust = 0;
        if (state.fuel > 0) {
            const throttle = parseInt(throttleInput.value) / 100;
            thrust = state.maxThrust * throttle;

            // Isp = 300s
            const massFlowRate = thrust / (300 * G0);
            const fuelBurned = massFlowRate * dt;

            state.fuel -= fuelBurned;
            state.mass -= fuelBurned;

            if (state.fuel <= 0) {
                state.fuel = 0;
                rocket.classList.remove('launching');
                statusDisplay.textContent = 'MECO (Motor Sustu)';
                statusDisplay.style.color = '#00f2ff';
            }
        } else {
            rocket.classList.remove('launching');
        }

        // 5. Net Force & Acceleration
        const weight = state.mass * g;
        const netForce = thrust - weight - drag;
        state.acceleration = netForce / state.mass;

        // 6. Integration
        state.velocity += state.acceleration * dt;
        state.altitude += state.velocity * dt;

        // --- EVENTS ---

        // Ground Collision
        if (state.altitude < 0) {
            state.altitude = 0;
            state.velocity = 0;
            state.acceleration = 0;
            isLaunching = false;
            rocket.classList.remove('launching', 'shake');

            if (Math.abs(state.velocity) > 10) {
                statusDisplay.textContent = 'ÇAKILDI (Görev Başarısız)';
                statusDisplay.style.color = '#ff0055';
            } else {
                statusDisplay.textContent = 'İNİŞ BAŞARILI';
                statusDisplay.style.color = '#00ff88';
            }

            launchBtn.classList.remove('abort');
            launchBtn.innerHTML = '<span class="btn-text">TEKRAR</span><i class="fa-solid fa-rotate-right"></i>';
            return;
        }

        // Apogee
        if (state.velocity < 0 && state.altitude > 100) {
            statusDisplay.textContent = 'APOGEE (Tepe Noktası)';
            rocket.style.transform = 'translateX(-50%) rotate(180deg)';
        }

        // --- VISUALS ---
        const visualAlt = Math.min(state.altitude * VISUAL_SCALE, 450);
        rocket.style.bottom = `${20 + visualAlt}px`;

        // Timer
        const elapsed = Math.floor(state.time);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        missionTimer.textContent = `T+ 00:${mins}:${secs}`;

        updateDisplays();
        updateGraph(); // Real-time graph

        animationId = requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

launchBtn.addEventListener('click', () => {
    if (launchBtn.innerHTML.includes('TEKRAR')) {
        resetSimulation();
    } else {
        startLaunch();
    }
});

// Initialize
updateDisplays();

// --- NEW TOOLS ---

// 1. SpaceX Launch Tracker
async function fetchSpaceXData() {
    const missionName = document.getElementById('mission-name');
    const countdown = document.getElementById('countdown');
    const rocketName = document.getElementById('rocket-name');
    const launchSite = document.getElementById('launch-site');

    try {
        const response = await fetch('https://api.spacexdata.com/v4/launches/next');
        const data = await response.json();

        missionName.textContent = data.name;

        // Fetch Rocket Name
        const rocketRes = await fetch(`https://api.spacexdata.com/v4/rockets/${data.rocket}`);
        const rocketData = await rocketRes.json();
        rocketName.textContent = rocketData.name;

        // Launch Site (Simplified)
        launchSite.textContent = "Kennedy Space Center / Cape Canaveral";

        const launchDate = new Date(data.date_utc).getTime();

        // Countdown Timer
        setInterval(() => {
            const now = new Date().getTime();
            const distance = launchDate - now;

            if (distance < 0) {
                countdown.textContent = "FIRLATILDI";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            countdown.textContent = `${days}g ${hours}s ${minutes}d ${seconds}s`;
        }, 1000);

    } catch (error) {
        console.error('SpaceX API Error:', error);
        missionName.textContent = "Veri Alınamadı";
    }
}

fetchSpaceXData();

// 2. Orbit Visualizer
const orbitCanvas = document.getElementById('orbit-canvas');
const orbitCtx = orbitCanvas.getContext('2d');
const orbitSpeedInput = document.getElementById('orbit-speed');
const orbitSpeedVal = document.getElementById('orbit-speed-val');
const orbitStatus = document.getElementById('orbit-status');

let orbitAngle = 0;

function drawOrbit() {
    const w = orbitCanvas.width;
    const h = orbitCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const earthRadius = 40;

    orbitCtx.clearRect(0, 0, w, h);

    // Draw Earth
    orbitCtx.beginPath();
    orbitCtx.arc(cx, cy, earthRadius, 0, Math.PI * 2);
    orbitCtx.fillStyle = '#00f2ff';
    orbitCtx.fill();
    orbitCtx.shadowBlur = 20;
    orbitCtx.shadowColor = '#00f2ff';

    // Physics (Simplified)
    const v = parseInt(orbitSpeedInput.value);
    orbitSpeedVal.textContent = v;

    let orbitColor = '#fff';
    let orbitPath = [];

    // Determine Orbit Type based on velocity
    // V_circular = sqrt(GM/r) ~ 7800 m/s at LEO
    // V_escape = sqrt(2GM/r) ~ 11200 m/s

    if (v < 7000) {
        orbitStatus.textContent = "Yörünge Altı (Düşüyor)";
        orbitStatus.style.color = "#ff0055";
        orbitColor = "#ff0055";

        // Draw Ballistic Arc
        orbitCtx.beginPath();
        orbitCtx.moveTo(cx, cy - earthRadius);
        orbitCtx.quadraticCurveTo(cx + 50, cy - earthRadius - 20, cx + 60, cy);
        orbitCtx.strokeStyle = orbitColor;
        orbitCtx.stroke();

    } else if (v >= 7000 && v < 11000) {
        orbitStatus.textContent = "Yörüngede (Stabil)";
        orbitStatus.style.color = "#00ff88";
        orbitColor = "#00ff88";

        // Draw Ellipse/Circle
        const radius = earthRadius + 40 + (v - 7000) / 100;
        orbitCtx.beginPath();
        orbitCtx.ellipse(cx, cy, radius, radius * 0.8, 0, 0, Math.PI * 2);
        orbitCtx.strokeStyle = orbitColor;
        orbitCtx.stroke();

        // Animate Satellite
        orbitAngle += (v / 100000);
        const satX = cx + Math.cos(orbitAngle) * radius;
        const satY = cy + Math.sin(orbitAngle) * radius * 0.8;

        orbitCtx.beginPath();
        orbitCtx.arc(satX, satY, 5, 0, Math.PI * 2);
        orbitCtx.fillStyle = '#fff';
        orbitCtx.fill();

    } else {
        orbitStatus.textContent = "Kaçış Hızı (Güneş Sistemi)";
        orbitStatus.style.color = "#ffaa00";
        orbitColor = "#ffaa00";

        // Draw Hyperbola
        orbitCtx.beginPath();
        orbitCtx.moveTo(cx, cy - earthRadius - 10);
        orbitCtx.quadraticCurveTo(cx + 100, cy - 100, w, 0);
        orbitCtx.strokeStyle = orbitColor;
        orbitCtx.stroke();
    }

    requestAnimationFrame(drawOrbit);
}

drawOrbit();

// 3. Atmosphere Calculator
const atmoAltInput = document.getElementById('atmo-alt');
const atmoAltVal = document.getElementById('atmo-alt-val');
const atmoDensity = document.getElementById('atmo-density');
const atmoPressure = document.getElementById('atmo-pressure');
const atmoRocket = document.getElementById('atmo-rocket');

function updateAtmosphere() {
    const h = parseInt(atmoAltInput.value); // km
    atmoAltVal.textContent = h;

    // Standard Atmosphere Model (Simplified)
    // P = P0 * e^(-h/H)
    const P0 = 101325; // Pa
    const rho0 = 1.225; // kg/m3
    const H = 8.5; // Scale height km

    const pressure = P0 * Math.exp(-h / H);
    const density = rho0 * Math.exp(-h / H);

    atmoPressure.textContent = Math.round(pressure);
    atmoDensity.textContent = density.toFixed(4);

    // Visual Update
    const maxH = 100;
    const percent = (h / maxH) * 100;
    atmoRocket.style.bottom = `${percent}%`;
}

atmoAltInput.addEventListener('input', updateAtmosphere);

// --- Background Music (YouTube API) ---
let player;
const musicBtn = document.getElementById('music-toggle');
const musicIcon = musicBtn ? musicBtn.querySelector('i') : null;
let isMusicPlaying = false;

// Load YouTube IFrame API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// This function MUST be in global scope
window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: 'THhjjnsgFlE',
        playerVars: {
            'autoplay': 0, // Don't autoplay due to browser restrictions
            'controls': 0,
            'loop': 1,
            'playlist': 'THhjjnsgFlE',
            'start': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    // Don't auto-play due to browser restrictions
    // User must click the button
    console.log('YouTube player ready');
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isMusicPlaying = true;
        if (musicIcon) {
            musicIcon.className = 'fa-solid fa-volume-high';
            musicBtn.classList.add('playing');
        }
    } else if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.ENDED) {
        isMusicPlaying = false;
        if (musicIcon) {
            musicIcon.className = 'fa-solid fa-volume-xmark';
            musicBtn.classList.remove('playing');
        }
    }
}

// Toggle Button Logic
if (musicBtn) {
    musicBtn.addEventListener('click', () => {
        if (!player || !player.playVideo) {
            console.log('Player not ready yet');
            return;
        }

        if (isMusicPlaying) {
            player.pauseVideo();
        } else {
            player.setVolume(15); // Set volume to 15%
            player.playVideo();
        }
    });
}
// Auto-start on first interaction if blocked
// --- Rocketry Search Engine ---
const searchInput = document.getElementById('archive-search');
const searchButtonsContainer = document.getElementById('search-buttons');

if (searchInput && searchButtonsContainer) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        updateSearchButtons(query);
    });

    // Initial state
    updateSearchButtons('');
}

function updateSearchButtons(query) {
    if (!query) {
        searchButtonsContainer.innerHTML = '<p style="color: var(--text-muted); width: 100%;">Aramak istediğiniz terimi yukarı yazın...</p>';
        return;
    }

    const libraries = [
        {
            name: "NASA NTRS'de Ara",
            icon: "fa-rocket",
            url: `https://ntrs.nasa.gov/search?q=${encodeURIComponent(query)}`
        },
        {
            name: "Google Patents'de Ara",
            icon: "fa-scroll",
            url: `https://patents.google.com/?q=${encodeURIComponent(query)}&oc=0`
        },
        {
            name: "DTIC (Askeri) Ara",
            icon: "fa-shield-halved",
            url: `https://discover.dtic.mil/results/?q=${encodeURIComponent(query)}`
        }
    ];

    searchButtonsContainer.innerHTML = libraries.map(lib => `
        <a href="${lib.url}" target="_blank" class="search-btn gold-btn">
            <i class="fa-solid ${lib.icon}"></i> ${lib.name}
        </a>
    `).join('');
}

// --- Pro Tools Calculators ---

// Delta-V Calculator
const dvIsp = document.getElementById('dv-isp');
const dvWet = document.getElementById('dv-wet');
const dvDry = document.getElementById('dv-dry');
const dvResult = document.getElementById('dv-result');

function calculateDeltaV() {
    const isp = parseFloat(dvIsp.value) || 0;
    const wet = parseFloat(dvWet.value) || 0;
    const dry = parseFloat(dvDry.value) || 0;

    if (isp > 0 && wet > 0 && dry > 0 && wet > dry) {
        const g0 = 9.80665;
        const deltaV = isp * g0 * Math.log(wet / dry);
        dvResult.innerText = Math.round(deltaV);
    } else {
        dvResult.innerText = "0";
    }
}

if (dvIsp && dvWet && dvDry) {
    dvIsp.addEventListener('input', calculateDeltaV);
    dvWet.addEventListener('input', calculateDeltaV);
    dvDry.addEventListener('input', calculateDeltaV);
    calculateDeltaV(); // Initial calc
}

// TWR Analyzer
const twrThrust = document.getElementById('twr-thrust');
const twrMass = document.getElementById('twr-mass');
const twrResult = document.getElementById('twr-result');
const twrStatus = document.getElementById('twr-status');
const twrIndicator = document.getElementById('twr-indicator');

function calculateTWR() {
    const thrust = parseFloat(twrThrust.value) || 0;
    const mass = parseFloat(twrMass.value) || 0;

    if (thrust > 0 && mass > 0) {
        const weight = mass * 9.80665;
        const twr = thrust / weight;

        twrResult.innerText = twr.toFixed(2);

        // Visual Indicator
        // Map TWR 0-3 to 0-100% width
        let widthPercentage = (twr / 3) * 100;
        if (widthPercentage > 100) widthPercentage = 100;
        twrIndicator.style.width = `${widthPercentage}%`;

        // Status Text & Color
        if (twr < 1) {
            twrStatus.innerText = "Yetersiz İtki (Uçamaz)";
            twrStatus.style.color = "var(--danger-accent)";
        } else if (twr < 1.2) {
            twrStatus.innerText = "Riskli Kalkış (Çok Yavaş)";
            twrStatus.style.color = "#ffd700"; // Gold
        } else {
            twrStatus.innerText = "Uçuşa Uygun";
            twrStatus.style.color = "#00ff88"; // Green
        }
    } else {
        twrResult.innerText = "0.00";
        twrIndicator.style.width = "0%";
        twrStatus.innerText = "-";
    }
}

if (twrThrust && twrMass) {
    twrThrust.addEventListener('input', calculateTWR);
    twrMass.addEventListener('input', calculateTWR);
    calculateTWR(); // Initial calc
}

// --- Engineering Design Cycle Logic ---
const cycleSteps = document.querySelectorAll('.cycle-steps .step');
const cycleContents = document.querySelectorAll('.cycle-content .step-content');

if (cycleSteps.length > 0) {
    cycleSteps.forEach(step => {
        step.addEventListener('click', () => {
            // Remove active class from all
            cycleSteps.forEach(s => s.classList.remove('active'));
            cycleContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked step
            step.classList.add('active');

            // Show corresponding content
            const stepNum = step.getAttribute('data-step');
            const content = document.getElementById(`content-${stepNum}`);
            if (content) {
                content.classList.add('active');
            }
        });
    });
}
