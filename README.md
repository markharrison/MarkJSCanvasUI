# MarkJSCanvasUI

[![npm version](https://img.shields.io/npm/v/@markharrison%2Fmarkjscanvasui)](https://www.npmjs.com/package/@markharrison/markjscanvasui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight JavaScript library for creating interactive UI controls within HTML Canvas elements, specifically designed for simple web games and canvas-based applications.

## Features

-   **Complete UI Controls** - Menus (including buttons), toggles, text inputs, radio buttons, carousels, sliders, and panels
-   **Modal Dialogs & Toast Notifications** - User-friendly pop-ups and temporary messages
-   **Comprehensive Theme System** - Consistent styling across all controls with easy customization
-   **Multi-Input Support** - Keyboard, mouse, gamepad, and touch navigation
-   **External Input Management** - Uses [@markharrison/markjsinput](https://www.npmjs.com/package/@markharrison/markjsinput) for flexible input handling
-   **Canvas Scaling Support** - Automatically handles responsive canvas sizing
-   **Simple API** - Minimal setup with maximum flexibility

## Installation

```bash
npm install @markharrison/markjscanvasui --save
```

## Requirements

MarkJSCanvasUI requires an external input handler to manage user interactions. The recommended input handler is [@markharrison/markjsinput](https://www.npmjs.com/package/@markharrison/markjsinput).

## Quick Start

```javascript
import { MarkJSCanvasUI, Menu } from './markjscanvasui.js';
import { MarkJSInput } from '@markharrison/markjsinput';

const canvas = document.getElementById('gameCanvas');
const input = new MarkJSInput(canvas);
const ui = new MarkJSCanvasUI(canvas, { input });

// Add a button (using Menu with single item)
const button = new Menu(100, 100, [{ label: 'Click Me!', callback: () => ui.showToast('Hello World!', 'success') }], { width: 200, height: 50 });
ui.addControl(button);

// Game loop
let lastTime = 0;
function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    ui.update(deltaTime);
    ui.render();

    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```

## Available Controls

-   **Menu** - Horizontal or vertical navigation menus (can be used for buttons with single items)
-   **Toggle** - On/off switches with labels
-   **TextInput** - Text input fields with placeholder support
-   **Radio** - Mutually exclusive option groups
-   **Carousel** - Cycleable option selectors with arrows
-   **Slider** - Numeric value selection with range controls
-   **Panel** - Non-interactive background panels for grouping

## Theme System

```javascript
// Set consistent styling across all controls
ui.setTheme({
    controlColor: '#4CAF50',
    backgroundColor: '#333333',
    textColor: '#ffffff',
    borderRadius: 10,
    fontFamily: 'Arial',
    fontSize: 16,
});
```

## Documentation 

📖 **[Complete Documentation](markjscanvasui.md)** - Detailed API reference, examples, and usage guide

## Test Application

🎮 **[Live Showcase](index.html)** - Interactive demo showing all controls and themes in action

![MarkJSCanvasUI Showcase](https://github.com/user-attachments/assets/cc1178cc-e777-495c-adae-7dbc364743c3)

![MarkJSCanvasUI Showcase](https://github.com/user-attachments/assets/daed10cd-4f08-4e22-9acc-70b218efafc4)

![MarkJSCanvasUI Showcase](https://github.com/user-attachments/assets/d5a66134-e7d2-4b5a-b1fa-7e11ae25c6a4)

## License

MIT License - See [LICENSE](LICENSE) file for details.
