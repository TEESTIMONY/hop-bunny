/**
 * Platform class for the game
 */
class Platform {
    /**
     * Create a new platform
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Platform width
     * @param {number} height - Platform height
     * @param {string} type - Platform type ('normal', 'bouncy', 'breakable', 'moving', 'disappearing')
     */
    constructor(x, y, width, height, type = 'normal') {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // Type and state
        this.type = type;
        this.active = true;
        
        // Properties for special platform types
        this.opacity = 1;
        this.breakProgress = 0;
        this.direction = Math.random() > 0.5 ? 1 : -1; // For moving platforms
        this.velocityX = 0;
        this.maxVelocityX = 2; // For moving platforms
        this.disappearTimer = 0;
        
        // Animation time for visual effects
        this.animationTime = 0;
        
        // Colors for different platform types
        this.colors = {
            normal: {
                light: '#5D7FBA', // Light blue (Bunny theme)
                dark: '#39547B'   // Dark blue
            },
            bouncy: {
                light: '#66DD66', // Bright green
                dark: '#2A8C2A'   // Dark green
            },
            breakable: {
                light: '#C9873C', // Light wood color
                dark: '#8B4513'   // Dark wood color
            },
            moving: {
                light: '#71A744', // Pepe green light
                dark: '#4B5320'   // Pepe green dark
            },
            disappearing: {
                light: '#FF6B6B', // Light red
                dark: '#8B3A3A'   // Dark red
            }
        };
    }
    
    /**
     * Update platform state
     * @param {number} deltaTime - Time since last update
     * @param {number} canvasWidth - Width of the game canvas
     */
    update(deltaTime, canvasWidth) {
        // Update animation time
        this.animationTime += deltaTime * 0.01;
        
        // Handle special platform behaviors
        switch (this.type) {
            case 'moving':
                // Move platform left and right
                this.velocityX = this.direction * this.maxVelocityX;
                this.x += this.velocityX;
                
                // Reverse direction at screen edges
                if (this.x <= 0 || this.x + this.width >= canvasWidth) {
                    this.direction *= -1;
                }
                break;
                
            case 'breakable':
                // Update break animation if broken
                if (this.breakProgress > 0) {
                    this.breakProgress += deltaTime * 0.05;
                    this.opacity = 1 - this.breakProgress;
                    
                    if (this.breakProgress >= 1) {
                        this.active = false;
                    }
                }
                break;
                
            case 'disappearing':
                // Update disappearing animation
                if (this.disappearTimer > 0) {
                    this.disappearTimer += deltaTime;
                    this.opacity = 1 - (this.disappearTimer / 60);
                    
                    if (this.disappearTimer >= 60) {
                        this.active = false;
                    }
                }
                break;
        }
    }
    
    /**
     * Break a breakable platform
     */
    break() {
        if (this.type === 'breakable') {
            this.breakProgress = 0.01; // Start breaking
        }
    }
    
    /**
     * Start disappearing animation for disappearing platforms
     */
    startDisappearing() {
        if (this.type === 'disappearing') {
            this.disappearTimer = 0.01; // Start disappearing
        }
    }
    
    /**
     * Draw the platform
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraY) {
        const screenY = this.y - cameraY;
        
        // Skip rendering platforms that are off-screen
        if (screenY > ctx.canvas.height || screenY + this.height < 0) {
            return;
        }
        
        ctx.save();
        
        // Apply opacity for disappearing/breaking platforms
        if (this.opacity < 1) {
            ctx.globalAlpha = this.opacity;
        }
        
        // Get the current platform's colors
        const colors = this.colors[this.type];
        
        // Create a gradient fill for the platform
        const gradient = ctx.createLinearGradient(this.x, screenY, this.x, screenY + this.height);
        gradient.addColorStop(0, colors.light);
        gradient.addColorStop(1, colors.dark);
        
        // Draw platform body with rounded corners
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = 8; // Corner radius
        
        // Draw rounded rectangle
        ctx.moveTo(this.x + radius, screenY);
        ctx.lineTo(this.x + this.width - radius, screenY);
        ctx.quadraticCurveTo(this.x + this.width, screenY, this.x + this.width, screenY + radius);
        ctx.lineTo(this.x + this.width, screenY + this.height - radius);
        ctx.quadraticCurveTo(this.x + this.width, screenY + this.height, this.x + this.width - radius, screenY + this.height);
        ctx.lineTo(this.x + radius, screenY + this.height);
        ctx.quadraticCurveTo(this.x, screenY + this.height, this.x, screenY + this.height - radius);
        ctx.lineTo(this.x, screenY + radius);
        ctx.quadraticCurveTo(this.x, screenY, this.x + radius, screenY);
        ctx.fill();
        
        // Add platform details based on type
        switch (this.type) {
            case 'normal':
                // Draw paw prints (Bunny themed)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                const pawCount = Math.floor(this.width / 40);
                for (let i = 0; i < pawCount; i++) {
                    const pawX = this.x + 20 + i * (this.width - 40) / Math.max(1, pawCount - 1);
                    const pawY = screenY + this.height / 2;
                    
                    // Main paw pad
                    ctx.beginPath();
                    ctx.arc(pawX, pawY, 5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Toe pads
                    for (let j = 0; j < 3; j++) {
                        const angle = -Math.PI / 4 + (Math.PI / 2) * j / 2;
                        ctx.beginPath();
                        ctx.arc(
                            pawX + Math.cos(angle) * 7,
                            pawY + Math.sin(angle) * 7,
                            3,
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                }
                break;
                
            case 'bouncy':
                // Draw springs
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                ctx.lineWidth = 3;
                
                const springCount = Math.floor(this.width / 30);
                for (let i = 0; i < springCount; i++) {
                    const springX = this.x + (i + 1) * this.width / (springCount + 1);
                    const springY = screenY + this.height / 2;
                    
                    // Draw spring coil
                    ctx.beginPath();
                    ctx.moveTo(springX, springY - 8);
                    
                    // Create zigzag pattern for spring
                    for (let j = 0; j < 3; j++) {
                        const yOffset = -8 + j * 5;
                        ctx.lineTo(springX - 5, springY + yOffset);
                        ctx.lineTo(springX + 5, springY + yOffset + 2.5);
                    }
                    
                    ctx.lineTo(springX, springY + 8);
                    ctx.stroke();
                }
                
                // Add pulsing glow effect
                const glowIntensity = (Math.sin(this.animationTime * 5) + 1) * 0.2;
                if (glowIntensity > 0.1) {
                    ctx.fillStyle = `rgba(255, 255, 0, ${glowIntensity})`;
                    ctx.filter = 'blur(5px)';
                    ctx.fillRect(this.x, screenY, this.width, this.height);
                    ctx.filter = 'none';
                }
                break;
                
            case 'breakable':
                // Draw wood grain texture
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 1;
                
                for (let i = 0; i < this.width; i += 10) {
                    ctx.beginPath();
                    ctx.moveTo(this.x + i, screenY);
                    
                    // Wavy line for wood grain
                    for (let y = 0; y < this.height; y += 5) {
                        const xOffset = Math.sin(y * 0.2 + i * 0.1) * 2;
                        ctx.lineTo(this.x + i + xOffset, screenY + y);
                    }
                    
                    ctx.stroke();
                }
                
                // Draw cracks if breaking
                if (this.breakProgress > 0) {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.lineWidth = 2;
                    
                    const centerX = this.x + this.width / 2;
                    const centerY = screenY + this.height / 2;
                    
                    // Create random cracks radiating from center
                    for (let i = 0; i < 5; i++) {
                        const angle = (i / 5) * Math.PI * 2;
                        const length = this.width * 0.4 * this.breakProgress;
                        
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.lineTo(
                            centerX + Math.cos(angle) * length,
                            centerY + Math.sin(angle) * length
                        );
                        ctx.stroke();
                    }
                } else {
                    // Warning symbol
                    ctx.fillStyle = 'rgba(255, 50, 50, 0.6)';
                    ctx.beginPath();
                    ctx.arc(this.x + this.width / 2, screenY + this.height / 2, 8, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('!', this.x + this.width / 2, screenY + this.height / 2 + 1);
                }
                break;
                
            case 'moving':
                // Draw Pepe face
                // Eyes
                const eyeSize = this.height * 0.3;
                const eyePosY = screenY + this.height * 0.4;
                const leftEyeX = this.x + this.width * 0.3;
                const rightEyeX = this.x + this.width * 0.7;
                
                // White of eyes
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(leftEyeX, eyePosY, eyeSize, 0, Math.PI * 2);
                ctx.arc(rightEyeX, eyePosY, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Direction of pupils based on movement
                const pupilOffset = this.direction > 0 ? eyeSize * 0.3 : -eyeSize * 0.3;
                
                // Pupils
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(leftEyeX + pupilOffset, eyePosY, eyeSize * 0.5, 0, Math.PI * 2);
                ctx.arc(rightEyeX + pupilOffset, eyePosY, eyeSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Smile
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                    this.x + this.width / 2,
                    screenY + this.height * 0.7,
                    this.width * 0.15,
                    0,
                    Math.PI
                );
                ctx.stroke();
                
                // Direction indicator - arrow on the side
                const arrowSize = 10;
                ctx.fillStyle = '#FFFFFF';
                
                // Draw arrow pointing in movement direction
                if (this.direction > 0) {
                    // Right arrow
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.width - arrowSize, screenY + this.height / 2);
                    ctx.lineTo(this.x + this.width - arrowSize * 3, screenY + this.height / 2 - arrowSize);
                    ctx.lineTo(this.x + this.width - arrowSize * 3, screenY + this.height / 2 + arrowSize);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Left arrow
                    ctx.beginPath();
                    ctx.moveTo(this.x + arrowSize, screenY + this.height / 2);
                    ctx.lineTo(this.x + arrowSize * 3, screenY + this.height / 2 - arrowSize);
                    ctx.lineTo(this.x + arrowSize * 3, screenY + this.height / 2 + arrowSize);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
                
            case 'disappearing':
                // Draw clock pattern
                const centerX = this.x + this.width / 2;
                const centerY = screenY + this.height / 2;
                const radius = this.height * 0.4;
                
                // Clock face
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Clock hands - based on animation time
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                
                // Hour hand
                const hourAngle = this.animationTime % (Math.PI * 2);
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(
                    centerX + Math.cos(hourAngle) * radius * 0.5,
                    centerY + Math.sin(hourAngle) * radius * 0.5
                );
                ctx.stroke();
                
                // Minute hand - moving faster
                const minuteAngle = (this.animationTime * 12) % (Math.PI * 2);
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(
                    centerX + Math.cos(minuteAngle) * radius * 0.7,
                    centerY + Math.sin(minuteAngle) * radius * 0.7
                );
                ctx.stroke();
                
                // Center dot
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // If disappearing, add particles rising up
                if (this.disappearTimer > 0) {
                    ctx.fillStyle = 'rgba(255, 200, 200, 0.7)';
                    
                    for (let i = 0; i < 10; i++) {
                        const particleX = this.x + Math.random() * this.width;
                        const particleY = screenY + this.height - (this.disappearTimer * 0.5) * Math.random() * this.height;
                        const particleSize = 2 + Math.random() * 3;
                        
                        ctx.beginPath();
                        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
        }
        
        // Add shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(this.x, screenY + this.height - 2);
        ctx.lineTo(this.x + this.width, screenY + this.height - 2);
        ctx.lineTo(this.x + this.width, screenY + this.height);
        ctx.lineTo(this.x, screenY + this.height);
        ctx.fill();
        
        // Add platform shine/highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(this.x, screenY);
        ctx.lineTo(this.x + this.width, screenY);
        ctx.lineTo(this.x + this.width, screenY + 2);
        ctx.lineTo(this.x, screenY + 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Helper method to draw a star
     */
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
}

/**
 * PlatformManager class for handling platform generation and management
 */
class PlatformManager {
    /**
     * Create a new platform manager
     * @param {number} canvasWidth - Width of the game canvas
     * @param {number} canvasHeight - Height of the game canvas
     * @param {number} initialPlatformCount - Number of platforms to generate initially
     */
    constructor(canvasWidth, canvasHeight, initialPlatformCount = 10) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.platforms = [];
        this.minPlatformWidth = 80;  // Increased from 60
        this.maxPlatformWidth = 150; // Increased from 120
        this.platformHeight = 20;
        this.minGapY = 70;           // Increased minimum gap
        this.maxGapY = 110;          // Reduced maximum gap further
        this.specialPlatformChance = 0.3; // Chance of generating a special platform
        this.highestPlatformY = canvasHeight; // Track highest platform for generation
        this.platformDensity = 1.0;  // Adjust this to change overall platform density
        
        // Properties for difficulty scaling
        this.density = 10; // Number of platforms to maintain on screen
        this.minWidth = 60; // Minimum platform width
        this.maxWidth = 120; // Maximum platform width
        
        // Generate initial platforms
        this.generateInitialPlatforms(initialPlatformCount);
    }
    
    /**
     * Generate initial set of platforms
     * @param {number} count - Number of platforms to generate
     */
    generateInitialPlatforms(count) {
        // Always create a starting platform below the player
        const startPlatform = new Platform(
            this.canvasWidth / 2 - 75,
            this.canvasHeight - 100,
            150,
            this.platformHeight,
            'normal'
        );
        this.platforms.push(startPlatform);
        this.highestPlatformY = startPlatform.y;
        
        // Add a few more platforms at the bottom to ensure player doesn't fall
        for (let i = 0; i < 5; i++) {  // Increased from 3 to 5
            const x = Utils.randomBetween(0, this.canvasWidth - 100);
            const y = this.canvasHeight - 200 - (i * 70);
            const platform = new Platform(x, y, 100, this.platformHeight, 'normal');
            this.platforms.push(platform);
            this.highestPlatformY = Math.min(this.highestPlatformY, y);
        }
        
        // Generate the rest of the platforms
        for (let i = 6; i < count + 5; i++) {  // Increased initial count
            this.generatePlatform();
        }
    }
    
    /**
     * Generate a new platform
     * @returns {Platform} The newly generated platform
     */
    generatePlatform() {
        // Calculate next platform Y position
        const gap = Utils.randomBetween(this.minGapY, this.maxGapY);
        const newY = this.highestPlatformY - gap;
        this.highestPlatformY = newY;
        
        // Determine platform width based on difficulty
        const width = Utils.randomBetween(this.minWidth, this.maxWidth);
        
        // Calculate X position (within canvas bounds)
        const x = Utils.randomBetween(0, this.canvasWidth - width);
        
        // Determine platform type
        let type = 'normal';
        
        // Score-based special platform chance (increases with height)
        const score = Math.abs(newY) / 10; // Roughly equivalent to game score
        const specialChance = Math.min(0.6, 0.2 + (score / 1000)); // Up to 60% chance at score 4000
        
        if (Math.random() < specialChance) {
            // Different special platform distributions based on score
            const rand = Math.random();
            
            if (score < 300) {
                // Early game: more bouncy, some moving
                if (rand < 0.6) {
                    type = 'bouncy';
                } else if (rand < 0.9) {
                    type = 'moving';
                } else {
                    type = 'normal';
                }
            } else if (score < 1000) {
                // Mid game: more variety
                if (rand < 0.4) {
                    type = 'bouncy';
                } else if (rand < 0.7) {
                    type = 'moving';
                } else if (rand < 0.9) {
                    type = 'breakable';
                } else {
                    type = 'disappearing';
                }
            } else {
                // Late game: more challenging platforms
                if (rand < 0.25) {
                    type = 'bouncy';
                } else if (rand < 0.5) {
                    type = 'moving';
                } else if (rand < 0.75) {
                    type = 'breakable';
                } else {
                    type = 'disappearing';
                }
            }
            
            // Don't create challenging platforms too close together
            const lastFewTypes = this.platforms.slice(-3).map(p => p.type);
            if (type === 'disappearing' && lastFewTypes.includes('disappearing')) {
                // Don't create two disappearing platforms in a row
                type = 'normal';
            } else if (type === 'breakable' && lastFewTypes.includes('breakable') && 
                       lastFewTypes.includes('disappearing')) {
                // Avoid too many difficult platforms in a sequence
                type = Math.random() < 0.5 ? 'bouncy' : 'normal';
            }
            
            // Create more consistent landing possibilities around score 300-310
            if (score >= 300 && score <= 310) {
                type = Math.random() < 0.7 ? 'normal' : 'bouncy';
            }
        }
        
        // Create the platform
        const platform = new Platform(x, newY, width, this.platformHeight, type);
        
        // Add to list of platforms
        this.platforms.push(platform);
        
        return platform;
    }
    
    /**
     * Update all platforms
     * @param {number} deltaTime - Time since last update
     * @param {number} cameraY - Camera Y position
     */
    update(deltaTime, cameraY) {
        // Update existing platforms
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const platform = this.platforms[i];
            
            // Update platform behavior
            platform.update(deltaTime, this.canvasWidth);
            
            // Remove platforms that are no longer active or are too far below the camera
            if (!platform.active || platform.y > cameraY + this.canvasHeight + 300) {
                this.platforms.splice(i, 1);
            }
        }
        
        // Generate new platforms if needed - ensure we always have platforms ahead
        while (this.highestPlatformY > cameraY - this.canvasHeight * 2) {
            this.generatePlatform();
        }
        
        // Check platform density - if we have too few platforms, add more
        const visiblePlatforms = this.platforms.filter(p => 
            p.y >= cameraY - 100 && p.y <= cameraY + this.canvasHeight + 100
        );
        
        if (visiblePlatforms.length < this.density * this.platformDensity) {
            // Create some extra platforms within the visible range
            for (let i = 0; i < 2; i++) {
                const y = cameraY + Utils.randomBetween(100, this.canvasHeight - 100);
                const width = Utils.randomBetween(this.minWidth, this.maxWidth);
                const x = Utils.randomBetween(0, this.canvasWidth - width);
                
                const fillPlatform = new Platform(x, y, width, this.platformHeight, 'normal');
                this.platforms.push(fillPlatform);
            }
        }
    }
    
    /**
     * Draw all platforms
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraY - Camera Y position
     */
    draw(ctx, cameraY) {
        for (const platform of this.platforms) {
            if (Utils.isVisible(platform, this.canvasHeight, cameraY)) {
                platform.draw(ctx, cameraY);
            }
        }
    }
    
    /**
     * Check for collisions with platforms
     * @param {Player} player - The player object
     * @returns {boolean} True if collision occurred
     */
    checkCollisions(player) {
        let collided = false;
        
        // Only check collisions when player is falling
        if (player.velocityY <= 0) return false;
        
        // Check only platforms that could be in collision range
        const playerBottom = player.y + player.height;
        
        for (const platform of this.platforms) {
            if (!platform.active) continue;
            
            // Quick vertical range check to skip unnecessary collision checks
            if (Math.abs(platform.y - playerBottom) > 20) continue;
            
            // Check precise collision
            const horizontalCollision = 
                player.x < platform.x + platform.width && 
                player.x + player.width > platform.x;
                
            const verticalCollision = 
                playerBottom >= platform.y && 
                player.y < platform.y + platform.height;
                
            if (horizontalCollision && verticalCollision) {
                // Collision detected, trigger player's platform handling
                const result = player.onPlatformCollision(platform);
                if (result) {
                    collided = true;
                    // We've found a collision, no need to check more platforms
                    break;
                }
            }
        }
        
        return collided;
    }
} 