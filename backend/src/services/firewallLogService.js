const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FirewallLog = require('../models/FirewallLog');

const FIREWALL_LOG_PATHS = [
  '/var/log/ufw.log',
  '/var/log/syslog',
  '/var/log/messages',
];

const CURSOR_PATH = path.join(__dirname, '..', 'data', 'firewall-cursor.json');
const BATCH_SIZE = parseInt(process.env.FIREWALL_BATCH_SIZE || 50, 10);
const MAX_BATCH_WRITE = parseInt(process.env.FIREWALL_MAX_BATCH_WRITE || 200, 10);

let cursorMap = {};
try {
  if (fs.existsSync(CURSOR_PATH)) {
    cursorMap = JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf8'));
  }
} catch (_) {}

function saveCursor() {
  try {
    const dir = path.dirname(CURSOR_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CURSOR_PATH, JSON.stringify(cursorMap), 'utf8');
  } catch (_) {}
}

const UFW_LOG_PATTERN = /\[UFW\s+(BLOCK|ALLOW|DROP|REJECT|LIMIT)\]/;
const SYSLOG_TIMESTAMP = /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/;
const MONTH_MAP = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function parseSyslogTimestamp(raw, year) {
  const m = raw.match(SYSLOG_TIMESTAMP);
  if (!m) return null;
  const parts = m[1].split(/\s+/);
  const month = MONTH_MAP[parts[0]];
  if (month === undefined) return null;
  const day = parseInt(parts[1], 10);
  const timeParts = parts[2].split(':');
  const date = new Date(year || new Date().getFullYear(), month, day, parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), parseInt(timeParts[2], 10));
  if (date > new Date()) date.setFullYear(date.getFullYear() - 1);
  return date;
}

function parseUfwLine(line, hostname) {
  if (!line || !UFW_LOG_PATTERN.test(line)) return null;

  const actionMatch = line.match(/\[UFW\s+(BLOCK|ALLOW|DROP|REJECT|LIMIT)\]/);
  if (!actionMatch) return null;
  const action = actionMatch[1];

  const ts = parseSyslogTimestamp(line);

  const host = line.match(/^\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+(\S+)/);
  const hostnameVal = host ? host[1] : hostname || 'unknown';

  const srcMatch = line.match(/SRC=([0-9a-fA-F:.]+)/);
  const dstMatch = line.match(/DST=([0-9a-fA-F:.]+)/);
  const protoMatch = line.match(/PROTO=(\w+)/);
  const sportMatch = line.match(/SPT=(\d+)/);
  const dportMatch = line.match(/DPT=(\d+)/);
  const lenMatch = line.match(/LEN=(\d+)/);
  const ttlMatch = line.match(/TTL=(\d+)/);
  const inMatch = line.match(/IN=(\S+)/);
  const outMatch = line.match(/OUT=(\S+)/);
  const macMatch = line.match(/MAC=([0-9a-fA-F:]+)/);
  const tosMatch = line.match(/TOS=(0x[0-9a-fA-F]+)/);
  const precMatch = line.match(/PREC=(0x[0-9a-fA-F]+)/);
  const windowMatch = line.match(/WINDOW=(\d+)/);
  const tcpFlagsMatch = line.match(/URGP=\d+\s*(.+)?$/);

  const logHash = crypto.createHash('md5').update(line).digest('hex');

  return {
    raw: line.substring(0, 1000),
    timestamp: ts || new Date(),
    action,
    protocol: protoMatch ? protoMatch[1] : null,
    srcIp: srcMatch ? srcMatch[1] : null,
    dstIp: dstMatch ? dstMatch[1] : null,
    srcPort: sportMatch ? parseInt(sportMatch[1], 10) : null,
    dstPort: dportMatch ? parseInt(dportMatch[1], 10) : null,
    length: lenMatch ? parseInt(lenMatch[1], 10) : null,
    ttl: ttlMatch ? parseInt(ttlMatch[1], 10) : null,
    interface_in: inMatch && inMatch[1] !== '*' ? inMatch[1] : null,
    interface_out: outMatch && outMatch[1] !== '*' ? outMatch[1] : null,
    mac: macMatch ? macMatch[1] : null,
    tos: tosMatch ? tosMatch[1] : null,
    prec: precMatch ? precMatch[1] : null,
    window: windowMatch ? parseInt(windowMatch[1], 10) : null,
    tcpFlags: tcpFlagsMatch ? tcpFlagsMatch[1].trim() : null,
    logHash,
    hostname: hostnameVal,
    processor: 'ufw',
  };
}

function findLogFile() {
  for (const p of FIREWALL_LOG_PATHS) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

let isCollecting = false;

async function collectLogs() {
  if (isCollecting) return;
  isCollecting = true;

  try {
    const logPath = findLogFile();
    if (!logPath) return;

    const stat = fs.statSync(logPath);
    const cursor = cursorMap[logPath] || { ino: null, size: 0 };
    const ino = stat.ino;

    if (cursor.ino !== null && cursor.ino !== ino) {
      cursor.size = 0;
    }

    if (stat.size <= cursor.size) {
      cursorMap[logPath] = { ino, size: stat.size };
      return;
    }

    const hostname = require('os').hostname();
    const fd = fs.openSync(logPath, 'r');
    const bufSize = stat.size - cursor.size;
    const buffer = Buffer.alloc(bufSize);
    fs.readSync(fd, buffer, 0, bufSize, cursor.size);
    fs.closeSync(fd);

    cursor.ino = ino;
    cursor.size = stat.size;
    cursorMap[logPath] = cursor;
    saveCursor();

    const content = buffer.toString('utf8');
    const lines = content.split('\n').filter(Boolean);
    if (lines.length === 0) return;

    const entries = [];
    for (const line of lines) {
      const parsed = parseUfwLine(line, hostname);
      if (parsed) entries.push(parsed);
      if (entries.length >= MAX_BATCH_WRITE) break;
    }

    if (entries.length === 0) return;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      try {
        await FirewallLog.insertMany(batch, { ordered: false, lean: true });
      } catch (err) {
        if (err.code !== 11000) {
          console.error(`[FirewallLog] Batch insert error: ${err.message}`);
        }
        for (const entry of batch) {
          try {
            await FirewallLog.updateOne({ logHash: entry.logHash }, { $setOnInsert: entry }, { upsert: true });
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`[FirewallLog] Collect error: ${err.message}`);
    }
  } finally {
    isCollecting = false;
  }
}

const POLL_INTERVAL = parseInt(process.env.FIREWALL_POLL_INTERVAL || 30000, 10);
let intervalHandle = null;

function startCollector() {
  if (intervalHandle) return;
  collectLogs();
  intervalHandle = setInterval(collectLogs, POLL_INTERVAL);
  if (intervalHandle.unref) intervalHandle.unref();
  console.log(`[FirewallLog] Collector started (poll every ${POLL_INTERVAL / 1000}s)`);
}

function stopCollector() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { startCollector, stopCollector, collectLogs };
