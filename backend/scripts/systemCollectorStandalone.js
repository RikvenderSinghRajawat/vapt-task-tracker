#!/usr/bin/env node

/**
 * Standalone system collector
 * - Collects backend host metrics every 30 minutes
 * - Writes output to backend/data/system-metrics.json
 * - Appends to backend/data/system-metrics.log
 *
 * Designed to test "server info function" independent of the main API.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_JSON = path.join(DATA_DIR, 'system-metrics.json');
const OUT_LOG = path.join(DATA_DIR, 'system-metrics.log');

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const COMMAND_TIMEOUT_MS = 5000;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function appendLog(line) {
  const ts = new Date().toISOString();
  fs.appendFileSync(OUT_LOG, `[${ts}] ${line}\n`);
}

async function executeCommand(command, timeout = COMMAND_TIMEOUT_MS) {
  try {
    // execAsync doesn't support AbortController cleanly; we use `timeout` option instead.
    const { stdout } = await execAsync(command, { timeout });
    return stdout.trim();
  } catch (err) {
    return null;
  }
}

async function getDiskInfo() {
  try {
    const dfOutput = await executeCommand('df -h /');
    if (!dfOutput) return null;

    const lines = dfOutput.split('\n');
    if (lines.length < 2) return null;

    const data = lines[1].split(/\s+/);
    const total = data[1];
    const used = data[2];
    const available = data[3];
    const percentage = parseInt(String(data[4] || '').replace('%', ''), 10);

    const inodeOutput = await executeCommand('df -i /');
    const inodeLine = inodeOutput ? inodeOutput.split('\n')[1] : null;
    const inodeData = inodeLine ? inodeLine.split(/\s+/) : null;

    const inodeTotal = inodeData ? parseInt(inodeData[1], 10) : null;
    const inodeUsed = inodeData ? parseInt(inodeData[2], 10) : null;
    const inodeFree = inodeData ? parseInt(inodeData[3], 10) : null;

    const inodePercent =
      inodeTotal && inodeUsed != null
        ? parseFloat(((inodeUsed / inodeTotal) * 100).toFixed(1))
        : null;

    return {
      total,
      used,
      free: available,
      percentage: Number.isFinite(percentage) ? percentage : 0,
      mount: '/',
      inode: inodeTotal
        ? {
            total: inodeTotal,
            used: inodeUsed,
            free: inodeFree,
            percentage: inodePercent != null ? inodePercent : 0,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

async function _getMemoryInfo() {
  try {
    const memTotalKb = await executeCommand("awk '/MemTotal/ {print $2}' /proc/meminfo");
    const memFreeKb = await executeCommand("awk '/MemAvailable/ {print $2}' /proc/meminfo");

    const buffersKb = await executeCommand("awk '/Buffers/ {print $2}' /proc/meminfo");
    const cachedKb = await executeCommand("awk '/^Cached/ {print $2}' /proc/meminfo");

    const swapTotalKb = await executeCommand("awk '/SwapTotal/ {print $2}' /proc/meminfo");
    const swapFreeKb = await executeCommand("awk '/SwapFree/ {print $2}' /proc/meminfo");

    const totalKb = Math.max(parseInt(memTotalKb, 10) || 0, 0);
    const freeKb = Math.max(parseInt(memFreeKb, 10) || 0, 0);

    const usedKb = Math.max(totalKb - freeKb, 0);
    const percentage = totalKb > 0 ? Math.min((usedKb / totalKb) * 100, 100) : 0;

    const swapTotal = Math.max(parseInt(swapTotalKb, 10) || 0, 0);
    const swapFree = Math.max(parseInt(swapFreeKb, 10) || 0, 0);
    const swapUsed = Math.max(swapTotal - swapFree, 0);
    const swapPercentage = swapTotal > 0 ? Math.min((swapUsed / swapTotal) * 100, 100) : 0;

    const totalMB = totalKb / 1024;
    const usedMB = usedKb / 1024;
    const freeMB = freeKb / 1024;

    const totalGB = (totalMB / 1024).toFixed(2);
    const usedGB = (usedMB / 1024).toFixed(2);
    const freeGB = (freeMB / 1024).toFixed(2);

    const swapTotalMB = swapTotal / 1024;
    const swapUsedMB = swapUsed / 1024;
    const swapFreeMB = swapFree / 1024;

    return {
      total: totalMB,
      used: usedMB,
      free: freeMB,
      percentage: Math.round(percentage * 10) / 10,
      totalGB,
      usedGB,
      freeGB,
      swap: {
        total: swapTotalMB,
        used: swapUsedMB,
        free: swapFreeMB,
        percentage: Math.round(swapPercentage * 10) / 10,
      },
      buffers: (parseInt(buffersKb, 10) || 0) / 1024,
      cached: (parseInt(cachedKb, 10) || 0) / 1024,
    };
  } catch {
    return null;
  }
}

async function getCpuInfo() {
  try {
    const cpuInfo = await executeCommand('cat /proc/cpuinfo | grep "model name" | head -1');
    const cpuCores = await executeCommand('nproc');
    const topCpuLine = await executeCommand('top -bn1 | grep "Cpu(s)"');
    const loadAvgLine = await executeCommand('top -bn1 | grep "load average"');

    if (!cpuInfo || !cpuCores || !topCpuLine || !loadAvgLine) return null;

    const modelName = cpuInfo.split(':')[1]?.trim() || 'Unknown';
    const cores = parseInt(cpuCores, 10) || 0;

    const loadValues = loadAvgLine.match(/load average:\s*([0-9.,]+),\s*([0-9.,]+),\s*([0-9.,]+)/i);
    const avg1m = loadValues ? parseFloat(String(loadValues[1]).replace(',', '.')) : 0;
    const avg5m = loadValues ? parseFloat(String(loadValues[2]).replace(',', '.')) : 0;
    const avg15m = loadValues ? parseFloat(String(loadValues[3]).replace(',', '.')) : 0;

    const cpuUsageMatch = topCpuLine.match(/([0-9.]+)\s*us/);
    const cpuUsage = cpuUsageMatch ? parseFloat(cpuUsageMatch[1]) : 0;

    let temperature = null;
    const tempOutput = await executeCommand('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0"', 3000);
    if (tempOutput && tempOutput !== '0') {
      temperature = parseFloat((parseInt(tempOutput, 10) / 1000).toFixed(1));
    }

    return {
      model: modelName,
      cores,
      load: {
        current: cpuUsage,
        avg1m,
        avg5m,
        avg15m,
        percentage: Math.min(cpuUsage, 100),
      },
      temperature,
    };
  } catch {
    return null;
  }
}

async function getHostInfo() {
  try {
    const hostname = await executeCommand('hostname');
    const platform = await executeCommand('uname -s');
    const release = await executeCommand('uname -r');
    const arch = await executeCommand('uname -m');
    const os_release = await executeCommand('cat /etc/os-release | grep PRETTY_NAME | cut -d\\" -f2');

    const uptimeSecondsRaw = await executeCommand('cat /proc/uptime | cut -d" " -f1');
    const seconds = uptimeSecondsRaw ? parseFloat(uptimeSecondsRaw) : null;

    const days = seconds != null ? Math.floor(seconds / 86400) : 0;
    const hours = seconds != null ? Math.floor((seconds % 86400) / 3600) : 0;
    const minutes = seconds != null ? Math.floor((seconds % 3600) / 60) : 0;
    const uptime = seconds != null ? `${days}d ${hours}h ${minutes}m` : 'Unknown';

    return {
      name: hostname || 'Unknown',
      platform: platform && release ? `${platform} ${release}` : 'Unknown',
      arch: arch || 'Unknown',
      os: os_release || 'Unknown',
      uptime,
      uptimeSeconds: seconds ? Math.round(seconds) : 0,
    };
  } catch {
    return null;
  }
}

async function getNetworkInfo() {
  try {
    const ipOutput = await executeCommand('hostname -I | awk \'{print $1}\'');
    const ifaceCount = await executeCommand('ls /sys/class/net | wc -l');

    const ip = ipOutput || 'Unknown';
    const ifaceCountNum = parseInt(ifaceCount, 10) || 0;

    return {
      primaryIP: ip,
      interfaceCount: ifaceCountNum,
    };
  } catch {
    return null;
  }
}

async function getProcessCount() {
  try {
    const psCount = await executeCommand('ps aux | wc -l');
    return parseInt(psCount, 10) || 0;
  } catch {
    return 0;
  }
}

function getProcessInfo() {
  const uptimeSeconds = Math.floor(process.uptime());
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const rssMemMB = Math.round(memUsage.rss / 1024 / 1024);

  return {
    uptime: `${days}d ${hours}h ${minutes}m`,
    uptimeSeconds,
    heap: {
      used: `${heapUsedMB}MB`,
      usedMB: heapUsedMB,
      total: `${heapTotalMB}MB`,
      totalMB: heapTotalMB,
    },
    rss: `${rssMemMB}MB`,
    rssMB: rssMemMB,
  };
}

async function collectOnce() {
  ensureDir();

  const [hostInfo, cpuInfo, memoryInfo, diskInfo, networkInfo, processCount] = await Promise.all([
    getHostInfo(),
    getCpuInfo(),
    _getMemoryInfo(),
    getDiskInfo(),
    getNetworkInfo(),
    getProcessCount(),
  ]);

  const processInfo = getProcessInfo();

  const systemData = {
    host: hostInfo || { name: 'Unknown', platform: 'Unknown', arch: 'Unknown', uptime: 'Unknown', uptimeSeconds: 0 },
    cpu: cpuInfo || {
      model: 'Unknown',
      cores: 0,
      load: { current: 0, avg1m: 0, avg5m: 0, avg15m: 0, percentage: 0 },
      temperature: null,
    },
    memory: memoryInfo || {
      total: 0,
      used: 0,
      free: 0,
      percentage: 0,
      totalGB: '0',
      usedGB: '0',
      freeGB: '0',
      swap: { total: 0, used: 0, free: 0, percentage: 0 },
      buffers: 0,
      cached: 0,
    },
    storage: diskInfo || { total: 'Unknown', used: 'Unknown', free: 'Unknown', percentage: 0, mount: '/', inode: undefined },
    network: networkInfo || { primaryIP: 'Unknown', interfaceCount: 0 },
    processes: processCount || 0,
    process: processInfo,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(systemData, null, 2));
  appendLog('Collected system metrics successfully');

  return systemData;
}

async function main() {
  console.log('Starting standalone system collector (30 min interval)...');

  await collectOnce();

  setInterval(async () => {
    try {
      await collectOnce();
    } catch (e) {
      appendLog(`Collector failed: ${e && e.message ? e.message : String(e)}`);
    }
  }, INTERVAL_MS);
}

main().catch((e) => {
  ensureDir();
  appendLog(`Fatal error: ${e && e.message ? e.message : String(e)}`);
  console.error(e);
  process.exit(1);
});

