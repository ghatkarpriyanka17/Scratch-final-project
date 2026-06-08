// Space Explorer - Parallax Starfield and Particle Engine

class Starfield {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.layers = [
      { stars: [], count: 120, speedMult: 0.05, sizeMin: 0.5, sizeMax: 1.2, alphaMin: 0.2, alphaMax: 0.5 }, // Distant
      { stars: [], count: 60, speedMult: 0.15, sizeMin: 1.2, sizeMax: 2.0, alphaMin: 0.5, alphaMax: 0.8 }, // Mid-ground
      { stars: [], count: 20, speedMult: 0.4, sizeMin: 2.0, sizeMax: 3.5, alphaMin: 0.8, alphaMax: 1.0 }  // Foreground
    ];
    this.init();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    // Re-initialize stars when resized to distribute them on new dimensions
    this.init();
  }

  init() {
    this.layers.forEach(layer => {
      layer.stars = [];
      for (let i = 0; i < layer.count; i++) {
        layer.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: Math.random() * (layer.sizeMax - layer.sizeMin) + layer.sizeMin,
          alpha: Math.random() * (layer.alphaMax - layer.alphaMin) + layer.alphaMin,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinkleDir: Math.random() > 0.5 ? 1 : -1
        });
      }
    });
  }

  // Draw starfield, scrolling based on ship velocity (vx, vy)
  updateAndDraw(ctx, shipVx, shipVy) {
    ctx.save();
    
    this.layers.forEach((layer, layerIdx) => {
      // Determine parallax movement offset
      const dx = -shipVx * layer.speedMult;
      const dy = -shipVy * layer.speedMult;

      ctx.fillStyle = `rgba(255, 255, 255, 1)`;

      layer.stars.forEach(star => {
        // Move star
        star.x += dx;
        star.y += dy;

        // Wrap around borders
        if (star.x < 0) star.x += this.width;
        if (star.x > this.width) star.x -= this.width;
        if (star.y < 0) star.y += this.height;
        if (star.y > this.height) star.y -= this.height;

        // Twinkle effect (alpha pulsing)
        star.alpha += star.twinkleSpeed * star.twinkleDir;
        if (star.alpha >= layer.alphaMax || star.alpha <= layer.alphaMin) {
          star.twinkleDir *= -1;
        }

        // Draw star
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, star.alpha)})`;
        ctx.beginPath();
        // Give layer 3 stars a slight cyan/blue glow for space depth
        if (layerIdx === 2) {
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = 4;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.restore();
  }
}

class Particle {
  constructor(options) {
    this.x = options.x;
    this.y = options.y;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.color = options.color || '#fff';
    this.size = options.size || 2;
    this.life = options.life || 1.0; // Starts at 1.0, decays to 0
    this.decay = options.decay || 0.02; // amount to subtract per update
    this.friction = options.friction || 0.98; // speed slow down mult
    this.gravity = options.gravity || 0; // vertical acceleration
    this.growth = options.growth || 0; // size growth rate
    this.shape = options.shape || 'circle';
    this.text = options.text || '';
    this.rotation = options.rotation || 0;
    this.rotSpeed = options.rotSpeed || 0;
    this.glow = options.glow || false;
  }

  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    
    this.x += this.vx;
    this.y += this.vy;
    
    this.size += this.growth;
    this.size = Math.max(0.1, this.size);
    
    this.rotation += this.rotSpeed;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.glow) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.glow;
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'square') {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else if (this.shape === 'line') {
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(-this.vx * 2, -this.vy * 2);
      ctx.lineTo(0, 0);
      ctx.stroke();
    } else if (this.shape === 'text') {
      ctx.font = `${this.size}px 'Orbitron', sans-serif`;
      ctx.fontWeight = '800';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, 0, 0);
    } else if (this.shape === 'asteroid-shard') {
      // Small irregular triangle shard
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.lineTo(this.size, this.size);
      ctx.lineTo(-this.size, this.size / 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

class ParticleEngine {
  constructor() {
    this.particles = [];
    this.maxParticles = 800; // Cap to preserve CPU/WebGL drawing speed
  }

  clear() {
    this.particles = [];
  }

  addParticle(particle) {
    if (this.particles.length >= this.maxParticles) {
      // Evict oldest particle if cap is exceeded
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  // Spaceship thruster flame trail
  createThrusterFlame(x, y, shipAngle, intensity = 0) {
    // Reverse ship angle to blast backwards
    const angle = shipAngle + Math.PI + (Math.random() * 0.4 - 0.2);
    const speed = (2 + Math.random() * 5) * (1 + intensity);
    
    // Gradient of flame colors depending on intensity
    let color = '#ff3c00'; // Default orange
    const r = Math.random();
    if (r > 0.7) color = '#ffa200'; // Yellow
    else if (r < 0.25) color = '#ff003c'; // Red-pink
    
    // Under hot thrust, cyan core sparks
    if (intensity > 0.6 && Math.random() > 0.6) {
      color = '#00f2fe';
    }

    this.addParticle(new Particle({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: color,
      size: (2 + Math.random() * 4) * (0.8 + intensity * 0.4),
      life: 1.0,
      decay: 0.04 + Math.random() * 0.03, // Decays rapidly
      friction: 0.96,
      glow: 6
    }));
  }

  // Asteroid explosion: big radial burst with fire sparks + dark rock shards
  createAsteroidExplosion(x, y, asteroidRadius) {
    const particleCount = Math.floor(20 + asteroidRadius * 0.8);
    
    // 1. Spitting fire and sparks
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      const r = Math.random();
      const color = r > 0.6 ? '#ff5e3a' : (r > 0.3 ? '#ffcc00' : '#888888');
      
      this.addParticle(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        friction: 0.95,
        glow: r > 0.3 ? 10 : 0
      }));
    }

    // 2. Exploding rocky shards
    const shardCount = Math.floor(4 + asteroidRadius * 0.15);
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      
      this.addParticle(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#4a4a4f',
        size: Math.random() * 6 + 3,
        life: 1.0,
        decay: 0.01 + Math.random() * 0.01,
        friction: 0.98,
        shape: 'asteroid-shard',
        rotSpeed: Math.random() * 0.1 - 0.05
      }));
    }
  }

  // Crystal harvesting spark explosion
  createCrystalCollectSparks(x, y, type) {
    let color = '#00f2fe'; // Blue
    if (type === 'rare') color = '#b927fc'; // Purple
    if (type === 'hyper') color = '#ffd700'; // Gold

    const count = 25;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      
      this.addParticle(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: Math.random() * 3 + 1.5,
        life: 1.0,
        decay: 0.025 + Math.random() * 0.015,
        friction: 0.94,
        glow: 8,
        shape: 'circle'
      }));
    }
  }

  // Floating Indicator Text (e.g. "+100", "SHIELD CRITICAL", "+2x MULTIPLIER")
  createFloatingText(x, y, text, color = '#fff', fontSize = 16) {
    this.addParticle(new Particle({
      x: x,
      y: y - 10,
      vx: Math.random() * 0.8 - 0.4,
      vy: -1.2 - Math.random() * 0.5, // Drifts slowly upwards
      color: color,
      size: fontSize,
      life: 1.0,
      decay: 0.016, // Fades over ~1 second
      friction: 0.98,
      shape: 'text',
      text: text,
      glow: 6
    }));
  }

  // Ship Shield impact sparks
  createShieldSparks(x, y, angle) {
    const sparkCount = 12;
    for (let i = 0; i < sparkCount; i++) {
      // sparks spray out centered around the collision point
      const sprayAngle = angle + (Math.random() * 1.2 - 0.6);
      const speed = Math.random() * 4 + 1;
      
      this.addParticle(new Particle({
        x: x,
        y: y,
        vx: Math.cos(sprayAngle) * speed,
        vy: Math.sin(sprayAngle) * speed,
        color: '#00f2fe',
        size: Math.random() * 2 + 1,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.02,
        friction: 0.95,
        glow: 5,
        shape: 'line'
      }));
    }
  }
}

window.Starfield = Starfield;
window.ParticleEngine = ParticleEngine;
window.Particle = Particle;
