const path = require("path");

/** PM2 配置：pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "ip-card-ai",
      cwd: __dirname,
      script: path.join(__dirname, "start-prod.cjs"),
      interpreter: "node",
      node_args: "--max-old-space-size=4096",
      env: {
        NODE_ENV: "production",
        PORT: 8032,
        HOSTNAME: "0.0.0.0",
      },
      autorestart: true,
      max_restarts: 50,
      min_uptime: "10s",
      restart_delay: 3000,
    },
  ],
};
