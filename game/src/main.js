/**
 * Cyber Strike: Neon Defender
 * Entrypoint script loaded by game/index.html
 */

import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element #gameCanvas not found');
    return;
  }

  const game = new Game(canvas);

  // Quick Controls UI buttons
  const soundBtn = document.getElementById('btn-sound');
  const updateSoundBtn = () => {
    if (soundBtn) {
      soundBtn.textContent = `Sound: ${game.audio.isMuted ? 'OFF' : 'ON'}`;
    }
  };

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      game.toggleMute();
      updateSoundBtn();
    });
  }

  const pauseBtn = document.getElementById('btn-pause');
  const updatePauseBtn = () => {
    if (pauseBtn) {
      pauseBtn.textContent = game.state === 'PAUSED' ? 'Resume' : 'Pause';
    }
  };

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      game.togglePause();
      updatePauseBtn();
    });
  }

  // Synchronize button text on key presses
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') {
      setTimeout(updateSoundBtn, 10);
    }
    if (e.code === 'KeyP') {
      setTimeout(updatePauseBtn, 10);
    }
    if (e.code === 'KeyF') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  });

  // Auto-pause when page loses focus to preserve player lives
  window.addEventListener('blur', () => {
    if (game.state === 'PLAYING') {
      game.togglePause();
      updatePauseBtn();
    }
  });

  // Handle window resizing gracefully
  const resizeCanvas = () => {
    const container = document.getElementById('game-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Maintain aspect ratio within container
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Start animation loop
  game.start();

  // Expose game instance for debugging
  window.__CYBER_GAME__ = game;
});
