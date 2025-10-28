// PM2 Ecosystem Configuration for NowCerts MCP Server
// Usage: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'nowcerts-mcp-sse',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        USE_SSE: 'true',
        PORT: 3000,
      },
      env_file: '.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
    },
    {
      name: 'nowcerts-mcp-test',
      script: './test-sse.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/test-error.log',
      out_file: './logs/test-out.log',
      log_file: './logs/test-combined.log',
      time: true,
      autorestart: true,
      watch: false,
    },
  ],
};
