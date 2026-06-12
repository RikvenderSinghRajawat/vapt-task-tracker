module.exports = {
  apps: [{
    name: 'ekavach-api',
    script: 'src/app.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
    },
    max_memory_restart: '500M',
    error_file: '../logs/pm2-error.log',
    out_file: '../logs/pm2-out.log',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 4000,
    exp_backoff_restart_delay: 100,
    kill_timeout: 10000,
    listen_timeout: 15000,
  }],
};
