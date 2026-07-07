// puzzle.js
// Pure geometry & image-processing helpers for generating the jigsaw grid.

window.SS = window.SS || {};

SS.Puzzle = (function () {

  function pickBoardSize() {
    const maxW = Math.min(560, window.innerWidth - 64);
    return Math.max(280, maxW);
  }

  function tabPoints(length, sign, tabSize) {
    if (sign === 0) {
      return [{ a: 0, p: 0 }, { a: length, p: 0 }];
    }
    const s = sign * tabSize;
    return [
      { a: 0, p: 0 },
      { a: length * 0.32, p: 0 },
      { a: length * 0.40, p: s },
      { a: length * 0.60, p: s },
      { a: length * 0.68, p: 0 },
      { a: length, p: 0 }
    ];
  }

  function generateSignGrids(N) {
    const vSign = [];
    const hSign = [];
    for (let r = 0; r < N; r++) {
      vSign[r] = [];
      for (let c = 0; c < N - 1; c++) vSign[r][c] = Math.random() < 0.5 ? -1 : 1;
    }
    for (let r = 0; r < N - 1; r++) {
      hSign[r] = [];
      for (let c = 0; c < N; c++) hSign[r][c] = Math.random() < 0.5 ? -1 : 1;
    }
    return { vSign, hSign };
  }

  function computePiecePolygon(r, c, N, tileSize, margin, tabSize, signs) {
    const { vSign, hSign } = signs;

    const topPts    = r === 0     ? tabPoints(tileSize, 0, tabSize) : tabPoints(tileSize, hSign[r - 1][c], tabSize);
    const bottomPts = r === N - 1 ? tabPoints(tileSize, 0, tabSize) : tabPoints(tileSize, hSign[r][c], tabSize);
    const rightPts  = c === N - 1 ? tabPoints(tileSize, 0, tabSize) : tabPoints(tileSize, vSign[r][c], tabSize);
    const leftPts   = c === 0     ? tabPoints(tileSize, 0, tabSize) : tabPoints(tileSize, vSign[r][c - 1], tabSize);

    const poly = [];
    topPts.forEach(pt => poly.push([margin + pt.a, margin + pt.p]));
    rightPts.forEach(pt => poly.push([margin + tileSize + pt.p, margin + pt.a]));
    [...bottomPts].reverse().forEach(pt => poly.push([margin + pt.a, margin + tileSize + pt.p]));
    [...leftPts].reverse().forEach(pt => poly.push([margin + pt.p, margin + pt.a]));
    return poly;
  }

  function cropToSquare(image, size) {
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext('2d');
    const iw = image.naturalWidth, ih = image.naturalHeight;
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2, sy = (ih - side) / 2;
    ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
    return cv;
  }

  return { pickBoardSize, tabPoints, generateSignGrids, computePiecePolygon, cropToSquare };
})();
