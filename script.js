document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');

    const planets = document.querySelectorAll('.planet');
    const orbits = document.querySelectorAll('.orbit');
    const audio = document.getElementById('audio-player');

    const playlistEl = document.getElementById('playlist');
    const metaTitle = document.getElementById('meta-title');
    const metaArtist = document.getElementById('meta-artist');
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const playPauseBtn = document.getElementById("play-pause");
    const muteBtn = document.getElementById("mute");
    const volumeBtn = document.getElementById("volumeSlider");
    const audioControls = document.getElementById("audioControls");
    const volumeSlider = document.getElementById("volumeSlider");
    const volumeTrack = document.getElementById("volumeTrack");
    const volumeFill = document.getElementById("volumeFill");
    const playIcon = document.querySelector('.fa-play');
    const pauseIcon = document.querySelector('.fa-pause');
    
    // Initially hide controls
    audioControls.style.display = "none";

    // Show controls when audio starts
    audio.addEventListener("play", () => {
        audioControls.style.display = "flex";
        playPauseBtn.classList.add("playing");
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'inline-block';
        audio.volume = 0.5; // Initial volume 50%
        volumeFill.style.width = "50%"; // Fill 50% on start
    });

    // Hide when audio ends
    audio.addEventListener("pause", () => {
        playPauseBtn.classList.remove("playing");
    });
    audio.addEventListener("ended", () => {
        playPauseBtn.classList.remove("playing");

        if (loopMode === 2) {
            // Loop playlist: find current index, play next, loop back if at end
            const currentIndex = tracks.findIndex(t => t.src === audio.src);
            const nextIndex = (currentIndex + 1) % tracks.length;
            playTrack(nextIndex);
        } else {
            // Stop UI if not looping
            audioControls.style.display = "none";
        }
    });





    // Play/Pause toggle
    playPauseBtn.addEventListener("click", () => {
        if (audio.src && !audio.paused) {
            audio.pause();
            pauseIcon.style.display = 'none';
            playIcon.style.display = 'inline-block';
        } else if (audio.src) {
            audio.play();

        }
    });

    const loopBtn = document.getElementById("loop");
    const loopIcons = loopBtn.querySelectorAll("i");

    let loopMode = 0; // 0 = no loop, 1 = loop current, 2 = loop playlist

    function updateLoopIcons() {
        loopIcons.forEach((icon, index) => {
            icon.style.display = index === loopMode ? "inline" : "none";
        });

        switch (loopMode) {
            case 0:
                audio.loop = false;
                break;
            case 1:
                audio.loop = true;
                break;
            case 2:
                audio.loop = false; // we'll handle playlist loop manually
                break;
        }
    }

    loopBtn.addEventListener("click", () => {
        loopMode = (loopMode + 1) % 3;
        updateLoopIcons();
    });

    updateLoopIcons(); // Initialize correct icon and behavior


    // Mute toggle
    muteBtn.addEventListener("click", () => {
        audio.muted = !audio.muted;
        muteBtn.classList.toggle("muted", audio.muted);
    });

    // Volume div slider
    volumeSlider.addEventListener("click", (e) => {
        const rect = volumeTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, clickX / rect.width));
        volumeFill.style.width = `${percent * 100}%`;
        audio.volume = percent;
    });

    volumeFill.style.width = "100%";
    audio.volume = 1;

    let audioCtx, analyser;

    // Setup tracks
    const tracks = Array.from(planets).map((p, i) => {
        console.log(`Planet ${i}: ${p.dataset.src}`);
        return {
            src: p.dataset.src,
            bpm: +p.dataset.bpm,
            el: p
        };
    });

    // Resize canvas
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Initialize audio context and analyser
    function initAudio() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 256;
        drawVisualizer();
    }

    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        if (!analyser) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let x = 0;
        const barW = (canvas.width / data.length) * 2.5;
        data.forEach(v => {
            ctx.fillStyle = `rgba(${v + 50},${100 * (x / canvas.width)},200,0.7)`;
            ctx.fillRect(x, canvas.height - v, barW, v);
            x += barW + 1;
        });
    }

    // Populate playlist UI
    tracks.forEach((t, i) => {
        const li = document.createElement('li');
        li.textContent = `Track ${i + 1}`;
        li.onclick = () => playTrack(i);
        playlistEl.appendChild(li);
    });

    function playTrack(i) {
        audio.crossOrigin = 'anonymous';
        if (!audioCtx) initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const t = tracks[i];
        console.log(`Playing ${t.src}`);

        // Update metadata display
        metaTitle.textContent = `Track ${i + 1}`;
        metaArtist.textContent = `BPM: ${t.bpm}`;

        // Stop current, set new source
        audio.pause();
        audio.src = t.src;
        audio.load();

        // Ensure only one listener and correct timing
        audio.addEventListener('canplay', function handler() {
            audio.currentTime = 0;
            audio.play().catch(e => console.error(e));
            audio.removeEventListener('canplay', handler);
        });

        // Animate planet
        // Reset all planets
        planets.forEach(p => {
            p.classList.remove('active');
            p.querySelector('img').classList.remove('glow'); // Remove glow from img
            p.style.transform = "translate(-50%, -50%) scale(1)";
        });

        // Zoom the clicked planet
        t.el.classList.add('active');
        t.el.querySelector('img').classList.add('glow'); // Add glow to active img
        t.el.style.transform = "translate(-50%, -50%) scale(1.5)";


        // 🌟 NEW: Orbit glow effect
        orbits.forEach(o => o.classList.remove('glow')); // remove from all
        const orbit = t.el.closest('.orbit'); // get the one for this planet
        if (orbit) orbit.classList.add('glow'); // add glow to selected
    }

    // Attach click events to orbits and planets
    planets.forEach((planet, i) => {
        planet.addEventListener("click", function (e) {
            e.stopPropagation();
            console.log("planet clicked", i);
            playTrack(i);
        });
    });

    orbits.forEach((orbit, i) => {
        orbit.addEventListener("click", function (e) {
            e.stopPropagation();
            console.log("orbit clicked", i);
            playTrack(i);
        });
    });

});