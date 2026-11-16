/**
 * High-performance Particle and FX System for Cyber Strike: Neon Defender
 */

export class Particle {
  constructor(x, y, vx, vy, color, size, life, drag = 0.96) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.life = life;
    this.maxLife = life;
    this.drag = drag;
    this.alpha = 1;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return false;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= this.drag;
    this.vy *= this.drag;

    const progress = this.life / this.maxLife;
    this.alpha = progress;
    this.size = this.initialSize * (0.3 + 0.7 * progress);
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Shockwave {
  constructor(x, y, color, maxRadius = 70, speed = 180, lineWidth = 3) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.maxRadius = maxRadius;
    this.speed = speed;
    this.color = color;
    this.lineWidth = lineWidth;
    this.alpha = 1;
  }

  update(dt) {
    this.radius += this.speed * dt;
    this.alpha = 1 - (this.radius / this.maxRadius);
    return this.radius < this.maxRadius && this.alpha > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#ffff00', fontSize = 18, duration = 0.9) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.life = duration;
    this.maxLife = duration;
    this.vy = -45;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const progress = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, progress));
    ctx.font = `bold ${this.fontSize}px 'Segoe UI', monospace, sans-serif`;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  shake(intensity = 6, duration = 0.2) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  getShakeOffset() {
    if (this.shakeDuration <= 0) return { x: 0, y: 0 };
    const angle = Math.random() * Math.PI * 2;
    const mag = this.shakeIntensity * (this.shakeDuration / 0.3);
    return {
      x: Math.cos(angle) * mag,
      y: Math.sin(angle) * mag
    };
  }

  createSparks(x, y, color = '#00ffff', count = 12, speed = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const size = Math.random() * 2.5 + 1.2;
      const life = Math.random() * 0.3 + 0.2;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life));
    }
  }

  createExplosion(x, y, color = '#ff007f', count = 35, speed = 5, isLarge = false) {
    const palette = isLarge 
      ? ['#ff0055', '#ffaa00', '#ffff00', '#ffffff', '#9900ff'] 
      : [color, '#ffaa00', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.2) * (isLarge ? speed * 1.5 : speed);
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const pColor = palette[Math.floor(Math.random() * palette.length)];
      const size = Math.random() * (isLarge ? 4.5 : 3) + 1.5;
      const life = Math.random() * (isLarge ? 0.6 : 0.4) + 0.3;
      this.particles.push(new Particle(x, y, vx, vy, pColor, size, life, 0.94));
    }

    this.shockwaves.push(new Shockwave(x, y, color, isLarge ? 120 : 65, isLarge ? 280 : 180));
    this.shake(isLarge ? 12 : 5, isLarge ? 0.35 : 0.18);
  }

  createLaserImpact(x, y, color = '#00ffff') {
    this.createSparks(x, y, color, 6, 2.5);
  }

  addFloatingText(x, y, text, color = '#ffff00', fontSize = 18) {
    this.floatingTexts.push(new FloatingText(x, y, text, color, fontSize));
  }

  update(dt) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }

    this.particles = this.particles.filter(p => p.update(dt));
    this.shockwaves = this.shockwaves.filter(s => s.update(dt));
    this.floatingTexts = this.floatingTexts.filter(t => t.update(dt));
  }

  draw(ctx) {
    for (let i = 0; i < this.shockwaves.length; i++) {
      this.shockwaves[i].draw(ctx);
    }
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].draw(ctx);
    }
  }

  clear() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }
}
