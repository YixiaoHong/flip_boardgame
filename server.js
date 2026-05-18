import http from 'http';
import { URL } from 'url';
import { getInitialBoard, getValidMovesForPlayer, aiChooseMove, getGameStatus } from './engine/game.js';

const PORT = process.env.PORT || 3000;
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function sendJSON(res, status, payload) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(payload, null, 2));
}

function sendError(res, status, message) {
  sendJSON(res, status, { error: message });
}

async function parseJSONBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const rawBody = Buffer.concat(chunks).toString('utf-8');
  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, JSON_HEADERS);
    return res.end();
  }

  try {
    if (pathname === '/api/ping' && req.method === 'GET') {
      return sendJSON(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
    }

    if (pathname === '/api/game/new' && req.method === 'GET') {
      const board = getInitialBoard();
      return sendJSON(res, 200, { board, currentPlayer: 1 });
    }

    if (pathname === '/api/game/valid-moves' && req.method === 'POST') {
      const body = await parseJSONBody(req);
      if (!body || !Array.isArray(body.board) || typeof body.player !== 'number') {
        return sendError(res, 400, 'Request body must include board array and player number.');
      }
      const moves = getValidMovesForPlayer(body.board, body.player);
      return sendJSON(res, 200, { moves });
    }

    if (pathname === '/api/ai/move' && req.method === 'POST') {
      const body = await parseJSONBody(req);
      if (!body || !Array.isArray(body.board) || typeof body.player !== 'number') {
        return sendError(res, 400, 'Request body must include board array and player number.');
      }
      const difficulty = body.difficulty || 'medium';
      const result = aiChooseMove(body.board, body.player, difficulty);
      return sendJSON(res, 200, result);
    }

    return sendError(res, 404, 'Not Found');
  } catch (error) {
    return sendError(res, 500, error.message || 'Server error');
  }
});

server.listen(PORT, () => {
  console.log(`Flip board game API server running on http://localhost:${PORT}`);
});
