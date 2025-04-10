// Auth checker - Checks if user is authenticated and redirects to auth page if not

document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('startScreen');
    
    // Check if we're in development mode (running locally)
    const isDevelopment = window.location.hostname === "127.0.0.1" || 
                           window.location.hostname === "localhost";
    
    // Check if user is authenticated
    function checkAuthentication() {
        // Check localStorage and sessionStorage for token
        const tokenFromStorage = localStorage.getItem('token');
        const tokenFromSession = sessionStorage.getItem('token');
        
        // Display username if available
        const username = localStorage.getItem('username') || sessionStorage.getItem('username');
        if (username) {
            console.log(`Authenticated as: ${username}`);
            
            // Create username element in the top right corner
            const usernameElement = document.createElement('div');
            usernameElement.classList.add('username-display', 'top-right');
            usernameElement.innerHTML = `<i class="fas fa-user"></i> ${username}`;
            
            // Add to the game container instead of footer
            const gameContainer = document.querySelector('.game-container');
            if (gameContainer) {
                gameContainer.appendChild(usernameElement);
            }
        }
        
        // If no token found in either storage, redirect to auth page
        if (!tokenFromStorage && !tokenFromSession) {
            console.log('No authentication token found, redirecting to auth page');
            window.location.href = 'auth.html';
            return false;
        }
        
        return true;
    }
    
    // In development mode, we can still require authentication
    // Remove or comment out this block to enforce authentication in all environments
    if (isDevelopment && false) { // Set to false to enforce auth even in development
        console.log('Development mode: Bypassing authentication check');
        startScreen.classList.remove('hidden');
        return;
    }
    
    // Check authentication and redirect if needed
    if (!checkAuthentication()) {
        return; // Stop execution if redirecting
    }
    
    // If we get here, the user is authenticated
    console.log('User is authenticated, showing start screen');
    startScreen.classList.remove('hidden');
    
    // Set up logout functionality
    const logoutButton = document.createElement('button');
    logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> LOGOUT';
    logoutButton.classList.add('game-button', 'logout-game-button');
    
    logoutButton.addEventListener('click', () => {
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('highScore');
        
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('highScore');
        
        // Redirect to auth page
        window.location.href = 'auth.html';
    });
    
    // Find the play button and create a buttons container
    const startButton = document.getElementById('startButton');
    if (startButton) {
        // Create a button container that holds both buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('button-container');
        
        // Replace the current play button with the container 
        // and move the play button into it
        if (startButton.parentNode) {
            startButton.parentNode.insertBefore(buttonContainer, startButton);
            buttonContainer.appendChild(startButton);
            buttonContainer.appendChild(logoutButton);
            
            // Add some spacing between the buttons
            startButton.style.marginBottom = '15px';
        }
    }
    
    // Display high score if available
    const highScore = localStorage.getItem('highScore') || sessionStorage.getItem('highScore') || 0;
    const highScoreElement = document.getElementById('highScore');
    if (highScoreElement) {
        highScoreElement.textContent = highScore;
    }
}); 