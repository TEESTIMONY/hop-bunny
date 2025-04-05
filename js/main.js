/**
 * Main entry point for the game
 */
// Create a global game reference that can be used by other components
let game;

// Fix for mobile viewport height issues
function fixViewportHeight() {
    // First we get the viewport height and multiply it by 1% to get a value for a vh unit
    let vh = window.innerHeight * 0.01;
    // Then we set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Make sure the game initializes properly
function initGame() {
    try {
        // Fix viewport height for mobile
        fixViewportHeight();
        
        // Add resize event listener
        window.addEventListener('resize', () => {
            fixViewportHeight();
            if (game) {
                // Add a small delay to ensure the browser UI elements have adjusted
                setTimeout(() => game.resizeCanvas(), 100);
            }
        });
        
        // Add orientation change listener for mobile
        window.addEventListener('orientationchange', () => {
            // Wait for orientation change to complete
            setTimeout(() => {
                fixViewportHeight();
                if (game) game.resizeCanvas();
            }, 200);
        });
        
        // Get canvas element
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas element not found! Make sure the HTML has loaded properly.');
            return;
        }
        
        // Create game instance
        game = new Game(canvas);
        
        // Make game globally accessible for debugging and components that need it
        window.game = game;
        
        // Add debug overlay
        addDebugOverlay();
        
        // Don't start the game automatically, wait for start button click
        setupStartScreen();
        
        // Add touch controls for mobile devices
        addTouchControls(game);
        
        console.log('Bunny Runner game initialized successfully!');
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('There was an error starting the game. Please check the console for details.');
    }
}

// Setup the start screen and button functionality
function setupStartScreen() {
    const startButton = document.getElementById('startButton');
    const startScreen = document.getElementById('startScreen');
    const restartButton = document.getElementById('restartButton');
    const gameOverScreen = document.getElementById('gameOver');
    
    // Safe sound play function to avoid errors
    function playSoundSafely(sound) {
        if (sound) {
            try {
                // Create a clone of the audio to avoid issues with playing the same sound multiple times
                const soundClone = sound.cloneNode();
                soundClone.volume = 0.5;
                soundClone.play().catch(err => {
                    console.warn('Could not play sound:', err);
                });
            } catch (err) {
                console.warn('Error playing sound:', err);
            }
        }
    }
    
    // Add both click and touchend events to ensure mobile compatibility
    function startGameHandler(e) {
        e.preventDefault(); // Prevent any default behavior
        
        // Remove active-touch class if it exists
        startButton.classList.remove('active-touch');
        
        // Hide the start screen
        startScreen.classList.add('hidden');
        
        // Start the game
        game.start();
        
        // Play a sound effect if available
        if (game.sounds && game.sounds.jump) {
            playSoundSafely(game.sounds.jump);
        }
    }
    
    // Add multiple event listeners to ensure button works on all devices
    startButton.addEventListener('click', startGameHandler);
    startButton.addEventListener('touchend', startGameHandler);
    
    // Fix for iOS Safari where touch events might be blocked
    startButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default to allow touchend to fire reliably
        startButton.classList.add('active-touch'); // Visual feedback
    });
    
    // Handle touch cancel
    startButton.addEventListener('touchcancel', () => {
        startButton.classList.remove('active-touch');
    });
    
    // Make sure restart button works with similar approach
    function restartGameHandler(e) {
        console.log('Restart button clicked');
        e.preventDefault();
        
        // Remove active-touch class if it exists
        restartButton.classList.remove('active-touch');
        
        // Hide game over screen
        gameOverScreen.classList.add('hidden');
        
        // Restart the game
        if (game && typeof game.restart === 'function') {
            game.restart();
            
            // Play a sound effect if available
            if (game.sounds && game.sounds.jump) {
                playSoundSafely(game.sounds.jump);
            }
        } else {
            console.error('Game restart function not available');
            // Fallback: reload the page
            window.location.reload();
        }
    }
    
    // Remove any existing event listeners to avoid duplicate handlers
    restartButton.removeEventListener('click', restartGameHandler);
    restartButton.removeEventListener('touchend', restartGameHandler);
    
    // Add event listeners
    restartButton.addEventListener('click', restartGameHandler);
    restartButton.addEventListener('touchend', restartGameHandler);
    
    restartButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        restartButton.classList.add('active-touch'); // Visual feedback
        console.log('Restart button touch start');
    });
    
    // Handle touch cancel for restart button
    restartButton.addEventListener('touchcancel', () => {
        restartButton.classList.remove('active-touch');
    });
    
    // Set up high score display for game over screen
    setupHighScoreDisplay();
    
    // Log initialization for debugging
    console.log('Start and restart buttons initialized with mobile support');
}

// Set up high score display
function setupHighScoreDisplay() {
    const highScoreElement = document.getElementById('highScore');
    const savedHighScore = localStorage.getItem('highScore') || 0;
    
    // Update the high score element
    highScoreElement.textContent = savedHighScore;
    
    // No need to add another event listener here since we already handle 
    // high score updates in the game's gameOver method
    console.log('High score display set up with value:', savedHighScore);
}

// Add a debug overlay to help troubleshoot
function addDebugOverlay() {
    // Create debug div
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debugOverlay';
    document.querySelector('.game-container').appendChild(debugDiv);
    
    // Add debug styles
    const debugStyles = document.createElement('style');
    debugStyles.textContent = `
        #debugOverlay {
            position: absolute;
            top: 50px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 5px;
            border-radius: 3px;
            width: 180px;
            z-index: 100;
            pointer-events: none;
            white-space: pre;
            display: none;
        }
        
        .debug-enabled #debugOverlay {
            display: block;
        }
    `;
    document.head.appendChild(debugStyles);
    
    // Add key listener to toggle debug
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F2' || e.key === 'd') {
            document.body.classList.toggle('debug-enabled');
            updateDebugInfo();
        }
    });
    
    // Update debug info periodically
    function updateDebugInfo() {
        if (!document.body.classList.contains('debug-enabled')) return;
        
        const info = [];
        if (window.game) {
            const g = window.game;
            info.push(`FPS: ${Math.round(1000 / (performance.now() - g.lastTime))}`);
            info.push(`Player: ${Math.round(g.player.x)},${Math.round(g.player.y)}`);
            info.push(`VelY: ${g.player.velocityY.toFixed(1)}`);
            info.push(`Falling: ${g.player.isFalling}`);
            info.push(`Camera: ${Math.round(g.camera.y)}`);
            info.push(`Score: ${g.score}`);
            info.push(`Platforms: ${g.platformManager.platforms.length}`);
            info.push(`Press D to hide debug`);
        } else {
            info.push('Game not initialized');
        }
        
        debugDiv.textContent = info.join('\n');
        requestAnimationFrame(updateDebugInfo);
    }
    
    // Initial update
    updateDebugInfo();
}

// Wait for DOM to be fully loaded before initializing the game
document.addEventListener('DOMContentLoaded', initGame);

// Fallback if DOMContentLoaded doesn't trigger properly
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initGame, 1000); // Give it a second to make sure everything is loaded
}

/**
 * Add touch controls for mobile devices
 * @param {Game} game - Game instance
 */
function addTouchControls(game) {
    const gameContainer = document.querySelector('.game-container');
    
    // Touch event handlers
    gameContainer.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling
        handleTouch(e, game);
    });
    
    gameContainer.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling
        handleTouch(e, game);
    });
    
    // Helper function to handle touch input
    function handleTouch(e, game) {
        const touch = e.touches[0];
        const containerRect = gameContainer.getBoundingClientRect();
        const touchX = touch.clientX - containerRect.left;
        
        // Determine left or right based on touch position
        const centerX = containerRect.width / 2;
        
        if (touchX < centerX) {
            // Left side touched
            game.player.direction = -1;
        } else {
            // Right side touched
            game.player.direction = 1;
        }
    }
    
    // Stop movement when touch ends
    gameContainer.addEventListener('touchend', () => {
        game.player.direction = 0;
    });
    
    gameContainer.addEventListener('touchcancel', () => {
        game.player.direction = 0;
    });
} 