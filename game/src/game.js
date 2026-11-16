/**
 * Main Game Controller for Cyber Strike: Neon Defender
 */

import { AudioManager } from './audio.js';
import { ParticleSystem } from './particles.js';
import { Starfield, Player, Enemy, PowerUp } from './entities.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.starfield = new Starfield(this.width, this.height);
    this.player = new Player(this.width / 2, this.height - 120);

    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.wave = 1;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.enemiesDefeated = 0;
    this.shotsFired = 0;

    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.powerUps = [];

    // Wave spawning system
    this.waveState = 'PRE_WAVE'; // 'PRE_WAVE' | 'SPAWNING' | 'ACTIVE' | 'WAVE_CLEARED'
    this.waveTimer = 2.0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.isWarping = false;
    this.bossActive = null;

    // Inputs
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      bomb: false,
      mouseX: this.width / 2,
      mouseY: this.height / 2,
      mouseActive: false
    };

    this.lastTime = 0;
    this.setupInputs();
  }

  loadHighScore() {
    try {
      return parseInt(localStorage.getItem('cyber_strike_high_score') || '0', 10);
    } catch {
      return 0;
    }
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('cyber_strike_high_score', this.highScore.toString());
      } catch {
        // Ignore storage errors in restricted iframes
      }
    }
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.audio.init();

      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.input.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.input.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.input.right = true;
      if (e.code === 'Space') {
        this.input.fire = true;
        if (this.state === 'START' || this.state === 'GAME_OVER') {
          this.startNewGame();
        }
      }
      if (e.code === 'KeyB') {
        this.triggerBomb();
      }
      if (e.code === 'KeyP') {
        this.togglePause();
      }
      if (e.code === 'KeyM') {
        this.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.input.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.input.down = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.input.right = false;
      if (e.code === 'Space') this.input.fire = false;
    });

    const getCanvasPos = (evt) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
      };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getCanvasPos(e);
      this.input.mouseX = pos.x;
      this.input.mouseY = pos.y;
      this.input.mouseActive = true;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.audio.init();
      if (e.button === 0) {
        this.input.fire = true;
        if (this.state === 'START' || this.state === 'GAME_OVER') {
          this.startNewGame();
        } else if (this.state === 'PAUSED') {
          this.togglePause();
        }
      } else if (e.button === 2) {
        e.preventDefault();
        this.triggerBomb();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.fire = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch support for mobile / touch screens
    this.canvas.addEventListener('touchstart', (e) => {
      this.audio.init();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const pos = getCanvasPos(touch);
        this.input.mouseX = pos.x;
        this.input.mouseY = pos.y;
        this.input.mouseActive = true;
        this.input.fire = true;

        if (this.state === 'START' || this.state === 'GAME_OVER') {
          this.startNewGame();
        } else if (this.state === 'PAUSED') {
          this.togglePause();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const pos = getCanvasPos(touch);
        this.input.mouseX = pos.x;
        this.input.mouseY = pos.y;
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.input.fire = false;
    });
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.audio.stopMusic();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.audio.startMusic();
    }
  }

  toggleMute() {
    this.audio.init();
    return this.audio.toggleMute();
  }

  startNewGame() {
    this.audio.init();
    this.audio.startMusic();
    this.state = 'PLAYING';
    this.score = 0;
    this.wave = 1;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.enemiesDefeated = 0;
    this.shotsFired = 0;

    this.player = new Player(this.width / 2, this.height - 120);
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.powerUps = [];
    this.particles.clear();

    this.initWave(1);
  }

  initWave(waveNumber) {
    this.wave = waveNumber;
    this.waveState = 'PRE_WAVE';
    this.waveTimer = 2.0;
    this.isWarping = true;
    this.bossActive = null;

    this.audio.playWaveStart();
    this.particles.addFloatingText(this.width / 2, this.height * 0.45, `WAVE ${waveNumber}`, '#00ffff', 36);

    const isBossWave = waveNumber % 5 === 0;

    if (isBossWave) {
      this.particles.addFloatingText(this.width / 2, this.height * 0.52, 'WARNING: BOSS DETECTED!', '#ff0055', 24);
      this.spawnQueue = [{ type: 'BOSS', delay: 1.5, x: this.width / 2, y: -80 }];
    } else {
      // Build wave composition
      this.spawnQueue = [];
      const scoutCount = 6 + waveNumber * 2;
      const fighterCount = 3 + Math.floor(waveNumber * 1.5);
      const interceptorCount = Math.floor(waveNumber * 1.2);
      const cruiserCount = Math.floor(waveNumber / 2);

      let curDelay = 0.5;

      for (let i = 0; i < scoutCount; i++) {
        curDelay += 0.45;
        this.spawnQueue.push({
          type: 'SCOUT',
          delay: curDelay,
          x: 60 + Math.random() * (this.width - 120),
          y: -40
        });
      }

      for (let i = 0; i < fighterCount; i++) {
        curDelay += 0.8;
        this.spawnQueue.push({
          type: 'FIGHTER',
          delay: curDelay,
          x: 80 + Math.random() * (this.width - 160),
          y: -40
        });
      }

      for (let i = 0; i < interceptorCount; i++) {
        curDelay += 1.0;
        this.spawnQueue.push({
          type: 'INTERCEPTOR',
          delay: curDelay,
          x: 100 + Math.random() * (this.width - 200),
          y: -40
        });
      }

      for (let i = 0; i < cruiserCount; i++) {
        curDelay += 1.8;
        this.spawnQueue.push({
          type: 'CRUISER',
          delay: curDelay,
          x: 120 + Math.random() * (this.width - 240),
          y: -60
        });
      }
    }
  }

  triggerBomb() {
    if (this.state !== 'PLAYING' || this.player.bombs <= 0) return;

    this.player.bombs--;
    this.audio.playBomb();
    this.particles.createShockwave(this.player.x, this.player.y, '#00ffff', 400);
    this.particles.shake(16, 0.45);
    this.particles.addFloatingText(this.player.x, this.player.y - 40, 'EMP DETONATED!', '#ffff00', 22);

    // Clear all enemy bullets
    this.enemyProjectiles = [];

    // Damage all enemies on screen
    for (const enemy of this.enemies) {
      const dead = enemy.takeDamage(200);
      this.particles.createExplosion(enemy.x, enemy.y, enemy.color, 15, 3);
      if (dead) {
        this.destroyEnemy(enemy);
      }
    }
  }

  destroyEnemy(enemy) {
    this.enemiesDefeated++;
    const points = enemy.scoreVal * this.comboMultiplier;
    this.score += points;
    this.combo++;
    this.comboMultiplier = Math.min(5, 1 + Math.floor(this.combo / 10));

    this.audio.playExplosion(enemy.type === 'BOSS' || enemy.type === 'CRUISER');
    this.particles.createExplosion(enemy.x, enemy.y, enemy.color, enemy.type === 'BOSS' ? 70 : 30, 5, enemy.type === 'BOSS');
    this.particles.addFloatingText(enemy.x, enemy.y, `+${points}`, '#00ffff', enemy.type === 'BOSS' ? 24 : 16);

    // Spawn powerups
    const dropRate = enemy.type === 'BOSS' ? 1.0 : (enemy.type === 'CRUISER' ? 0.6 : 0.15);
    if (Math.random() < dropRate) {
      const types = ['shield', 'weapon', 'bomb', 'life', 'overdrive'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      this.powerUps.push(new PowerUp(enemy.x, enemy.y, chosen));
    }

    if (enemy.type === 'BOSS') {
      this.bossActive = null;
    }
  }

  applyPowerUp(powerUp) {
    this.audio.playPowerup();
    if (powerUp.type === 'shield') {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 60);
      this.particles.addFloatingText(this.player.x, this.player.y - 30, '+SHIELD RESTORE', '#00ffff', 18);
    } else if (powerUp.type === 'weapon') {
      this.player.weaponLevel = Math.min(4, this.player.weaponLevel + 1);
      this.particles.addFloatingText(this.player.x, this.player.y - 30, `WEAPON LVL ${this.player.weaponLevel}!`, '#ffff00', 18);
    } else if (powerUp.type === 'bomb') {
      this.player.bombs = Math.min(5, this.player.bombs + 1);
      this.particles.addFloatingText(this.player.x, this.player.y - 30, '+1 EMP BOMB', '#ff0055', 18);
    } else if (powerUp.type === 'life') {
      this.player.lives = Math.min(5, this.player.lives + 1);
      this.player.health = this.player.maxHealth;
      this.particles.addFloatingText(this.player.x, this.player.y - 30, '+1 EXTRA LIFE', '#00ff66', 18);
    } else if (powerUp.type === 'overdrive') {
      this.player.overdriveTimer = 8.0;
      this.particles.addFloatingText(this.player.x, this.player.y - 30, 'OVERDRIVE ACTIVE!', '#ff00ff', 20);
    }
  }

  update(dt) {
    this.starfield.update(dt, this.isWarping);
    this.particles.update(dt);

    if (this.state !== 'PLAYING') return;

    // Wave Progression
    if (this.waveState === 'PRE_WAVE') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveState = 'SPAWNING';
        this.isWarping = false;
        this.spawnTimer = 0;
      }
    } else if (this.waveState === 'SPAWNING') {
      this.spawnTimer += dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
        const item = this.spawnQueue.shift();
        const enemy = new Enemy(item.x, item.y, item.type, this.wave);
        this.enemies.push(enemy);
        if (item.type === 'BOSS') this.bossActive = enemy;
      }
      if (this.spawnQueue.length === 0) {
        this.waveState = 'ACTIVE';
      }
    } else if (this.waveState === 'ACTIVE') {
      if (this.enemies.length === 0) {
        this.waveState = 'WAVE_CLEARED';
        this.isWarping = true;
        this.particles.addFloatingText(this.width / 2, this.height * 0.45, `WAVE ${this.wave} COMPLETED!`, '#00ff66', 28);
        this.score += 500 * this.wave;
        setTimeout(() => {
          if (this.state === 'PLAYING') {
            this.initWave(this.wave + 1);
          }
        }, 2200);
      }
    }

    // Update Player
    const bounds = { width: this.width, height: this.height };
    const firedProjs = this.player.update(dt, this.input, bounds, this.particles, this.audio);
    if (firedProjs) {
      this.playerProjectiles.push(...firedProjs);
      this.shotsFired += firedProjs.length;
    }

    // Update Player Projectiles
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const p = this.playerProjectiles[i];
      p.update(dt);
      if (p.isOutOfBounds(this.width, this.height)) {
        this.playerProjectiles.splice(i, 1);
      }
    }

    // Update Enemies & handle their firing
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const eShots = e.update(dt, this.player, bounds, this.audio);
      if (eShots.length > 0) {
        this.enemyProjectiles.push(...eShots);
      }
      if (e.isOutOfBounds(this.width, this.height)) {
        this.enemies.splice(i, 1);
        if (e.type === 'BOSS') this.bossActive = null;
      }
    }

    // Update Enemy Projectiles
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.update(dt);
      if (ep.isOutOfBounds(this.width, this.height)) {
        this.enemyProjectiles.splice(i, 1);
      }
    }

    // Update PowerUps
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.update(dt, this.player);
      if (pu.isOutOfBounds(this.height)) {
        this.powerUps.splice(i, 1);
      }
    }

    // --- Collisions ---

    // 1. Player Projectiles vs Enemies
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const p = this.playerProjectiles[i];
      let pRemoved = false;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dist = Math.hypot(p.x - e.x, p.y - e.y);
        if (dist < p.radius + e.radius) {
          this.particles.createLaserImpact(p.x, p.y, p.color);
          const isDead = e.takeDamage(p.damage);
          if (isDead) {
            this.destroyEnemy(e);
            this.enemies.splice(j, 1);
          }
          this.playerProjectiles.splice(i, 1);
          pRemoved = true;
          break;
        }
      }
      if (pRemoved) continue;
    }

    // 2. Enemy Projectiles vs Player
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      const dist = Math.hypot(ep.x - this.player.x, ep.y - this.player.y);
      if (dist < ep.radius + this.player.hitRadius) {
        this.particles.createLaserImpact(ep.x, ep.y, ep.color);
        this.enemyProjectiles.splice(i, 1);
        this.combo = 0; // Reset combo multiplier
        this.comboMultiplier = 1;

        const isDead = this.player.takeDamage(ep.damage, this.particles, this.audio);
        if (isDead) {
          this.handlePlayerLifeLost();
        }
      }
    }

    // 3. Enemies vs Player (Ramming)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist < e.radius + this.player.hitRadius) {
        this.combo = 0;
        this.comboMultiplier = 1;
        const isPlayerDead = this.player.takeDamage(40, this.particles, this.audio);
        if (e.type !== 'BOSS') {
          this.destroyEnemy(e);
          this.enemies.splice(i, 1);
        }
        if (isPlayerDead) {
          this.handlePlayerLifeLost();
        }
      }
    }

    // 4. PowerUps vs Player
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      const dist = Math.hypot(pu.x - this.player.x, pu.y - this.player.y);
      if (dist < pu.radius + this.player.hitRadius + 8) {
        this.applyPowerUp(pu);
        this.powerUps.splice(i, 1);
      }
    }

    this.saveHighScore();
  }

  handlePlayerLifeLost() {
    this.audio.playExplosion(true);
    this.particles.createExplosion(this.player.x, this.player.y, '#00ffff', 50, 6, true);

    if (this.player.lives <= 0) {
      this.state = 'GAME_OVER';
      this.audio.stopMusic();
      this.audio.playGameOver();
      this.saveHighScore();
    } else {
      this.player.respawn(this.width / 2, this.height - 120);
      this.particles.addFloatingText(this.player.x, this.player.y - 40, `LIVES REMAINING: ${this.player.lives}`, '#ffff00', 20);
    }
  }

  draw() {
    const shake = this.particles.getShakeOffset();
    this.ctx.save();
    this.ctx.translate(shake.x, shake.y);

    // 1. Background Starfield & Synthwave Grid
    this.starfield.draw(this.ctx);

    // 2. PowerUps
    for (let i = 0; i < this.powerUps.length; i++) {
      this.powerUps[i].draw(this.ctx);
    }

    // 3. Projectiles
    for (let i = 0; i < this.playerProjectiles.length; i++) {
      this.playerProjectiles[i].draw(this.ctx);
    }
    for (let i = 0; i < this.enemyProjectiles.length; i++) {
      this.enemyProjectiles[i].draw(this.ctx);
    }

    // 4. Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].draw(this.ctx);
    }

    // 5. Player
    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      this.player.draw(this.ctx);
    }

    // 6. Particles & FX
    this.particles.draw(this.ctx);

    this.ctx.restore();

    // 7. HUD & UI Overlays
    this.drawHUD();
  }

  drawHUD() {
    const ctx = this.ctx;

    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      ctx.save();

      // Top Left: Score & High Score
      ctx.font = 'bold 22px monospace, sans-serif';
      ctx.fillStyle = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ffff';
      ctx.fillText(`SCORE: ${this.score.toLocaleString()}`, 24, 40);

      ctx.font = '14px monospace, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowBlur = 0;
      ctx.fillText(`HI: ${Math.max(this.score, this.highScore).toLocaleString()}`, 24, 60);

      if (this.comboMultiplier > 1) {
        ctx.font = 'bold 15px monospace, sans-serif';
        ctx.fillStyle = '#ff00ff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ff00ff';
        ctx.fillText(`COMBO x${this.comboMultiplier} (${this.combo})`, 24, 80);
      }

      // Top Center: Wave or Boss Banner
      ctx.textAlign = 'center';
      if (this.bossActive) {
        ctx.font = 'bold 18px monospace, sans-serif';
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';
        ctx.fillText('⚡ BOSS BATTLE: NEON DREADNOUGHT ⚡', this.width / 2, 40);

        // Big Boss Health Bar
        const bBarW = 320;
        const bBarH = 10;
        const bBarX = this.width / 2 - bBarW / 2;
        const bBarY = 50;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(bBarX, bBarY, bBarW, bBarH);
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(bBarX, bBarY, bBarW * Math.max(0, this.bossActive.hp / this.bossActive.maxHp), bBarH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);
      } else {
        ctx.font = 'bold 20px monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffffff';
        ctx.fillText(`WAVE ${this.wave}`, this.width / 2, 40);
      }

      // Bottom Left: Health & Shield Bars
      ctx.textAlign = 'left';
      const barX = 24;
      const barW = 160;

      // Shield Bar
      const shieldY = this.height - 50;
      ctx.font = '12px monospace, sans-serif';
      ctx.fillStyle = '#00ffff';
      ctx.fillText(`SHIELD ${Math.max(0, Math.round(this.player.shield))}%`, barX, shieldY - 5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, shieldY, barW, 8);
      ctx.fillStyle = '#00ffff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00ffff';
      ctx.fillRect(barX, shieldY, barW * (this.player.shield / this.player.maxShield), 8);

      // Health Bar
      const hpY = this.height - 24;
      ctx.font = '12px monospace, sans-serif';
      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 0;
      ctx.fillText(`HULL ${Math.max(0, Math.round(this.player.health))}%`, barX, hpY - 5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, hpY, barW, 8);
      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ff0055';
      ctx.fillRect(barX, hpY, barW * (this.player.health / this.player.maxHealth), 8);

      // Bottom Right: Lives & Bombs
      ctx.textAlign = 'right';
      ctx.font = 'bold 15px monospace, sans-serif';
      ctx.fillStyle = '#ffff00';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffff00';
      ctx.fillText(`BOMBS: ${'💣 '.repeat(this.player.bombs)} (B)`, this.width - 24, this.height - 48);

      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.fillText(`LIVES: ${'▲ '.repeat(this.player.lives)}`, this.width - 24, this.height - 24);

      ctx.restore();
    }

    // Screens: START, PAUSED, GAME_OVER
    if (this.state === 'START') {
      this.drawStartScreen();
    } else if (this.state === 'PAUSED') {
      this.drawPauseScreen();
    } else if (this.state === 'GAME_OVER') {
      this.drawGameOverScreen();
    }
  }

  drawStartScreen() {
    const ctx = this.ctx;
    ctx.save();

    // Dim background
    ctx.fillStyle = 'rgba(5, 3, 15, 0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';

    // Game Title
    ctx.font = 'bold 44px monospace, sans-serif';
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#00ffff';
    ctx.fillText('CYBER STRIKE', this.width / 2, this.height * 0.28);

    ctx.font = 'bold 22px monospace, sans-serif';
    ctx.fillStyle = '#ff0080';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#ff0080';
    ctx.fillText('NEON DEFENDER', this.width / 2, this.height * 0.34);

    // Call to Action
    const pulse = (Math.sin(Date.now() / 250) + 1) * 0.5;
    ctx.font = 'bold 24px monospace, sans-serif';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.6})`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.fillText('► PRESS SPACE OR CLICK TO PLAY ◄', this.width / 2, this.height * 0.48);

    // Controls Guide Box
    const boxW = 460;
    const boxH = 190;
    const boxX = this.width / 2 - boxW / 2;
    const boxY = this.height * 0.56;

    ctx.fillStyle = 'rgba(10, 15, 35, 0.85)';
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.shadowBlur = 0;
    ctx.font = 'bold 15px monospace, sans-serif';
    ctx.fillStyle = '#ffff00';
    ctx.fillText('CONTROLS & TACTICS', this.width / 2, boxY + 28);

    ctx.font = '14px monospace, sans-serif';
    ctx.fillStyle = '#e0e0ff';
    ctx.fillText('WASD / Arrows / Mouse : Maneuver Ship', this.width / 2, boxY + 60);
    ctx.fillText('SPACE / Left Click   : Fire Blasters', this.width / 2, boxY + 86);
    ctx.fillText('B / Right Click       : Deploy EMP Bomb', this.width / 2, boxY + 112);
    ctx.fillText('P                     : Pause Game', this.width / 2, boxY + 138);
    ctx.fillText('M                     : Toggle Audio / Music', this.width / 2, boxY + 164);

    // High score indicator
    if (this.highScore > 0) {
      ctx.font = 'bold 16px monospace, sans-serif';
      ctx.fillStyle = '#00ffaa';
      ctx.fillText(`ALL-TIME RECORD: ${this.highScore.toLocaleString()} PTS`, this.width / 2, this.height * 0.86);
    }

    ctx.restore();
  }

  drawPauseScreen() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 2, 12, 0.75)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 40px monospace, sans-serif';
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00ffff';
    ctx.fillText('SYSTEM PAUSED', this.width / 2, this.height * 0.44);

    ctx.font = '20px monospace, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.fillText('Press P or Click to Resume', this.width / 2, this.height * 0.52);
    ctx.restore();
  }

  drawGameOverScreen() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 2, 14, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';

    // Game Over Title
    ctx.font = 'bold 44px monospace, sans-serif';
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#ff0055';
    ctx.fillText('SYSTEM OVERRIDE', this.width / 2, this.height * 0.28);

    ctx.font = 'bold 20px monospace, sans-serif';
    ctx.fillStyle = '#ff88aa';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff88aa';
    ctx.fillText('NEON DEFENDER DESTROYED', this.width / 2, this.height * 0.33);

    // Final Stats Card
    const cardW = 380;
    const cardH = 180;
    const cardX = this.width / 2 - cardW / 2;
    const cardY = this.height * 0.38;

    ctx.fillStyle = 'rgba(12, 16, 38, 0.9)';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 1.8;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    ctx.shadowBlur = 0;
    ctx.font = 'bold 20px monospace, sans-serif';
    ctx.fillStyle = '#ffff00';
    ctx.fillText(`FINAL SCORE: ${this.score.toLocaleString()}`, this.width / 2, cardY + 38);

    ctx.font = '15px monospace, sans-serif';
    ctx.fillStyle = '#00ffff';
    ctx.fillText(`WAVES DEFENDED: ${this.wave}`, this.width / 2, cardY + 74);
    ctx.fillText(`ENEMIES DESTROYED: ${this.enemiesDefeated}`, this.width / 2, cardY + 104);
    ctx.fillText(`BLASTER BOLTS FIRED: ${this.shotsFired}`, this.width / 2, cardY + 134);

    if (this.score >= this.highScore && this.score > 0) {
      ctx.font = 'bold 16px monospace, sans-serif';
      ctx.fillStyle = '#00ff66';
      ctx.fillText('★ NEW HIGH SCORE RECORD! ★', this.width / 2, cardY + 160);
    }

    // Restart Prompt
    const pulse = (Math.sin(Date.now() / 200) + 1) * 0.5;
    ctx.font = 'bold 22px monospace, sans-serif';
    ctx.fillStyle = `rgba(0, 255, 255, ${0.4 + pulse * 0.6})`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.fillText('► PRESS SPACE OR CLICK TO REBOOT ◄', this.width / 2, this.height * 0.72);

    ctx.restore();
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap delta time
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    requestAnimationFrame((t) => this.loop(t));
  }
}
