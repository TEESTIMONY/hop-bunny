# Hopping Bunny - Platformer Game

A Doodle Jump-inspired vertical platformer game made with vanilla JavaScript, HTML5, and CSS.

## How to Play

1. Open `index.html` in a modern web browser.
2. Control the bunny with left and right arrow keys (or A/D keys).
3. Jump on platforms to climb higher.
4. Collect power-ups to gain special abilities.
5. Avoid or jump on enemies to defeat them.
6. Don't fall off the bottom of the screen!

## Controls

- **Desktop:** 
  - Left/Right Arrow Keys or A/D Keys: Move left/right
  - Fullscreen button: Toggle fullscreen mode

- **Mobile:** 
  - Touch left/right side of the screen to move
  - Device tilt: Control movement
  - Fullscreen button: Toggle fullscreen mode

## Features

- **Procedurally generated** platforms and obstacles
- **Multiple platform types**:
  - Normal: Standard jumping platforms
  - Bouncy: Higher jumps
  - Breakable: Breaks after jumping on it
  - Moving: Moves horizontally
  - Disappearing: Disappears shortly after landing on it
- **Power-ups**:
  - Jetpack: Fly upward for a few seconds
  - Spring: Higher jumps for a limited time
  - Shield: Protection from one enemy or fall
- **Enemies** that can be defeated by jumping on top of them
- **Score system** based on height reached
- **Responsive design** for both desktop and mobile devices
- **Sound effects** for gameplay events (jump, power-up, etc.)

## Technical Details

This game is built using:
- Vanilla JavaScript (no frameworks)
- HTML5 Canvas
- CSS for styling

The code is structured in a modular way with separate classes for:
- `Player`: Player character logic
- `Platform`: Different platform types
- `Enemy`: Enemy behaviors
- `PowerUp`: Power-up effects
- `Game`: Main game loop and logic

## Credits

Created as a coding exercise inspired by the popular game Doodle Jump.

## License

Feel free to use and modify this code for your personal projects. 