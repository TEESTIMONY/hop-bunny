/**
 * Leaderboard JavaScript for Hop Bunny
 * Handles leaderboard data loading, display, and interaction
 */

// API Configuration
const API_BASE_URL = 'https://hop-bunny-backend-v2.vercel.app/api';
const API_ENDPOINTS = {
    users: '/users'
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the leaderboard
    initLeaderboard();
    
    // Add event listeners
    document.getElementById('refreshButton').addEventListener('click', refreshLeaderboard);
    
    // Add button feedback on mobile
    const buttons = document.querySelectorAll('.game-button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.classList.add('active');
        });
        button.addEventListener('touchend', function() {
            this.classList.remove('active');
        });
    });
});

/**
 * Initialize the leaderboard
 */
function initLeaderboard() {
    // Set up animations for particles
    setupParticleAnimations();
    
    // Load and display user info at the top bar
    loadUserInfo();
    
    // Load leaderboard data
    loadLeaderboardData();
    
    // Load player's own stats
    loadPlayerStats();
}

/**
 * Set up animations for particles to match the blue bubble style
 */
function setupParticleAnimations() {
    const particles = document.querySelectorAll('.particle');
    
    particles.forEach((particle, index) => {
        // Random size between 8px and 30px
        const size = 8 + Math.random() * 22;
        
        // Random starting position
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        
        // Random animation duration between 20-40s
        const duration = 20 + Math.random() * 20;
        
        // Random delay
        const delay = Math.random() * 5;
        
        // Random opacity
        const opacity = 0.1 + Math.random() * 0.15;
        
        // Apply styles
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${startX}%`;
        particle.style.top = `${startY}%`;
        particle.style.opacity = opacity;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        // Add custom animation path
        if (index % 3 === 0) {
            // Floating up animation
            particle.style.animation = `floatUp ${duration}s ${delay}s infinite linear`;
        } else if (index % 3 === 1) {
            // Diagonal animation
            particle.style.animation = `floatDiagonal ${duration}s ${delay}s infinite linear`;
        } else {
            // Circular animation
            particle.style.animation = `floatCircular ${duration}s ${delay}s infinite linear`;
        }
    });
    
    // Add animation keyframes to the document
    addAnimationKeyframes();
}

/**
 * Add custom animation keyframes to the document
 */
function addAnimationKeyframes() {
    // Create a style element
    const style = document.createElement('style');
    
    // Define keyframes for different bubble movements
    const keyframes = `
        @keyframes floatUp {
            0% {
                transform: translateY(100%) translateX(0) scale(1);
                opacity: 0.1;
            }
            25% {
                transform: translateY(75%) translateX(15px) scale(1.05);
                opacity: 0.2;
            }
            50% {
                transform: translateY(50%) translateX(-15px) scale(1.1);
                opacity: 0.15;
            }
            75% {
                transform: translateY(25%) translateX(15px) scale(1.05);
                opacity: 0.2;
            }
            100% {
                transform: translateY(-20%) translateX(0) scale(1);
                opacity: 0;
            }
        }
        
        @keyframes floatDiagonal {
            0% {
                transform: translate(0, 100%) scale(1);
                opacity: 0.1;
            }
            25% {
                transform: translate(20%, 75%) scale(1.1);
                opacity: 0.15;
            }
            50% {
                transform: translate(40%, 50%) scale(1.2);
                opacity: 0.2;
            }
            75% {
                transform: translate(60%, 25%) scale(1.1);
                opacity: 0.15;
            }
            100% {
                transform: translate(80%, -20%) scale(1);
                opacity: 0;
            }
        }
        
        @keyframes floatCircular {
            0% {
                transform: translate(0, 100%) scale(1) rotate(0deg);
                opacity: 0.1;
            }
            25% {
                transform: translate(-30px, 75%) scale(1.1) rotate(90deg);
                opacity: 0.2;
            }
            50% {
                transform: translate(0, 50%) scale(1.2) rotate(180deg);
                opacity: 0.15;
            }
            75% {
                transform: translate(30px, 25%) scale(1.1) rotate(270deg);
                opacity: 0.2;
            }
            100% {
                transform: translate(0, -20%) scale(1) rotate(360deg);
                opacity: 0;
            }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .refreshed {
            animation: pulse 0.5s ease-in-out;
            text-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
        }
        
        .user-info-bar.refreshed {
            background: rgba(59, 130, 246, 0.3);
        }
        
        .new-score-animation {
            animation: pulse 0.5s ease-in-out;
            color: #fbbf24;
            text-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
        }
    `;
    
    // Add the keyframes to the style element
    style.textContent = keyframes;
    
    // Append the style element to the head
    document.head.appendChild(style);
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Fetch leaderboard data from the API
 */
async function loadLeaderboardData() {
    try {
        // Show loading state
        const leaderboardTable = document.querySelector('.leaderboard-table');
        if (leaderboardTable) {
            // Clear the table first
            leaderboardTable.innerHTML = '';
            
            // Create header row
            const headerRow = document.createElement('div');
            headerRow.className = 'leaderboard-row header';
            headerRow.innerHTML = `
                <div class="rank"><i class="fas fa-trophy"></i> RANK</div>
                <div class="player"><i class="fas fa-user"></i> PLAYER</div>
                <div class="score"><i class="fas fa-star"></i> SCORE</div>
            `;
            leaderboardTable.appendChild(headerRow);
            
            // Create scrollable container
            const rowsContainer = document.createElement('div');
            rowsContainer.className = 'leaderboard-rows-container';
            leaderboardTable.appendChild(rowsContainer);
            
            // Add loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'leaderboard-loading';
            loadingIndicator.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>Loading leaderboard data...</p>
            `;
            rowsContainer.appendChild(loadingIndicator);
        }
        
        // Fetch data from API
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.users}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        const users = data.users || [];
        
        // Sort users by highScore in descending order
        const sortedUsers = users.sort((a, b) => b.highScore - a.highScore);
        
        // Get top 10 users
        const topUsers = sortedUsers.slice(0, 10);
        
        // Display users in leaderboard
        displayLeaderboardData(topUsers);
        
        console.log('Leaderboard data loaded successfully');
        
        // Store all users for reference (to find current user's rank)
        window.allUsers = sortedUsers;
        
        return sortedUsers;
    } catch (error) {
        console.error('Error loading leaderboard data:', error);
        
        // Load sample data if API fails
        loadSampleUserData();
        return [];
    }
}

/**
 * Load sample user data (for demo purposes)
 */
function loadSampleUserData() {
    console.log('Loading sample user data');
    
    // Create sample data for demonstration
    const sampleUsers = [
        {
            userId: "PCwtU7YgdQbw13r24rNHj0ix5Xx1",
            username: "Delo",
            email: "testimonyalade191@gmail.com",
            highScore: 297,
            gamesPlayed: 8,
            createdAt: "2025-04-10T08:54:55.039Z"
        },
        {
            userId: "jA8IwqYgdQbw13r24rNHj0ix5Xx2",
            username: "PepeHop",
            email: "pepe@example.com",
            highScore: 512,
            gamesPlayed: 15,
            createdAt: "2025-04-11T10:25:12.039Z"
        },
        {
            userId: "K9PrT7YgdQbw13r24rNHj0ix5Xx3",
            username: "BunnyMaster",
            email: "bunny@example.com",
            highScore: 756,
            gamesPlayed: 23,
            createdAt: "2025-04-09T14:30:45.039Z"
        },
        {
            userId: "M5QtW2YgdQbw13r24rNHj0ix5Xx4",
            username: "HopKing",
            email: "king@example.com",
            highScore: 421,
            gamesPlayed: 12,
            createdAt: "2025-04-12T09:15:22.039Z"
        },
        {
            userId: "N7RsX4YgdQbw13r24rNHj0ix5Xx5",
            username: "JumpQueen",
            email: "queen@example.com",
            highScore: 689,
            gamesPlayed: 19,
            createdAt: "2025-04-08T11:45:33.039Z"
        }
    ];
    
    // Sort by high score descending
    const sortedUsers = sampleUsers.sort((a, b) => b.highScore - a.highScore);
    
    // Display users in leaderboard
    displayLeaderboardData(sortedUsers);
    
    // Store for reference
    window.allUsers = sortedUsers;
}

/**
 * Display leaderboard data in the table
 */
function displayLeaderboardData(users) {
    const leaderboardTable = document.querySelector('.leaderboard-table');
    
    // Clear the table first
    leaderboardTable.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('div');
    headerRow.className = 'leaderboard-row header';
    headerRow.innerHTML = `
        <div class="rank"><i class="fas fa-trophy"></i> RANK</div>
        <div class="player"><i class="fas fa-user"></i> PLAYER</div>
        <div class="score"><i class="fas fa-star"></i> SCORE</div>
    `;
    leaderboardTable.appendChild(headerRow);
    
    // Create scrollable container for the data rows
    const rowsContainer = document.createElement('div');
    rowsContainer.className = 'leaderboard-rows-container';
    leaderboardTable.appendChild(rowsContainer);
    
    // Add user rows
    users.forEach((user, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        
        // Add special class for top 3 players
        if (rank === 1) {
            row.className = 'leaderboard-row top-player gold';
        } else if (rank === 2) {
            row.className = 'leaderboard-row top-player silver';
        } else if (rank === 3) {
            row.className = 'leaderboard-row top-player bronze';
        } else {
            row.className = 'leaderboard-row';
        }
        
        // Enhanced rank icons for top 3
        let rankDisplay = '';
        if (rank === 1) {
            rankDisplay = `<i class="fas fa-crown gold-icon"></i> ${rank}`;
        } else if (rank === 2) {
            rankDisplay = `<i class="fas fa-medal silver-icon"></i> ${rank}`;
        } else if (rank === 3) {
            rankDisplay = `<i class="fas fa-award bronze-icon"></i> ${rank}`;
        } else {
            rankDisplay = `<i class="fas fa-hashtag"></i> ${rank}`;
        }
        
        row.innerHTML = `
            <div class="rank">${rankDisplay}</div>
            <div class="player">${user.username || 'Anonymous'}</div>
            <div class="score">${formatNumber(user.highScore)}</div>
        `;
        
        rowsContainer.appendChild(row);
    });
    
    // Animate rows
    animateLeaderboardRows();
}

/**
 * Display error message in the table
 */
function displayErrorMessage(message) {
    const leaderboardTable = document.querySelector('.leaderboard-table');
    
    // Clear the table first
    leaderboardTable.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('div');
    headerRow.className = 'leaderboard-row header';
    headerRow.innerHTML = `
        <div class="rank"><i class="fas fa-trophy"></i> RANK</div>
        <div class="player"><i class="fas fa-user"></i> PLAYER</div>
        <div class="score"><i class="fas fa-star"></i> SCORE</div>
    `;
    leaderboardTable.appendChild(headerRow);
    
    // Create scrollable container
    const rowsContainer = document.createElement('div');
    rowsContainer.className = 'leaderboard-rows-container';
    leaderboardTable.appendChild(rowsContainer);
    
    // Create error message row
    const errorRow = document.createElement('div');
    errorRow.className = 'leaderboard-row error-row';
    errorRow.innerHTML = `
        <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #ff6b6b;">
            <i class="fas fa-exclamation-triangle"></i> ${message}
        </div>
    `;
    
    rowsContainer.appendChild(errorRow);
}

/**
 * Animate the leaderboard rows on load
 */
function animateLeaderboardRows() {
    const rows = document.querySelectorAll('.leaderboard-rows-container .leaderboard-row');
    
    rows.forEach((row, index) => {
        // Add initial hidden state
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';
        
        // Animate in with delay based on index
        setTimeout(() => {
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateX(0)';
        }, 100 + (index * 50));
    });
}

/**
 * Load and display user information on the top bar
 */
function loadUserInfo() {
    // Get user info from localStorage or sessionStorage (same approach as auth-checker.js)
    const username = localStorage.getItem('username') || sessionStorage.getItem('username');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    const highScore = localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || 0;
    
    // Update the UI elements
    const currentUsernameElement = document.getElementById('currentUsername');
    const currentUserScoreElement = document.getElementById('currentUserScore');
    
    if (username) {
        // Use the actual username from auth
        currentUsernameElement.textContent = username;
        currentUserScoreElement.textContent = formatNumber(highScore);
    } else {
        // If no username found, use a placeholder (this should rarely happen since auth is required)
        currentUsernameElement.textContent = "Guest Player";
        currentUserScoreElement.textContent = "0";
        
        // Create a random guest username for demo purposes
        const guestNames = ["Hopper", "JumpMaster", "BunnyFan", "SkipJoy", "LeapFrog"];
        const randomName = guestNames[Math.floor(Math.random() * guestNames.length)];
        currentUsernameElement.textContent = `Guest_${randomName}`;
        
        // Log authentication status
        console.log('No user authenticated, using guest mode');
    }
}

/**
 * Load the player's stats from localStorage or the API
 */
async function loadPlayerStats() {
    try {
        const currentUserScoreElement = document.getElementById('currentUserScore');
        const currentUsernameElement = document.getElementById('currentUsername');
        
        // Get current user ID from localStorage or sessionStorage
        const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        
        if (!currentUserId) {
            // No user ID found, nothing to do since we removed the .your-rank section
            console.log('No authenticated user found.');
            return;
        }
        
        // Make sure we have all users data
        let allUsers = window.allUsers;
        if (!allUsers) {
            allUsers = await loadLeaderboardData();
        }
        
        // Find current user in the list
        const currentUser = allUsers.find(user => user.userId === currentUserId);
        
        if (!currentUser) {
            console.log('Current user not found in leaderboard data');
            return;
        }
        
        // Check if score has changed
        const oldHighScore = parseInt(localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || '0');
        const newHighScore = currentUser.highScore;
        
        // Update the user info bar
        if (currentUsernameElement) currentUsernameElement.textContent = currentUser.username || 'Guest Player';
        
        if (currentUserScoreElement) {
            currentUserScoreElement.textContent = formatNumber(newHighScore);
            
            // Add animation if score increased
            if (newHighScore > oldHighScore) {
                currentUserScoreElement.classList.add('new-score-animation');
                
                // Remove the animation class after it completes
                setTimeout(() => {
                    currentUserScoreElement.classList.remove('new-score-animation');
                }, 1000);
            }
        }
        
        // Store user info in localStorage and sessionStorage based on where the original token was stored
        if (localStorage.getItem('token')) {
            localStorage.setItem('username', currentUser.username);
            localStorage.setItem('highScore', currentUser.highScore);
        } else if (sessionStorage.getItem('token')) {
            sessionStorage.setItem('username', currentUser.username);
            sessionStorage.setItem('highScore', currentUser.highScore);
        }
    } catch (error) {
        console.error('Error loading player stats:', error);
    }
}

/**
 * Show a message to the user (success or error)
 */
function showMessage(message, type = 'info') {
    // Check if a message element already exists
    let messageElement = document.querySelector('.message-popup');
    
    // If not, create one
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'message-popup';
        document.body.appendChild(messageElement);
    }
    
    // Set message content and style based on type
    messageElement.textContent = message;
    messageElement.className = `message-popup ${type}`;
    
    // Display the message
    messageElement.style.display = 'block';
    messageElement.style.opacity = '1';
    
    // Add styles if not already in document
    if (!document.getElementById('message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            .message-popup {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: opacity 0.3s ease;
                text-align: center;
                max-width: 80%;
                word-wrap: break-word;
            }
            
            .message-popup.success {
                background-color: #2ecc71;
            }
            
            .message-popup.error {
                background-color: #e74c3c;
            }
            
            .message-popup.info {
                background-color: #3498db;
            }
            
            @media (max-width: 400px) {
                .message-popup {
                    padding: 10px 16px;
                    font-size: 14px;
                    max-width: 85%;
                }
            }
            
            @media (max-width: 320px) {
                .message-popup {
                    padding: 8px 12px;
                    font-size: 13px;
                    top: 15px;
                    max-width: 90%;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 300);
    }, 3000);
}

/**
 * Refresh the leaderboard data
 */
function refreshLeaderboard() {
    // Show loading spinner
    const refreshIcon = document.getElementById('refresh-icon');
    if (refreshIcon) {
        refreshIcon.classList.add('fa-spin');
    }
    
    // Call loadLeaderboardData to refresh the data
    loadLeaderboardData()
        .then(users => {
            // Remove loading spinner
            if (refreshIcon) {
                refreshIcon.classList.remove('fa-spin');
            }
            
            // Apply refreshed animation to user info bar
            const userInfoBar = document.querySelector('.user-info-bar');
            if (userInfoBar) {
                userInfoBar.classList.add('refreshed');
                
                // Remove the class after animation completes
                setTimeout(() => {
                    userInfoBar.classList.remove('refreshed');
                }, 1000);
            }
            
            if (users && users.length > 0) {
                showMessage('Leaderboard refreshed successfully!', 'success');
            } else {
                showMessage('Leaderboard refreshed with sample data.', 'info');
            }
            
            // Also refresh the player stats
            loadPlayerStats();
        })
        .catch(error => {
            // Remove loading spinner on error
            if (refreshIcon) {
                refreshIcon.classList.remove('fa-spin');
            }
            
            console.error('Error refreshing leaderboard:', error);
            showMessage('Error refreshing leaderboard. Using sample data.', 'error');
            
            // Load sample data as fallback
            loadSampleUserData();
        });
}

/**
 * Update a player's ranking animation
 * This would be called if player positions change after a refresh
 */
function updateRankingWithAnimation(playerId, oldRank, newRank) {
    // In a real implementation, this would animate a player row
    // moving to its new position in the leaderboard
    
    // For example:
    // 1. Highlight the row
    // 2. Animate it moving to the new position
    // 3. Update the rank number
    
    console.log(`Player ${playerId} moved from rank ${oldRank} to ${newRank}`);
} 