module.exports = {
  apps: [{
    name: 'search-frontend',
    script: 'npm',
    args: 'start -- --hostname 0.0.0.0',
    cwd: '/home/ec2-user/serachtoolsidhe/my-next-app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_API_URL: 'http://localhost:8000'
    },
    log_file: '/home/ec2-user/logs/frontend.log',
    error_file: '/home/ec2-user/logs/frontend-error.log',
    out_file: '/home/ec2-user/logs/frontend-out.log',
    instances: 1,
    exec_mode: 'fork',
    restart_delay: 5000,
    max_restarts: 10
  }]
};
