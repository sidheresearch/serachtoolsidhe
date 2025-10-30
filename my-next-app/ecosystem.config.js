module.exports = {
  apps: [{
    name: 'search-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/serachtoolsidhe/my-next-app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_API_URL: 'http://localhost:8000'
    },
    log_file: '/home/ubuntu/logs/frontend.log',
    error_file: '/home/ubuntu/logs/frontend-error.log',
    out_file: '/home/ubuntu/logs/frontend-out.log',
    instances: 1,
    exec_mode: 'fork',
    restart_delay: 5000,
    max_restarts: 10
  }]
};
