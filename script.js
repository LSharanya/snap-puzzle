(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const state = {
    sourceImage: null,
    N: 4,
    boardSize: 0,
    tileSize: 0,
    tabSize: 0,
    boardOffset: 0,
    pieces: [],
    placedCount: 0,
    moves: 0,
    timerStart: null,
    timerInterval: null,
    cleanupFns: []
  };

  // ---------- Step 1: acquiring an image ----------
  const fileInput = $('file-input');

  $('btn-upload').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFromFile(f);
    fileInput.value = '';
  });

  // ---------- Camera ----------
  let cameraStream = null;
  const cameraModal = $('camera-modal');
  const cameraVideo = $('camera-video');
  const cameraStatus = $('camera-status');

  $('btn-camera').addEventListener('click', openCamera);
  $('btn-camera-cancel').addEventListener('click', closeCamera);
  $('btn-camera-shot').addEventListener('click', takePhoto);

  async function openCamera() {
    cameraModal.classList.add('show');
    cameraStatus.textContent = 'Starting camera…';
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();
      cameraStatus.textContent = 'Center yourself and take the shot.';
    } catch (err) {
      cameraStatus.textContent = "Couldn't access your camera.";
    }
  }

  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    cameraVideo.srcObject = null;
    cameraModal.classList.remove('show');
  }

  function takePhoto() {
    if (!cameraStream || !cameraVideo.videoWidth) return;
    const cv = document.createElement('canvas');
    cv.width = cameraVideo.videoWidth;
    cv.height = cameraVideo.videoHeight;
    const ctx = cv.getContext('2d');
    ctx.translate(cv.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cameraVideo, 0, 0);
    closeCamera();
    loadFromDataURL(cv.toDataURL('image/png'));
  }

  // ---------- Paste ----------
  const pasteBtn = $('btn-paste');
  pasteBtn.addEventListener('click', () => {
    pasteBtn.classList.add('active-paste');
    pasteBtn.querySelector('.lbl').textContent = 'Now press Ctrl+V…';
    pasteBtn.focus();
  });

  document.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        loadFromFile(item.getAsFile());
        pasteBtn.classList.remove('active-paste');
        pasteBtn.querySelector('.lbl').textContent = 'Paste a screenshot';
        break;
      }
    }
  });

  function loadFromFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => loadFromDataURL(ev.target.result);
    reader.readAsDataURL(file);
  }

  function loadFromDataURL(dataUrl) {
    const img = new Image();
    img.onload = () => {
      state.sourceImage = img;
      $('preview-img').src = dataUrl;
      $('step-capture').classList.add('hidden');
      $('step-difficulty').classList.remove('hidden');
      window.scrollTo({ top: $('step-difficulty').offsetTop - 20, behavior: 'smooth' });
    };
    img.src = dataUrl;
  }

  // ---------- Difficulty ----------
  document.querySelectorAll('#diff-row .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#diff-row .pill').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.N = parseInt(btn.dataset.n, 10);
    });
  });

  $('btn-go').addEventListener('click', () => {
    if (!state.sourceImage) return;
    $('step-difficulty').classList.add('hidden');
    $('step-game').classList.remove('hidden');
    startPuzzle();
  });

  $('btn-newimage').addEventListener('click', () => {
    stopTimer();
    cleanupPieces();
    $('step-game').classList.add('hidden');
    $('step-capture').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('btn-reshuffle').addEventListener('click', () => {
    cleanupPieces();
    startPuzzle();
  });

  $('btn-hint').addEventListener('click', () => {
    $('ghost').classList.toggle('show');
    $('btn-hint').classList.toggle('on');
  });

  $('btn-again').addEventListener('click', () => {
    $('win-modal').classList.remove('show');
    cleanupPieces();
    startPuzzle();
  });

  // ---------- Cleanup ----------
  function cleanupPieces() {
    state.cleanupFns.forEach(fn => fn());
    state.cleanupFns = [];
    state.pieces = [];
    state.placedCount = 0;
    $('board').querySelectorAll('.piece').forEach(el => el.remove());
    $('tray').innerHTML = '';
  }

  // ---------- Puzzle ----------
  function startPuzzle() {
    if (!state.sourceImage) return;

    state.boardSize = SS.Puzzle.pickBoardSize();
    state.tileSize = state.boardSize / state.N;
    state.tabSize = state.tileSize * 0.20;
    state.boardOffset = state.tabSize + 2;

    const board = $('board');
    board.style.width = (state.boardSize + state.boardOffset * 2) + 'px';
    board.style.height = (state.boardSize + state.boardOffset * 2) + 'px';
    board.querySelectorAll('.piece').forEach(el => el.remove());

    const tray = $('tray');
    tray.innerHTML = '';

    const squareCanvas = SS.Puzzle.cropToSquare(state.sourceImage, state.boardSize);

    const ghost = $('ghost');
    ghost.src = squareCanvas.toDataURL('image/png');
    ghost.style.left = state.boardOffset + 'px';
    ghost.style.top = state.boardOffset + 'px';
    ghost.style.width = state.boardSize + 'px';
    ghost.style.height = state.boardSize + 'px';
    ghost.classList.remove('show');
    $('btn-hint').classList.remove('on');

    // Build pieces on board first
    buildPieces(board, squareCanvas);
    
    // Then move them to tray
    layoutSideTray(state.pieces);

    $('tray-count').textContent = state.pieces.length + ' pieces';

    resetStats();
    startTimer();
  }

  function buildPieces(board, squareCanvas) {
    const N = state.N;
    const margin = state.tabSize;
    const signs = SS.Puzzle.generateSignGrids(N);

    state.pieces = [];
    state.placedCount = 0;
    state.cleanupFns = [];

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const polygon = SS.Puzzle.computePiecePolygon(r, c, N, state.tileSize, margin, state.tabSize, signs);
        const { el, size } = SS.Pieces.createPieceEl(board, polygon, squareCanvas, r, c, state.tileSize, margin);

        const homeX = state.boardOffset + c * state.tileSize - margin;
        const homeY = state.boardOffset + r * state.tileSize - margin;

        const piece = { r, c, el, homeX, homeY, x: 0, y: 0, placed: false, size };
        state.pieces.push(piece);

        const cleanup = SS.Pieces.attachDrag(piece, () => $('board'), state.tileSize, {
          onDrop: (p, snapped) => {
            state.moves++;
            if (snapped) state.placedCount++;
            updateStats();
            if (snapped) checkWin();
          }
        });
        state.cleanupFns.push(cleanup);
      }
    }
  }

  function layoutSideTray(pieces) {
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    const order = shuffle([...pieces]);
    const tray = $('tray');
    
    // Calculate piece size based on tray width
    const trayWidth = tray.clientWidth || 220;
    const cols = Math.max(2, Math.floor(trayWidth / (pieces[0].size * 0.55)));
    const scale = Math.min(0.55, (trayWidth / cols) / pieces[0].size);

    order.forEach((piece, idx) => {
      piece.placed = false;
      piece.el.classList.remove('placed');
      
      const rowI = Math.floor(idx / cols);
      const colI = idx % cols;
      const cellW = piece.size * scale + 4;
      const x = colI * cellW;
      const y = rowI * (piece.size * scale + 4);
      
      piece.x = x;
      piece.y = y;
      piece.el.style.transformOrigin = 'top left';
      piece.el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      
      // Move piece from board to tray
      tray.appendChild(piece.el);
    });
  }

  // ---------- Stats ----------
  function resetStats() {
    state.moves = 0;
    state.placedCount = 0;
    updateStats();
  }
  
  function updateStats() {
    $('stat-moves').textContent = state.moves;
    $('stat-left').textContent = (state.pieces.length - state.placedCount);
  }
  
  function startTimer() {
    stopTimer();
    state.timerStart = Date.now();
    state.timerInterval = setInterval(() => {
      const secs = Math.floor((Date.now() - state.timerStart) / 1000);
      const m = Math.floor(secs / 60), s = secs % 60;
      $('stat-time').textContent = m + ':' + String(s).padStart(2, '0');
    }, 300);
  }
  
  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function checkWin() {
    if (state.placedCount === state.pieces.length) {
      stopTimer();
      const secs = Math.floor((Date.now() - state.timerStart) / 1000);
      const m = Math.floor(secs / 60), s = secs % 60;
      $('win-stats').textContent = `Done in ${m}:${String(s).padStart(2, '0')} with ${state.moves} moves.`;
      $('win-modal').classList.add('show');
      launchConfetti();
    }
  }

  function launchConfetti() {
    const card = $('win-card');
    const colors = ['#FFC94D', '#4FD1C5', '#FF6F61', '#a996d6'];
    for (let i = 0; i < 36; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (1.2 + Math.random() * 1.2) + 's';
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      card.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }
  }

})();
