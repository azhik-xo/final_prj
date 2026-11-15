#!/usr/bin/env node
/**
 * GlucoGuard Virtual CGM Terminal Runner (Module M1)
 *
 * Interactive / CLI runner streaming continuous simulated CGM telemetry:
 * - Selects persona (default: VP-03 Brittle Type 1 or VP-01 Healthy)
 * - Streams readings every 1-2 seconds with trend arrows and clinical color-coding
 * - Supports CLI event injection via --event flag
 * - Prominently displays non-clinical simulation disclaimers per ADR-007
 *
 * Usage:
 *   node runner.js --persona VP-03
 *   node runner.js --persona VP-02 --event meal_spike
 *   node runner.js --persona VP-03 --event hypo_drop --interval 1000
 *
 * @module simulator/runner
 */

const { SimulatorEngine } = require('./simulatorEngine');
const { getAllPersonas } = require('./personas');

// ANSI Color formatting
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    persona: 'VP-03', // Default to VP-03 to demonstrate high volatility & risk
    interval: 1500,   // 1.5 seconds per tick for snappy terminal demo
    event: null,
    ticks: Infinity   // Run continuously unless count specified
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--persona' || arg === '-p') {
      options.persona = args[++i];
    } else if (arg === '--interval' || arg === '-i') {
      options.interval = parseInt(args[++i], 10) || 1500;
    } else if (arg === '--event' || arg === '-e') {
      options.event = args[++i];
    } else if (arg === '--ticks' || arg === '-t') {
      options.ticks = parseInt(args[++i], 10) || Infinity;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
${C.bold}${C.cyan}GlucoGuard Virtual CGM Terminal Runner${C.reset}
Usage: node runner.js [options]

Options:
  -p, --persona <id>     Persona ID (VP-01 through VP-06, default: VP-03)
  -i, --interval <ms>    Tick interval in milliseconds (default: 1500)
  -e, --event <type>     Inject event immediately (meal_spike, hypo_drop, exercise, rescue_carbs, reset)
  -t, --ticks <count>    Stop after <count> readings (default: continuous)
  -h, --help             Show this help screen

Available Personas:
${getAllPersonas()
  .map((p) => `  ${C.bold}${p.id}${C.reset}: ${p.name} (Baseline: ${p.baseline} mg/dL)`)
  .join('\n')}
`);
}

function colorizeGlucose(glucose) {
  if (glucose < 54) {
    return `${C.bgRed}${C.white}${C.bold} ${glucose} mg/dL (CRITICAL LOW) ${C.reset}`;
  }
  if (glucose < 70) {
    return `${C.red}${C.bold}${glucose} mg/dL (LOW)${C.reset}`;
  }
  if (glucose > 250) {
    return `${C.bgYellow}${C.black}${C.bold} ${glucose} mg/dL (CRITICAL HIGH) ${C.reset}`;
  }
  if (glucose > 180) {
    return `${C.yellow}${C.bold}${glucose} mg/dL (HIGH)${C.reset}`;
  }
  return `${C.green}${C.bold}${glucose} mg/dL (IN TARGET)${C.reset}`;
}

function colorizeTrend(arrow, roc) {
  const sign = roc > 0 ? `+${roc}` : `${roc}`;
  if (arrow === '↑↑' || arrow === '↓↓') {
    return `${C.magenta}${C.bold}${arrow} (${sign} mg/dL/min)${C.reset}`;
  }
  if (arrow === '↑' || arrow === '↓') {
    return `${C.cyan}${arrow} (${sign} mg/dL/min)${C.reset}`;
  }
  return `${C.dim}${arrow} (${sign} mg/dL/min)${C.reset}`;
}

function main() {
  const options = parseArgs();
  const engine = new SimulatorEngine();

  console.log(`\n${C.bold}${C.yellow}══════════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(` ${C.bold}${C.red}SIMULATION ONLY — NOT A CLINICAL MEDICAL DEVICE${C.reset}`);
  console.log(` ${C.dim}All telemetry is computer-generated for simulation & testing purposes.${C.reset}`);
  console.log(`${C.bold}${C.yellow}══════════════════════════════════════════════════════════════════════════════${C.reset}\n`);

  console.log(`${C.cyan}Selected Persona:${C.reset} ${C.bold}${options.persona}${C.reset}`);
  console.log(`${C.cyan}Tick Interval:${C.reset}    ${options.interval} ms`);
  if (options.event) {
    console.log(`${C.magenta}Initial Event:${C.reset}    ${C.bold}${options.event}${C.reset}`);
  }
  console.log(`${C.dim}Press Ctrl+C to stop simulation.${C.reset}\n`);

  console.log(
    `${C.bold}${'TIMESTAMP'.padEnd(14)} | ${'PERSONA'.padEnd(24)} | ${'GLUCOSE'.padEnd(28)} | ${'TREND'.padEnd(20)} | ${'EVENT'.padEnd(14)} | ${'BATTERY'}${C.reset}`
  );
  console.log('-'.repeat(105));

  let count = 0;

  engine.onReading((reading) => {
    count++;
    const timeStr = new Date(reading.timestamp).toLocaleTimeString();
    const personaStr = reading.persona.length > 24
      ? reading.persona.substring(0, 21) + '...'
      : reading.persona.padEnd(24);
    const glucoseStr = colorizeGlucose(reading.glucose);
    const trendStr = colorizeTrend(reading.trendArrow, reading.rateOfChange);
    const eventStr = reading.activeEvent
      ? `${C.magenta}[${reading.activeEvent}]${C.reset}`
      : `${C.dim}[none]${C.reset}`;
    const batteryStr = `${reading.batteryLevel}%`;

    console.log(
      `${timeStr.padEnd(14)} | ${personaStr} | ${glucoseStr.padEnd(38)} | ${trendStr.padEnd(30)} | ${eventStr.padEnd(24)} | ${batteryStr}`
    );

    if (count >= options.ticks) {
      console.log(`\n${C.green}Completed ${count} ticks. Stopping simulator.${C.reset}`);
      engine.stop();
      process.exit(0);
    }
  });

  // Start the engine
  engine.start(options.persona, {
    intervalMs: options.interval,
    simulatedMinutesPerTick: 5
  });

  // Inject event if requested via CLI
  if (options.event) {
    try {
      engine.injectEvent(options.event);
    } catch (err) {
      console.error(`${C.red}Error injecting event:${C.reset}`, err.message);
    }
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n${C.yellow}Shutting down simulator gracefully...${C.reset}`);
    engine.stop();
    console.log(`${C.green}Simulator stopped.${C.reset}\n`);
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}

module.exports = { main };

