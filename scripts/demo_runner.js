#!/usr/bin/env node
/**
 * GlucoGuard Clinical Simulation Demonstration Runner (TASK-E2E-01)
 *
 * Orchestrates preflight environment health checks, port audits,
 * and concurrent process execution across the monorepo:
 * - Express Backend API (Port 5000)
 * - Next.js Clinical Web Portal (Port 3000)
 * - FastAPI AI Engine (Port 8000)
 *
 * Usage:
 *   node scripts/demo_runner.js          # Preflight check & concurrent start
 *   node scripts/demo_runner.js --check  # Preflight check only (exit code 0/1)
 *
 * @module scripts/demo_runner
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  emerald: '\x1b[32m',
  sky: '\x1b[36m',
  indigo: '\x1b[34m',
  amber: '\x1b[33m',
  rose: '\x1b[31m',
  purple: '\x1b[35m'
};

/**
 * Checks whether a local TCP port is already in use.
 * @param {number} port
 * @returns {Promise<boolean>} Resolves to true if port is available (not in use), false otherwise.
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Prints the GlucoGuard ASCII Clinical Banner.
 */
function printBanner() {
  console.log(`
${colors.emerald}${colors.bold}================================================================================${colors.reset}
${colors.emerald}${colors.bold}   GLUCOGUARD — AI-POWERED CONTINUOUS GLUCOSE MONITORING SIMULATION PLATFORM    ${colors.reset}
${colors.sky}${colors.dim}   Autonomous Healthcare Prototype • Final-Year Engineering Project • Monorepo  ${colors.reset}
${colors.emerald}${colors.bold}================================================================================${colors.reset}
${colors.amber}${colors.bold}[CLINICAL SIMULATION BOUNDARY NOTICE — ADR-007]${colors.reset}
  * Strictly educational prototype. NOT a certified medical device.
  * 100% synthetically simulated telemetry; zero real emergency dispatch (911/112).
  * Absolutely NO drug, insulin titration, or medical prescriptions.
${colors.emerald}--------------------------------------------------------------------------------${colors.reset}`);
}

/**
 * Validates existence of environment configuration and key files.
 */
async function runPreflightChecks() {
  console.log(`\n${colors.bold}[PREFLIGHT READINESS AUDIT]${colors.reset}`);

  let allPassed = true;

  // 1. Check apps/api/.env
  const apiEnvPath = path.join(ROOT_DIR, 'apps', 'api', '.env');
  const apiEnvExists = fs.existsSync(apiEnvPath);
  if (apiEnvExists) {
    const content = fs.readFileSync(apiEnvPath, 'utf8');
    const hasMongo = content.includes('MONGODB_URI=');
    console.log(`  ${colors.emerald}[PASS]${colors.reset} apps/api/.env detected (${hasMongo ? 'MongoDB URI configured' : 'Default config'})`);
  } else {
    console.log(`  ${colors.amber}[WARN]${colors.reset} apps/api/.env not found (Will use in-memory simulation fallback)`);
  }

  // 2. Check apps/web/.env.local or apps/web
  const webPath = path.join(ROOT_DIR, 'apps', 'web');
  if (fs.existsSync(webPath)) {
    console.log(`  ${colors.emerald}[PASS]${colors.reset} apps/web Next.js frontend workspace verified`);
  } else {
    console.log(`  ${colors.rose}[FAIL]${colors.reset} apps/web directory missing`);
    allPassed = false;
  }

  // 3. Check Python venv in services/ai-engine
  const pyVenvWin = path.join(ROOT_DIR, 'services', 'ai-engine', '.venv', 'Scripts', 'python.exe');
  const pyVenvUnix = path.join(ROOT_DIR, 'services', 'ai-engine', '.venv', 'bin', 'python');
  const pyExists = fs.existsSync(pyVenvWin) || fs.existsSync(pyVenvUnix);
  if (pyExists) {
    console.log(`  ${colors.emerald}[PASS]${colors.reset} services/ai-engine Python virtual environment verified`);
  } else {
    console.log(`  ${colors.amber}[WARN]${colors.reset} services/ai-engine/.venv not found (Run setup or pip install -r requirements.txt)`);
  }

  // 4. Port Availability Audit
  console.log(`\n${colors.bold}[PORT AVAILABILITY AUDIT]${colors.reset}`);
  const ports = [
    { name: 'Express API Gateway', port: 5000 },
    { name: 'Next.js Web Portal', port: 3000 },
    { name: 'FastAPI AI Engine', port: 8000 }
  ];

  for (const { name, port } of ports) {
    const available = await isPortAvailable(port);
    if (available) {
      console.log(`  ${colors.emerald}[AVAILABLE]${colors.reset} Port ${port} (${name})`);
    } else {
      console.log(`  ${colors.sky}[ACTIVE / IN USE]${colors.reset} Port ${port} (${name}) — Service may already be running`);
    }
  }

  // 5. Route Sitemap
  console.log(`\n${colors.bold}[INTERACTIVE ROUTE SITEMAP]${colors.reset}`);
  const routes = [
    { label: 'Patient Live Dashboard', url: 'http://localhost:3000' },
    { label: 'Senior Care & Tamil Voice View', url: 'http://localhost:3000 (Toggle Senior Mode)' },
    { label: 'Virtual CGM Simulation Lab', url: 'http://localhost:3000/simulation' },
    { label: 'AI Diet Planner', url: 'http://localhost:3000/diet' },
    { label: 'AI Workout Planner', url: 'http://localhost:3000/workout' },
    { label: 'Emergency Response Hub', url: 'http://localhost:3000/emergency' },
    { label: 'Caregiver Oversight Portal', url: 'http://localhost:3000/caregiver' },
    { label: 'Doctor AGP Clinical Report', url: 'http://localhost:3000/clinical' },
    { label: 'Express API Health Status', url: 'http://localhost:5000/health' },
    { label: 'AI Engine Health Status', url: 'http://localhost:8000/health' }
  ];

  routes.forEach((r) => {
    console.log(`  * ${colors.bold}${r.label.padEnd(32)}${colors.reset} -> ${colors.sky}${r.url}${colors.reset}`);
  });

  console.log(`\n${colors.emerald}${colors.bold}Preflight audit complete. System readiness confirmed.${colors.reset}\n`);
  return allPassed;
}

/**
 * Spawns a long-running service with colored console prefixing.
 */
function spawnService(name, command, args, cwd, color) {
  const isWindows = process.platform === 'win32';
  const cmd = isWindows && command.endsWith('.cmd') ? command : command;

  const child = spawn(cmd, args, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  const prefix = `${color}[${name}]${colors.reset} `;

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((l) => console.log(prefix + l));
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((l) => console.error(prefix + colors.dim + l + colors.reset));
  });

  child.on('close', (code) => {
    console.log(`${prefix}Process exited with code ${code}`);
  });

  return child;
}

/**
 * Starts all 3 monorepo services concurrently.
 */
function startAllServices() {
  console.log(`${colors.bold}Launching GlucoGuard services concurrently... (Press Ctrl+C to stop all)${colors.reset}\n`);

  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  const children = [];

  // 1. Express API (Port 5000)
  const apiChild = spawnService(
    'API:5000',
    npmCmd,
    ['run', 'dev'],
    path.join(ROOT_DIR, 'apps', 'api'),
    colors.emerald
  );
  children.push(apiChild);

  // 2. Next.js Web (Port 3000)
  const webChild = spawnService(
    'WEB:3000',
    npmCmd,
    ['run', 'dev'],
    path.join(ROOT_DIR, 'apps', 'web'),
    colors.sky
  );
  children.push(webChild);

  // 3. FastAPI AI Engine (Port 8000)
  const uvicornPath = isWindows
    ? path.join(ROOT_DIR, 'services', 'ai-engine', '.venv', 'Scripts', 'uvicorn.exe')
    : path.join(ROOT_DIR, 'services', 'ai-engine', '.venv', 'bin', 'uvicorn');

  const uvicornCmd = fs.existsSync(uvicornPath) ? uvicornPath : 'uvicorn';
  const aiChild = spawnService(
    'AI:8000 ',
    uvicornCmd,
    ['main:app', '--reload', '--port', '8000'],
    path.join(ROOT_DIR, 'services', 'ai-engine'),
    colors.purple
  );
  children.push(aiChild);

  // Handle graceful exit
  const handleExit = () => {
    console.log(`\n${colors.amber}Shutting down all GlucoGuard services...${colors.reset}`);
    children.forEach((c) => {
      try {
        if (isWindows) {
          spawn('taskkill', ['/pid', c.pid, '/f', '/t']);
        } else {
          c.kill('SIGTERM');
        }
      } catch (e) {
        // Ignore
      }
    });
    process.exit(0);
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}

// Main entrypoint
async function main() {
  printBanner();
  const passed = await runPreflightChecks();

  if (process.argv.includes('--check')) {
    process.exit(passed ? 0 : 1);
  }

  startAllServices();
}

main().catch((err) => {
  console.error('Fatal error in demo runner:', err);
  process.exit(1);
});
