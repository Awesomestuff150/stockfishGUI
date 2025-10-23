import { EngineController } from './engine-controller.js';

const PIECE_GLYPHS = {
  w: {
    k: '♔',
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
    p: '♙'
  },
  b: {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟'
  }
};

const STARTING_COUNTS = {
  w: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 },
  b: { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 }
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const DEFAULT_ENGINE_LABEL = 'Bundled Stockfish.js';
const DEFAULT_BEST_LINE_MESSAGE = 'Engine line will appear here.';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('game-status');
const moveListEl = document.getElementById('move-list');
const evaluationFillEl = document.getElementById('evaluation-fill');
const evaluationLabelEl = document.getElementById('evaluation-label');
const bestLineEl = document.getElementById('best-line');
const analysisLinesEl = document.getElementById('analysis-lines');
const capturedByPlayerEl = document.getElementById('captured-by-player');
const capturedByEngineEl = document.getElementById('captured-by-engine');
const clockWhiteEl = document.querySelector('#clock-white .clock-display');
const clockBlackEl = document.querySelector('#clock-black .clock-display');
const colorSelectEl = document.getElementById('color-select');
const timeControlEl = document.getElementById('time-control');
const skillSliderEl = document.getElementById('skill-level');
const skillLabelEl = document.getElementById('skill-level-value');
const engineNameEl = document.getElementById('engine-name');
const engineImportButton = document.getElementById('engine-import');
const engineResetButton = document.getElementById('engine-reset');
const engineFileInput = document.getElementById('engine-file');
const newGameButton = document.getElementById('new-game');
const undoButton = document.getElementById('undo');
const hintButton = document.getElementById('hint');
const flipButton = document.getElementById('flip');
const analyzeButton = document.getElementById('analyze');
const resignButton = document.getElementById('resign');
const downloadButton = document.getElementById('download-pgn');
const autoPlayToggle = document.getElementById('auto-play');
const showLegalToggle = document.getElementById('show-legal');
const promotionDialogEl = document.getElementById('promotion-dialog');
const promotionOptionsEl = document.getElementById('promotion-options');

// Board editor elements
const editorToggleEl = document.getElementById('toggle-editor');
const editorPaletteEl = document.getElementById('editor-palette');
const editorClearButton = document.getElementById('editor-clear');
const editorStartButton = document.getElementById('editor-start');
const editorApplyButton = document.getElementById('editor-apply');
const editorActiveColorEl = document.getElementById('editor-active-color');
const castleWkEl = document.getElementById('castle-wk');
const castleWqEl = document.getElementById('castle-wq');
const castleBkEl = document.getElementById('castle-bk');
const castleBqEl = document.getElementById('castle-bq');
const editorEnPassantEl = document.getElementById('editor-en-passant');
const editorHalfmoveEl = document.getElementById('editor-halfmove');
const editorFullmoveEl = document.getElementById('editor-fullmove');
const editorFenEl = document.getElementById('editor-fen');
const editorStatusEl = document.getElementById('editor-status');

const palettePieces = [
  { code: 'wK', label: 'White King', icon: PIECE_GLYPHS.w.k },
  { code: 'wQ', label: 'White Queen', icon: PIECE_GLYPHS.w.q },
  { code: 'wR', label: 'White Rook', icon: PIECE_GLYPHS.w.r },
  { code: 'wB', label: 'White Bishop', icon: PIECE_GLYPHS.w.b },
  { code: 'wN', label: 'White Knight', icon: PIECE_GLYPHS.w.n },
  { code: 'wP', label: 'White Pawn', icon: PIECE_GLYPHS.w.p },
  { code: 'bK', label: 'Black King', icon: PIECE_GLYPHS.b.k },
  { code: 'bQ', label: 'Black Queen', icon: PIECE_GLYPHS.b.q },
  { code: 'bR', label: 'Black Rook', icon: PIECE_GLYPHS.b.r },
  { code: 'bB', label: 'Black Bishop', icon: PIECE_GLYPHS.b.b },
  { code: 'bN', label: 'Black Knight', icon: PIECE_GLYPHS.b.n },
  { code: 'bP', label: 'Black Pawn', icon: PIECE_GLYPHS.b.p },
  { code: 'empty', label: 'Empty Square', icon: '·' }
];

const state = {
  game: new Chess(),
  orientation: 'white',
  playerColor: 'w',
  autoPlay: true,
  showLegalMoves: true,
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,
  hintMove: null,
  dragSource: null,
  analysisMode: false,
  skillLevel: Number(skillSliderEl.value),
  engineMoveTime: 1800,
  engineReady: false,
  engineWorking: false,
  engineContext: null,
  engineSource: { type: 'bundled', label: DEFAULT_ENGINE_LABEL },
  evaluation: { cp: 0, mate: null, label: '0.00' },
  analysisLines: new Map(),
  isResigned: false,
  boardEditor: {
    active: false,
    pieces: {},
    selected: 'wP',
    settings: {
      active: 'w',
      castling: { wk: true, wq: true, bk: true, bq: true },
      enPassant: '-',
      halfmove: 0,
      fullmove: 1
    }
  },
  timers: {
    enabled: false,
    increment: 0,
    white: Infinity,
    black: Infinity,
    active: null,
    lastTick: null,
    handle: null
  }
};

const engineController = new EngineController({
  onMessage: handleEngineMessage,
  onError: handleEngineError,
});

loadBundledEngine({ announce: false });

function handleEngineMessage(event) {
  const line = typeof event === 'string' ? event : event?.data;
  if (!line) {
    return;
  }

  if (line === 'uciok') {
    engineController.postMessage('setoption name Threads value 1');
    engineController.postMessage(`setoption name Skill Level value ${state.skillLevel}`);
    engineController.postMessage('setoption name MultiPV value 3');
    engineController.postMessage('setoption name UCI_ShowWDL value true');
    engineController.postMessage('isready');
    return;
  }

  if (line === 'readyok') {
    state.engineReady = true;
    updateStatus('Engine ready. Play a move to begin.');
    requestEvaluation();
    return;
  }

  if (line.startsWith('info')) {
    handleEngineInfo(line);
    return;
  }

  if (line.startsWith('bestmove')) {
    handleEngineBestMove(line);
  }
}

function handleEngineError(error) {
  console.error('Engine error:', error);
  state.engineReady = false;
  state.engineWorking = false;
  state.engineContext = null;
  const message = typeof error === 'string' ? error : error?.message ?? 'Unknown engine error.';
  updateStatus(`Engine error: ${message}`);
  updateEngineControls();
}

function loadBundledEngine(options = {}) {
  const { announce = true } = options;
  try {
    const source = engineController.useBundled(DEFAULT_ENGINE_LABEL);
    state.engineSource = source;
    updateEngineControls();
    const status = announce
      ? 'Bundled Stockfish engine selected. Initialising...'
      : 'Loading bundled Stockfish engine...';
    prepareEngine(status);
  } catch (error) {
    console.error('Failed to load bundled engine', error);
    updateStatus('Failed to load bundled Stockfish engine.');
  }
}

function prepareEngine(statusMessage = 'Initialising engine...') {
  state.engineReady = false;
  state.engineWorking = false;
  state.engineContext = null;
  state.analysisLines.clear();
  renderAnalysisLines();
  bestLineEl.textContent = DEFAULT_BEST_LINE_MESSAGE;
  state.evaluation = { cp: 0, mate: null, label: '0.00' };
  evaluationLabelEl.textContent = state.evaluation.label;
  evaluationFillEl.style.height = '50%';
  updateEngineControls();
  updateStatus(statusMessage);
  engineController.postMessage('uci');
}

async function handleEngineFileSelection(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    return;
  }

  try {
    const source = await engineController.useCustomFile(file);
    state.engineSource = source;
    updateEngineControls();
    prepareEngine(`Loaded ${file.name}. Initialising...`);
  } catch (error) {
    console.error('Failed to import engine', error);
    const message = error?.message ?? 'Unknown error importing engine.';
    updateStatus(`Failed to import engine: ${message}`);
  } finally {
    event.target.value = '';
  }
}

function updateEngineControls() {
  const label = state.engineSource?.label ?? 'No engine loaded';
  engineNameEl.textContent = label;
  if (state.engineSource?.type === 'custom') {
    engineNameEl.title = label;
  } else {
    engineNameEl.removeAttribute('title');
  }
  engineResetButton.disabled = !state.engineSource || state.engineSource.type === 'bundled';
}

function init() {
  buildBoard();
  renderBoard();
  updateMoveList();
  updateCapturedPieces();
  updateClockDisplays();
  populateEditorPalette();
  loadFenIntoEditor(state.game.fen());
  updateEditorPreview();
  bindControls();
  updateSkillState(Number(skillSliderEl.value));
  updateStatus('Welcome! Start a game to play Stockfish.');
}

function bindControls() {
  newGameButton.addEventListener('click', startNewGame);
  undoButton.addEventListener('click', undoMove);
  hintButton.addEventListener('click', requestHint);
  flipButton.addEventListener('click', () => {
    state.orientation = state.orientation === 'white' ? 'black' : 'white';
    renderBoard();
  });
  analyzeButton.addEventListener('click', toggleAnalysisMode);
  resignButton.addEventListener('click', resignGame);
  downloadButton.addEventListener('click', downloadPGN);
  engineImportButton.addEventListener('click', () => engineFileInput.click());
  engineResetButton.addEventListener('click', () => loadBundledEngine());
  engineFileInput.addEventListener('change', handleEngineFileSelection);
  autoPlayToggle.addEventListener('change', (event) => {
    state.autoPlay = event.target.checked;
    if (state.autoPlay && !state.analysisMode && state.game.turn() !== state.playerColor && !state.game.isGameOver()) {
      requestEngineMove();
    }
  });
  showLegalToggle.addEventListener('change', (event) => {
    state.showLegalMoves = event.target.checked;
    renderBoard();
  });
  colorSelectEl.addEventListener('change', () => {
    const value = colorSelectEl.value;
    if (value === 'auto') {
      return;
    }
    state.playerColor = value === 'white' ? 'w' : 'b';
    state.orientation = value;
    renderBoard();
  });
  timeControlEl.addEventListener('change', () => setTimeControl(timeControlEl.value));
  skillSliderEl.addEventListener('input', () => updateSkillState(Number(skillSliderEl.value)));

  editorToggleEl.addEventListener('change', () => {
    state.boardEditor.active = editorToggleEl.checked;
    state.selectedSquare = null;
    state.legalMoves = [];
    state.hintMove = null;
    if (state.boardEditor.active) {
      loadFenIntoEditor(state.game.fen());
      updateStatus('Editor enabled. Apply to start from a custom position.');
    } else {
      editorStatusEl.textContent = '';
    }
    renderBoard();
  });

  editorClearButton.addEventListener('click', () => {
    if (!state.boardEditor.active) return;
    state.boardEditor.pieces = {};
    updateEditorPreview();
    renderBoard();
  });

  editorStartButton.addEventListener('click', () => {
    if (!state.boardEditor.active) return;
    loadFenIntoEditor(new Chess().fen());
    renderBoard();
  });

  editorApplyButton.addEventListener('click', applyEditorPosition);
  editorActiveColorEl.addEventListener('change', () => {
    state.boardEditor.settings.active = editorActiveColorEl.value;
    updateEditorPreview();
  });
  castleWkEl.addEventListener('change', () => updateCastling('wk', castleWkEl.checked));
  castleWqEl.addEventListener('change', () => updateCastling('wq', castleWqEl.checked));
  castleBkEl.addEventListener('change', () => updateCastling('bk', castleBkEl.checked));
  castleBqEl.addEventListener('change', () => updateCastling('bq', castleBqEl.checked));
  editorEnPassantEl.addEventListener('input', () => {
    state.boardEditor.settings.enPassant = editorEnPassantEl.value.trim() || '-';
    updateEditorPreview();
  });
  editorHalfmoveEl.addEventListener('input', () => {
    state.boardEditor.settings.halfmove = Math.max(0, Number(editorHalfmoveEl.value) || 0);
    updateEditorPreview();
  });
  editorFullmoveEl.addEventListener('input', () => {
    const value = Math.max(1, Number(editorFullmoveEl.value) || 1);
    state.boardEditor.settings.fullmove = value;
    updateEditorPreview();
  });
}

function buildBoard() {
  boardEl.innerHTML = '';
  const squares = 64;
  for (let i = 0; i < squares; i += 1) {
    const squareEl = document.createElement('div');
    squareEl.classList.add('square');
    squareEl.addEventListener('click', handleSquareClick);
    squareEl.addEventListener('dragover', handleDragOver);
    squareEl.addEventListener('drop', handleDrop);
    boardEl.appendChild(squareEl);
  }
}

function renderBoard() {
  const orientation = state.orientation;
  const ranks = orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'white' ? FILES : [...FILES].reverse();

  const squares = boardEl.querySelectorAll('.square');
  let index = 0;
  for (const rank of ranks) {
    for (const file of files) {
      const squareName = `${file}${rank}`;
      const squareEl = squares[index];
      squareEl.dataset.square = squareName;
      squareEl.classList.toggle('light', (file.charCodeAt(0) + rank) % 2 === 0);
      squareEl.classList.toggle('dark', (file.charCodeAt(0) + rank) % 2 === 1);
      squareEl.classList.toggle('highlight', state.selectedSquare === squareName);
      squareEl.classList.toggle('last-move', isLastMoveSquare(squareName));
      squareEl.classList.toggle('hint', isHintSquare(squareName));

      const labelNeeded =
        (orientation === 'white' && rank === 1) || (orientation === 'black' && rank === 8) ||
        (orientation === 'white' && file === 'a') || (orientation === 'black' && file === 'h');

      squareEl.innerHTML = '';
      if (labelNeeded) {
        const label = document.createElement('span');
        label.classList.add('label');
        label.textContent =
          orientation === 'white'
            ? `${file}${rank === 1 ? rank : ''}`
            : `${file}${rank === 8 ? rank : ''}`;
        squareEl.appendChild(label);
      }

      if (state.showLegalMoves && state.selectedSquare) {
        const moveData = state.legalMoves.find((move) => move.to === squareName);
        squareEl.classList.toggle('legal', Boolean(moveData) && !moveData.captured);
        squareEl.classList.toggle('capture', Boolean(moveData) && Boolean(moveData.captured));
      } else {
        squareEl.classList.remove('legal', 'capture');
      }

      const piece = getPieceOn(squareName);
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('piece', piece.color === 'w' ? 'white' : 'black');
        pieceEl.textContent = PIECE_GLYPHS[piece.color][piece.type];
        const draggable =
          !state.boardEditor.active &&
          !state.analysisMode &&
          !state.game.isGameOver() &&
          state.game.turn() === piece.color &&
          piece.color === state.playerColor &&
          !state.isResigned;
        if (draggable) {
          pieceEl.setAttribute('draggable', 'true');
          pieceEl.addEventListener('dragstart', handleDragStart);
          pieceEl.addEventListener('dragend', handleDragEnd);
        }
        squareEl.appendChild(pieceEl);
      }
      index += 1;
    }
  }
}

function isLastMoveSquare(square) {
  if (!state.lastMove) return false;
  return state.lastMove.from === square || state.lastMove.to === square;
}

function isHintSquare(square) {
  if (!state.hintMove) return false;
  return state.hintMove.from === square || state.hintMove.to === square;
}

function getPieceOn(square) {
  if (state.boardEditor.active) {
    const code = state.boardEditor.pieces[square];
    if (!code || code === 'empty') return null;
    const color = code[0].toLowerCase();
    const type = code[1].toLowerCase();
    return { color, type };
  }
  return state.game.get(square);
}

function handleSquareClick(event) {
  const square = event.currentTarget.dataset.square;
  if (!square) return;

  if (state.boardEditor.active) {
    placeEditorPiece(square);
    return;
  }

  if (state.analysisMode || state.isResigned) {
    state.selectedSquare = null;
    state.legalMoves = [];
    renderBoard();
    return;
  }

  const piece = state.game.get(square);
  const isOwnPiece = piece && piece.color === state.playerColor;
  const playersTurn = state.game.turn() === state.playerColor;

  if (state.selectedSquare) {
    const move = state.legalMoves.find((candidate) => candidate.to === square);
    if (move) {
      performMove({ from: move.from, to: move.to, promotion: move.promotion });
      return;
    }
    state.selectedSquare = null;
    state.legalMoves = [];
  } else if (piece && isOwnPiece && playersTurn) {
    state.selectedSquare = square;
    state.legalMoves = state.game.moves({ square, verbose: true });
  }

  renderBoard();
}

function handleDragStart(event) {
  const square = event.target?.parentElement?.dataset?.square;
  if (!square) return;
  state.dragSource = square;
  event.dataTransfer.setData('text/plain', square);
  event.dataTransfer.effectAllowed = 'move';
  event.target.classList.add('dragging');
  state.selectedSquare = square;
  state.legalMoves = state.game.moves({ square, verbose: true });
  renderBoard();
}

function handleDragOver(event) {
  if (state.boardEditor.active) {
    event.preventDefault();
    return;
  }
  if (typeof state.dragSource === 'string') {
    event.preventDefault();
  }
}

function handleDrop(event) {
  event.preventDefault();
  if (state.boardEditor.active) {
    const target = event.currentTarget.dataset.square;
    if (!target) return;
    const code = state.boardEditor.selected;
    if (code === 'empty') {
      delete state.boardEditor.pieces[target];
    } else {
      state.boardEditor.pieces[target] = code;
    }
    updateEditorPreview();
    renderBoard();
    return;
  }

  if (typeof state.dragSource !== 'string') {
    return;
  }
  const targetSquare = event.currentTarget.dataset.square;
  if (!targetSquare) {
    return;
  }
  const move = state.game.moves({ square: state.dragSource, verbose: true }).find((m) => m.to === targetSquare);
  state.dragSource = null;
  if (move) {
    performMove({ from: move.from, to: move.to, promotion: move.promotion });
  } else {
    state.selectedSquare = null;
    state.legalMoves = [];
    renderBoard();
  }
}

function handleDragEnd(event) {
  event.target.classList.remove('dragging');
  state.dragSource = null;
}

async function performMove({ from, to, promotion }) {
  if (state.game.isGameOver() || state.analysisMode || state.isResigned) {
    return;
  }
  let chosenPromotion = promotion;
  const moveNeedsPromotion = requiresPromotion(from, to);
  if (moveNeedsPromotion && !chosenPromotion) {
    chosenPromotion = await choosePromotion(state.game.turn());
  }

  const move = state.game.move({ from, to, promotion: chosenPromotion || 'q' });
  if (!move) {
    return;
  }

  state.lastMove = { from: move.from, to: move.to };
  state.selectedSquare = null;
  state.legalMoves = [];
  state.hintMove = null;

  applyIncrement(move.color);
  switchClock();
  renderBoard();
  updateMoveList();
  updateCapturedPieces();
  updateStatus(getGameStatusMessage());
  requestEvaluation();

  if (state.game.isGameOver()) {
    finalizeGame();
    return;
  }

  if (state.autoPlay && !state.analysisMode) {
    requestEngineMove();
  }
}

function requiresPromotion(from, to) {
  const piece = state.game.get(from);
  if (!piece || piece.type !== 'p') return false;
  const targetRank = Number(to[1]);
  return (piece.color === 'w' && targetRank === 8) || (piece.color === 'b' && targetRank === 1);
}

function choosePromotion(color) {
  return new Promise((resolve) => {
    const options = ['q', 'r', 'b', 'n'];
    promotionDialogEl.classList.remove('hidden');
    promotionDialogEl.setAttribute('aria-hidden', 'false');
    promotionOptionsEl.innerHTML = '';
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'promotion-option';
      button.textContent = PIECE_GLYPHS[color][option];
      button.title = option.toUpperCase();
      button.addEventListener('click', () => {
        promotionDialogEl.classList.add('hidden');
        promotionDialogEl.setAttribute('aria-hidden', 'true');
        resolve(option);
      });
      promotionOptionsEl.appendChild(button);
    });
  });
}

function requestEngineMove() {
  if (!state.engineReady || state.game.turn() === state.playerColor || state.game.isGameOver() || state.isResigned) {
    return;
  }
  state.engineContext = 'move';
  state.engineWorking = true;
  engineController.postMessage('stop');
  engineController.postMessage(`position fen ${state.game.fen()}`);
  engineController.postMessage(`setoption name Skill Level value ${state.skillLevel}`);
  const moveTime = Math.max(600, state.engineMoveTime);
  engineController.postMessage(`go movetime ${moveTime}`);
}

function requestHint() {
  if (!state.engineReady || state.game.isGameOver()) {
    return;
  }
  state.engineContext = 'hint';
  state.engineWorking = true;
  engineController.postMessage('stop');
  engineController.postMessage(`position fen ${state.game.fen()}`);
  const depth = Math.min(20, 10 + Math.round(state.skillLevel / 2));
  engineController.postMessage(`go depth ${depth}`);
  updateStatus('Requesting best move hint...');
}

function requestEvaluation() {
  if (!state.engineReady) return;
  if (state.engineContext === 'move') return;
  state.engineContext = 'analysis';
  state.analysisLines.clear();
  renderAnalysisLines();
  engineController.postMessage('stop');
  engineController.postMessage(`position fen ${state.game.fen()}`);
  engineController.postMessage('go movetime 700');
}

function handleEngineInfo(line) {
  const tokens = line.split(' ');
  const depthIndex = tokens.indexOf('depth');
  const multiPvIndex = tokens.indexOf('multipv');
  const scoreIndex = tokens.indexOf('score');
  const pvIndex = tokens.indexOf('pv');

  const depth = depthIndex > -1 ? Number(tokens[depthIndex + 1]) : null;
  const multipv = multiPvIndex > -1 ? Number(tokens[multiPvIndex + 1]) : 1;
  let score = null;
  let scoreType = null;

  if (scoreIndex > -1) {
    scoreType = tokens[scoreIndex + 1];
    const raw = tokens[scoreIndex + 2];
    score = Number(raw);
    if (Number.isNaN(score)) {
      score = null;
    }
  }

  let pvMoves = [];
  if (pvIndex > -1) {
    pvMoves = tokens.slice(pvIndex + 1);
  }

  if (score != null) {
    updateEvaluation(scoreType, score, multipv === 1);
  }

  if (pvMoves.length) {
    const fen = state.game.fen();
    const sanMoves = convertUciToSan(fen, pvMoves);
    state.analysisLines.set(multipv, {
      depth,
      scoreType,
      score,
      moves: sanMoves
    });
    renderAnalysisLines();
  }
}

function handleEngineBestMove(line) {
  state.engineWorking = false;
  const context = state.engineContext;
  const parts = line.split(' ');
  const bestMove = parts[1];
  if (!bestMove || bestMove === '(none)') {
    state.engineContext = null;
    return;
  }
  const from = bestMove.slice(0, 2);
  const to = bestMove.slice(2, 4);
  const promotion = bestMove.length > 4 ? bestMove.slice(4) : undefined;

  if (context === 'hint') {
    state.hintMove = { from, to };
    updateStatus(`Hint: ${from} → ${to}`);
    renderBoard();
    state.engineContext = null;
    requestEvaluation();
    return;
  }

  if (context !== 'move') {
    state.engineContext = null;
    return;
  }

  if (state.autoPlay && !state.analysisMode && !state.game.isGameOver()) {
    const move = state.game.move({ from, to, promotion });
    if (move) {
      state.lastMove = { from: move.from, to: move.to };
      applyIncrement(move.color);
      switchClock();
      renderBoard();
      updateMoveList();
      updateCapturedPieces();
      updateStatus(getGameStatusMessage());
      requestEvaluation();
      if (state.game.isGameOver()) {
        finalizeGame();
      }
    }
  }

  state.engineContext = null;
}

function updateEvaluation(type, rawScore, primaryLine) {
  const turn = state.game.turn();
  let scoreCp = null;
  let display = '0.00';

  if (type === 'cp') {
    scoreCp = rawScore;
    if (turn === 'b') {
      scoreCp = -scoreCp;
    }
    const playerPerspective = state.playerColor === 'w' ? scoreCp : -scoreCp;
    display = formatScore(playerPerspective / 100);
    if (primaryLine) {
      state.evaluation = { cp: scoreCp, mate: null, label: display };
    }
  } else if (type === 'mate') {
    const mateValue = turn === 'b' ? -rawScore : rawScore;
    const playerPerspective = state.playerColor === 'w' ? mateValue : -mateValue;
    display = `M${Math.abs(playerPerspective)}`;
    if (playerPerspective < 0) {
      display = `M-${Math.abs(playerPerspective)}`;
    }
    if (primaryLine) {
      state.evaluation = { cp: null, mate: mateValue, label: display };
    }
  }

  evaluationLabelEl.textContent = display;
  const normalized = normalizeScore(state.evaluation);
  evaluationFillEl.style.height = `${(normalized * 100).toFixed(1)}%`;
  if (state.analysisLines.has(1)) {
    const primary = state.analysisLines.get(1);
    bestLineEl.textContent = primary.moves.slice(0, 6).join(' ');
  }
}

function formatScore(value) {
  if (Math.abs(value) < 0.01) return '0.00';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

function normalizeScore(evaluation) {
  if (evaluation.mate != null) {
    return evaluation.mate > 0 ? 1 : 0;
  }
  const cp = Math.max(Math.min(evaluation.cp ?? 0, 1000), -1000);
  return 1 / (1 + Math.exp(-cp / 110));
}

function convertUciToSan(fen, moves) {
  const clone = new Chess(fen);
  const sanMoves = [];
  for (const uci of moves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4) : undefined;
    const move = clone.move({ from, to, promotion });
    if (!move) break;
    sanMoves.push(move.san);
  }
  return sanMoves;
}

function renderAnalysisLines() {
  const lines = Array.from(state.analysisLines.entries()).sort((a, b) => a[0] - b[0]);
  analysisLinesEl.innerHTML = '';
  for (const [rank, data] of lines) {
    const wrapper = document.createElement('div');
    wrapper.className = 'analysis-line';
    const header = document.createElement('div');
    header.className = 'analysis-line-header';
    const depth = data.depth ? `Depth ${data.depth}` : 'Depth —';
    header.innerHTML = `<span>#${rank} • ${depth}</span>`;
    const score = data.scoreType === 'mate' ? `M${Math.abs(data.score || 0)}` : formatScore((data.score ?? 0) / 100);
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'analysis-line-score';
    scoreSpan.textContent = score;
    header.appendChild(scoreSpan);
    const movesEl = document.createElement('div');
    movesEl.className = 'analysis-line-moves';
    movesEl.textContent = data.moves.join(' ');
    wrapper.appendChild(header);
    wrapper.appendChild(movesEl);
    analysisLinesEl.appendChild(wrapper);
  }
}

function updateMoveList() {
  const history = state.game.history({ verbose: true });
  moveListEl.innerHTML = '';
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = history[i];
    const blackMove = history[i + 1];

    const numberSpan = document.createElement('span');
    numberSpan.className = 'move-number';
    numberSpan.textContent = `${moveNumber}.`;

    const whiteSpan = document.createElement('span');
    whiteSpan.className = 'player-move';
    whiteSpan.textContent = whiteMove ? whiteMove.san : '';

    const blackSpan = document.createElement('span');
    blackSpan.className = 'player-move';
    blackSpan.textContent = blackMove ? blackMove.san : '';

    if (i === history.length - 1) {
      if (history[i].color === 'w') {
        whiteSpan.classList.add('active');
      } else {
        blackSpan.classList.add('active');
      }
    }

    const row = document.createElement('li');
    row.appendChild(numberSpan);
    row.appendChild(whiteSpan);
    row.appendChild(blackSpan);
    moveListEl.appendChild(row);
  }

  moveListEl.scrollTop = moveListEl.scrollHeight;
}

function updateCapturedPieces() {
  const counts = {
    w: { ...STARTING_COUNTS.w },
    b: { ...STARTING_COUNTS.b }
  };

  for (let rank = 8; rank >= 1; rank--) {
    for (const file of FILES) {
      const piece = state.game.get(`${file}${rank}`);
      if (piece) {
        counts[piece.color][piece.type] -= 1;
      }
    }
  }

  const playerColor = state.playerColor;
  const opponentColor = playerColor === 'w' ? 'b' : 'w';

  capturedByPlayerEl.innerHTML = buildCapturedRow(opponentColor, counts[opponentColor]);
  capturedByEngineEl.innerHTML = buildCapturedRow(playerColor, counts[playerColor]);
}

function buildCapturedRow(color, missing) {
  const pieces = [];
  for (const type of ['q', 'r', 'b', 'n', 'p']) {
    const missingCount = Math.max(0, missing[type]);
    if (missingCount > 0) {
      for (let i = 0; i < missingCount; i += 1) {
        pieces.push(PIECE_GLYPHS[color][type]);
      }
    }
  }
  return pieces.map((icon) => `<span>${icon}</span>`).join('');
}

function getGameStatusMessage() {
  if (state.game.isCheckmate()) {
    const winner = state.game.turn() === 'w' ? 'Black' : 'White';
    return `${winner} wins by checkmate.`;
  }
  if (state.game.isDraw()) {
    return 'Drawn position.';
  }
  if (state.game.inCheck()) {
    return `${state.game.turn() === 'w' ? 'White' : 'Black'} to move • Check!`;
  }
  return `${state.game.turn() === 'w' ? 'White' : 'Black'} to move.`;
}

function updateStatus(message) {
  if (message) {
    statusEl.textContent = message;
  }
}

function toggleAnalysisMode() {
  state.analysisMode = !state.analysisMode;
  analyzeButton.textContent = state.analysisMode ? 'Resume Play' : 'Analysis Mode';
  if (state.analysisMode) {
    state.autoPlay = false;
    autoPlayToggle.checked = false;
    updateStatus('Analysis mode enabled. Engine will not move automatically.');
    stopClock();
    engineController.postMessage('stop');
    state.engineContext = null;
    state.engineWorking = false;
  } else {
    state.autoPlay = true;
    autoPlayToggle.checked = true;
    updateStatus('Play mode restored. Stockfish will respond automatically.');
    switchClock();
    if (state.game.turn() !== state.playerColor) {
      requestEngineMove();
    }
  }
}

function resignGame() {
  if (state.game.isGameOver() || state.isResigned) return;
  state.isResigned = true;
  stopClock();
  updateStatus('You resigned. Stockfish wins.');
}

function downloadPGN() {
  const pgn = state.game.pgn({ newline_char: '\n' });
  const blob = new Blob([pgn], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stockfish-studio-${Date.now()}.pgn`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function undoMove() {
  if (state.boardEditor.active) {
    return;
  }
  const first = state.game.undo();
  if (!first) return;
  if (state.autoPlay && !state.analysisMode) {
    state.game.undo();
  }
  state.lastMove = null;
  state.hintMove = null;
  state.selectedSquare = null;
  state.legalMoves = [];
  state.isResigned = false;
  renderBoard();
  updateMoveList();
  updateCapturedPieces();
  updateStatus('Moves undone.');
  requestEvaluation();
}

function startNewGame() {
  const colorChoice = colorSelectEl.value;
  if (colorChoice === 'auto') {
    state.playerColor = Math.random() < 0.5 ? 'w' : 'b';
    colorSelectEl.value = state.playerColor === 'w' ? 'white' : 'black';
  } else {
    state.playerColor = colorChoice === 'white' ? 'w' : 'b';
  }
  state.orientation = state.playerColor === 'w' ? 'white' : 'black';
  state.game.reset();
  state.lastMove = null;
  state.hintMove = null;
  state.selectedSquare = null;
  state.legalMoves = [];
  state.analysisLines.clear();
  renderAnalysisLines();
  state.isResigned = false;
  renderBoard();
  updateMoveList();
  updateCapturedPieces();
  stopClock();
  setTimeControl(timeControlEl.value);
  updateStatus(`New game started. You play as ${state.playerColor === 'w' ? 'White' : 'Black'}.`);
  engineController.postMessage('ucinewgame');
  engineController.postMessage(`setoption name Skill Level value ${state.skillLevel}`);
  if (state.playerColor === 'b') {
    requestEngineMove();
  }
  requestEvaluation();
}

function finalizeGame() {
  stopClock();
  if (state.game.isCheckmate()) {
    const winner = state.game.turn() === 'w' ? 'Black' : 'White';
    updateStatus(`${winner} wins by checkmate.`);
  } else if (state.game.isDraw()) {
    updateStatus('Game drawn.');
  } else if (state.game.isStalemate()) {
    updateStatus('Stalemate! Drawn game.');
  }
}

function setTimeControl(value) {
  if (value === 'unlimited') {
    state.timers.enabled = false;
    state.timers.white = Infinity;
    state.timers.black = Infinity;
    updateClockDisplays();
    stopClock();
    return;
  }
  const [minutes, increment] = value.split('|').map(Number);
  const base = minutes * 60 * 1000;
  state.timers.enabled = true;
  state.timers.white = base;
  state.timers.black = base;
  state.timers.increment = (increment || 0) * 1000;
  state.timers.active = 'white';
  state.timers.lastTick = Date.now();
  updateClockDisplays();
  switchClock(state.timers.active);
}

function applyIncrement(color) {
  if (!state.timers.enabled) return;
  const key = color === 'w' ? 'white' : 'black';
  state.timers[key] += state.timers.increment;
  updateClockDisplays();
}

function switchClock(forceSide) {
  if (!state.timers.enabled) return;
  const target = forceSide || (state.game.turn() === 'w' ? 'white' : 'black');
  state.timers.active = target;
  state.timers.lastTick = Date.now();
  if (state.timers.handle) {
    clearInterval(state.timers.handle);
  }
  state.timers.handle = setInterval(tickClock, 200);
}

function tickClock() {
  if (!state.timers.enabled || !state.timers.active) return;
  const now = Date.now();
  const delta = now - state.timers.lastTick;
  state.timers.lastTick = now;
  const key = state.timers.active;
  state.timers[key] -= delta;
  if (state.timers[key] <= 0) {
    state.timers[key] = 0;
    clearInterval(state.timers.handle);
    state.timers.handle = null;
    updateClockDisplays();
    updateStatus(`${key === 'white' ? 'White' : 'Black'} ran out of time.`);
    return;
  }
  updateClockDisplays();
}

function stopClock() {
  if (state.timers.handle) {
    clearInterval(state.timers.handle);
    state.timers.handle = null;
  }
  state.timers.active = null;
}

function updateClockDisplays() {
  clockWhiteEl.textContent = formatClock(state.timers.white);
  clockBlackEl.textContent = formatClock(state.timers.black);
}

function formatClock(ms) {
  if (!state.timers.enabled || !Number.isFinite(ms)) {
    return '∞';
  }
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0 && seconds < 10) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `0:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateSkillState(value) {
  state.skillLevel = value;
  skillLabelEl.textContent = value;
  state.engineMoveTime = 600 + value * 160;
  if (state.engineReady) {
    engineController.postMessage(`setoption name Skill Level value ${value}`);
  }
}

function populateEditorPalette() {
  editorPaletteEl.innerHTML = '';
  palettePieces.forEach((piece) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span class="piece-icon">${piece.icon}</span><span>${piece.label}</span>`;
    button.dataset.code = piece.code;
    button.classList.toggle('active', state.boardEditor.selected === piece.code);
    button.addEventListener('click', () => {
      state.boardEditor.selected = piece.code;
      document.querySelectorAll('#editor-palette button').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
    });
    editorPaletteEl.appendChild(button);
  });
}

function placeEditorPiece(square) {
  const code = state.boardEditor.selected;
  if (!code) return;
  if (code === 'empty') {
    delete state.boardEditor.pieces[square];
  } else {
    state.boardEditor.pieces[square] = code;
  }
  updateEditorPreview();
  renderBoard();
}

function updateCastling(key, value) {
  state.boardEditor.settings.castling[key] = value;
  updateEditorPreview();
}

function updateEditorPreview() {
  const fen = buildFenFromEditor();
  editorFenEl.value = fen;
}

function buildFenFromEditor() {
  const rows = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let emptyCount = 0;
    for (const file of FILES) {
      const square = `${file}${rank}`;
      const code = state.boardEditor.pieces[square];
      if (!code || code === 'empty') {
        emptyCount += 1;
      } else {
        if (emptyCount > 0) {
          row += emptyCount;
          emptyCount = 0;
        }
        const [color, type] = code.split('');
        row += color === 'w' ? type.toUpperCase() : type.toLowerCase();
      }
    }
    if (emptyCount > 0) {
      row += emptyCount;
    }
    rows.push(row || '8');
  }
  const castlingRights = buildCastlingString(state.boardEditor.settings.castling);
  const enPassant = validateEnPassant(state.boardEditor.settings.enPassant) ? state.boardEditor.settings.enPassant : '-';
  const halfmove = Math.max(0, state.boardEditor.settings.halfmove || 0);
  const fullmove = Math.max(1, state.boardEditor.settings.fullmove || 1);
  return `${rows.join('/')}` +
    ` ${state.boardEditor.settings.active}` +
    ` ${castlingRights}` +
    ` ${enPassant}` +
    ` ${halfmove}` +
    ` ${fullmove}`;
}

function buildCastlingString(castling) {
  let rights = '';
  if (castling.wk) rights += 'K';
  if (castling.wq) rights += 'Q';
  if (castling.bk) rights += 'k';
  if (castling.bq) rights += 'q';
  return rights || '-';
}

function validateEnPassant(value) {
  if (value === '-' || value === '') return true;
  return /^[a-h][36]$/.test(value);
}

function loadFenIntoEditor(fen) {
  const [position, active, castling, enPassant, halfmove, fullmove] = fen.split(' ');
  const ranks = position.split('/');
  const pieces = {};
  for (let r = 0; r < ranks.length; r += 1) {
    let fileIndex = 0;
    for (const char of ranks[r]) {
      if (Number.isInteger(Number(char))) {
        fileIndex += Number(char);
      } else {
        const file = FILES[fileIndex];
        const rank = 8 - r;
        const color = char === char.toUpperCase() ? 'w' : 'b';
        const type = char.toUpperCase();
        pieces[`${file}${rank}`] = `${color}${type}`;
        fileIndex += 1;
      }
    }
  }
  state.boardEditor.pieces = pieces;
  state.boardEditor.settings = {
    active: active || 'w',
    castling: {
      wk: castling?.includes('K') ?? false,
      wq: castling?.includes('Q') ?? false,
      bk: castling?.includes('k') ?? false,
      bq: castling?.includes('q') ?? false
    },
    enPassant: enPassant || '-',
    halfmove: Number(halfmove) || 0,
    fullmove: Number(fullmove) || 1
  };
  editorActiveColorEl.value = state.boardEditor.settings.active;
  castleWkEl.checked = state.boardEditor.settings.castling.wk;
  castleWqEl.checked = state.boardEditor.settings.castling.wq;
  castleBkEl.checked = state.boardEditor.settings.castling.bk;
  castleBqEl.checked = state.boardEditor.settings.castling.bq;
  editorEnPassantEl.value = state.boardEditor.settings.enPassant === '-' ? '' : state.boardEditor.settings.enPassant;
  editorHalfmoveEl.value = state.boardEditor.settings.halfmove;
  editorFullmoveEl.value = state.boardEditor.settings.fullmove;
  updateEditorPreview();
}

function applyEditorPosition() {
  const fen = buildFenFromEditor();
  const clone = new Chess();
  const legal = clone.load(fen);
  if (!legal) {
    editorStatusEl.textContent = 'Invalid FEN. Ensure both kings exist and castling rights are legal.';
    return;
  }
  state.game.load(fen);
  state.orientation = state.boardEditor.settings.active === 'w' ? 'white' : 'black';
  state.playerColor = state.boardEditor.settings.active === 'w' ? 'w' : 'b';
  colorSelectEl.value = state.playerColor === 'w' ? 'white' : 'black';
  state.selectedSquare = null;
  state.legalMoves = [];
  state.lastMove = null;
  state.hintMove = null;
  state.analysisLines.clear();
  renderAnalysisLines();
  renderBoard();
  updateMoveList();
  updateCapturedPieces();
  stopClock();
  updateClockDisplays();
  editorStatusEl.textContent = 'Position applied. Ready to continue!';
  updateStatus('Custom position loaded.');
  requestEvaluation();
}

init();
