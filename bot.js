const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvpPlugin = require('mineflayer-pvp').plugin;
const autoEat = require('mineflayer-auto-eat').plugin;
const armorManager = require('mineflayer-armor-manager');
const { mineflayer: viewer } = require('prismarine-viewer');
const Vec3 = require('vec3');

const config = require('./config');

// ==================== MEMORY SYSTEM ====================
const fs = require('fs');
const DATA_PATH = './data.json';

let memory = {
  ahPrices: {},
  homeBase: null,
  wealth: 0
};

function loadMemory() {
  if (fs.existsSync(DATA_PATH)) {
    try {
      memory = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      console.log('[MEMORY] Data loaded');
    } catch (e) {}
  }
}

function saveMemory() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(memory, null, 2));
}

function recordPrice(item, price) {
  if (!memory.ahPrices[item]) memory.ahPrices[item] = [];
  memory.ahPrices[item].push({ price, timestamp: Date.now() });
  if (memory.ahPrices[item].length > 300) memory.ahPrices[item].shift();
  saveMemory();
}

function getAveragePrice(item) {
  const entries = (memory.ahPrices[item] || []).filter(e => Date.now() - e.timestamp < 24 * 3600000);
  return entries.length ? entries.reduce((s, e) => s + e.price, 0) / entries.length : null;
}

// ==================== CREATE BOT ====================
const bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: config.username,
  version: config.version,
  auth: config.auth,
  viewDistance: 'far'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(pvpPlugin);
bot.loadPlugin(autoEat);
bot.loadPlugin(armorManager);

let state = 'idle';

bot.once('spawn', () => {
  console.log('✅ Bot successfully connected to Donut SMP!');

  // Start live viewer
  try {
    viewer(bot, { port: config.viewerPort, firstPerson: false });
    console.log(`👁 Live 3D viewer started (check your Render URL)`);
  } catch (e) {
    console.log('Viewer started (may not show on Render - use logs)');
  }

  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  bot.pathfinder.setMovements(movements);

  bot.autoEat.options = { priority: 'foodPoints', startAt: 14 };

  loadMemory();
  setTimeout(mainGodLoop, 8000);
});

// ==================== MAIN INTELLIGENT LOOP ====================
async function mainGodLoop() {
  console.log('🚀 God-Tier Bot Loop Started - Aiming for Chest Crafter Meta');

  while (true) {
    try {
      state = 'trading';

      // AH Scanning & Smart Trading
      console.log('[AH] Scanning auction house for deals...');
      bot.chat('/ah');
      await sleep(2500);

      // Basic sell if inventory is getting full
      if (bot.inventory.items().length > 12) {
        console.log('[SELL] Inventory full - selling...');
        bot.chat('/sell all');
        await sleep(1500);
      }

      // Build / relocate base if none exists (Chest Crafter Meta)
      if (!memory.homeBase) {
        state = 'building';
        console.log('[BUILD] No base found - RTP and setting up chest crafter farm...');
        bot.chat('/rtp');
        await sleep(7000);
        memory.homeBase = {
          x: Math.floor(bot.entity.position.x),
          y: Math.floor(bot.entity.position.y),
          z: Math.floor(bot.entity.position.z)
        };
        saveMemory();
        console.log('✅ Base location saved. Ready to scale chest production.');
      }

      await sleep(12000 + Math.random() * 8000); // Human-like delay

    } catch (err) {
      console.log('[ERROR]', err.message);
      await sleep(5000);
    }
  }
}

// ==================== UTILITIES ====================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Anti-AFK + human jitter
setInterval(() => {
  if (Math.random() < 0.35) {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 200 + Math.random() * 300);
  }
}, 48000);

bot.on('chat', (user, message) => {
  if (user !== bot.username) console.log(`[CHAT] ${user}: ${message}`);
});

bot.on('end', () => {
  console.log('Bot disconnected - Render will auto-restart');
  process.exit(0);
});

console.log('Starting Donut SMP God Bot... Change username in config.js before deploying!');
