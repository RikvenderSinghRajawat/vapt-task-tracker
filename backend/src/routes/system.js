const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const execAsync = promisify(exec);

// Cache system info to avoid excessive command execution
let cachedSystemInfo = null;
let lastCacheTime = null;
const CACHE_DURATION = 45 * 60 * 1000; // 45 minutes cache duration

// Helper function to execute Linux commands safely with timeout
async function executeCommand(command, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const { stdout } = await execAsync(command);
    clearTimeout(timeoutId);
    
    return stdout.trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`, error.message);
    return null;
  }
}

// Helper function to get disk info
async function getDiskInfo() {
  try {
    // Get root filesystem info
    const dfOutput = await executeCommand('df -h /');
    if (!dfOutput) return null;

    const lines = dfOutput.split('\n');
    if (lines.length < 2) return null;

    const data = lines[1].split(/\s+/);
    const total = data[1];
    const used = data[2];
    const available = data[3];
    const percentage = parseInt(data[4].replace('%', ''));

    // Get inode info
    const inodeOutput = await executeCommand('df -i /');
    const inodeData = inodeOutput.split('\n')[1].split(/\s+/);
    const inodeTotal = parseInt(inodeData[1]);
    const inodeUsed = parseInt(inodeData[2]);
    const inodeFree = parseInt(inodeData[3]);
    const inodePercent = ((inodeUsed / inodeTotal) * 100).toFixed(1);

    return {
      total,
      used,
      free: available,
      percentage,
      mount: '/',
      inode: {
        total: inodeTotal,
        used: inodeUsed,
        free: inodeFree,
        percentage: parseFloat(inodePercent)
      }
    };
  } catch (error) {
    console.error('Error getting disk info:', error);
    return null;
  }
}

// Helper function to get memory info
async function _getMemoryInfo() {
  try {
    // Memory totals (in kB)
    const memTotalKb = await executeCommand("awk '/MemTotal/ {print $2}' /proc/meminfo");
    const memFreeKb = await executeCommand("awk '/MemAvailable/ {print $2}' /proc/meminfo");
    const buffersKb = await executeCommand("awk '/Buffers/ {print $2}' /proc/meminfo");
    const cachedKb = await executeCommand("awk '/^Cached/ {print $2}' /proc/meminfo");

    // Swap totals (in kB)
    const swapTotalKb = await executeCommand("awk '/SwapTotal/ {print $2}' /proc/meminfo");
    const swapFreeKb = await executeCommand("awk '/SwapFree/ {print $2}' /proc/meminfo");

    const total = Math.max(parseInt(memTotalKb) || 0, 0);
    const free = Math.max(parseInt(memFreeKb) || 0, 0);

    const used = Math.max(total - free, 0);
    const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;

    const swapTotal = Math.max(parseInt(swapTotalKb) || 0, 0);
    const swapFree = Math.max(parseInt(swapFreeKb) || 0, 0);
    const swapUsed = Math.max(swapTotal - swapFree, 0);
    const swapPercentage = swapTotal > 0 ? Math.min((swapUsed / swapTotal) * 100, 100) : 0;

    // Provide both MB numbers and GB numbers since frontend expects GB fields in formatSystemInfo()
    const totalMB = total / 1024;
    const usedMB = used / 1024;
    const freeMB = free / 1024;

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
        percentage: Math.round(swapPercentage * 10) / 10
      },
      // keep compatibility: some renderers might look for these
      buffers: (parseInt(buffersKb) || 0) / 1024,
      cached: (parseInt(cachedKb) || 0) / 1024
    };
  } catch (error) {
    console.error('Error getting memory info:', error);
    return null;
  }
}

// Helper function to get CPU info
async function getCpuInfo() {
  try {
    const cpuInfo = await executeCommand('cat /proc/cpuinfo | grep "model name" | head -1');

    const cpuCores = await executeCommand('nproc');
    const topCpuLine = await executeCommand('top -bn1 | grep "Cpu(s)"');
    const loadAvgLine = await executeCommand('top -bn1 | grep "load average"');

    if (!cpuInfo || !cpuCores || !topCpuLine || !loadAvgLine) return null;

    const modelName = cpuInfo.split(':')[1]?.trim() || 'Unknown';
    const cores = parseInt(cpuCores) || 0;

    const loadValues = loadAvgLine.match(/load average:\s*([0-9.,]+),\s*([0-9.,]+),\s*([0-9.,]+)/i);
    const avg1m = loadValues ? parseFloat(loadValues[1].replace(',', '.')) : 0;
    const avg5m = loadValues ? parseFloat(loadValues[2].replace(',', '.')) : 0;
    const avg15m = loadValues ? parseFloat(loadValues[3].replace(',', '.')) : 0;

    const cpuUsageMatch = topCpuLine.match(/([0-9.]+)\s*us/);
    const cpuUsage = cpuUsageMatch ? parseFloat(cpuUsageMatch[1]) : 0;

    // Get CPU temperature if available
    let temperature = null;
    const tempOutput = await executeCommand('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0"', 3000);
    if (tempOutput && tempOutput !== '0') {
      temperature = (parseInt(tempOutput) / 1000).toFixed(1);
    }

    return {
      model: modelName,
      cores,
      load: {
        current: cpuUsage,
        avg1m,
        avg5m,
        avg15m,
        percentage: Math.min(cpuUsage, 100)
      },
      temperature: temperature ? parseFloat(temperature) : null
    };
  } catch (error) {
    console.error('Error getting CPU info:', error);
    return null;
  }
}

// Helper function to get system uptime
async function getSystemUptime() {
  try {
    const uptimeSeconds = await executeCommand('cat /proc/uptime | cut -d" " -f1');
    if (!uptimeSeconds) return null;

    const seconds = parseFloat(uptimeSeconds);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return {
      uptimeSeconds: Math.round(seconds),
      uptime: `${days}d ${hours}h ${minutes}m ${secs}s`,
      readableUptime: {
        days,
        hours,
        minutes,
        seconds: secs
      }
    };
  } catch (error) {
    console.error('Error getting uptime:', error);
    return null;
  }
}

// Helper function to get host information
async function getHostInfo() {
  try {
    const hostname = await executeCommand('hostname');
    const platform = await executeCommand('uname -s');
    const release = await executeCommand('uname -r');
    const arch = await executeCommand('uname -m');
    const os_release = await executeCommand('cat /etc/os-release | grep PRETTY_NAME | cut -d\\" -f2');

    return {
      name: hostname || 'Unknown',
      platform: platform ? `${platform} ${release}` : 'Unknown',
      arch: arch || 'Unknown',
      os: os_release || 'Unknown',
      ...(await getSystemUptime())
    };
  } catch (error) {
    console.error('Error getting host info:', error);
    return null;
  }
}

// Helper function to get network info
async function getNetworkInfo() {
  try {
    // Get IP address
    const ipOutput = await executeCommand('hostname -I | awk \'{print $1}\'');
    const ip = ipOutput || 'Unknown';

    // Get network interfaces count
    const ifaceCount = await executeCommand('ls /sys/class/net | wc -l');
    const ifaceCountNum = parseInt(ifaceCount) || 0;

    return {
      primaryIP: ip,
      interfaceCount: ifaceCountNum
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    return null;
  }
}

// Helper function to get running processes count
async function getProcessCount() {
  try {
    const psCount = await executeCommand('ps aux | wc -l');
    return parseInt(psCount) || 0;
  } catch (error) {
    console.error('Error getting process count:', error);
    return 0;
  }
}

// Helper function to get Node.js process info
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
      totalMB: heapTotalMB
    },
    rss: `${rssMemMB}MB`,
    rssMB: rssMemMB
  };
}

// GET /api/system/health - Simple health check
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'System endpoint is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

router.get('/metrics/clear-cache', protect, authorize('admin'), async (req, res) => {
  try {

    cachedSystemInfo = null;
    lastCacheTime = null;

    res.json({
      success: true,
      message: 'System metrics cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

// GET /api/system/metrics - Get system metrics
// Public endpoint
// This endpoint is now backed by the standalone collector cache to make it reliable.
const fs = require('fs');
const path = require('path');

const METRICS_JSON_PATH = path.join(__dirname, '..', 'data', 'system-metrics.json');

router.get('/metrics', protect, async (req, res) => {
  try {
    // Prefer in-memory cache first
    const now = Date.now();
    if (cachedSystemInfo && lastCacheTime && (now - lastCacheTime) < CACHE_DURATION) {
      return res.json({
        success: true,
        data: cachedSystemInfo,
        message: 'System metrics retrieved successfully (cached)',
        cached: true,
        cacheAge: Math.round((now - lastCacheTime) / 1000 / 60)
      });
    }

    // Then prefer standalone collector output
    if (fs.existsSync(METRICS_JSON_PATH)) {
      const raw = fs.readFileSync(METRICS_JSON_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      cachedSystemInfo = parsed;
      lastCacheTime = now;

      return res.json({
        success: true,
        data: parsed,
        message: 'System metrics retrieved successfully (collector file)',
        cached: false,
        nextUpdate: new Date(now + CACHE_DURATION).toISOString()
      });
    }

    // Fallback: compute on-demand (keeps backward compatibility)
    const [hostInfo, cpuInfo, memoryInfo, diskInfo, networkInfo, processCount] = await Promise.all([
      getHostInfo(),
      getCpuInfo(),
      _getMemoryInfo(),
      getDiskInfo(),
      getNetworkInfo(),
      getProcessCount()
    ]);

    const finalCpuInfo = cpuInfo || {
      model: 'Unknown',
      cores: 0,
      load: { current: 0, avg1m: 0, avg5m: 0, avg15m: 0, percentage: 0 },
      temperature: null
    };

    const finalMemoryInfo = memoryInfo || {
      total: 0,
      used: 0,
      free: 0,
      percentage: 0,
      totalGB: '0',
      usedGB: '0',
      freeGB: '0',
      swap: { total: 0, used: 0, free: 0, percentage: 0 },
      buffers: 0,
      cached: 0
    };

    const processInfo = getProcessInfo();

    const systemData = {
      host: hostInfo,
      cpu: finalCpuInfo,
      memory: finalMemoryInfo,
      storage: diskInfo,
      network: networkInfo,
      processes: processCount,
      process: processInfo,
      timestamp: new Date().toISOString()
    };

    cachedSystemInfo = systemData;
    lastCacheTime = now;

    return res.json({
      success: true,
      data: systemData,
      message: 'System metrics retrieved successfully (on-demand fallback)',
      cached: false,
      nextUpdate: new Date(now + CACHE_DURATION).toISOString()
    });

  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metrics',
      error: error.message
    });
  }
});


module.exports = router;
