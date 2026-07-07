// pieces.js
// Turns a polygon + image into an actual draggable piece on the board.

window.SS = window.SS || {};

SS.Pieces = (function () {

  function createPieceEl(boardEl, polygon, squareCanvas, r, c, tileSize, margin) {
    const canvasSize = tileSize + margin * 2;
    const pc = document.createElement('canvas');
    pc.width = canvasSize;
    pc.height = canvasSize;
    const ctx = pc.getContext('2d');

    ctx.save();
    ctx.beginPath();
    polygon.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(squareCanvas, -(c * tileSize - margin), -(r * tileSize - margin));
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    polygon.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    ctx.restore();

    const el = document.createElement('div');
    el.className = 'piece';
    el.style.width = canvasSize + 'px';
    el.style.height = canvasSize + 'px';
    el.appendChild(pc);
    boardEl.appendChild(el);

    return { el, size: canvasSize };
  }

  function attachDrag(piece, getBoardEl, tileSize, callbacks) {
    const el = piece.el;
    let dragging = false;
    let startPX = 0, startPY = 0, startX = 0, startY = 0;
    let scale = 1;

    function getScale() {
      const m = el.style.transform.match(/scale\(([\d.]+)\)/);
      return m ? parseFloat(m[1]) : 1;
    }

    function pointFromEvent(e) {
      const rect = getBoardEl().getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function pointerDown(e) {
      if (piece.placed) return;
      dragging = true;
      scale = getScale();
      const p = pointFromEvent(e);
      startPX = p.x; startPY = p.y;
      startX = piece.x; startY = piece.y;
      el.classList.add('dragging');
      e.preventDefault();
    }

    function pointerMove(e) {
      if (!dragging) return;
      const p = pointFromEvent(e);
      piece.x = startX + (p.x - startPX);
      piece.y = startY + (p.y - startPY);
      el.style.transform = `translate(${piece.x}px, ${piece.y}px) scale(${scale})`;
    }

    function pointerUp(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');

      const dist = Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY);
      let snapped = false;
      if (dist < tileSize * 0.35) {
        piece.x = piece.homeX;
        piece.y = piece.homeY;
        el.style.transform = `translate(${piece.x}px, ${piece.y}px) scale(1)`;
        piece.placed = true;
        el.classList.add('placed', 'pop');
        setTimeout(() => el.classList.remove('pop'), 300);
        snapped = true;
      }
      callbacks.onDrop(piece, snapped);
    }

    el.addEventListener('pointerdown', pointerDown);
    document.addEventListener('pointermove', pointerMove);
    document.addEventListener('pointerup', pointerUp);
    
    return function cleanup() {
      document.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('pointerup', pointerUp);
    };
  }

  function layoutTray(pieces, boardSize, boardOffset) {
    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    const order = shuffle([...pieces]);
    const refTile = pieces.length ? pieces[0].size : 80;
    const cols = Math.max(3, Math.floor(boardSize / (refTile * 0.9)));
    const scale = 0.72;

    order.forEach((piece, idx) => {
      piece.placed = false;
      piece.el.classList.remove('placed');
      const rowI = Math.floor(idx / cols);
      const colI = idx % cols;
      const cellW = piece.size * scale + 8;
      const x = 8 + colI * cellW;
      const y = boardSize + boardOffset * 2 + 16 + rowI * (piece.size * scale + 8);
      piece.x = x;
      piece.y = y;
      piece.el.style.transformOrigin = 'top left';
      piece.el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    });

    return { cols, scale };
  }

  return { createPieceEl, attachDrag, layoutTray };
})();
