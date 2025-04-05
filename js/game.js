/**
 * Main Game class that manages game logic and entities
 */
class Game {
    /**
     * Create a new game instance
     * @param {HTMLCanvasElement} canvas - Canvas element to render the game on
     */
    constructor(canvas) {
        // Canvas and rendering context
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas size based on container size
        this.resizeCanvas();
        
        // Add resize listener to adjust canvas on window resize with better handling
        window.addEventListener('resize', () => {
            console.log('Window resized, updating canvas');
            // Add delay to ensure proper resizing after orientation changes
            setTimeout(() => this.resizeCanvas(), 100);
        });
        
        // Add specific listeners for mobile orientation changes
        window.addEventListener('orientationchange', () => {
            console.log('Orientation changed, updating canvas');
            // Delay resize to ensure screen dimensions have updated
            setTimeout(() => this.resizeCanvas(), 200);
        });
        
        // Handle visibility changes to prevent issues when app goes to background
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('App visible again, updating canvas');
                this.resizeCanvas();
            }
        });
        
        // Game state
        this.isRunning = false;
        this.isGameOver = false;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        
        // Difficulty system
        this.difficulty = 1;
        this.lastDifficultyIncrease = 0;
        
        // Time tracking
        this.lastTime = 0;
        this.animationFrameId = null;
        
        // Camera
        this.camera = {
            y: 0,
            targetY: 0,
            smoothing: 0.1
        };
        
        // Background
        this.background = {
            color: '#87CEEB',
            clouds: []
        };
        
        // Sound effects
        this.sounds = {
            jump: null,
            powerUp: null,
            enemyDeath: null,
            playerDeath: null,
            milestone: null
        };
        
        // Initialize game entities
        this.initEntities();
        
        // Initialize DOM elements
        this.scoreElement = document.getElementById('score');
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartButton = document.getElementById('restartButton');
        
        // Set up event listeners
        this.restartButton.addEventListener('click', () => this.restart());
        
        // Load audio if requested
        this.loadAudio();
        
        // Generate initial clouds
        this.generateClouds();
        
        // Milestone timers
        this.milestoneTimers = {};
        
        // Set up event listeners for control buttons
        this.setupControlButtons();
    }
    
    /**
     * Initialize game entities
     */
    initEntities() {
        // Create player
        this.player = new Player(
            this.canvas.width / 2 - 30, // Half of width (60/2)
            this.canvas.height - 150, // Position for player
            60, // Width reduced to 60
            100  // Height maintained at 100
        );
        
        // Create platform manager
        this.platformManager = new PlatformManager(
            this.canvas.width,
            this.canvas.height,
            15 // Initial platform count
        );
        
        // Create enemy manager
        this.enemyManager = new EnemyManager(
            this.canvas.width,
            this.canvas.height
        );
        
        // Create power-up manager
        this.powerUpManager = new PowerUpManager(
            this.canvas.width,
            this.canvas.height
        );
        
        // Ensure there's a starting platform under the player
        const startingPlatform = new Platform(
            this.canvas.width / 2 - 40, // Platform centered under player (slightly wider than player)
            this.canvas.height - 40, // Just below player's feet
            80, // Platform width appropriate for 60px player
            this.platformManager.platformHeight || 20,
            'normal'
        );
        this.platformManager.platforms.push(startingPlatform);
    }
    
    /**
     * Load audio files
     */
    loadAudio() {
        // Make audio optional to avoid blocking game start if files don't exist
        this.sounds = {
            jump: null,
            powerUp: null,
            enemyDeath: null,
            playerDeath: null,
            milestone: null
        };
        
        // Try to load audio files, but don't block game if they don't exist
        try {
            // Create audio objects
            const jumpAudio = new Audio('assets/jump.mp3');
            const powerUpAudio = new Audio('assets/powerup.mp3');
            const enemyDeathAudio = new Audio('assets/enemy_death.mp3');
            const playerDeathAudio = new Audio('assets/player_death.mp3');
            const milestoneAudio = new Audio('assets/milestone.mp3');
            
            // Set audio properties
            [jumpAudio, powerUpAudio, enemyDeathAudio, playerDeathAudio, milestoneAudio].forEach(audio => {
                audio.volume = 0.5;
                
                // Test if audio can play without errors
                audio.addEventListener('error', (e) => {
                    console.warn(`Audio error: ${e.target.src}`, e);
                });
            });
            
            // Assign to game sounds only if they loaded without errors
            this.sounds = {
                jump: jumpAudio,
                powerUp: powerUpAudio,
                enemyDeath: enemyDeathAudio,
                playerDeath: playerDeathAudio,
                milestone: milestoneAudio
            };
            
            // Check if audio should be muted based on user preference
            const isMuted = localStorage.getItem('gameMuted') === 'true';
            this.setAudioMuted(isMuted);
        } catch (error) {
            console.warn('Audio could not be loaded, continuing without sound', error);
            // Ensure sounds object is defined with nulls
            this.sounds = {
                jump: null,
                powerUp: null,
                enemyDeath: null,
                playerDeath: null,
                milestone: null
            };
        }
    }
    
    /**
     * Generate background clouds
     */
    generateClouds() {
        const cloudCount = 10;
        
        for (let i = 0; i < cloudCount; i++) {
            this.background.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height * 2 - this.canvas.height,
                width: Utils.randomBetween(50, 150),
                height: Utils.randomBetween(30, 60),
                speed: Utils.randomBetween(0.03, 0.1) // Minimized speed for nearly stationary clouds
            });
        }
    }
    
    /**
     * Start the game
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isGameOver = false;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    /**
     * Stop the game
     */
    stop() {
        this.isRunning = false;
        cancelAnimationFrame(this.animationFrameId);
    }
    
    /**
     * Game over
     */
    gameOver() {
        this.isGameOver = true;
        this.stop();
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
        }
        
        // Function to handle both clicks and touches
        const handleInteraction = (event) => {
            // Get the appropriate coordinates based on event type
            let x, y;
            
            if (event.type === 'touchend') {
                // Prevent default behavior for touch events
                event.preventDefault();
                
                // Get touch coordinates
                if (event.changedTouches && event.changedTouches.length > 0) {
                    const rect = this.canvas.getBoundingClientRect();
                    x = event.changedTouches[0].clientX - rect.left;
                    y = event.changedTouches[0].clientY - rect.top;
                } else {
                    return; // No touch data available
                }
            } else {
                // Mouse click coordinates
                const rect = this.canvas.getBoundingClientRect();
                x = event.clientX - rect.left;
                y = event.clientY - rect.top;
            }
            
            // Check if interaction is within the restart button bounds
            if (this.restartButtonBounds && 
                x >= this.restartButtonBounds.x && 
                x <= this.restartButtonBounds.x + this.restartButtonBounds.width &&
                y >= this.restartButtonBounds.y && 
                y <= this.restartButtonBounds.y + this.restartButtonBounds.height) {
                
                // Remove all event listeners
                this.canvas.removeEventListener('click', handleInteraction);
                this.canvas.removeEventListener('touchend', handleInteraction);
                
                // Restart the game
                this.restart();
            }
        };
        
        // Add event listeners for both mouse and touch
        this.canvas.addEventListener('click', handleInteraction);
        this.canvas.addEventListener('touchend', handleInteraction, { passive: false });
        
        // Play death sound if available
        if (this.sounds.playerDeath) {
            try {
                this.sounds.playerDeath.play().catch(e => console.warn('Could not play sound', e));
            } catch (e) {
                console.warn('Could not play sound', e);
            }
        }
        
        // Draw the game over screen immediately
        this.render();
    }
    
    /**
     * Restart the game
     */
    restart() {
        // Reset game state
        this.score = 0;
        this.updateScore(0);
        this.camera.y = 0;
        this.camera.targetY = 0;
        this.isGameOver = false;
        
        // Reset difficulty
        this.difficulty = 1;
        this.lastDifficultyIncrease = 0;
        
        // Reset entities
        this.initEntities();
        
        // Clear milestone timers
        this.milestoneTimers = {};
        
        // Start the game loop again
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('Game restarted');
    }
    
    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp
     */
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Don't allow massive delta time jumps (e.g. after tab switching)
        const safeDeltaTime = Math.min(deltaTime, 50);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update game
        this.update(safeDeltaTime);
        
        // Render game
        this.render();
        
        // Periodically log status for debugging
        if (Math.random() < 0.001) { // ~0.1% chance each frame
            Utils.checkGameStatus();
        }
        
        // Request next frame
        this.animationFrameId = requestAnimationFrame(time => this.gameLoop(time));
    }
    
    /**
     * Update game state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Don't update if game is over
        if (this.isGameOver) return;
        
        // CRITICAL FIX: Special handling for score 300-310 range where player vanishes
        if (this.score >= 300 && this.score <= 310) {
            // Enable extra debugging
            console.log(`Score ${this.score}: Player at ${Math.round(this.player.x)},${Math.round(this.player.y)} - Camera at ${Math.round(this.camera.y)}`);
            
            // Force player to be visible - extreme measure for this score range
            const screenY = this.player.y - this.camera.y;
            if (screenY < 0 || screenY > this.canvas.height || isNaN(screenY)) {
                console.log("CRITICAL FIX: Repositioning player at score 300-310 range");
                this.player.y = this.camera.y + this.canvas.height * 0.5;
                this.player.velocityY = -5; // Small upward velocity
                
                // Create safe platform below
                const safePlatform = new Platform(
                    this.canvas.width / 2 - 75,
                    this.player.y + this.player.height + 20,
                    150,
                    this.platformManager.platformHeight,
                    'normal'
                );
                this.platformManager.platforms.push(safePlatform);
                
                // Remove any enemies at this height
                this.enemyManager.enemies = this.enemyManager.enemies.filter(enemy => {
                    const enemyScreenY = enemy.y - this.camera.y;
                    return enemyScreenY < 0 || enemyScreenY > this.canvas.height;
                });
            }
        }
        
        // Emergency player recovery - if the player is outside the screen bounds
        this.recoverPlayerIfNeeded();
        
        // Update player
        this.player.update(deltaTime, this);
        
        // Check if player is dead
        if (!this.player.isAlive) {
            this.gameOver();
            return;
        }
        
        // Update camera to follow player
        this.updateCamera(deltaTime);
        
        // Update platforms
        this.platformManager.update(deltaTime, this.camera.y);
        
        // Update enemies
        this.enemyManager.update(deltaTime, this.camera.y, Math.abs(this.camera.y));
        
        // Update power-ups
        this.powerUpManager.update(deltaTime, this.camera.y, Math.abs(this.camera.y));
        
        // Check collisions
        this.checkCollisions();
        
        // Update background
        this.updateBackground(deltaTime);
        
        // Update score based on height
        const currentHeight = Math.abs(this.camera.y);
        this.updateScore(Math.floor(currentHeight / 10));

        // Ensure player is visible after score update
        if (this.score === 300) {
            console.log("Player just reached score 300, ensuring visibility");
            this.forcePlayerVisibility();
        }
    }
    
    /**
     * Force player to be visible on screen
     */
    forcePlayerVisibility() {
        const screenY = this.player.y - this.camera.y;
        
        // If player is not clearly visible on screen, reposition
        if (screenY < 50 || screenY > this.canvas.height - 50) {
            // Position player at lower middle of screen
            this.player.y = this.camera.y + this.canvas.height * 0.7;
            
            // Reset vertical velocity to a small upward bounce
            this.player.velocityY = this.player.jumpForce * 0.5;
            
            // Create supporting platform
            const platform = new Platform(
                this.canvas.width / 2 - 75,
                this.player.y + this.player.height + 20,
                150,
                this.platformManager.platformHeight,
                'normal'
            );
            
            this.platformManager.platforms.push(platform);
            console.log("Force repositioned player for visibility at score 300");
        }
    }
    
    /**
     * Update camera position to follow player
     * @param {number} deltaTime - Time since last update
     */
    updateCamera(deltaTime) {
        // Calculate how far up the screen the player is
        const screenY = this.player.y - this.camera.y;
        
        // If player is in the upper 2/3 of the screen, move the camera up
        if (screenY < this.canvas.height * 0.67) {
            this.camera.targetY = this.player.y - (this.canvas.height * 0.5);
        }
        
        // Camera shouldn't move down too quickly if player is falling
        // Only follow player down if they're below 80% of screen height
        if (screenY > this.canvas.height * 0.8 && this.camera.targetY > this.camera.y) {
            this.camera.targetY = this.camera.y;
        }
        
        // Smooth camera movement, but slower when moving down
        const easing = this.player.velocityY > 0 ? 0.05 : 0.1;
        this.camera.y = Utils.ease(this.camera.y, this.camera.targetY, easing);
        
        // Don't let the player fall off the bottom - check game over
        if (screenY > this.canvas.height + 50) {
            // Player has fallen too far
            Utils.debug("Player fell off screen", {screenY, cameraY: this.camera.y, playerY: this.player.y});
            
            // No more safety shields or repositioning - player dies when falling off screen
            this.player.isAlive = false;
        }
    }
    
    /**
     * Update score display with animation
     * @param {number} newScore - New score value
     */
    updateScore(newScore) {
        if (newScore > this.score) {
            // Check if we crossed a 100-point threshold
            const previousHundred = Math.floor(this.score / 100);
            const newHundred = Math.floor(newScore / 100);
            
            if (newHundred > previousHundred) {
                // Play milestone sound for every 100 points
                if (this.sounds && this.sounds.milestone) {
                    try {
                        this.sounds.milestone.currentTime = 0;
                        this.sounds.milestone.play().catch(e => console.warn('Could not play milestone sound', e));
                    } catch (e) {
                        console.warn('Could not play milestone sound', e);
                    }
                }
                
                // Add special animation class for 100-point milestones
                const scoreElement = document.getElementById('score');
                if (scoreElement) {
                    scoreElement.classList.add('score-pulse');
                    setTimeout(() => {
                        scoreElement.classList.remove('score-pulse');
                    }, 1000);
                }
            }
            
            // Check if we crossed a 1000-point threshold
            const previousThousand = Math.floor(this.score / 1000);
            const newThousand = Math.floor(newScore / 1000);
            
            if (newThousand > previousThousand) {
                this.increaseDifficulty();
                this.showThousandMilestone(newThousand * 1000);
            }
            
            this.score = newScore;
            
            // Update DOM score with animation
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                // Add pulse animation class if not already added
                if (!scoreElement.classList.contains('score-pulse')) {
                    scoreElement.classList.add('score-pulse');
                    setTimeout(() => {
                        scoreElement.classList.remove('score-pulse');
                    }, 300);
                }
                scoreElement.textContent = Math.floor(this.score);
            }
        }
    }
    
    /**
     * Show a special effect for thousand milestone
     * @param {number} milestone - The milestone achieved
     */
    showThousandMilestone(milestone) {
        // Add milestone to the list to be shown by drawScore
        this.milestoneTimers[milestone] = 120;  // Show for 2 seconds
        
        // Try to play a special sound for milestone
        if (this.sounds && this.sounds.milestone) {
            try {
                this.sounds.milestone.play().catch(e => console.warn('Could not play milestone sound', e));
            } catch (e) {
                console.warn('Could not play milestone sound', e);
            }
        }
    }
    
    /**
     * Increase game difficulty
     */
    increaseDifficulty() {
        this.difficulty += 1;
        this.lastDifficultyIncrease = this.score;
        
        console.log(`Difficulty increased to level ${this.difficulty} at score ${this.score}`);
        
        // Increase player gravity
        if (this.player) {
            const newGravity = 0.5 + (this.difficulty - 1) * 0.05;
            this.player.gravity = Math.min(newGravity, 0.8); // Cap at 0.8
            
            // Also increase jump force to compensate for higher gravity
            const newJumpForce = -15 - (this.difficulty - 1);
            this.player.jumpForce = Math.max(newJumpForce, -20); // Cap at -20
            
            console.log(`Player gravity increased to ${this.player.gravity}, jump force to ${this.player.jumpForce}`);
        }
        
        // Adjust platform generation
        if (this.platformManager) {
            // Reduce platform density
            const platformReduction = Math.min(this.difficulty - 1, 5);
            this.platformManager.density = Math.max(10 - platformReduction, 5); // Ensure at least 5 platforms
            
            // Make platforms narrower with each level
            const widthReduction = Math.min((this.difficulty - 1) * 10, 40);
            this.platformManager.minWidth = Math.max(60 - widthReduction, 20); // Minimum 20px wide (was 40)
            this.platformManager.maxWidth = Math.max(120 - widthReduction, 60); // Minimum 60px wide (was 80)
            
            // Also make platforms shorter (reduce height)
            const heightReduction = Math.min((this.difficulty - 1) * 2, 10);
            this.platformManager.platformHeight = Math.max(20 - heightReduction, 10); // Minimum 10px height
            
            console.log(`Platform size reduced: ${this.platformManager.minWidth}-${this.platformManager.maxWidth}x${this.platformManager.platformHeight}, density: ${this.platformManager.density}`);
        }
        
        // Increase enemy spawn rate
        if (this.enemyManager) {
            // More enemies
            this.enemyManager.spawnChance = Math.min(0.2 + (this.difficulty - 1) * 0.05, 0.5); // Cap at 50%
            
            // Faster enemies
            this.enemyManager.maxSpeed = Math.min(2 + (this.difficulty - 1) * 0.5, 5); // Cap at 5
            
            console.log(`Enemy spawn chance increased to ${this.enemyManager.spawnChance}, max speed to ${this.enemyManager.maxSpeed}`);
        }
        
        // Also adjust camera speed
        this.camera.smoothing = Math.min(0.1 + (this.difficulty - 1) * 0.02, 0.2); // Cap at 0.2
    }
    
    /**
     * Update background elements
     * @param {number} deltaTime - Time since last update
     */
    updateBackground(deltaTime) {
        // Update clouds with minimal horizontal movement
        for (const cloud of this.background.clouds) {
            // Move clouds horizontally (reduced speed by 90% from original)
            cloud.x += cloud.speed * 0.1;
            
            // Wrap clouds around when they go off-screen
            if (cloud.x > this.canvas.width) {
                cloud.x = -cloud.width;
                // Keep y-position fixed so clouds don't appear to move vertically
                cloud.y = cloud.y;
            }
        }
        
        // Add new clouds as camera moves up, but only when needed
        if (this.background.clouds.length < 10) {
            this.background.clouds.push({
                x: Utils.randomBetween(-50, this.canvas.width),
                y: -this.canvas.height - this.camera.y,
                width: Utils.randomBetween(50, 150),
                height: Utils.randomBetween(30, 60),
                speed: Utils.randomBetween(0.03, 0.1) // Further reduced cloud speed
            });
        }
    }
    
    /**
     * Check for collisions between game entities
     */
    checkCollisions() {
        // Check player-platform collisions
        const platformCollision = this.platformManager.checkCollisions(this.player);
        
        // Force the player to jump if on a platform and not already jumping
        if (platformCollision && this.player.isFalling) {
            // The player has landed on a platform, ensure jump happens
            Utils.debug('Player landed on platform');
        }
        
        // Check player-enemy collisions
        if (this.enemyManager.checkCollisions(this.player)) {
            // Player hit an enemy (harmful collision)
            Utils.debug('Player hit enemy, game over');
            this.player.isAlive = false;
        }
        
        // Check player-powerup collisions
        this.powerUpManager.checkCollisions(this.player);
    }
    
    /**
     * Emergency player recovery if they vanish or go out of bounds
     */
    recoverPlayerIfNeeded() {
        // Check if player is off-screen horizontally
        if (this.player.x < -this.player.width * 2 || this.player.x > this.canvas.width + this.player.width * 2) {
            console.log("Emergency player recovery: Player off-screen horizontally");
            // Reset to center
            this.player.x = this.canvas.width / 2 - this.player.width / 2;
        }
        
        // Calculate player's screen position
        const screenY = this.player.y - this.camera.y;
        
        // Check if player is way off-screen vertically - game over instead of recovery
        if (screenY < -this.canvas.height || screenY > this.canvas.height * 2) {
            console.log("Player is too far off-screen vertically - game over");
            this.player.isAlive = false;
            return;
        }
        
        // Check if player has invalid position (NaN)
        if (isNaN(this.player.x) || isNaN(this.player.y) || 
            isNaN(this.player.velocityX) || isNaN(this.player.velocityY)) {
            console.log("Emergency player recovery: Player has NaN position or velocity");
            
            // Reset player
            this.player.x = this.canvas.width / 2 - this.player.width / 2;
            this.player.y = this.camera.y + this.canvas.height * 0.7;
            this.player.velocityX = 0;
            this.player.velocityY = this.player.jumpForce * 0.5;
        }
    }
    
    /**
     * Render the game
     */
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw platforms
        this.platformManager.draw(this.ctx, this.camera.y);
        
        // Draw power-ups
        this.powerUpManager.draw(this.ctx, this.camera.y);
        
        // Draw enemies
        this.enemyManager.draw(this.ctx, this.camera.y);
        
        // Draw player
        this.player.draw(this.ctx, this.camera.y);
        
        // Draw score
        this.drawScore(this.ctx);
        
        // Draw game over screen if game is over
        if (this.isGameOver) {
            this.drawGameOverScreen();
        }
    }
    
    /**
     * Draw the score on the screen
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawScore(ctx) {
        const score = Math.floor(this.score);
        
        ctx.save();
        
        // Draw score background
        const scoreX = 20;
        const scoreY = 20;
        const scoreWidth = 100;
        const scoreHeight = 40;
        const cornerRadius = 10;
        
        // Background with gradient
        const gradient = ctx.createLinearGradient(
            scoreX, 
            scoreY, 
            scoreX + scoreWidth, 
            scoreY + scoreHeight
        );
        gradient.addColorStop(0, 'rgba(57, 84, 123, 0.8)');  // Bunny blue
        gradient.addColorStop(1, 'rgba(75, 83, 32, 0.8)');   // Pepe green
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(scoreX, scoreY, scoreWidth, scoreHeight, [cornerRadius]);
        ctx.fill();
        
        // Add border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(scoreX, scoreY, scoreWidth, scoreHeight, [cornerRadius]);
        ctx.stroke();
        
        // Draw score text with glow
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text shadow/glow effect
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';  // Gold color
        ctx.font = 'bold 24px Arial';
        
        // Shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        const textX = scoreX + scoreWidth / 2;
        const textY = scoreY + scoreHeight / 2;
        
        // Draw score
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(score, textX, textY);
        
        // Draw small "score" label
        ctx.font = '12px Arial';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('SCORE', textX, textY - 18);
        
        ctx.restore();
        
        // Draw milestone markers when score reaches certain thresholds
        if (score > 0 && score % 100 === 0 && this.milestoneTimers[score] === undefined) {
            this.milestoneTimers[score] = 60;  // Show for 60 frames (1 second at 60fps)
        }
        
        // Draw active milestone notifications
        Object.keys(this.milestoneTimers).forEach(milestone => {
            if (this.milestoneTimers[milestone] > 0) {
                const alpha = Math.min(1, this.milestoneTimers[milestone] / 30);
                const scale = 1 + (1 - alpha) * 0.5;
                
                ctx.save();
                ctx.globalAlpha = alpha;
                
                // Calculate position (center of screen)
                const notifX = ctx.canvas.width / 2;
                const notifY = ctx.canvas.height / 3;
                
                // Apply scale transformation
                ctx.translate(notifX, notifY);
                ctx.scale(scale, scale);
                ctx.translate(-notifX, -notifY);
                
                // Draw milestone notification
                const notifWidth = 200;
                const notifHeight = 60;
                
                // Background with gradient
                const milestoneGradient = ctx.createLinearGradient(
                    notifX - notifWidth/2, 
                    notifY - notifHeight/2, 
                    notifX + notifWidth/2, 
                    notifY + notifHeight/2
                );
                milestoneGradient.addColorStop(0, 'rgba(212, 175, 55, 0.9)');  // Gold
                milestoneGradient.addColorStop(1, 'rgba(255, 215, 0, 0.9)');   // Brighter gold
                
                ctx.fillStyle = milestoneGradient;
                ctx.beginPath();
                ctx.roundRect(
                    notifX - notifWidth/2, 
                    notifY - notifHeight/2, 
                    notifWidth, 
                    notifHeight, 
                    [15]
                );
                ctx.fill();
                
                // Border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(
                    notifX - notifWidth/2, 
                    notifY - notifHeight/2, 
                    notifWidth, 
                    notifHeight, 
                    [15]
                );
                ctx.stroke();
                
                // Text shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                // Draw milestone text
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(`SCORE ${milestone}!`, notifX, notifY - 5);
                
                ctx.font = '14px Arial';
                ctx.fillText(`Keep hopping!`, notifX, notifY + 20);
                
                // Decrease timer
                this.milestoneTimers[milestone]--;
                if (this.milestoneTimers[milestone] <= 0) {
                    delete this.milestoneTimers[milestone];
                }
                
                ctx.restore();
            }
        });
    }
    
    /**
     * Resize the canvas to fit the container
     */
    resizeCanvas() {
        // Get window dimensions instead of container
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Set canvas dimensions to match window size
        this.canvas.width = windowWidth;
        this.canvas.height = windowHeight;
        
        // Log canvas dimensions for debugging
        console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
        
        // Handle different device orientations
        const isPortrait = window.innerHeight > window.innerWidth;
        const isMobile = window.innerWidth <= 430;
        
        // Adjust game entities for the new canvas size
        this.adjustEntitiesForResize(isPortrait, isMobile);
        
        // Force camera position update
        if (this.player) {
            const targetPlayerScreenY = this.canvas.height * 0.7;
            this.camera.y = this.player.y - targetPlayerScreenY;
            this.camera.targetY = this.camera.y;
            
            // Log camera position for debugging
            console.log(`Camera position updated to ${this.camera.y}`);
        }
        
        // Re-render if game is already running
        if (this.isRunning) {
            this.render();
        }
    }
    
    /**
     * Adjust game entities when screen is resized
     * @param {boolean} isPortrait - Whether device is in portrait orientation
     * @param {boolean} isMobile - Whether device is a mobile device
     */
    adjustEntitiesForResize(isPortrait, isMobile) {
        // Update platform manager dimensions
        if (this.platformManager) {
            this.platformManager.canvasWidth = this.canvas.width;
            this.platformManager.canvasHeight = this.canvas.height;
        }
        
        // Update player position
        if (this.player) {
            // Keep player horizontally centered on resize
            this.player.x = Math.min(
                this.canvas.width - this.player.width,
                Math.max(0, (this.canvas.width / 2) - (this.player.width / 2))
            );
            
            // Adjust vertical position to keep player in view
            const screenY = this.player.y - this.camera.y;
            if (screenY < 0 || screenY > this.canvas.height) {
                this.player.y = this.camera.y + (this.canvas.height * 0.7);
            }
        }
        
        // Adjust enemy manager
        if (this.enemyManager) {
            this.enemyManager.canvasWidth = this.canvas.width;
            this.enemyManager.canvasHeight = this.canvas.height;
        }
        
        // Adjust power-up manager
        if (this.powerUpManager) {
            this.powerUpManager.canvasWidth = this.canvas.width;
            this.powerUpManager.canvasHeight = this.canvas.height;
        }
        
        // For mobile devices in portrait, adjust camera position
        if (isMobile && isPortrait && this.camera) {
            // Ensure camera shows relevant part of the game
            const cameraAdjustment = this.canvas.height * 0.1;
            this.camera.y -= cameraAdjustment;
            this.camera.targetY = this.camera.y;
        }
    }
    
    /**
     * Draw game over screen on canvas
     */
    drawGameOverScreen() {
        this.ctx.save();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Center position
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height * 0.4;
        
        // Draw "Game Over" text
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 48px Arial';
        
        // Text shadow for "Game Over"
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;
        
        // Draw "Game Over" with gradient
        const textGradient = this.ctx.createLinearGradient(
            centerX - 100, 
            centerY - 30, 
            centerX + 100, 
            centerY + 30
        );
        textGradient.addColorStop(0, '#8B3A3A');  // Umbrella red
        textGradient.addColorStop(1, '#A04848');  // Lighter red
        
        this.ctx.fillStyle = textGradient;
        this.ctx.fillText('GAME OVER', centerX, centerY);
        
        // Draw score panel
        const panelWidth = 280;
        const panelHeight = 150;
        const panelX = centerX - panelWidth / 2;
        const panelY = centerY + 50;
        
        // Panel background with gradient
        const panelGradient = this.ctx.createLinearGradient(
            panelX, 
            panelY, 
            panelX + panelWidth, 
            panelY + panelHeight
        );
        panelGradient.addColorStop(0, 'rgba(57, 84, 123, 0.9)');  // Bunny blue
        panelGradient.addColorStop(1, 'rgba(75, 83, 32, 0.9)');   // Pepe green
        
        // Reset shadow for panel
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw rounded panel
        this.ctx.fillStyle = panelGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, [15]);
        this.ctx.fill();
        
        // Panel border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, [15]);
        this.ctx.stroke();
        
        // Turn off shadow for text
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw score text
        this.ctx.font = '22px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('YOUR SCORE:', panelX + 30, panelY + 50);
        
        // Draw high score text
        this.ctx.fillText('HIGH SCORE:', panelX + 30, panelY + 100);
        
        // Draw score values
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'right';
        
        // Your score with gold glow if it's a new high score
        if (this.score > this.highScore) {
            // Gold glow for new high score
            this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#FFD700';  // Gold color
        }
        this.ctx.fillText(Math.floor(this.score), panelX + panelWidth - 30, panelY + 50);
        
        // Reset style for high score
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(Math.floor(this.highScore), panelX + panelWidth - 30, panelY + 100);
        
        // Draw restart button
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = centerX - buttonWidth / 2;
        const buttonY = panelY + panelHeight + 30;
        
        // Button gradient
        const buttonGradient = this.ctx.createLinearGradient(
            buttonX, 
            buttonY, 
            buttonX + buttonWidth, 
            buttonY + buttonHeight
        );
        buttonGradient.addColorStop(0, '#8B3A3A');  // Umbrella red
        buttonGradient.addColorStop(1, '#A04848');  // Lighter red
        
        // Button shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 5;
        
        // Draw rounded button
        this.ctx.fillStyle = buttonGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, [30]);
        this.ctx.fill();
        
        // Button text
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('TRY AGAIN', centerX, buttonY + buttonHeight / 2);
        
        // Add fun characters to game over screen
        this.drawGameOverCharacters();
        
        this.ctx.restore();
        
        // Store button position for click handling
        this.restartButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    /**
     * Draw character illustrations for the game over screen
     */
    drawGameOverCharacters() {
        // Pepe (sad face)
        const pepeX = this.canvas.width * 0.25;
        const pepeY = this.canvas.height * 0.2;
        const pepeSize = 80;
        
        // Draw Pepe's head
        this.ctx.fillStyle = '#4B5320'; // Pepe green
        this.ctx.beginPath();
        this.ctx.arc(pepeX, pepeY, pepeSize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw Pepe's eyes (sad)
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(pepeX - pepeSize/4, pepeY - pepeSize/8, pepeSize/6, 0, Math.PI * 2);
        this.ctx.arc(pepeX + pepeSize/4, pepeY - pepeSize/8, pepeSize/6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw pupils (looking down)
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(pepeX - pepeSize/4, pepeY - pepeSize/8 + pepeSize/12, pepeSize/12, 0, Math.PI * 2);
        this.ctx.arc(pepeX + pepeSize/4, pepeY - pepeSize/8 + pepeSize/12, pepeSize/12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw sad mouth
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(pepeX, pepeY + pepeSize/4, pepeSize/4, Math.PI * 0.6, Math.PI * 0.4, true);
        this.ctx.stroke();
        
        // Sad tear
        this.ctx.fillStyle = '#87CEEB'; // Light blue
        this.ctx.beginPath();
        this.ctx.arc(pepeX - pepeSize/3, pepeY + pepeSize/8, pepeSize/10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Bunny (surprised face)
        const bunnyX = this.canvas.width * 0.75;
        const bunnyY = this.canvas.height * 0.2;
        const bunnySize = 80;
        
        // Draw Bunny's head
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(bunnyX, bunnyY, bunnySize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw Bunny's ears
        this.ctx.fillStyle = 'white';
        
        // Left ear
        this.ctx.beginPath();
        this.ctx.ellipse(
            bunnyX - bunnySize/4, 
            bunnyY - bunnySize/1.5, 
            bunnySize/6, 
            bunnySize/2, 
            0, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Right ear
        this.ctx.beginPath();
        this.ctx.ellipse(
            bunnyX + bunnySize/4, 
            bunnyY - bunnySize/1.5, 
            bunnySize/6, 
            bunnySize/2, 
            0, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Inner ear coloring
        this.ctx.fillStyle = '#FFCAD4'; // Light pink
        
        // Left inner ear
        this.ctx.beginPath();
        this.ctx.ellipse(
            bunnyX - bunnySize/4, 
            bunnyY - bunnySize/1.5, 
            bunnySize/12, 
            bunnySize/3, 
            0, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Right inner ear
        this.ctx.beginPath();
        this.ctx.ellipse(
            bunnyX + bunnySize/4, 
            bunnyY - bunnySize/1.5, 
            bunnySize/12, 
            bunnySize/3, 
            0, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw Bunny's eyes (surprised)
        this.ctx.fillStyle = '#39547B'; // Hoodie blue
        this.ctx.beginPath();
        this.ctx.arc(bunnyX - bunnySize/4, bunnyY - bunnySize/8, bunnySize/6, 0, Math.PI * 2);
        this.ctx.arc(bunnyX + bunnySize/4, bunnyY - bunnySize/8, bunnySize/6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw pupils
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(bunnyX - bunnySize/4, bunnyY - bunnySize/8, bunnySize/12, 0, Math.PI * 2);
        this.ctx.arc(bunnyX + bunnySize/4, bunnyY - bunnySize/8, bunnySize/12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw shocked mouth (small o shape)
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(bunnyX, bunnyY + bunnySize/5, bunnySize/8, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * Draw the background with decorative elements
     */
    drawBackground() {
        // Clear the entire canvas first to prevent any artifacts
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Create a richer sky gradient with multiple color stops for dawn/dusk look
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        skyGradient.addColorStop(0, '#1A2C5B'); // Deep blue at top
        skyGradient.addColorStop(0.3, '#4A6DB5'); // Mid blue
        skyGradient.addColorStop(0.6, '#87CEEB'); // Sky blue
        skyGradient.addColorStop(0.8, '#E6A972'); // Warm horizon glow
        skyGradient.addColorStop(1, '#39547B'); // Darker bunny blue at bottom
        
        // Fill the entire canvas with the gradient
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw subtle sun/moon with glow effect
        const timeOfDay = Math.sin(Date.now() * 0.0001) * 0.5 + 0.5; // Value oscillates between 0-1
        const celestialBodyX = this.canvas.width * 0.8;
        const celestialBodyY = this.canvas.height * 0.2;
        const celestialBodySize = 40;
        
        // Create glow effect
        const glowGradient = this.ctx.createRadialGradient(
            celestialBodyX, celestialBodyY, celestialBodySize * 0.5,
            celestialBodyX, celestialBodyY, celestialBodySize * 5
        );
        
        if (timeOfDay > 0.5) {
            // Sun with warm glow
            glowGradient.addColorStop(0, 'rgba(255, 230, 150, 0.8)');
            glowGradient.addColorStop(0.2, 'rgba(255, 150, 50, 0.4)');
            glowGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
        } else {
            // Moon with cool glow
            glowGradient.addColorStop(0, 'rgba(220, 240, 255, 0.6)');
            glowGradient.addColorStop(0.2, 'rgba(150, 180, 255, 0.3)');
            glowGradient.addColorStop(1, 'rgba(150, 180, 255, 0)');
        }
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.fillRect(celestialBodyX - celestialBodySize * 5, celestialBodyY - celestialBodySize * 5, 
                        celestialBodySize * 10, celestialBodySize * 10);
        
        // Draw the celestial body (sun/moon)
        if (timeOfDay > 0.5) {
            // Sun
            this.ctx.fillStyle = '#FFF8E0';
        } else {
            // Moon
            this.ctx.fillStyle = '#F0F8FF';
        }
        this.ctx.beginPath();
        this.ctx.arc(celestialBodyX, celestialBodyY, celestialBodySize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add atmospheric haze layer
        const hazeGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        hazeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        hazeGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
        hazeGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        this.ctx.fillStyle = hazeGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // PARALLAX BACKGROUND LAYER 1 - Far mountains silhouette
        this.ctx.save();
        // Set far mountain parallax to 0 (completely stationary)
        const farParallaxOffset = this.camera.y * 0.0;
        
        // Draw distant mountain range with gradient
        const mountainY = this.canvas.height * 0.75 - farParallaxOffset;
        const mountainGradient = this.ctx.createLinearGradient(0, mountainY - 100, 0, mountainY);
        mountainGradient.addColorStop(0, '#1A3050'); // Dark blue-purple
        mountainGradient.addColorStop(1, '#2A4060'); // Slightly lighter blue-purple
        this.ctx.fillStyle = mountainGradient;
        
        // Create mountain range silhouette
        this.ctx.beginPath();
        this.ctx.moveTo(0, mountainY);
        
        // Use a more natural mountain pattern
        const mountainCount = 5;
        const mountainWidth = this.canvas.width / mountainCount;
        
        for (let i = 0; i <= mountainCount; i++) {
            const x = i * mountainWidth;
            const y = mountainY - (Math.sin(i * 3.1) * 60 + 40);
            
            if (i === 0) {
                this.ctx.lineTo(x, y);
            } else {
                // Create a more natural mountain curve with control points
                const cpX1 = x - mountainWidth * 0.8;
                const cpY1 = mountainY - (Math.sin((i-0.4) * 3.1) * 80 + 20);
                const cpX2 = x - mountainWidth * 0.3;
                const cpY2 = y - 20 * Math.sin(i * 2.5);
                
                this.ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, x, y);
            }
        }
        
        this.ctx.lineTo(this.canvas.width, mountainY);
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw snow caps on mountains
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.beginPath();
        
        for (let i = 0; i <= mountainCount; i++) {
            const x = i * mountainWidth;
            const peakY = mountainY - (Math.sin(i * 3.1) * 60 + 40);
            
            // Only add snow to the higher peaks
            if (peakY < mountainY - 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(x - 20, peakY + 15);
                this.ctx.lineTo(x, peakY);
                this.ctx.lineTo(x + 20, peakY + 15);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
        
        // PARALLAX BACKGROUND LAYER 2 - Far trees and hills
        this.ctx.save();
        // Set trees/hills parallax to 0 (completely stationary)
        const midParallaxOffset = this.camera.y * 0.0;
        const treeLine = this.canvas.height * 0.8 - midParallaxOffset;
        
        // Draw far hills/trees with improved gradient
        const hillsGradient = this.ctx.createLinearGradient(0, treeLine - 70, 0, treeLine);
        hillsGradient.addColorStop(0, '#304030'); // Darker green for distance
        hillsGradient.addColorStop(1, '#3A5030'); // Slight lighter green for closer parts
        this.ctx.fillStyle = hillsGradient;
        
        // Draw a few hills with different heights
        this.ctx.beginPath();
        this.ctx.moveTo(0, treeLine);
        
        const hillCount = 6;
        const hillWidth = this.canvas.width / hillCount;
        
        for (let i = 0; i <= hillCount; i++) {
            const x = i * hillWidth;
            const hillHeight = Math.sin(i * 2.5) * 30 + 40;
            
            if (i === 0) {
                this.ctx.lineTo(x, treeLine - hillHeight);
            } else {
                // More natural hill curve
                const cpX1 = x - hillWidth * 0.7;
                const cpY1 = treeLine - Math.sin((i-0.3) * 2.5) * 20 - 30;
                const cpX2 = x - hillWidth * 0.3;
                const cpY2 = treeLine - hillHeight - 10 * Math.sin(i);
                
                this.ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, x, treeLine - hillHeight);
            }
        }
        
        this.ctx.lineTo(this.canvas.width, treeLine);
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.fill();
        
        // Draw tree silhouettes on hills
        this.ctx.fillStyle = '#253525'; // Darker green for trees
        
        for (let i = 0; i < 20; i++) {
            const treeX = Math.random() * this.canvas.width;
            const treeHeight = Math.random() * 30 + 40;
            const treeWidth = treeHeight * 0.7;
            
            // Calculate base Y position on the hills
            let baseY = treeLine;
            const hillPosition = treeX / hillWidth;
            const hillIndex = Math.floor(hillPosition);
            const hillFraction = hillPosition - hillIndex;
            
            if (hillIndex < hillCount) {
                const leftHeight = Math.sin(hillIndex * 2.5) * 30 + 40;
                const rightHeight = Math.sin((hillIndex + 1) * 2.5) * 30 + 40;
                const interpolatedHeight = leftHeight * (1 - hillFraction) + rightHeight * hillFraction;
                baseY = treeLine - interpolatedHeight;
            }
            
            // Draw tree shape (triangle for pine trees)
            this.ctx.beginPath();
            this.ctx.moveTo(treeX - treeWidth / 2, baseY);
            this.ctx.lineTo(treeX, baseY - treeHeight);
            this.ctx.lineTo(treeX + treeWidth / 2, baseY);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Add tree trunk
            this.ctx.fillStyle = '#3D2817'; // Brown for trunk
            this.ctx.fillRect(treeX - treeWidth / 10, baseY - treeHeight / 5, treeWidth / 5, treeHeight / 5);
            this.ctx.fillStyle = '#253525'; // Reset to tree color
        }
        
        this.ctx.restore();
        
        // PARALLAX BACKGROUND LAYER 3 - Mid ground trees and elements (MADE COMPLETELY STATIONARY)
        this.ctx.save();
        // Remove parallax effect completely - fixed position regardless of camera movement
        const midGroundY = this.canvas.height * 0.9;
        
        // Mid-ground trees with more detail
        this.ctx.fillStyle = '#4B5320'; // Pepe green for mid-ground trees
        
        // Generate trees using fixed positions for consistency
        const treePositions = [];
        for (let i = 0; i < 15; i++) {
            treePositions.push({
                x: (i * 83 + 50) % this.canvas.width,
                size: 0.8 + (((i * 17) % 53) / 100) // Deterministic sizes between 0.8-1.33
            });
        }
        
        // Draw each tree with more detail but at fixed position
        for (const tree of treePositions) {
            const treeX = tree.x;
            const treeSize = tree.size;
            const treeHeight = 70 * treeSize;
            const treeWidth = 40 * treeSize;
            const baseY = midGroundY;
            
            // Draw trunk
            this.ctx.fillStyle = '#5E4B2D'; // Brown trunk
            this.ctx.fillRect(treeX - treeWidth/6, baseY - treeHeight/3, treeWidth/3, treeHeight/3);
            
            // Draw tree crown (more detailed shape)
            this.ctx.fillStyle = '#71A744'; // Brighter green for closer trees
            
            // Draw a more natural looking tree crown
            this.ctx.beginPath();
            this.ctx.moveTo(treeX - treeWidth/2, baseY - treeHeight/3);
            this.ctx.quadraticCurveTo(
                treeX - treeWidth/4, baseY - treeHeight/2,
                treeX, baseY - treeHeight
            );
            this.ctx.quadraticCurveTo(
                treeX + treeWidth/4, baseY - treeHeight/2,
                treeX + treeWidth/2, baseY - treeHeight/3
            );
            this.ctx.closePath();
            this.ctx.fill();
            
            // Add highlights to trees
            const timeOfDay = Math.sin(Date.now() * 0.0001) * 0.5 + 0.5; // Value oscillates between 0-1
            if (timeOfDay > 0.5) { // Only during "day"
                this.ctx.fillStyle = 'rgba(255, 255, 150, 0.2)';
                this.ctx.beginPath();
                this.ctx.moveTo(treeX - treeWidth/4, baseY - treeHeight/2);
                this.ctx.quadraticCurveTo(
                    treeX - treeWidth/8, baseY - treeHeight/1.8,
                    treeX, baseY - treeHeight/1.2
                );
                this.ctx.quadraticCurveTo(
                    treeX + treeWidth/8, baseY - treeHeight/1.5,
                    treeX + treeWidth/3, baseY - treeHeight/2.5
                );
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
        
        // Draw ground and grass - completely stationary
        const groundGradient = this.ctx.createLinearGradient(0, midGroundY, 0, this.canvas.height);
        groundGradient.addColorStop(0, '#8B4513'); // Brown for dirt
        groundGradient.addColorStop(0.2, '#5E4B2D'); // Darker brown
        groundGradient.addColorStop(1, '#3D2817'); // Even darker for depth
        
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, midGroundY, this.canvas.width, this.canvas.height - midGroundY);
        
        // Add grass details on top of the ground - use fixed seed for consistency
        this.ctx.fillStyle = '#71A744'; // Grass green
        
        // Draw grass tufts with deterministic pattern
        for (let i = 0; i < this.canvas.width; i += 10) {
            const grassHeight = 5 + ((i * 7) % 15); // Deterministic height between 5-20
            this.ctx.beginPath();
            this.ctx.moveTo(i, midGroundY);
            this.ctx.lineTo(i + 5, midGroundY - grassHeight);
            this.ctx.lineTo(i + 10, midGroundY);
            this.ctx.fill();
        }
        
        // Add fixed flowers in the grass
        for (let i = 0; i < 20; i++) {
            const flowerX = (i * 53 + 23) % this.canvas.width;
            const flowerY = midGroundY - ((i * 3) % 10); // Fixed heights
            const flowerSize = 3 + ((i * 11) % 3); // Fixed sizes between 3-6
            
            // Deterministic flower color
            this.ctx.fillStyle = i % 2 === 0 ? '#FF69B4' : '#FFFFFF';
            
            // Draw flower
            this.ctx.beginPath();
            this.ctx.arc(flowerX, flowerY, flowerSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw yellow center
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.beginPath();
            this.ctx.arc(flowerX, flowerY, flowerSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw umbrellas in the background (appears only if score exceeds 300) - fixed positions
        if (this.score > 300) {
            const umbrellaCount = Math.floor(this.score / 300); // More umbrellas as score increases
            
            for (let i = 0; i < Math.min(umbrellaCount, 5); i++) {
                const umbrellaX = ((i * 567) % this.canvas.width) - 50; // Deterministic position
                const umbrellaY = midGroundY - 50 - (i * 20); // Vary the height but fixed
                
                // Draw umbrella with shadow
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowOffsetX = 5;
                this.ctx.shadowOffsetY = 5;
                
                // Umbrella top
                this.ctx.beginPath();
                this.ctx.fillStyle = '#8B3A3A'; // Umbrella red
                this.ctx.arc(umbrellaX, umbrellaY, 30, Math.PI, 0, false);
                this.ctx.fill();
                
                // Reset shadow
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
                
                // Umbrella handle
                this.ctx.strokeStyle = '#5E2727'; // Darker red
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(umbrellaX, umbrellaY);
                this.ctx.lineTo(umbrellaX, umbrellaY + 50);
                this.ctx.stroke();
                
                // Umbrella ribs
                this.ctx.strokeStyle = '#5E2727'; // Darker red
                this.ctx.lineWidth = 1;
                for (let angle = Math.PI; angle <= 2 * Math.PI; angle += Math.PI / 6) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(umbrellaX, umbrellaY);
                    this.ctx.lineTo(
                        umbrellaX + Math.cos(angle) * 30,
                        umbrellaY + Math.sin(angle) * 30
                    );
                    this.ctx.stroke();
                }
            }
        }
        
        this.ctx.restore();
        
        // Draw some floating clouds with very minimal parallax effect
        this.ctx.save();
        this.ctx.globalAlpha = 0.8;
        
        for (const cloud of this.background.clouds) {
            // Apply extremely minimal parallax effect for clouds (nearly stationary)
            const parallaxFactor = 0.003 - (cloud.width / 50000);
            const adjustedY = cloud.y - this.camera.y * parallaxFactor;
            
            // Only draw clouds that are visible on screen (with some margin)
            if (adjustedY > -cloud.height * 2 && adjustedY < this.canvas.height + cloud.height) {
                // Create cloud shape with multiple overlapping circles
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                
                // Draw a more complex, natural looking cloud
                const centerX = cloud.x;
                const centerY = adjustedY;
                
                // Base cloud shape
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, cloud.width * 0.3, 0, Math.PI * 2);
                this.ctx.arc(centerX + cloud.width * 0.2, centerY - cloud.height * 0.1, cloud.width * 0.25, 0, Math.PI * 2);
                this.ctx.arc(centerX - cloud.width * 0.2, centerY, cloud.width * 0.25, 0, Math.PI * 2);
                this.ctx.arc(centerX + cloud.width * 0.4, centerY + cloud.height * 0.1, cloud.width * 0.2, 0, Math.PI * 2);
                this.ctx.arc(centerX - cloud.width * 0.4, centerY + cloud.height * 0.05, cloud.width * 0.2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add subtle highlight based on time of day
                if (timeOfDay > 0.5) {
                    // Daytime - subtle gold/pink highlight on top
                    const highlightGradient = this.ctx.createLinearGradient(
                        centerX, centerY - cloud.height * 0.5,
                        centerX, centerY + cloud.height * 0.5
                    );
                    highlightGradient.addColorStop(0, 'rgba(255, 237, 213, 0.4)');
                    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    this.ctx.fillStyle = highlightGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY - cloud.height * 0.1, cloud.width * 0.28, 0, Math.PI * 2);
                    this.ctx.arc(centerX + cloud.width * 0.2, centerY - cloud.height * 0.2, cloud.width * 0.23, 0, Math.PI * 2);
                    this.ctx.arc(centerX - cloud.width * 0.2, centerY - cloud.height * 0.1, cloud.width * 0.23, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    // Nighttime - subtle blue highlight
                    this.ctx.fillStyle = 'rgba(180, 200, 255, 0.2)';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, cloud.width * 0.28, 0, Math.PI * 2);
                    this.ctx.arc(centerX + cloud.width * 0.2, centerY - cloud.height * 0.1, cloud.width * 0.23, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        this.ctx.restore();
        
        // Draw height indicators at 1000-point intervals
        if (this.score > 100) {
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.setLineDash([5, 5]);
            this.ctx.lineWidth = 1;
            
            // Calculate which height markers should be visible
            const currentHeight = Math.abs(this.camera.y);
            const visibleMarkerStart = Math.max(0, Math.floor((currentHeight - this.canvas.height) / 1000)) * 1000;
            const visibleMarkerEnd = Math.ceil((currentHeight + this.canvas.height) / 1000) * 1000;
            
            for (let h = visibleMarkerStart; h <= visibleMarkerEnd; h += 1000) {
                // Calculate screen position for this height
                const markerScreenY = h - this.camera.y;
                
                // Only draw if within visible range
                if (markerScreenY >= 0 && markerScreenY <= this.canvas.height) {
                    // Draw horizontal line
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, markerScreenY);
                    this.ctx.lineTo(this.canvas.width, markerScreenY);
                    this.ctx.stroke();
                    
                    // Draw height text
                    this.ctx.font = '14px Arial';
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    this.ctx.textAlign = 'left';
                    this.ctx.fillText(`${h / 10}m`, 10, markerScreenY - 5);
                }
            }
            
            this.ctx.restore();
        }
    }
    
    /**
     * Set up event listeners for control buttons
     */
    setupControlButtons() {
        const pauseButton = document.getElementById('pauseButton');
        const audioButton = document.getElementById('audioButton');
        
        // Pause button functionality
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                if (this.isRunning && !this.isGameOver) {
                    this.pauseGame();
                    pauseButton.innerHTML = '<i class="fas fa-play"></i>';
                    pauseButton.classList.add('active');
                } else if (!this.isGameOver) {
                    this.resumeGame();
                    pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
                    pauseButton.classList.remove('active');
                }
            });
        }
        
        // Audio button functionality
        if (audioButton) {
            // Check initial audio state
            const isMuted = localStorage.getItem('gameMuted') === 'true';
            this.setAudioMuted(isMuted);
            
            // Update button appearance based on state
            if (isMuted) {
                audioButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
                audioButton.classList.add('active');
            }
            
            audioButton.addEventListener('click', () => {
                const currentMuted = localStorage.getItem('gameMuted') === 'true';
                const newMuted = !currentMuted;
                
                this.setAudioMuted(newMuted);
                localStorage.setItem('gameMuted', newMuted);
                
                if (newMuted) {
                    audioButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
                    audioButton.classList.add('active');
                } else {
                    audioButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                    audioButton.classList.remove('active');
                }
            });
        }
    }
    
    /**
     * Set the muted state for all game audio
     * @param {boolean} muted - Whether audio should be muted
     */
    setAudioMuted(muted) {
        // Set muted property on all sound objects
        if (this.sounds) {
            Object.values(this.sounds).forEach(sound => {
                if (sound) {
                    sound.muted = muted;
                }
            });
        }
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        this.isRunning = false;
        this.drawPauseOverlay();
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    /**
     * Draw a pause overlay
     */
    drawPauseOverlay() {
        this.ctx.save();
        
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw pause text
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        // Draw instruction
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Click the pause button to resume', this.canvas.width / 2, this.canvas.height / 2 + 30);
        
        this.ctx.restore();
    }
}