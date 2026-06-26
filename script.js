/**
 * PlanetOS v2 — script.js
 */

"use strict";

/* ==========================================
   MUSIC LIBRARY CONFIG
   Add your playlists and tracks here.
   The player reads title/artist/cover from
   each MP3's embedded ID3 tags automatically.
   Just list the exact filenames as they are
   on disk — no renaming needed.
   ========================================== */

const MUSIC_LIBRARY = [
  {
    name:   "Kanye",
    folder: "Music/Kanye",
    cover:  "Music/Kanye/Cover.png",
    tracks: [
      "Circles.mp3",
      "Last Breath.mp3",
      "This A Must.mp3",
      "Whatever Works.mp3"
    ]
  },
  {
    name:   "Mac Miller",
    folder: "Music/Mac Miller",
    cover:  "Music/Mac Miller/Cover.png",
    tracks: [

    ]
  },
  {
    name:   "TLT",
    folder: "Music/TLT",
    cover:  "Music/TLT/Cover.png",
    tracks: [
	"1000 Doors.mp3",
	"BATIM.mp3",
	"Cut the Cord.mp3",
	"Drunk.mp3",
	"My Ordinary Life"
    ]
  }
];

/* ==========================================
   OS — core namespace
   ========================================== */

const OS = {

  state: {
    achievements: {},
    wallpaper: null,
    stats: {
      boots:                0,
      foldersOpened:        0,
      wallpapersChanged:    0,
      songsPlayed:          0,
      achievementsUnlocked: 0,
    }
  },

  ACHIEVEMENTS: {
    FIRST_LOGIN:       "First Login",
    FIRST_FOLDER:      "Opened your first folder",
    WALLPAPER_CHANGED: "Fresh Coat",
    MUSIC_LOVER:       "Hit Play",
    SECRET_FOUND:      "Behind the Curtain",
  },

  /* ==========================================
     SAVE / LOAD
     ========================================== */
  save: {
    KEY: "PlanetOS_v2",
    write() {
      try { localStorage.setItem(OS.save.KEY, JSON.stringify(OS.state)); }
      catch(e) { console.warn("PlanetOS: save failed", e); }
    },
    load() {
      try {
        const raw = localStorage.getItem(OS.save.KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        OS.state.achievements = data.achievements || {};
        OS.state.wallpaper    = data.wallpaper    || null;
        OS.state.stats        = Object.assign(OS.state.stats, data.stats || {});
      } catch(e) { console.warn("PlanetOS: load failed", e); }
    }
  },

  /* ==========================================
     WINDOWS
     ========================================== */
  windows: {
    _zBase: 100,
    _open:  new Set(),

    open(id) {
      const win = document.getElementById(id);
      if (!win) return;
      win.style.display = "block";
      win.classList.add("opening");
      win.addEventListener("animationend", () => win.classList.remove("opening"), { once: true });
      this._bringToFront(win);
      this._open.add(id);
      OS.taskbar.refresh();

      if (!OS._firstFolderDone) {
        OS._firstFolderDone = true;
        OS.achievements.unlock(OS.ACHIEVEMENTS.FIRST_FOLDER);
      }
      OS.state.stats.foldersOpened++;

      if (id === "music") OS.player.openPlayer();

      OS.startMenu.close();
    },

    close(id) {
      const win = document.getElementById(id);
      if (!win) return;
      win.style.display = "none";
      this._open.delete(id);
      OS.taskbar.refresh();
    },

    toggle(id) {
      const win = document.getElementById(id);
      if (!win) return;
      (win.style.display === "none" || !win.style.display)
        ? this.open(id) : this.close(id);
    },

    _bringToFront(win) {
      this._zBase++;
      win.style.zIndex = this._zBase;
    }
  },

  /* ==========================================
     TASKBAR
     ========================================== */
  taskbar: {
    refresh() {
      const bar = document.getElementById("taskItems");
      bar.innerHTML = "";
      OS.windows._open.forEach(id => {
        const win   = document.getElementById(id);
        const title = win ? (win.dataset.title || id) : id;
        const btn   = document.createElement("button");
        btn.className   = "taskItem";
        btn.textContent = title;
        btn.onclick = () => {
          const w = document.getElementById(id);
          if (!w) return;
          w.style.display === "none" ? OS.windows.open(id) : OS.windows._bringToFront(w);
        };
        bar.appendChild(btn);
      });
    }
  },

  /* ==========================================
     START MENU
     ========================================== */
  startMenu: {
    open()  { document.getElementById("startMenu").style.display = "block"; },
    close() { document.getElementById("startMenu").style.display = "none";  },
    toggle() {
      const m = document.getElementById("startMenu");
      m.style.display === "block" ? this.close() : this.open();
    }
  },

  /* ==========================================
     WALLPAPER
     ========================================== */
  wallpaper: {
    _pending: null,
    preview(path) {
      this._pending = path;
      document.getElementById("previewImage").src = path;
      OS.windows.open("imageViewer");
    },
    set() {
      const path = this._pending;
      if (!path) return;
      const d = document.querySelector(".desktop");
      d.style.backgroundImage    = `url('${path}')`;
      d.style.backgroundSize     = "cover";
      d.style.backgroundPosition = "center";
      OS.state.wallpaper = path;
      OS.state.stats.wallpapersChanged++;
      OS.save.write();
      OS.achievements.unlock(OS.ACHIEVEMENTS.WALLPAPER_CHANGED);
      OS.notify.show("Wallpaper Updated", path.split("/").pop(), "notice");
    },
    restore() {
      const saved = OS.state.wallpaper;
      if (!saved) return;
      const d = document.querySelector(".desktop");
      d.style.backgroundImage    = `url('${saved}')`;
      d.style.backgroundSize     = "cover";
      d.style.backgroundPosition = "center";
    }
  },

  /* ==========================================
     NOTIFICATIONS
     ========================================== */
  notify: {
    show(title, body, type = "notice") {
      const icons  = { notice:"💬", award:"🏆", alert:"⚠️" };
      const sounds = { notice:"SFX/notice.mp3", award:"SFX/award.mp3", alert:"SFX/alert.mp3" };
      const el = document.createElement("div");
      el.className    = "notification";
      el.dataset.type = type;
      el.innerHTML = `
        <div class="notificationIcon">${icons[type] || "💬"}</div>
        <div>
          <div class="notificationTitle">${title}</div>
          <div class="notificationBody">${body}</div>
        </div>`;
      document.getElementById("notificationContainer").appendChild(el);
      new Audio(sounds[type] || sounds.notice).play().catch(() => {});
      requestAnimationFrame(() => el.classList.add("show"));
      setTimeout(() => {
        el.classList.remove("show");
        el.classList.add("hide");
        setTimeout(() => el.remove(), 380);
      }, 4000);
    }
  },

  /* ==========================================
     ACHIEVEMENTS
     ========================================== */
  achievements: {
    unlock(name) {
      if (OS.state.achievements[name]) return;
      OS.state.achievements[name] = { unlocked: true, date: new Date().toLocaleDateString() };
      OS.state.stats.achievementsUnlocked++;
      OS.save.write();
      OS.notify.show("Achievement Unlocked", name, "award");
      OS._refreshStats();
    }
  },

  /* ==========================================
     CLOCK
     ========================================== */
  clock: {
    start() {
      const el = document.getElementById("taskClock");
      const tick = () => {
        const now = new Date();
        el.textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      };
      tick();
      setInterval(tick, 10000);
    }
  },

  /* ==========================================
     DRAG SYSTEM
     ========================================== */
  drag: {
    _active: null, _ox: 0, _oy: 0,
    init() {
      document.querySelectorAll(".window").forEach(win => {
        win.querySelector(".titlebar")?.addEventListener("mousedown", e => {
          if (e.target.classList.contains("winBtn")) return;
          OS.drag._active = win;
          const r = win.getBoundingClientRect();
          OS.drag._ox = e.clientX - r.left;
          OS.drag._oy = e.clientY - r.top;
          OS.windows._bringToFront(win);
          e.preventDefault();
        });
      });
      document.addEventListener("mousemove", e => {
        if (!OS.drag._active) return;
        OS.drag._active.style.left = (e.clientX - OS.drag._ox) + "px";
        OS.drag._active.style.top  = (e.clientY - OS.drag._oy) + "px";
      });
      document.addEventListener("mouseup", () => { OS.drag._active = null; });
    }
  },

  /* ==========================================
     MUSIC PLAYER
     ========================================== */
  player: {
    audio:           new Audio(),
    currentPlaylist: null,   // index into MUSIC_LIBRARY
    currentTrack:    null,   // index into playlist.tracks
    trackMeta:       [],     // cached { title, artist, cover } per track in current playlist
    isPlaying:       false,
    _progressRaf:    null,

    /* Called when the music window opens */
    openPlayer() {
      this._renderPlaylists();
    },

    /* ---- VIEW: Playlist grid ---- */
    _renderPlaylists() {
      const content = document.querySelector("#music .content");
      content.innerHTML = `
        <div class="playerHeader">
          <span class="playerTitle">🎵 Planet Player</span>
        </div>
        <div class="playlistGrid" id="playlistGrid"></div>
      `;
      const grid = document.getElementById("playlistGrid");
      MUSIC_LIBRARY.forEach((pl, i) => {
        const card = document.createElement("div");
        card.className = "playlistCard";
        card.innerHTML = `
          <div class="playlistCardName">${pl.name}</div>
          <div class="playlistCardCount">${pl.tracks.length} track${pl.tracks.length !== 1 ? "s" : ""}</div>
        `;
        card.onclick = () => this._openPlaylist(i);
        grid.appendChild(card);
      });
    },

    /* ---- VIEW: Track list ---- */
    _openPlaylist(plIndex) {
      this.currentPlaylist = plIndex;
      const pl = MUSIC_LIBRARY[plIndex];
      // Reset cached meta for this playlist
      this.trackMeta = pl.tracks.map(() => null);

      const content = document.querySelector("#music .content");
      content.innerHTML = `
        <div class="playerHeader">
          <button class="backBtn" id="playerBack">◀ Back</button>
          <span class="playerTitle">${pl.name}</span>
        </div>
        <div class="trackListWrap">
          <div class="playlistBanner">
            <button class="playlistBannerInfo">
              <div class="playlistBannerName">${pl.name}</div>
              <div class="playlistBannerCount">${pl.tracks.length} tracks</div>
            </button>
          </div>
          <div class="trackList" id="trackList"></div>
        </div>
        ${this._nowPlayingBarHTML()}
      `;

      document.getElementById("playerBack").onclick = () => this._renderPlaylists();
      this._bindNowPlayingBar();
      this._renderTrackList(pl);

      // If something is already playing from this playlist, restore UI state
      if (this.currentTrack !== null && this.isPlaying) {
        this._highlightTrack(this.currentTrack);
        this._updateNowPlayingUI();
      }
    },

    /* Render track rows, then async-load metadata for each */
    _renderTrackList(pl) {
      const list = document.getElementById("trackList");
      list.innerHTML = "";
      pl.tracks.forEach((filename, i) => {
        const row = document.createElement("div");
        row.className = "trackRow";
        row.id = `track-row-${i}`;
        row.innerHTML = `
          <div class="trackNum">${i + 1}</div>
          <div class="trackInfo role="button"">
            <div class="trackName" id="track-name-${i}">${this._stripExt(filename)}</div>
            <div class="trackArtist" id="track-artist-${i}">—</div>
          </div>
          <div class="trackDuration" id="track-dur-${i}">—</div>
        `;
        row.onclick = () => this.playTrack(i);
        list.appendChild(row);

        // Async: load ID3 tags from the MP3
        this._loadMeta(pl, i);
      });
    },

    /* Load ID3 tags using jsmediatags */
    _loadMeta(pl, i) {
      const path = `${pl.folder}/${pl.tracks[i]}`;
      if (typeof jsmediatags === "undefined") return;
      jsmediatags.read(path, {
        onSuccess: (tag) => {
          const t = tag.tags;
          const title  = t.title  || this._stripExt(pl.tracks[i]);
          const artist = t.artist || "Unknown Artist";
          let coverSrc = pl.cover;

          if (t.picture) {
            const pic  = t.picture;
            const b64  = btoa(String.fromCharCode(...new Uint8Array(pic.data)));
            coverSrc   = `data:${pic.format};base64,${b64}`;
          }

          this.trackMeta[i] = { title, artist, cover: coverSrc };

          // Update the row if it's still rendered
          const nameEl   = document.getElementById(`track-name-${i}`);
          const artistEl = document.getElementById(`track-artist-${i}`);
          const thumbEl  = document.querySelector(`#track-row-${i} .trackThumb`);
          if (nameEl)   nameEl.textContent   = title;
          if (artistEl) artistEl.textContent = artist;
          if (thumbEl)  thumbEl.src           = coverSrc;

          // If this is the current track, refresh the now-playing bar too
          if (this.currentTrack === i) this._updateNowPlayingUI();
        },
        onError: () => {
          this.trackMeta[i] = {
            title:  this._stripExt(pl.tracks[i]),
            artist: "Unknown Artist",
            cover:  pl.cover
          };
        }
      });

      // Also get duration via a temporary Audio element
      const tmpAudio = new Audio();
      tmpAudio.src = path;
      tmpAudio.addEventListener("loadedmetadata", () => {
        const durEl = document.getElementById(`track-dur-${i}`);
        if (durEl) durEl.textContent = this._fmtTime(tmpAudio.duration);
      });
    },

    /* ---- Playback ---- */
    playTrack(trackIndex) {
      const pl   = MUSIC_LIBRARY[this.currentPlaylist];
      const path = `${pl.folder}/${pl.tracks[trackIndex]}`;

      this.currentTrack = trackIndex;
      this.audio.src    = path;
      this.audio.play().then(() => {
        this.isPlaying = true;
        OS.state.stats.songsPlayed++;
        OS.achievements.unlock(OS.ACHIEVEMENTS.MUSIC_LOVER);
        OS.save.write();
        this._highlightTrack(trackIndex);
        this._updateNowPlayingUI();
        this._startProgress();
      }).catch(e => console.warn("Playback error:", e));
    },

    togglePlay() {
      if (this.currentTrack === null) return;
      if (this.isPlaying) {
        this.audio.pause();
        this.isPlaying = false;
      } else {
        this.audio.play();
        this.isPlaying = true;
      }
      this._updatePlayBtn();
    },

    prevTrack() {
      if (this.currentPlaylist === null) return;
      const pl  = MUSIC_LIBRARY[this.currentPlaylist];
      const idx = this.currentTrack === null ? 0
                : (this.currentTrack - 1 + pl.tracks.length) % pl.tracks.length;
      this.playTrack(idx);
    },

    nextTrack() {
      if (this.currentPlaylist === null) return;
      const pl  = MUSIC_LIBRARY[this.currentPlaylist];
      const idx = this.currentTrack === null ? 0
                : (this.currentTrack + 1) % pl.tracks.length;
      this.playTrack(idx);
    },

    seek(e) {
      if (this.currentTrack === null || !this.audio.duration) return;
      const bar  = e.currentTarget;
      const pct  = (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth;
      this.audio.currentTime = pct * this.audio.duration;
    },

    setVolume(val) {
      this.audio.volume = val;
      const ic = document.getElementById("volIcon");
      if (ic) ic.textContent = val == 0 ? "🔇" : val < 0.5 ? "🔉" : "🔊";
    },

    /* ---- Now Playing Bar HTML ---- */
    _nowPlayingBarHTML() {
      return `
        <div class="nowPlayingBar" id="nowPlayingBar">
          <img class="npCover" id="npCover" src="" alt="">
          <div class="npMeta">
            <div class="npTitle"  id="npTitle">No track selected</div>
            <div class="npArtist" id="npArtist">—</div>
          </div>
          <div class="npControls">
            <button class="npBtn" onclick="OS.player.prevTrack()" title="Previous">⏮</button>
            <button class="npBtn npPlay" id="npPlay" onclick="OS.player.togglePlay()" title="Play/Pause">▶</button>
            <button class="npBtn" onclick="OS.player.nextTrack()" title="Next">⏭</button>
          </div>
          <div class="npProgress">
            <span class="npTime" id="npCurrent">0:00</span>
            <div class="progressBar" id="progressBar">
              <div class="progressFill" id="progressFill"></div>
            </div>
            <span class="npTime" id="npTotal">0:00</span>
          </div>
          <div class="npVolume">
            <span id="volIcon">🔊</span>
            <input type="range" class="volSlider" min="0" max="1" step="0.02" value="1"
              oninput="OS.player.setVolume(this.value)">
          </div>
        </div>
      `;
    },

    _bindNowPlayingBar() {
      // Auto-advance
      this.audio.onended = () => this.nextTrack();

      const bar = document.getElementById("progressBar");
      if (bar) bar.onclick = (e) => this.seek(e);
    },

    _updateNowPlayingUI() {
      const pl   = this.currentPlaylist !== null ? MUSIC_LIBRARY[this.currentPlaylist] : null;
      const meta = (pl && this.currentTrack !== null) ? this.trackMeta[this.currentTrack] : null;

      const title  = meta?.title  || (pl ? this._stripExt(pl.tracks[this.currentTrack]) : "No track selected");
      const artist = meta?.artist || "Unkown Artist";

      const npTitle  = document.getElementById("npTitle");
      const npArtist = document.getElementById("npArtist");
      if (npTitle)  npTitle.textContent  = title;
      if (npArtist) npArtist.textContent = artist;

      this._updatePlayBtn();
    },

    _updatePlayBtn() {
      const btn = document.getElementById("npPlay");
      if (btn) btn.textContent = this.isPlaying ? "⏸" : "▶";
    },

    _highlightTrack(index) {
      document.querySelectorAll(".trackRow").forEach(r => r.classList.remove("playing"));
      const row = document.getElementById(`track-row-${index}`);
      if (row) {
        row.classList.add("playing");
        row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    },

    _startProgress() {
      if (this._progressRaf) cancelAnimationFrame(this._progressRaf);
      const tick = () => {
        const fill    = document.getElementById("progressFill");
        const current = document.getElementById("npCurrent");
        const total   = document.getElementById("npTotal");
        if (fill && this.audio.duration) {
          fill.style.width = (this.audio.currentTime / this.audio.duration * 100) + "%";
        }
        if (current) current.textContent = this._fmtTime(this.audio.currentTime);
        if (total)   total.textContent   = this._fmtTime(this.audio.duration || 0);
        this._progressRaf = requestAnimationFrame(tick);
      };
      tick();
    },

    /* ---- Helpers ---- */
    _stripExt(filename) {
      return filename.replace(/\.[^/.]+$/, "");
    },

    _fmtTime(secs) {
      if (!secs || isNaN(secs)) return "0:00";
      const m = Math.floor(secs / 60);
      const s = String(Math.floor(secs % 60)).padStart(2, "0");
      return `${m}:${s}`;
    }
  },

  /* ==========================================
     LOGIN
     ========================================== */
  login() {
    document.getElementById("loginSfx")?.play().catch(() => {});
    const screen = document.getElementById("loginScreen");
    screen.classList.add("fade");
    setTimeout(() => screen.style.display = "none", 750);
    OS.state.stats.boots++;
    OS.save.write();
    OS.achievements.unlock(OS.ACHIEVEMENTS.FIRST_LOGIN);
    OS._refreshStats();
  },

  reset() {
    if (!confirm("Reset PlanetOS? All data will be lost.")) return;
    localStorage.removeItem(OS.save.KEY);
    location.reload();
  },

  _refreshStats() {
    const s = OS.state.stats;
    const a = OS.state.achievements;
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el("stat-boots",        s.boots || 0);
    el("stat-folders",      s.foldersOpened || 0);
    el("stat-achievements", Object.keys(a).length);
  },

  /* ==========================================
     INIT
     ========================================== */
  init() {
    OS.save.load();
    OS.wallpaper.restore();
    OS.drag.init();
    OS.clock.start();
    OS._refreshStats();

    document.addEventListener("click", e => {
      const menu = document.getElementById("startMenu");
      const btn  = document.querySelector(".startBtn");
      if (menu.style.display === "block" && !menu.contains(e.target) && e.target !== btn) {
        OS.startMenu.close();
      }
    });
  }

};

/* ==========================================
   LEGACY SHIMS
   ========================================== */
function openWindow(id)          { OS.windows.open(id);          }
function closeWindow(id)         { OS.windows.close(id);         }
function toggleStart()           { OS.startMenu.toggle();        }
function login()                 { OS.login();                   }
function previewWallpaper(path)  { OS.wallpaper.preview(path);   }
function setWallpaper()          { OS.wallpaper.set();           }
function unlockAchievement(name) { OS.achievements.unlock(name); }

document.addEventListener("DOMContentLoaded", () => OS.init());
