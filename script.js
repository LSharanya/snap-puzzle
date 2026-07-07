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

  // Clear tray
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

  buildPieces(board, squareCanvas);
  
  // Layout pieces in side tray instead of bottom
  layoutSideTray(state.pieces, state.boardSize);

  $('tray-count').textContent = state.pieces.length + ' pieces';

  resetStats();
  startTimer();
}

function layoutSideTray(pieces, boardSize) {
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const order = shuffle([...pieces]);
  const tray = $('tray');
  tray.innerHTML = '';
  
  // Calculate size based on tray width
  const trayWidth = Math.min(260, window.innerWidth - boardSize - 80);
  const cols = Math.max(2, Math.floor(trayWidth / (pieces[0].size * 0.6)));
  const scale = Math.min(0.6, (trayWidth / cols) / pieces[0].size);

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
