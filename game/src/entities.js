/**
 * Game Entities for Cyber Strike: Neon Defender
 * Starfield, Player, Enemies, Boss, Projectiles, and PowerUps.
 */

export class Starfield {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.stars = [];
    this.warpFactor = 1;
    this.gridOffset = 0;

    // Create 120 stars across 3 depth layers
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        layer: Math.floor(Math.random() * 3), // 0: far, 1: mid, 2: near
        brightness: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 3 + 1
      });
    }
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
  }

  update(dt, isWarping = false) {
    const targetWarp = isWarping ? 5 : 1;
    this.warpFactor += (targetWarp - this.warpFactor) * dt * 4;

    const baseSpeeds = [35, 75, 150];

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const speed = baseSpeeds[s.layer] * this.warpFactor;
      s.y += speed * dt;

      if (s.y > this.height) {
        s.y = 0;
        s.x = Math.random() * this.width;
      }
    }

    // Grid scroll
    this.gridOffset = (this.gridOffset + 70 * this.warpFactor * dt) % 40;
  }

  draw(ctx) {
    // Draw deep space background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#04020a');
    bgGrad.addColorStop(0.5, '#08051a');
    bgGrad.addColorStop(1, '#130424');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw Synthwave Grid at bottom
    ctx.save();
    const horizon = this.height * 0.72;
    ctx.strokeStyle = 'rgba(255, 0, 128, 0.25)';
    ctx.lineWidth = 1.5;

    // Horizontal perspective lines
    for (let y = horizon; y < this.height; y += 14 + (y - horizon) * 0.28) {
      const lineY = y + (this.gridOffset * ((y - horizon) / (this.height - horizon)));
      if (lineY <= this.height) {
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(this.width, lineY);
        ctx.stroke();
      }
    }

    // Converging vertical lines
    const vanishX = this.width * 0.5;
    for (let x = -this.width * 0.4; x <= this.width * 1.4; x += 60) {
      ctx.beginPath();
      ctx.moveTo(vanishX + (x - vanishX) * 0.08, horizon);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    ctx.restore();

    // Draw Stars
    ctx.save();
    const layerColors = ['#88aaff', '#00ffff', '#ffffff'];
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const alpha = s.brightness;
      ctx.fillStyle = layerColors[s.layer];
      ctx.globalAlpha = alpha;

      if (this.warpFactor > 1.5) {
        // Warp streak
        const streakLen = (s.layer + 1) * 6 * this.warpFactor;
        ctx.fillRect(s.x, s.y - streakLen, s.layer + 1, streakLen);
      } else {
        const sz = s.layer === 2 ? 2.2 : (s.layer === 1 ? 1.5 : 1);
        ctx.fillRect(s.x, s.y, sz, sz);
      }
    }
    ctx.restore();
  }
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 360;
    this.hitRadius = 16;
    this.width = 44;
    this.height = 48;

    this.health = 100;
    this.maxHealth = 100;
    this.shield = 100;
    this.maxShield = 100;
    this.shieldDelay = 0;
    this.shieldRegenRate = 18;

    this.lives = 3;
    this.bombs = 2;
    this.weaponLevel = 1; // 1 to 4
    this.overdriveTimer = 0;

    this.invulnerableTime = 0;
    this.fireTimer = 0;
    this.rollTilt = 0;
    this.shieldAngle = 0;
  }

  takeDamage(amount, particles, audio) {
    if (this.invulnerableTime > 0) return false;

    if (this.shield > 0) {
      audio.playShieldHit();
      this.shield -= amount;
      particles.createSparks(this.x, this.y, '#00ffff', 14, 4);
      if (this.shield < 0) {
        this.health += this.shield; // Overflow to health
        this.shield = 0;
        particles.addFloatingText(this.x, this.y - 30, 'SHIELD BROKEN!', '#ff0055', 18);
      } else {
        particles.addFloatingText(this.x, this.y - 25, `-${amount} SHIELD`, '#00ffff', 15);
      }
      this.shieldDelay = 3.5;
    } else {
      this.health -= amount;
      audio.playExplosion(false);
      particles.createExplosion(this.x, this.y, '#ff0055', 20, 4);
      particles.addFloatingText(this.x, this.y - 25, `-${amount} HP`, '#ff0055', 18);
      this.shieldDelay = 4.0;
    }

    this.invulnerableTime = 1.0;

    if (this.health <= 0) {
      this.lives--;
      this.health = 0;
      return true; // Life lost
    }
    return false;
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.invulnerableTime = 2.5;
    this.weaponLevel = Math.max(1, this.weaponLevel - 1);
  }

  update(dt, input, bounds, particles, audio) {
    // Shield regeneration
    if (this.shieldDelay > 0) {
      this.shieldDelay -= dt;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * dt);
    }

    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= dt;
    }

    if (this.overdriveTimer > 0) {
      this.overdriveTimer -= dt;
    }

    this.shieldAngle = (this.shieldAngle + dt * 2.5) % (Math.PI * 2);

    // Movement input handling
    let moveX = 0;
    let moveY = 0;

    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;

    // Mouse steering if active
    if (input.mouseActive) {
      const dx = input.mouseX - this.x;
      const dy = input.mouseY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        moveX = dx / dist;
        moveY = dy / dist;
      }
    }

    // Normalize diagonal movement
    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
    }

    const currentSpeed = this.overdriveTimer > 0 ? this.speed * 1.3 : this.speed;
    this.vx += (moveX * currentSpeed - this.vx) * dt * 12;
    this.vy += (moveY * currentSpeed - this.vy) * dt * 12;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Tilt angle based on horizontal velocity
    this.rollTilt += ((this.vx / currentSpeed) * 0.45 - this.rollTilt) * dt * 10;

    // Clamp inside playfield bounds
    const padding = 24;
    this.x = Math.max(padding, Math.min(bounds.width - padding, this.x));
    this.y = Math.max(padding + 20, Math.min(bounds.height - padding, this.y));

    // Thruster exhaust particles
    if (Math.random() < 0.6) {
      const exhaustColor = this.overdriveTimer > 0 ? '#ff00ff' : '#00ffff';
      particles.createSparks(this.x + (Math.random() * 8 - 4), this.y + 22, exhaustColor, 2, 1.5);
    }

    // Weapon firing
    this.fireTimer -= dt;
    const effectiveFireRate = this.overdriveTimer > 0 ? 0.08 : (0.15 - (this.weaponLevel - 1) * 0.015);

    if (input.fire && this.fireTimer <= 0) {
      this.fireTimer = effectiveFireRate;
      return this.fireWeapons(audio);
    }

    return null;
  }

  fireWeapons(audio) {
    const projectiles = [];
    audio.playLaser(this.weaponLevel >= 2);

    if (this.weaponLevel === 1) {
      projectiles.push(new Projectile(this.x, this.y - 20, 0, -850, 25, '#00ffff', false));
    } else if (this.weaponLevel === 2) {
      projectiles.push(new Projectile(this.x - 14, this.y - 15, 0, -850, 24, '#00ffff', false));
      projectiles.push(new Projectile(this.x + 14, this.y - 15, 0, -850, 24, '#00ffff', false));
    } else if (this.weaponLevel === 3) {
      projectiles.push(new Projectile(this.x, this.y - 22, 0, -900, 26, '#ffff00', false));
      projectiles.push(new Projectile(this.x - 16, this.y - 12, -140, -850, 20, '#00ffff', false));
      projectiles.push(new Projectile(this.x + 16, this.y - 12, 140, -850, 20, '#00ffff', false));
    } else {
      // Weapon Level 4 (Overdrive Quad Blaster)
      projectiles.push(new Projectile(this.x - 8, this.y - 24, 0, -950, 30, '#ff00ff', false));
      projectiles.push(new Projectile(this.x + 8, this.y - 24, 0, -950, 30, '#ff00ff', false));
      projectiles.push(new Projectile(this.x - 22, this.y - 10, -220, -850, 22, '#00ffff', false));
      projectiles.push(new Projectile(this.x + 22, this.y - 10, 220, -850, 22, '#00ffff', false));
    }

    return projectiles;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rollTilt);

    // Flashing effect if invulnerable
    if (this.invulnerableTime > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.overdriveTimer > 0 ? '#ff00ff' : '#00ffff';

    // Ship Hull (Neon Delta Fighter)
    ctx.fillStyle = '#0a0d24';
    ctx.strokeStyle = this.overdriveTimer > 0 ? '#ff00ff' : '#00ffff';
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(0, -26); // Nose
    ctx.lineTo(20, 18); // Right wing tip
    ctx.lineTo(10, 14); // Right inner wing
    ctx.lineTo(0, 22);  // Engine center
    ctx.lineTo(-10, 14);// Left inner wing
    ctx.lineTo(-20, 18);// Left wing tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing accents / Lasers
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-16, 12);
    ctx.lineTo(-16, -6);
    ctx.moveTo(16, 12);
    ctx.lineTo(16, -6);
    ctx.stroke();

    // Cockpit Canopy
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(5, -4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.fill();

    // Engine Exhaust Glow
    const thrustGlow = ctx.createRadialGradient(0, 20, 2, 0, 26, 14);
    thrustGlow.addColorStop(0, '#ffffff');
    thrustGlow.addColorStop(0.4, this.overdriveTimer > 0 ? '#ff00aa' : '#00ffff');
    thrustGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = thrustGlow;
    ctx.beginPath();
    ctx.arc(0, 22, 12, 0, Math.PI * 2);
    ctx.fill();

    // Shield Aura
    if (this.shield > 0) {
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, this.y);
      const shieldRatio = this.shield / this.maxShield;
      ctx.globalAlpha = 0.35 + 0.35 * shieldRatio;
      ctx.strokeStyle = '#00ffff';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#00ffff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating energy arcs
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 32, this.shieldAngle, this.shieldAngle + 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 32, this.shieldAngle + Math.PI, this.shieldAngle + Math.PI + 1.2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class Projectile {
  constructor(x, y, vx, vy, damage, color = '#00ffff', isEnemy = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.isEnemy = isEnemy;
    this.radius = isEnemy ? 5 : 4;
    this.length = isEnemy ? 12 : 18;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  isOutOfBounds(w, h) {
    return this.x < -30 || this.x > w + 30 || this.y < -30 || this.y > h + 30;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = this.radius;
    ctx.lineCap = 'round';

    const angle = Math.atan2(this.vy, this.vx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(this.x - cos * this.length, this.y - sin * this.length);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Bright core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Enemy {
  constructor(x, y, type = 'SCOUT', wave = 1) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.wave = wave;
    this.timeAlive = 0;
    this.hitFlash = 0;

    // Config based on enemy type
    if (type === 'SCOUT') {
      this.hp = 30 + wave * 5;
      this.maxHp = this.hp;
      this.speed = 170 + Math.min(wave * 8, 80);
      this.scoreVal = 100;
      this.radius = 16;
      this.fireInterval = Math.max(1.4, 2.8 - wave * 0.1);
      this.fireTimer = Math.random() * this.fireInterval;
      this.baseX = x;
      this.color = '#ff007f';
    } else if (type === 'FIGHTER') {
      this.hp = 65 + wave * 12;
      this.maxHp = this.hp;
      this.speed = 120 + Math.min(wave * 6, 60);
      this.scoreVal = 250;
      this.radius = 22;
      this.fireInterval = Math.max(1.8, 3.2 - wave * 0.1);
      this.fireTimer = Math.random() * 1.5;
      this.color = '#ff9900';
    } else if (type === 'INTERCEPTOR') {
      this.hp = 85 + wave * 15;
      this.maxHp = this.hp;
      this.speed = 210 + Math.min(wave * 10, 90);
      this.scoreVal = 350;
      this.radius = 18;
      this.fireInterval = 2.4;
      this.fireTimer = 1.0;
      this.color = '#9900ff';
    } else if (type === 'CRUISER') {
      this.hp = 220 + wave * 30;
      this.maxHp = this.hp;
      this.speed = 65 + Math.min(wave * 4, 30);
      this.scoreVal = 600;
      this.radius = 32;
      this.fireInterval = 2.0;
      this.fireTimer = 1.2;
      this.color = '#00ffaa';
    } else if (type === 'BOSS') {
      this.hp = 1200 + wave * 350;
      this.maxHp = this.hp;
      this.speed = 50;
      this.scoreVal = 3500;
      this.radius = 65;
      this.fireInterval = 1.0;
      this.fireTimer = 1.0;
      this.color = '#ff0055';
      this.bossPhase = 1;
      this.targetY = 140;
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.12;
    return this.hp <= 0;
  }

  update(dt, player, bounds, audio) {
    this.timeAlive += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const projectiles = [];

    if (this.type === 'SCOUT') {
      this.y += this.speed * dt;
      this.x = this.baseX + Math.sin(this.timeAlive * 3.5) * 65;
    } else if (this.type === 'FIGHTER') {
      this.y += this.speed * dt;
      // Drift slightly towards player X
      this.x += (player.x - this.x) * dt * 0.6;
    } else if (this.type === 'INTERCEPTOR') {
      this.y += this.speed * dt;
      if (this.timeAlive > 1.2 && this.y < player.y) {
        // High-speed swooping dive
        const dx = player.x - this.x;
        this.x += Math.sign(dx) * 140 * dt;
      }
    } else if (this.type === 'CRUISER') {
      if (this.y < 180) {
        this.y += this.speed * dt;
      } else {
        this.x += Math.sin(this.timeAlive * 1.2) * 80 * dt;
      }
    } else if (this.type === 'BOSS') {
      if (this.y < this.targetY) {
        this.y += this.speed * dt;
      } else {
        this.x += Math.sin(this.timeAlive * 0.8) * 110 * dt;
      }
    }

    // Firing logic
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.y > 20 && this.y < bounds.height - 100) {
      this.fireTimer = this.fireInterval;
      const fired = this.fireAtPlayer(player, audio);
      if (fired) projectiles.push(...fired);
    }

    return projectiles;
  }

  fireAtPlayer(player, audio) {
    const projs = [];
    audio.playEnemyLaser();

    if (this.type === 'SCOUT') {
      // Single shot aiming down
      projs.push(new Projectile(this.x, this.y + 16, 0, 340, 15, this.color, true));
    } else if (this.type === 'FIGHTER') {
      // Dual targeted shots
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const spd = 360;
      projs.push(new Projectile(this.x - 12, this.y + 10, Math.cos(angle) * spd, Math.sin(angle) * spd, 18, this.color, true));
      projs.push(new Projectile(this.x + 12, this.y + 10, Math.cos(angle) * spd, Math.sin(angle) * spd, 18, this.color, true));
    } else if (this.type === 'INTERCEPTOR') {
      // Direct high-speed pulse
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      projs.push(new Projectile(this.x, this.y + 12, Math.cos(angle) * 440, Math.sin(angle) * 440, 20, this.color, true));
    } else if (this.type === 'CRUISER') {
      // Triple spread barrage
      const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
      const angles = [baseAngle - 0.3, baseAngle, baseAngle + 0.3];
      for (const a of angles) {
        projs.push(new Projectile(this.x, this.y + 24, Math.cos(a) * 320, Math.sin(a) * 320, 24, this.color, true));
      }
    } else if (this.type === 'BOSS') {
      // Boss pattern alternates between radial burst and heavy forward beams
      if (Math.random() < 0.5) {
        // 8-way radial burst
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.timeAlive;
          projs.push(new Projectile(this.x, this.y + 20, Math.cos(a) * 260, Math.sin(a) * 260, 25, '#ff0055', true));
        }
      } else {
        // Triple heavy targeted barrage
        const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let offset = -0.25; offset <= 0.25; offset += 0.25) {
          const a = baseAngle + offset;
          projs.push(new Projectile(this.x, this.y + 30, Math.cos(a) * 380, Math.sin(a) * 380, 28, '#ffff00', true));
        }
      }
    }

    return projs;
  }

  isOutOfBounds(w, h) {
    return this.y > h + 80;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const isFlashing = this.hitFlash > 0;
    const strokeCol = isFlashing ? '#ffffff' : this.color;
    ctx.strokeStyle = strokeCol;
    ctx.fillStyle = isFlashing ? '#ffffff' : '#080516';
    ctx.shadowBlur = 12;
    ctx.shadowColor = strokeCol;
    ctx.lineWidth = 2.2;

    if (this.type === 'SCOUT') {
      // Inverted sleek dart
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(16, -16);
      ctx.lineTo(0, -8);
      ctx.lineTo(-16, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'FIGHTER') {
      // Aggressive twin-prong fighter
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(20, 18);
      ctx.lineTo(22, -18);
      ctx.lineTo(10, -10);
      ctx.lineTo(0, -22);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-22, -18);
      ctx.lineTo(-20, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'INTERCEPTOR') {
      // Arrow diamond craft
      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.lineTo(18, 0);
      ctx.lineTo(0, -18);
      ctx.lineTo(-18, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -6, 12, 12);
    } else if (this.type === 'CRUISER') {
      // Heavy warship with wings
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(34, 12);
      ctx.lineTo(30, -20);
      ctx.lineTo(12, -26);
      ctx.lineTo(0, -18);
      ctx.lineTo(-12, -26);
      ctx.lineTo(-30, -20);
      ctx.lineTo(-34, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Reactor core
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'BOSS') {
      // Huge Dreadnought Boss
      ctx.beginPath();
      ctx.moveTo(0, 60);
      ctx.lineTo(65, 20);
      ctx.lineTo(60, -45);
      ctx.lineTo(25, -60);
      ctx.lineTo(0, -40);
      ctx.lineTo(-25, -60);
      ctx.lineTo(-60, -45);
      ctx.lineTo(-65, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Multiple pulsating neon energy cores
      const corePulse = (Math.sin(this.timeAlive * 4) + 1) * 0.5;
      ctx.fillStyle = `rgba(255, 0, 100, ${0.5 + corePulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(0, 5, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(-32, -15, 8, 0, Math.PI * 2);
      ctx.arc(32, -15, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health bar for heavy enemies and boss
    if (this.hp < this.maxHp && (this.type === 'CRUISER' || this.type === 'BOSS' || this.type === 'INTERCEPTOR')) {
      const barW = this.type === 'BOSS' ? 100 : 44;
      const barH = 5;
      const barY = -this.radius - 14;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barW / 2, barY, barW, barH);
      ctx.fillStyle = this.type === 'BOSS' ? '#ff0055' : '#00ffaa';
      ctx.fillRect(-barW / 2, barY, barW * (this.hp / this.maxHp), barH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2, barY, barW, barH);
    }

    ctx.restore();
  }
}

export class PowerUp {
  constructor(x, y, type = 'shield') {
    this.x = x;
    this.y = y;
    this.type = type; // 'shield', 'weapon', 'bomb', 'life', 'overdrive'
    this.radius = 16;
    this.vy = 85;
    this.rotation = 0;
    this.timeAlive = 0;

    const colors = {
      shield: '#00ffff',
      weapon: '#ffff00',
      bomb: '#ff0055',
      life: '#00ff66',
      overdrive: '#ff00ff'
    };
    this.color = colors[type] || '#ffffff';
  }

  update(dt, player) {
    this.timeAlive += dt;
    this.rotation += dt * 3;

    // Magnetize to player if within range
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 150) {
      const magnetSpeed = 300 * (1 - dist / 150) + 120;
      this.x += (dx / dist) * magnetSpeed * dt;
      this.y += (dy / dist) * magnetSpeed * dt;
    } else {
      this.y += this.vy * dt;
      this.x += Math.sin(this.timeAlive * 3) * 20 * dt;
    }
  }

  isOutOfBounds(h) {
    return this.y > h + 30;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowBlur = 14;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
    ctx.lineWidth = 2.2;

    // Hexagon pill shape
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Icon in center
    ctx.rotate(-this.rotation);
    ctx.fillStyle = this.color;
    ctx.font = 'bold 12px monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const icons = {
      shield: 'S',
      weapon: 'W',
      bomb: 'B',
      life: '+',
      overdrive: '⚡'
    };
    ctx.fillText(icons[this.type] || '★', 0, 1);

    ctx.restore();
  }
}
