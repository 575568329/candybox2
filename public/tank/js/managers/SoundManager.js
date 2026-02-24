
var Phaser = Phaser || {};
var GameTank = GameTank || {};

GameTank.SoundManager = function(gameState) {
  "use strict";
  Object.call(this);
  this.gameState = gameState;
  this.soundStart = game.add.audio("sound-start");
  this.soundPlayerFire  = game.add.audio("sound-player-fire");
  this.soundEnemyFire  = game.add.audio("sound-enemy-fire");
  this.soundOver = game.add.audio("sound-over");
  this.soundHitBrick = game.add.audio("sound-hit-brick");
  this.soundHitIron = game.add.audio("sound-hit-iron");
  this.soundEnemyBoom = game.add.audio("sound-enemy-boom");
  this.soundPlayerBoom = game.add.audio("sound-player-boom");
  this.soundGenerateAward = game.add.audio("sound-generate-award");
  this.soundGetAward = game.add.audio("sound-get-award");
};

GameTank.SoundManager.prototype = Object.create(Object.prototype);
GameTank.SoundManager.prototype.constructor = GameTank.SoundManager;

GameTank.SoundManager.prototype.gameStart = function() {
  if (SOUND_ENABLED) this.soundStart.play();
}

GameTank.SoundManager.prototype.playerFire = function() {
  if (SOUND_ENABLED) this.soundPlayerFire.play();
}

GameTank.SoundManager.prototype.enemyFire = function() {
  if (SOUND_ENABLED) this.soundEnemyFire.play();
}

GameTank.SoundManager.prototype.gameOver = function() {
  if (SOUND_ENABLED) this.soundOver.play();
}

GameTank.SoundManager.prototype.hitBrick = function() {
  if (SOUND_ENABLED) this.soundHitBrick.play();
}

GameTank.SoundManager.prototype.hitIron = function() {
  if (SOUND_ENABLED) this.soundHitIron.play();
}

GameTank.SoundManager.prototype.enemyBoom = function() {
  if (SOUND_ENABLED) this.soundEnemyBoom.play();
}

GameTank.SoundManager.prototype.playerBoom = function() {
  if (SOUND_ENABLED) this.soundPlayerBoom.play();
}

GameTank.SoundManager.prototype.generateAward = function() {
  if (SOUND_ENABLED) this.soundGenerateAward.play();
}

GameTank.SoundManager.prototype.getAward = function() {
  if (SOUND_ENABLED) this.soundGetAward.play();
}

GameTank.SoundManager.prototype.countScore = function() {
  if (SOUND_ENABLED) this.soundPlayerFire.play();
}
