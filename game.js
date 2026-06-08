// Space Explorer - Core Game Script

// Game Configurations & Balancing
const CONFIG = {
  shipSpeed: 0.15,
  shipMaxSpeed: 6.0,
  shipBoostMaxSpeed: 10.0,
  shipFriction: 0.985,
  shipTurnSpeed: 0.08,
  asteroidMinSpeed: 1.0,
  asteroidMaxSpeed: 3.5,
  asteroidSpawnRate: 1500, // ms
  crystalSpawnRate: 2000,  // ms
  powerupSpawnRate: 15000, // ms
  maxAsteroids: 30,
  maxCrystals: 20,
  maxPowerups: 5,
  worldBounds: 3000, // invisible boundary wrap
};

class Spaceship {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2; // Pointing upwards
    this.targetAngle = -Math.PI / 2;
    this.radius = 20;
    
    // Status
    this.maxHull = 100;
    this.hull = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.shieldRechargeRate = 0.02; // slow passive recharge
    
    // Power-up durations in ms
    this.boostTimer = 0;
    this.shieldTimer = 0;
    this.magnetTimer = 0;
    
    this.thrusting = false;
  }

  update(keys, mouse, dt) {
    // 1. Passive Shield Recharge
    if (this.shieldTimer <= 0 && this.shield < this.maxShield && this.hull > 0) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRechargeRate);
    }

    // 2. Power-up Timers
    if (this.boostTimer > 0) this.boostTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;

    // 3. Movement Controls (Keyboard WASD / Arrows)
    let moveX = 0;
    let moveY = 0;
    
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;

    // Determine target angle based on movement direction
    let keyboardSteering = false;
    if (moveX !== 0 || moveY !== 0) {
      this.targetAngle = Math.atan2(moveY, moveX);
      this.thrusting = true;
      keyboardSteering = true;
      mouse.active = false; // Deactivate mouse steering while using keyboard
    } else {
      this.thrusting = false;
    }

    // Mouse Steering override
    if (mouse.active) {
      const dx = mouse.worldX - this.x;
      const dy = mouse.worldY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Only steer if mouse is a reasonable distance from ship
      if (dist > 15) {
        this.targetAngle = Math.atan2(dy, dx);
        // Thrust if mouse button is held down or mouse steer active
        if (mouse.down) {
          this.thrusting = true;
        }
      }
    }

    // Smooth rotation towards target angle
    let angleDiff = this.targetAngle - this.angle;
    // Normalize angle difference to -PI to PI
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    
    this.angle += angleDiff * CONFIG.shipTurnSpeed;

    // Apply Acceleration / Thrust
    if (this.thrusting) {
      const currentAcc = CONFIG.shipSpeed * (this.boostTimer > 0 ? 1.8 : 1.0);
      this.vx += Math.cos(this.angle) * currentAcc;
      this.vy += Math.sin(this.angle) * currentAcc;
    }

    // Apply Friction / Drag
    this.vx *= CONFIG.shipFriction;
    this.vy *= CONFIG.shipFriction;

    // Limit Max Velocity
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxSpeed = this.boostTimer > 0 ? CONFIG.shipBoostMaxSpeed : CONFIG.shipMaxSpeed;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    // Update coordinates
    this.x += this.vx;
    this.y += this.vy;

    // Boundary wrapping
    if (this.x < -CONFIG.worldBounds) this.x += CONFIG.worldBounds * 2;
    if (this.x > CONFIG.worldBounds) this.x -= CONFIG.worldBounds * 2;
    if (this.y < -CONFIG.worldBounds) this.y += CONFIG.worldBounds * 2;
    if (this.y > CONFIG.worldBounds) this.y -= CONFIG.worldBounds * 2;
  }

  draw(ctx, camera) {
    ctx.save();
    
    // Convert world position to screen position
    const screenX = this.x - camera.x + ctx.canvas.width / 2;
    const screenY = this.y - camera.y + ctx.canvas.height / 2;

    ctx.translate(screenX, screenY);
    ctx.rotate(this.angle);

    // Draw Ship body
    ctx.shadowBlur = this.boostTimer > 0 ? 12 : 5;
    ctx.shadowColor = this.boostTimer > 0 ? '#b927fc' : '#00f2fe';

    // Spaceship design (vector drawing)
    ctx.fillStyle = '#101726';
    ctx.strokeStyle = this.boostTimer > 0 ? '#b927fc' : '#00f2fe';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Nose
    ctx.moveTo(25, 0);
    // Right wing tip
    ctx.lineTo(-15, 16);
    // Tail indent
    ctx.lineTo(-8, 0);
    // Left wing tip
    ctx.lineTo(-15, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wings decorative panel
    ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
    if (this.boostTimer > 0) ctx.fillStyle = 'rgba(185, 39, 252, 0.2)';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fill();

    // Cockpit shield glass
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.ellipse(3, 0, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engines/Thruster ports
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(-12, -8, 4, 3);
    ctx.fillRect(-12, 5, 4, 3);

    ctx.restore();

    // Shield Dome Overlay (if active or charging)
    if (this.shieldTimer > 0 || (this.shield > 0 && Math.random() > 0.05)) {
      ctx.save();
      ctx.translate(screenX, screenY);
      
      const shieldAlpha = this.shieldTimer > 0 ? 
        0.5 + Math.sin(Date.now() * 0.015) * 0.25 : 
        (this.shield / this.maxShield) * 0.15;
      
      const shieldGlowColor = this.shieldTimer > 0 ? '#b927fc' : '#00f2fe';
      ctx.strokeStyle = shieldGlowColor;
      ctx.shadowColor = shieldGlowColor;
      ctx.shadowBlur = this.shieldTimer > 0 ? 25 : 12;
      ctx.lineWidth = this.shieldTimer > 0 ? 3 : 1.5;
      ctx.fillStyle = this.shieldTimer > 0 ? 'rgba(185, 39, 252, 0.08)' : 'rgba(0, 242, 254, 0.04)';
      
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

class Asteroid {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius || Math.random() * 30 + 15; // 15 to 45px
    
    // Velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * (CONFIG.asteroidMaxSpeed - CONFIG.asteroidMinSpeed) + CONFIG.asteroidMinSpeed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    // Rotation
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = Math.random() * 0.03 - 0.015;

    // Irregular asteroid layout vertices
    this.vertexCount = Math.floor(Math.random() * 5) + 8; // 8 to 12 vertices
    this.vertexOffsets = [];
    for (let i = 0; i < this.vertexCount; i++) {
      // Offset ranges between 80% and 120% of core radius
      this.vertexOffsets.push(Math.random() * 0.4 + 0.8);
    }
    
    this.mass = this.radius * 1.5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;

    // Wrap around bounds
    if (this.x < -CONFIG.worldBounds) this.x += CONFIG.worldBounds * 2;
    if (this.x > CONFIG.worldBounds) this.x -= CONFIG.worldBounds * 2;
    if (this.y < -CONFIG.worldBounds) this.y += CONFIG.worldBounds * 2;
    if (this.y > CONFIG.worldBounds) this.y -= CONFIG.worldBounds * 2;
  }

  draw(ctx, camera) {
    ctx.save();
    
    const screenX = this.x - camera.x + ctx.canvas.width / 2;
    const screenY = this.y - camera.y + ctx.canvas.height / 2;

    ctx.translate(screenX, screenY);
    ctx.rotate(this.rotation);

    // Styling
    ctx.fillStyle = '#222530';
    ctx.strokeStyle = '#4e556e';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';

    ctx.beginPath();
    for (let i = 0; i < this.vertexCount; i++) {
      const angle = (i / this.vertexCount) * Math.PI * 2;
      const r = this.radius * this.vertexOffsets[i];
      const vx = Math.cos(angle) * r;
      const vy = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw some craters inside asteroid for volumetric premium look
    ctx.fillStyle = '#161821';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.radius * 0.4, this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Crystal {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.type = type || this.rollType();
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = 0.02 + Math.random() * 0.02;
    this.pulsePhase = Math.random() * 100;
  }

  rollType() {
    const roll = Math.random();
    if (roll > 0.92) return 'hyper'; // 8% gold
    if (roll > 0.75) return 'rare';  // 17% purple
    return 'common';                 // 75% blue
  }

  update(ship, dt) {
    this.rotation += this.rotSpeed;
    this.pulsePhase += 0.05;

    // Crystal Magnet Power-up Logic: Pull crystals if in magnet range
    if (ship.magnetTimer > 0) {
      const dx = ship.x - this.x;
      const dy = ship.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const magnetRange = 250;
      
      if (dist < magnetRange) {
        const pullSpeed = 4.5 * (1 - dist / magnetRange); // pull faster the closer it is
        this.x += (dx / dist) * pullSpeed;
        this.y += (dy / dist) * pullSpeed;
      }
    }

    // Wrap around bounds
    if (this.x < -CONFIG.worldBounds) this.x += CONFIG.worldBounds * 2;
    if (this.x > CONFIG.worldBounds) this.x -= CONFIG.worldBounds * 2;
    if (this.y < -CONFIG.worldBounds) this.y += CONFIG.worldBounds * 2;
    if (this.y > CONFIG.worldBounds) this.y -= CONFIG.worldBounds * 2;
  }

  draw(ctx, camera) {
    ctx.save();
    
    const screenX = this.x - camera.x + ctx.canvas.width / 2;
    const screenY = this.y - camera.y + ctx.canvas.height / 2;

    ctx.translate(screenX, screenY);
    ctx.rotate(this.rotation);

    // Glowing oscillation
    const sizeOffset = Math.sin(this.pulsePhase) * 1.5;
    const size = this.radius + sizeOffset;

    let glowColor = '#00f2fe'; // Common: Blue
    let crystalFill = 'rgba(0, 242, 254, 0.7)';
    let crystalBorder = '#ffffff';

    if (this.type === 'rare') {
      glowColor = '#b927fc'; // Rare: Purple
      crystalFill = 'rgba(185, 39, 252, 0.75)';
    } else if (this.type === 'hyper') {
      glowColor = '#ffd700'; // Hyper: Gold
      crystalFill = 'rgba(255, 215, 0, 0.85)';
    }

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = crystalFill;
    ctx.strokeStyle = crystalBorder;
    ctx.lineWidth = 1.5;

    // Draw diamond shape
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // inner facets for glass sheen
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.moveTo(-size * 0.7, 0);
    ctx.lineTo(size * 0.7, 0);
    ctx.stroke();

    ctx.restore();
  }
}

class Powerup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.type = type || this.rollType();
    this.rotation = 0;
    this.pulsePhase = Math.random() * 100;
  }

  rollType() {
    const types = ['shield', 'boost', 'magnet'];
    return types[Math.floor(Math.random() * types.length)];
  }

  update() {
    this.rotation += 0.015;
    this.pulsePhase += 0.04;

    // Wrap around bounds
    if (this.x < -CONFIG.worldBounds) this.x += CONFIG.worldBounds * 2;
    if (this.x > CONFIG.worldBounds) this.x -= CONFIG.worldBounds * 2;
    if (this.y < -CONFIG.worldBounds) this.y += CONFIG.worldBounds * 2;
    if (this.y > CONFIG.worldBounds) this.y -= CONFIG.worldBounds * 2;
  }

  draw(ctx, camera) {
    ctx.save();
    
    const screenX = this.x - camera.x + ctx.canvas.width / 2;
    const screenY = this.y - camera.y + ctx.canvas.height / 2;

    ctx.translate(screenX, screenY);
    ctx.rotate(this.rotation);

    // Glowing pulse size
    const size = this.radius + Math.sin(this.pulsePhase) * 2;
    let color = '#00f2fe';
    let icon = '⚡';

    if (this.type === 'shield') {
      color = '#39ff14'; // Green
      icon = '🛡️';
    } else if (this.type === 'magnet') {
      color = '#ff007f'; // Pink
      icon = '🧲';
    }

    // Outer capsule ring
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(10, 15, 30, 0.8)';
    
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotating dashed inner ring
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, size - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Draw symbol inside
    ctx.restore();
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.font = '14px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);
    ctx.restore();
  }
}

// Main Game Controller
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Systems
    this.starfield = null;
    this.particles = new ParticleEngine();
    
    // State
    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
    this.score = 0;
    this.crystalsCount = 0;
    this.streak = 0;
    this.multiplier = 1;
    this.highScore = parseInt(localStorage.getItem('space_explorer_highscore')) || 0;
    this.isNewRecord = false;
    this.timePlayed = 0; // seconds

    // Timers for Spawners
    this.spawnerTimers = {
      asteroid: 0,
      crystal: 0,
      powerup: 0
    };

    // Entities
    this.ship = null;
    this.asteroids = [];
    this.crystals = [];
    this.powerups = [];
    
    // Camera
    this.camera = { x: 0, y: 0, smoothFactor: 0.1 };

    // Inputs
    this.keys = {};
    this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, active: false };
    this.touch = { startX: 0, startY: 0, active: false };

    // Set up everything
    this.init();
  }

  init() {
    this.resizeCanvas();
    this.starfield = new Starfield(this.canvas.width, this.canvas.height);

    // Event Listeners
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Keyboard inputs
    window.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;

      // Handle ESC key for pausing
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        }
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse inputs
    window.addEventListener('mousemove', e => {
      this.mouse.active = true;
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    window.addEventListener('mousedown', e => {
      if (this.state === 'PLAYING') {
        this.mouse.down = true;
        this.mouse.active = true;
      }
      // Audio engine initializer trigger on any click
      window.GameAudio.init();
    });

    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });

    // Touch inputs (joystick setup)
    this.setupTouchControls();

    // DOM UI Button Actions
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-audio-toggle').addEventListener('click', () => this.toggleAudio());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-restart-pause').addEventListener('click', () => this.startGame());
    document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-menu').addEventListener('click', () => this.quitToMenu());

    // Update initial highscore board on main menu
    document.getElementById('menu-high-score').textContent = this.formatNumber(this.highScore);

    // Tab visibility change optimization
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'PLAYING') {
        this.pauseGame();
      }
    });

    // Start Animation Loop
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.starfield) {
      this.starfield.resize(this.canvas.width, this.canvas.height);
    }
  }

  setupTouchControls() {
    const container = document.getElementById('virtual-joystick-container');
    const handle = document.getElementById('joystick-handle');
    let joystickBaseRect = null;

    window.addEventListener('touchstart', e => {
      if (this.state !== 'PLAYING') return;
      
      window.GameAudio.init();
      const t = e.touches[0];
      this.touch.active = true;
      
      // Position base at touch position
      container.classList.remove('hidden');
      container.style.left = `${t.clientX - 60}px`;
      container.style.top = `${t.clientY - 60}px`;
      
      this.touch.startX = t.clientX;
      this.touch.startY = t.clientY;
      
      joystickBaseRect = container.getBoundingClientRect();
      handle.style.transform = 'translate(0px, 0px)';
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (!this.touch.active || this.state !== 'PLAYING') return;

      const t = e.touches[0];
      const dx = t.clientX - this.touch.startX;
      const dy = t.clientY - this.touch.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 45; // bounds of base

      let pullRatio = Math.min(dist, maxDist) / maxDist;
      let angle = Math.atan2(dy, dx);

      // Translate handle element visually
      const handleX = Math.cos(angle) * maxDist * pullRatio;
      const handleY = Math.sin(angle) * maxDist * pullRatio;
      handle.style.transform = `translate(${handleX}px, ${handleY}px)`;

      // Propagate steering values to spaceship
      this.ship.targetAngle = angle;
      this.ship.thrusting = pullRatio > 0.15;
      
      // Feed throttle intensity into thruster sound
      window.GameAudio.setEngineActive(this.ship.thrusting, pullRatio);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.touch.active = false;
      container.classList.add('hidden');
      if (this.ship) {
        this.ship.thrusting = false;
      }
      window.GameAudio.setEngineActive(false);
    });
  }

  // --- State Transitions ---

  startGame() {
    window.GameAudio.init();
    window.GameAudio.resumeContext();
    
    // Reset properties
    this.score = 0;
    this.crystalsCount = 0;
    this.streak = 0;
    this.multiplier = 1;
    this.isNewRecord = false;
    this.timePlayed = 0;
    this.asteroids = [];
    this.crystals = [];
    this.powerups = [];
    this.particles.clear();
    
    // Create new player
    this.ship = new Spaceship(0, 0);
    this.camera.x = 0;
    this.camera.y = 0;

    // Set initial spawns
    this.spawnStartingEntities();

    // Toggle DOM panels
    this.state = 'PLAYING';
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    
    this.updateHUD();
    
    // Play transition chime
    window.GameAudio.playShieldSound();
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    document.getElementById('pause-menu').classList.remove('hidden');
    window.GameAudio.setEngineActive(false);
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    document.getElementById('pause-menu').classList.add('hidden');
    window.GameAudio.resumeContext();
    this.lastTime = performance.now();
  }

  quitToMenu() {
    this.state = 'MENU';
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over-menu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    
    // Stop engine sound
    window.GameAudio.setEngineActive(false);
    
    // Refresh highscore
    document.getElementById('menu-high-score').textContent = this.formatNumber(this.highScore);
  }

  gameOver() {
    this.state = 'GAMEOVER';
    
    // Check for highscore record
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('space_explorer_highscore', this.highScore);
      this.isNewRecord = true;
    }

    // Set UI statistics
    document.getElementById('go-score').textContent = this.formatNumber(this.score);
    document.getElementById('go-crystals').textContent = this.crystalsCount;
    document.getElementById('go-multiplier').textContent = `x${this.multiplier}`;

    const badge = document.getElementById('new-high-score-badge');
    if (this.isNewRecord) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-menu').classList.remove('hidden');

    window.GameAudio.playGameOverSound();
  }

  toggleAudio() {
    const muted = window.GameAudio.toggleMute();
    const btnText = document.getElementById('btn-audio-toggle');
    btnText.innerHTML = muted ? '<span class="icon">🔇</span> AUDIO OFF' : '<span class="icon">🔊</span> AUDIO ON';
  }

  // --- Game Mechanics / Spawners ---

  spawnStartingEntities() {
    // Spawn a few crystals and asteroids around the player initial viewport
    for (let i = 0; i < 8; i++) {
      this.spawnAsteroid(true);
    }
    for (let i = 0; i < 6; i++) {
      this.spawnCrystal(true);
    }
  }

  spawnAsteroid(local = false) {
    if (this.asteroids.length >= CONFIG.maxAsteroids) return;

    let x, y;
    if (local) {
      // Spawn surrounding the center area, but not right on top of ship
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 500 + 250;
      x = Math.cos(angle) * dist;
      y = Math.sin(angle) * dist;
    } else {
      // Spawn offscreen in relation to camera coordinates
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(this.canvas.width, this.canvas.height) * 0.7;
      x = this.camera.x + Math.cos(angle) * dist;
      y = this.camera.y + Math.sin(angle) * dist;
    }

    this.asteroids.push(new Asteroid(x, y));
  }

  spawnCrystal(local = false) {
    if (this.crystals.length >= CONFIG.maxCrystals) return;

    let x, y;
    if (local) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 400 + 150;
      x = Math.cos(angle) * dist;
      y = Math.sin(angle) * dist;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(this.canvas.width, this.canvas.height) * 0.6;
      x = this.camera.x + Math.cos(angle) * dist;
      y = this.camera.y + Math.sin(angle) * dist;
    }

    this.crystals.push(new Crystal(x, y));
  }

  spawnPowerup() {
    if (this.powerups.length >= CONFIG.maxPowerups) return;

    // Spawn off-camera in the space
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(this.canvas.width, this.canvas.height) * 0.6;
    const x = this.camera.x + Math.cos(angle) * dist;
    const y = this.camera.y + Math.sin(angle) * dist;

    this.powerups.push(new Powerup(x, y));
  }

  // --- Collisions & Physics Solvers ---

  checkCollisions() {
    if (!this.ship || this.ship.hull <= 0) return;

    // 1. Ship vs Asteroids (Damage, bounce, reset multiplier)
    this.asteroids.forEach(ast => {
      const dx = this.ship.x - ast.x;
      const dy = this.ship.y - ast.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = this.ship.radius + ast.radius;

      if (dist < minDist) {
        // Spark particles at collision point
        const collisionAngle = Math.atan2(dy, dx);
        const colX = ast.x + Math.cos(collisionAngle) * ast.radius;
        const colY = ast.y + Math.sin(collisionAngle) * ast.radius;

        // Bounce physics vector calculation
        const normalX = dx / dist;
        const normalY = dy / dist;
        
        // Relative velocity
        const kx = this.ship.vx - ast.vx;
        const ky = this.ship.vy - ast.vy;
        
        // Dot product of normal vector and velocity
        const p = 2 * (normalX * kx + normalY * ky) / (1 + ast.mass / 20); // ship mass approx 20

        // Bounce the ship away
        this.ship.vx -= normalX * p * 0.6;
        this.ship.vy -= normalY * p * 0.6;
        
        // Nudge ship outside asteroid diameter to prevent sticky overlap
        this.ship.x = ast.x + normalX * minDist;
        this.ship.y = ast.y + normalY * minDist;

        // Apply Damage
        let damage = Math.floor(ast.radius * 0.7);
        this.triggerDamage(damage, colX, colY, collisionAngle);
      }
    });

    // 2. Ship vs Crystals (Harvest)
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const cry = this.crystals[i];
      const dx = this.ship.x - cry.x;
      const dy = this.ship.y - cry.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.ship.radius + cry.radius) {
        this.harvestCrystal(cry, i);
      }
    }

    // 3. Ship vs Power-ups (Upgrade timers)
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pup = this.powerups[i];
      const dx = this.ship.x - pup.x;
      const dy = this.ship.y - pup.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.ship.radius + pup.radius) {
        this.activatePowerup(pup, i);
      }
    }

    // 4. Asteroid vs Asteroid Elastic Bounce (Makes asteroid field dynamic!)
    for (let i = 0; i < this.asteroids.length; i++) {
      for (let j = i + 1; j < this.asteroids.length; j++) {
        const a1 = this.asteroids[i];
        const a2 = this.asteroids[j];

        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a1.radius + a2.radius;

        if (dist < minDist) {
          const normalX = dx / dist;
          const normalY = dy / dist;
          
          // Elastic collision math
          const kx = a1.vx - a2.vx;
          const ky = a1.vy - a2.vy;
          const p = 2 * (normalX * kx + normalY * ky) / (a1.mass + a2.mass);
          
          a1.vx -= normalX * p * a2.mass;
          a1.vy -= normalY * p * a2.mass;
          a2.vx += normalX * p * a1.mass;
          a2.vy += normalY * p * a1.mass;

          // Prevent overlap glitch
          const overlap = minDist - dist;
          a1.x -= normalX * overlap * 0.5;
          a1.y -= normalY * overlap * 0.5;
          a2.x += normalX * overlap * 0.5;
          a2.y += normalY * overlap * 0.5;
        }
      }
    }
  }

  triggerDamage(damage, hitX, hitY, hitAngle) {
    // Screen shake overlay activation
    const container = document.getElementById('game-container');
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 400);

    // Apply shield or hull reduction
    if (this.ship.shieldTimer > 0) {
      // Golden shield active, completely immune!
      this.particles.createShieldSparks(hitX, hitY, hitAngle);
      window.GameAudio.playShieldSound();
      this.particles.createFloatingText(this.ship.x, this.ship.y, "BLOCKED", "#ffd700", 18);
      return;
    }

    if (this.ship.shield > 0) {
      // Shield absorbs first
      const shieldDeduction = Math.min(this.ship.shield, damage);
      this.ship.shield -= shieldDeduction;
      damage -= shieldDeduction;
      
      this.particles.createShieldSparks(hitX, hitY, hitAngle);
      window.GameAudio.playShieldSound();
    }

    if (damage > 0) {
      // Hull absorbs remaining
      this.ship.hull = Math.max(0, this.ship.hull - damage);
      window.GameAudio.playExplosionSound();
      this.particles.createAsteroidExplosion(hitX, hitY, damage * 0.5);
      
      this.particles.createFloatingText(this.ship.x, this.ship.y, `-${damage} HULL`, "#ff5e3a", 16);
    }

    // Reset multiplier streak
    this.streak = 0;
    this.multiplier = 1;

    this.updateHUD();

    if (this.ship.hull <= 0) {
      this.gameOver();
    }
  }

  harvestCrystal(cry, index) {
    this.crystals.splice(index, 1);
    
    // Add stats
    this.crystalsCount++;
    
    let baseScore = 100;
    let text = "+100";
    let color = "#00f2fe";

    if (cry.type === 'rare') {
      baseScore = 250;
      text = "+250 RARE";
      color = "#b927fc";
      // Grant small speed boost
      this.ship.boostTimer = Math.max(this.ship.boostTimer, 2000); // 2s boost
    } else if (cry.type === 'hyper') {
      baseScore = 500;
      text = "+500 HYPER!";
      color = "#ffd700";
      // Grant small invincibility shield
      this.ship.shieldTimer = Math.max(this.ship.shieldTimer, 3000); // 3s shield
    }

    // Calculate score with multiplier
    const addedScore = baseScore * this.multiplier;
    this.score += addedScore;

    // Handle multiplier streak: Every 5 crystals increases multiplier up to x5
    this.streak++;
    if (this.streak >= 5 && this.multiplier < 5) {
      this.multiplier++;
      this.streak = 0;
      this.particles.createFloatingText(this.ship.x, this.ship.y - 25, `MULTIPLIER x${this.multiplier}!`, "#39ff14", 20);
    }

    // Visual indicators
    this.particles.createCrystalCollectSparks(cry.x, cry.y, cry.type);
    this.particles.createFloatingText(cry.x, cry.y, `${text} (x${this.multiplier})`, color, 15);
    
    window.GameAudio.playCrystalSound(cry.type);
    this.updateHUD();
  }

  activatePowerup(pup, index) {
    this.powerups.splice(index, 1);

    let text = "SHIELD CHARGED";
    let color = "#39ff14";

    if (pup.type === 'shield') {
      this.ship.shield = this.ship.maxShield;
      this.ship.hull = Math.min(this.ship.maxHull, this.ship.hull + 20); // heal hull too
      window.GameAudio.playShieldSound();
    } else if (pup.type === 'boost') {
      this.ship.boostTimer = 8000; // 8 seconds super booster
      text = "ENGINE BOOSTER";
      color = "#ff5e3a";
    } else if (pup.type === 'magnet') {
      this.ship.magnetTimer = 12000; // 12 seconds magnet
      text = "CRYSTAL MAGNET";
      color = "#ff007f";
    }

    this.particles.createCrystalCollectSparks(pup.x, pup.y, 'hyper');
    this.particles.createFloatingText(this.ship.x, this.ship.y, text, color, 16);
    
    this.updateHUD();
  }

  formatNumber(num) {
    return num.toString().padStart(6, '0');
  }

  updateHUD() {
    if (!this.ship) return;
    
    // Numbers
    document.getElementById('hud-score').textContent = this.formatNumber(this.score);
    document.getElementById('hud-multiplier').textContent = `x${this.multiplier}`;
    document.getElementById('hud-crystals').textContent = this.crystalsCount;

    // Calculate speed unit vector u/s
    const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
    document.getElementById('hud-speed').textContent = `${Math.floor(speed * 100)} u/s`;

    // Fill bars
    const shieldFill = document.getElementById('shield-fill');
    const shieldPercent = document.getElementById('shield-percent');
    const shieldW = Math.max(0, (this.ship.shield / this.ship.maxShield) * 100);
    shieldFill.style.width = `${shieldW}%`;
    shieldPercent.textContent = `${Math.floor(shieldW)}%`;

    const hullFill = document.getElementById('hull-fill');
    const hullPercent = document.getElementById('hull-percent');
    const hullW = Math.max(0, (this.ship.hull / this.ship.maxHull) * 100);
    hullFill.style.width = `${hullW}%`;
    hullPercent.textContent = `${Math.floor(hullW)}%`;
  }

  updatePowerupUI() {
    const bar = document.getElementById('powerup-status');
    if (!this.ship) return;

    // Find the active power-up with the highest remaining time
    let activeType = null;
    let duration = 0;
    let maxDuration = 1;

    if (this.ship.boostTimer > 0) {
      activeType = 'boost';
      duration = this.ship.boostTimer;
      maxDuration = 8000; // 8s
    } else if (this.ship.magnetTimer > 0) {
      activeType = 'magnet';
      duration = this.ship.magnetTimer;
      maxDuration = 12000; // 12s
    } else if (this.ship.shieldTimer > 0) {
      activeType = 'invincibility';
      duration = this.ship.shieldTimer;
      maxDuration = 3000; // 3s
    }

    if (activeType) {
      bar.classList.remove('hidden');
      const fill = document.getElementById('powerup-bar-fill');
      const name = document.getElementById('powerup-name');
      const icon = document.getElementById('powerup-icon');

      const percent = (duration / maxDuration) * 100;
      fill.style.width = `${percent}%`;

      if (activeType === 'boost') {
        icon.textContent = '⚡';
        name.textContent = 'BOOSTER';
        fill.style.background = 'var(--neon-orange)';
        fill.style.boxShadow = '0 0 6px var(--neon-orange)';
      } else if (activeType === 'magnet') {
        icon.textContent = '🧲';
        name.textContent = 'MAGNET';
        fill.style.background = 'var(--neon-pink)';
        fill.style.boxShadow = '0 0 6px var(--neon-pink)';
      } else if (activeType === 'invincibility') {
        icon.textContent = '🛡️';
        name.textContent = 'SHIELD BOOST';
        fill.style.background = 'var(--neon-purple)';
        fill.style.boxShadow = '0 0 6px var(--neon-purple)';
      }
    } else {
      bar.classList.add('hidden');
    }
  }

  // --- Main Core Loop ---

  loop(currentTime) {
    requestAnimationFrame(t => this.loop(t));

    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Protect against freeze lag spikes
    if (dt > 200) return;

    if (this.state === 'PLAYING') {
      this.timePlayed += dt / 1000;
      this.update(dt);
    }
    
    this.draw();
  }

  update(dt) {
    // 1. Mouse coordinates translations to world space
    if (this.mouse.active && this.ship) {
      this.mouse.worldX = this.mouse.x + this.camera.x - this.canvas.width / 2;
      this.mouse.worldY = this.mouse.y + this.camera.y - this.canvas.height / 2;
    }

    // 2. Spawners logic
    this.spawnerTimers.asteroid += dt;
    this.spawnerTimers.crystal += dt;
    this.spawnerTimers.powerup += dt;

    if (this.spawnerTimers.asteroid >= CONFIG.asteroidSpawnRate) {
      this.spawnerTimers.asteroid = 0;
      this.spawnAsteroid();
    }
    if (this.spawnerTimers.crystal >= CONFIG.crystalSpawnRate) {
      this.spawnerTimers.crystal = 0;
      this.spawnCrystal();
    }
    if (this.spawnerTimers.powerup >= CONFIG.powerupSpawnRate) {
      this.spawnerTimers.powerup = 0;
      this.spawnPowerup();
    }

    // 3. Update Entities
    if (this.ship) {
      this.ship.update(this.keys, this.mouse, dt);

      // Camera smooth follow spaceship coordinate
      let dx = this.ship.x - this.camera.x;
      let dy = this.ship.y - this.camera.y;
      
      // Wrap camera position if ship wrapped (distance > worldBounds)
      if (dx > CONFIG.worldBounds) {
        this.camera.x += CONFIG.worldBounds * 2;
        dx -= CONFIG.worldBounds * 2;
      } else if (dx < -CONFIG.worldBounds) {
        this.camera.x -= CONFIG.worldBounds * 2;
        dx += CONFIG.worldBounds * 2;
      }
      
      if (dy > CONFIG.worldBounds) {
        this.camera.y += CONFIG.worldBounds * 2;
        dy -= CONFIG.worldBounds * 2;
      } else if (dy < -CONFIG.worldBounds) {
        this.camera.y -= CONFIG.worldBounds * 2;
        dy += CONFIG.worldBounds * 2;
      }
      
      this.camera.x += dx * this.camera.smoothFactor;
      this.camera.y += dy * this.camera.smoothFactor;

      // Spawn thruster sparks
      if (this.ship.thrusting) {
        // Find thruster offset back relative to ship angle
        const engineOffsetDist = 12;
        const flameX = this.ship.x - Math.cos(this.ship.angle) * engineOffsetDist;
        const flameY = this.ship.y - Math.sin(this.ship.angle) * engineOffsetDist;
        
        const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
        const ratio = speed / CONFIG.shipMaxSpeed;
        
        this.particles.createThrusterFlame(flameX, flameY, this.ship.angle, ratio);
        
        // Feed throttle values to sound engine
        if (!this.touch.active) {
          window.GameAudio.setEngineActive(true, Math.min(1.0, ratio));
        }
      } else {
        if (!this.touch.active) {
          window.GameAudio.setEngineActive(false);
        }
      }
    }

    this.asteroids.forEach(ast => ast.update());
    this.crystals.forEach(cry => cry.update(this.ship, dt));
    this.powerups.forEach(pup => pup.update());
    this.particles.update();

    // 4. Collision solver
    this.checkCollisions();

    // 5. Update HUD and Powerup timers UI
    this.updatePowerupUI();
    this.updateHUD();
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#05070f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Starfield with parallax drift
    const scrollVx = this.ship ? this.ship.vx : 0;
    const scrollVy = this.ship ? this.ship.vy : 0;
    this.starfield.updateAndDraw(this.ctx, scrollVx, scrollVy);

    // 2. Draw world boundary warning circles if ship gets close
    this.drawWorldBoundaries();

    // 3. Draw Entities in world coordinates
    this.crystals.forEach(cry => cry.draw(this.ctx, this.camera));
    this.powerups.forEach(pup => pup.draw(this.ctx, this.camera));
    this.asteroids.forEach(ast => ast.draw(this.ctx, this.camera));
    this.particles.draw(this.ctx);

    if (this.ship && this.ship.hull > 0) {
      this.ship.draw(this.ctx, this.camera);
    }
  }

  drawWorldBoundaries() {
    if (!this.ship) return;
    
    // Draw grid bounds warnings
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const padding = 150;
    
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 94, 58, 0.1)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([8, 8]);
    
    // Translate relative to camera
    const leftX = -CONFIG.worldBounds - this.camera.x + cx;
    const rightX = CONFIG.worldBounds - this.camera.x + cx;
    const topY = -CONFIG.worldBounds - this.camera.y + cy;
    const bottomY = CONFIG.worldBounds - this.camera.y + cy;

    // Draw bounds lines
    this.ctx.beginPath();
    this.ctx.moveTo(leftX, topY);
    this.ctx.lineTo(rightX, topY);
    this.ctx.lineTo(rightX, bottomY);
    this.ctx.lineTo(leftX, bottomY);
    this.ctx.closePath();
    this.ctx.stroke();
    
    this.ctx.restore();
  }
}

// Start Game system on page load
window.addEventListener('DOMContentLoaded', () => {
  window.GameEngine = new Game();
});
