module.exports = {
  apps: [{
    name: 'ekavach-api',
    cwd: './backend',
    script: 'src/app.js',
    instances: process.env.PM2_INSTANCES || 1,
    exec_mode: process.env.PM2_EXEC_MODE || 'fork',
    watch: false,
    max_memory_restart: process.env.PM2_MAX_MEMORY || '768M',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5000,
      STORAGE_ROOT: process.env.STORAGE_ROOT || '../storage'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    time: true,
    kill_timeout: 10000,
    listen_timeout: 30000,
    shutdown_with_message: true
  }]
};
