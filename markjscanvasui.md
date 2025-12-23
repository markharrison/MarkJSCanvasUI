# MarkJSCanvasUI Documentation

MarkJSCanvasUI is a JavaScript library for creating UI controls within an HTML Canvas element, specifically designed for simple web games. **Note:** This library requires an external input handler (recommended: [@markharrison/markjsinput](https://www.npmjs.com/package/@markharrison/markjsinput)) to manage keyboard, mouse, gamepad, and touch interactions.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Input Controls](#input-controls)
4. [Display Features](#display-features)
5. [Modal Dialogs](#modal-dialogs)
6. [Toast Notifications](#toast-notifications)
7. [Input Handling](#input-handling)
8. [Styling and Customization](#styling-and-customization)
9. [API Reference](#api-reference)

## Getting Started

### Installation

#### Library Files

Include the library in your HTML file:

```html
<script type="module">
  import { MarkJSCanvasUI } from './markjscanvasui.js';
</script>
```

#### Input Handler Requirement

**Important:** MarkJSCanvasUI requires an external input handler to manage keyboard, mouse, gamepad, and touch input events. The recommended solution is to use the [@markharrison/markjsinput](https://www.npmjs.com/package/@markharrison/markjsinput) package.

**Install via npm:**

```bash
npm install @markharrison/markjsinput
```

**Or include directly in HTML:**

```html
<script type="module">
  import { MarkJSInput } from '@markharrison/markjsinput';
  import { MarkJSCanvasUI } from './markjscanvasui.js';
</script>
```

### Basic Setup

```html
<canvas id="gameCanvas" width="1280" height="720"></canvas>

<script type="module">
  import { MarkJSCanvasUI } from './markjscanvasui.js';
  import { MarkJSInput } from '@markharrison/markjsinput';

  const canvas = document.getElementById('gameCanvas');

  // Create input handler first
  const input = new MarkJSInput(canvas);

  // Pass input handler to MarkJSCanvasUI
  const ui = new MarkJSCanvasUI(canvas, {
    input: input,
    backgroundColor: '#1a1a1a',
  });

  // External game loop
  let lastTime = 0;
  function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    ui.update(deltaTime);
    ui.render();

    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);
</script>
```

### Making Canvas Responsive

To make your canvas scale with screen width:

```css
.canvas-container {
  width: 100%;
  max-width: 1280px;
  aspect-ratio: 16 / 9;
}

#gameCanvas {
  width: 100%;
  height: 100%;
}
```

The library automatically handles mouse position calculations for scaled canvases.

## Core Concepts

### MarkJSCanvasUI Instance

The main `MarkJSCanvasUI` class manages all UI elements. The library does not include an internal animation loop - you must provide your own game loop for maximum flexibility.

```javascript
const ui = new MarkJSCanvasUI(canvas, options);
```

**Options:**

- `input` (MarkJSInput): **Required.** Input handler instance for keyboard, mouse, gamepad, and touch events
- `backgroundColor` (string): Default background color (e.g., '#1a1a1a')
- `backgroundGradient` (array): Gradient definition (see [Display Features](#display-features))

**Animation Loop:**
Your game loop must call `update(deltaTime)` and `render()` each frame:

```javascript
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

### Adding Controls

Controls are added to the UI instance:

```javascript
import { Menu } from './markjscanvasui.js';
// Create a button using Menu with a single item
const button = new Menu(x, y, [{ label: 'Button Text', callback: () => console.log('Clicked!') }], options);
ui.addControl(button);
```

### Removing Controls

Remove a specific control:

```javascript
ui.removeControl(button);
```

Remove all controls at once (useful for switching between game states or screens):

```javascript
ui.removeAllControls();
```

**Note:** `removeAllControls()` clears everything from the canvas except the background settings (color or gradient). This includes all interactive controls, text displays, images, modals, and toasts.

Remove all controls but keep toasts visible:

```javascript
ui.removeAllControlsExceptToasts();
```

**Note:** `removeAllControlsExceptToasts()` clears everything from the canvas except the background settings and toast notifications. This is useful when you want to switch screens but keep important notifications visible. Toasts will auto-dismiss after their timeout period.

### Focus Management

The library automatically manages focus and keyboard navigation:

- **Tab**: Move to next control
- **Shift+Tab**: Move to previous control
- Focus is visually indicated by a highlighted border

You can also set the starting focus explicitly:

```javascript
// After adding controls
ui.addControl(panel);
ui.addControl(playButton);
ui.addControl(nameInput);

// Force focus to a specific control (or by index)
ui.focusControl(playButton); // or ui.focusControl(1)
```

## Input Controls

### Creating Buttons

While there's no dedicated `Button` class, you can easily create individual buttons using the `Menu` class with a single item:

```javascript
// Simple button
const playButton = new Menu(100, 100, [{ label: 'Play Game', callback: () => startGame() }], {
  width: 200,
  height: 60,
  menuButtonColor: '#4CAF50',
  menuButtonFontSize: 18,
});
ui.addControl(playButton);

// Button with custom styling
const exitButton = new Menu(300, 100, [{ label: 'Exit', callback: () => exitGame() }], {
  width: 150,
  height: 50,
  menuButtonColor: '#F44336',
  menuButtonActiveColor: '#D32F2F',
  menuButtonClickColor: '#B71C1C',
});
ui.addControl(exitButton);
```

### Menu

A vertical or horizontal list of selectable items (buttons).

```javascript
const menu = new Menu(
  100,
  100, // x, y position
  [
    // menu items
    { label: 'New Game', callback: () => console.log('New Game') },
    { label: 'Load Game', callback: () => console.log('Load Game') },
    { label: 'Options', callback: () => console.log('Options') },
    { label: 'Exit', callback: () => console.log('Exit') },
  ],
  {
    // options
    width: 200, // width of each item (default: 200)
    height: 50, // height of each item (default: 50)
    menuButtonColor: '#4CAF50', // Button background color
    menuButtonActiveColor: '#388E3C', // Selected/hovered button
    menuButtonClickColor: '#2E7D32', // Pressed button
    controlSurfaceColor: '#333333', // Unselected menu item background
    menuButtonBorderColor: '#666666', // Border color
    menuButtonFocusBorderColor: '#81C784', // Focused border
    menuButtonFontSize: 16, // Button text size
    orientation: 'vertical', // 'vertical' or 'horizontal' (default: 'vertical')
    gap: 0, // gap between items (default: 0)
    borderRadius: 8,
  }
);
ui.addControl(menu);
```

**Navigation:**

- Mouse click on item
- Arrow Up/Down keys when focused (or Left/Right for horizontal menus)
- Enter or Space to select when focused
- Gamepad D-pad up/down and A button

### Toggle

A switch that can be turned on or off.

```javascript
const toggle = new Toggle(
  100,
  100, // x, y position
  'Sound Effects', // label
  true, // initial value
  (value) => {
    // callback with current value
    console.log('Toggle is now:', value);
  },
  {
    // options
    width: 250, // width (default: 250)
    height: 50, // height (default: 50)
    controlColor: '#4CAF50', // Switch background when toggle is on
    borderColor: '#666666', // Border color
    borderRadius: 10,
  }
);
ui.addControl(toggle);
```

**Activation:**

- Mouse click
- Enter or Space key when focused
- Gamepad A button when focused

### TextInput

A text input field for user text entry.

```javascript
const textInput = new TextInput(
  100,
  100, // x, y position
  'Enter your name...', // placeholder text
  {
    // options
    width: 300, // width (default: 300)
    height: 50, // height (default: 50)
    controlSurfaceColor: '#333333', // Input field background
    controlTextColor: '#ffffff', // Text color
    controlBorderColor: '#666666', // Normal border
    controlFocusBorderColor: '#4CAF50', // Focused border
    borderRadius: 10,
  }
);
ui.addControl(textInput);

// Get the value
console.log(textInput.value);
```

**Interaction:**

- Click to focus and position cursor
- Type to enter text
- Backspace/Delete to remove text
- Arrow keys to move cursor
- Home/End keys

### Radio

A group of mutually exclusive options displayed vertically or horizontally.

```javascript
// Vertical Radio (default)
const radio = new Radio(
  100,
  100, // x, y position
  ['Easy', 'Medium', 'Hard', 'Expert'], // items
  1, // initial selected index
  'Difficulty', // label
  (index, value) => {
    // callback
    console.log(`Selected: ${value} (index ${index})`);
  },
  {
    // options
    width: 250, // width of each item (default: 250)
    height: 45, // height of each item (default: 45)
    controlColor: '#4CAF50', // Selected radio button fill
    controlBorderColor: '#666666', // Radio circle and border
    controlFocusBorderColor: '#81C784', // Focused border
    controlSurfaceColor: '#333333', // Control background
    orientation: 'vertical', // 'vertical' or 'horizontal' (default: 'vertical')
    gap: 0, // gap between items (default: 0)
    borderRadius: 10,
  }
);
ui.addControl(radio);

// Horizontal Radio
const horizontalRadio = new Radio(
  100,
  100,
  ['Low', 'Medium', 'High'],
  1,
  'Quality', // label
  (index, value) => {
    console.log(`Selected: ${value} (index ${index})`);
  },
  {
    width: 100, // width of each item
    height: 45, // height of each item
    orientation: 'horizontal',
    gap: 10, // gap between items
  }
);
ui.addControl(horizontalRadio);
```

**Navigation:**

- Mouse click on option
- Arrow Up/Down keys when focused (for vertical orientation)
- Arrow Left/Right keys when focused (for horizontal orientation)
- Gamepad D-pad left/right (navigates within control regardless of orientation)

**Label Feature:**

- The `label` parameter displays a text label at the top-left of the control
- The label helps identify the purpose of the radio group

### Carousel

A control for selecting one value at a time from a list, with arrow buttons to cycle through options.

```javascript
// Horizontal Carousel (default)
const carousel = new Carousel(
  100,
  100, // x, y position
  ['Option A', 'Option B', 'Option C', 'Option D'], // items
  0, // initial selected index
  'Select Option', // label
  (index, value) => {
    // callback
    console.log(`Selected: ${value} (index ${index})`);
  },
  {
    // options
    width: 300, // width (default: 250)
    height: 60, // height (default: 60)
    controlBorderColor: '#666666', // Border color
    controlFocusBorderColor: '#4CAF50', // Focused border
    controlSurfaceColor: '#333333', // Background
    controlColor: '#4CAF50', // Arrow color
    controlTextColor: '#ffffff', // Text color
    orientation: 'horizontal', // 'horizontal' or 'vertical' (default: 'horizontal')
    arrowSize: 12, // size of triangle arrows (default: 12)
    borderRadius: 10,
  }
);
ui.addControl(carousel);

// Vertical Carousel
const verticalCarousel = new Carousel(
  100,
  200,
  ['Red', 'Green', 'Blue'],
  1,
  'Colors', // label
  (index, value) => {
    console.log(`Color selected: ${value}`);
  },
  {
    width: 200,
    height: 120,
    orientation: 'vertical',
  }
);
ui.addControl(verticalCarousel);
```

**Navigation:**

- Mouse click on arrow buttons to navigate
- Arrow Left/Right keys when focused (for horizontal orientation)
- Arrow Up/Down keys when focused (for vertical orientation)
- Gamepad D-pad left/right (navigates within control regardless of orientation)
- Displays triangle arrows pointing in the appropriate direction
- Shows only the currently selected value

**Label Feature:**

- The `label` parameter displays a text label at the top-left of the control
- The label helps identify the purpose of the carousel

### Slider

A slider for selecting numerical values within a range.

```javascript
const slider = new Slider(
  100,
  100, // x, y position
  0,
  100, // min, max values
  50, // initial value
  5, // step increment
  'Volume', // label
  (value) => {
    // callback
    console.log('Value:', value);
  },
  {
    // options
    width: 300, // width (default: 300)
    height: 80, // height (default: 80)
    controlColor: '#4CAF50', // Slider thumb and filled track color
    controlBorderColor: '#666666', // Border color
    controlFocusBorderColor: '#81C784', // Border when focused
    controlSurfaceColor: '#333333', // Background
    controlTextColor: '#ffffff', // Label and value text
    borderRadius: 10,
  }
);
ui.addControl(slider);
```

**Interaction:**

- Mouse click on track to set value
- Arrow Left/Right keys when focused
- Gamepad D-pad left/right when focused
- Displays current value

### Panel

A non-interactive panel control used for visual grouping and background decoration.

```javascript
const panel = new Panel(
  100,
  100, // x, y position
  {
    // options
    width: 500, // width (default: 500)
    height: 500, // height (default: 500)
    panelSurfaceColor: '#333333', // Panel background (can also use backgroundColor)
    panelBorderColor: '#666666', // Panel border (can also use borderColor)
    borderWidth: 2,
    borderRadius: 10,
  }
);
ui.addControl(panel);
```

**Features:**

- Non-interactive (does not receive focus or input)
- Useful for creating visual grouping of related controls
- Supports rounded corners with borderRadius option
- Can be used as a background layer behind other controls
- Uses theme colors by default, which can be overridden with options

**Common Use Cases:**

```javascript
// Panel behind a group of radio buttons
const radioPanel = new Panel(90, 90, {
  width: 270,
  height: 200,
  backgroundColor: '#444444',
  borderColor: '#4CAF50',
  borderWidth: 2,
  borderRadius: 10,
});
ui.addControl(radioPanel);

// Add radio buttons on top
const radio = new Radio(100, 100, ['Option 1', 'Option 2'], 0, callback);
ui.addControl(radio);
```

## Display Features

### Text Display

Add static text to the canvas:

```javascript
// Text with no color specified - uses theme textColor
ui.addText('Hello World', 640, 100, {
  font: 'bold 24px Arial',
  align: 'center', // 'left', 'center', 'right'
  baseline: 'top', // 'top', 'middle', 'bottom'
});

// Text with explicit color (supports both 'textColor' and 'color')
ui.addText('Colored Text', 640, 150, {
  font: '20px Arial',
  textColor: '#FF5722', // or use 'color' for backward compatibility
  align: 'center',
});
```

**Note:** If no `textColor` or `color` is specified, `addText()` will use the theme's `textColor` value, ensuring consistency with UI controls.

### Image Display

Add images to the canvas:

```javascript
const image = new Image();
image.src = 'path/to/image.png';
image.onload = () => {
  ui.addImage(image, 100, 100, 200, 150); // x, y, width, height
};
```

### Background Color

Set a solid background color:

```javascript
ui.setBackground('#1a1a1a');
```

### Background Gradient

Set a gradient background with customizable direction:

```javascript
// Diagonal gradient (default) - from top-left to bottom-right
ui.setBackgroundGradient(
  [
    { offset: 0, color: '#1a1a1a' },
    { offset: 0.5, color: '#2c3e50' },
    { offset: 1, color: '#34495e' },
  ],
  'diagonal'
);

// Horizontal gradient - from left to right
ui.setBackgroundGradient(
  [
    { offset: 0, color: '#1a1a1a' },
    { offset: 1, color: '#34495e' },
  ],
  'horizontal'
);

// Vertical gradient - from top to bottom
ui.setBackgroundGradient(
  [
    { offset: 0, color: '#1a1a1a' },
    { offset: 1, color: '#34495e' },
  ],
  'vertical'
);
```

**Direction Options:**

- `'horizontal'` - Left to right gradient
- `'vertical'` - Top to bottom gradient
- `'diagonal'` - Top-left to bottom-right gradient (default)

### No Background (Overlay Mode)

Disable background clearing and painting:

```javascript
ui.setBackgroundNone();
```

When this is set, MarkJSCanvasUI will not clear or fill the canvas before drawing UI controls. This allows you to overlay UI elements on top of whatever was previously drawn to the canvas, or to let another system handle background painting. Useful for overlays, HUDs, or when you want to preserve custom canvas artwork.

## Modal Dialogs

Display modal dialog boxes with a semi-transparent overlay:

```javascript
// Basic modal using theme colors
ui.showModal(
  'Confirm Action', // title
  'Are you sure you want to proceed?', // message
  [
    // buttons
    {
      label: 'Yes',
      callback: () => console.log('Confirmed'),
    },
    {
      label: 'No',
      callback: () => console.log('Cancelled'),
    },
  ],
  {
    escapeButtonLabel: 'No', // Escape will trigger the 'No' button callback
  }
);

// Custom styled modal with color overrides
ui.showModal(
  'Custom Modal',
  'This modal has custom colors!',
  [
    { label: 'OK', callback: () => console.log('OK') },
    { label: 'Cancel', callback: () => console.log('Cancel') },
  ],
  {
    // Modal color options
    modalSurfaceColor: '#1a1a2e', // Modal background color
    modalBorderColor: '#ff6b6b', // Modal border color
    modalTextColor: '#eeeeee', // Title text color
    modalText2Color: '#cccccc', // Message text color
    modalTextFontSize: 20, // Title font size
    modalText2FontSize: 16, // Message font size

    // Menu button color options (for modal buttons)
    menuButtonColor: '#16213e', // Default button background
    menuButtonActiveColor: '#ff6b6b', // Selected/hovered button color
    menuButtonClickColor: '#ff4444', // Pressed button color
    menuButtonBorderColor: '#0f3460', // Button border color
    menuButtonFocusBorderColor: '#ff6b6b', // Focused button border
    menuButtonFontSize: 16, // Button text size

    // Style options
    borderWidth: 3, // Border thickness
    borderRadius: 15, // Corner radius

    // Size options
    width: 500, // Custom width
    height: 300, // Custom height

    escapeButtonLabel: 'Cancel', // Escape key behavior
  }
);

// Force line breaks inside the message
ui.showModal('Multiline', 'First line\nSecond line after break');
```

**Color Options:**

All color options default to theme colors but can be overridden:

**Modal Colors:**

- `modalSurfaceColor` - Modal background color (defaults to `theme.modalSurfaceColor`)
- `modalBorderColor` - Modal border color (defaults to `theme.modalBorderColor`)
- `modalTextColor` - Title text color (defaults to `theme.modalTextColor`)
- `modalText2Color` - Message text color (defaults to `theme.modalText2Color`)
- `modalTextFontSize` - Title font size (defaults to `theme.modalTextFontSize`)
- `modalText2FontSize` - Message font size (defaults to `theme.modalText2FontSize`)

**Button Colors:**

- `menuButtonColor` - Default button background (defaults to `theme.menuButtonColor`)
- `menuButtonActiveColor` - Selected/hovered button color (defaults to `theme.menuButtonActiveColor`)
- `menuButtonClickColor` - Pressed button color (defaults to `theme.menuButtonClickColor`)
- `menuButtonBorderColor` - Button border color (defaults to `theme.menuButtonBorderColor`)
- `menuButtonFocusBorderColor` - Focused button border (defaults to `theme.menuButtonFocusBorderColor`)
- `menuButtonFontSize` - Button text size (defaults to `theme.menuButtonFontSize`)

**Style Options:**

- `borderWidth` - Border thickness (defaults to `theme.borderWidth`)
- `borderRadius` - Corner radius (defaults to `theme.borderRadius` or 10)
- `width` - Custom modal width (auto-calculated if not provided)
- `height` - Custom modal height (auto-calculated if not provided)

**Features:**

- Semi-transparent background overlay
- Word-wrapped message text (supports `\n` for manual line breaks)
- Multiple button support
- Click outside or button to close
- Automatic centering
- **Theme Integration:** Uses theme colors as defaults with full customization support
- **Custom Escape Key Behavior:** Use `escapeButtonLabel` in the modal options to specify which button's callback is triggered when Escape is pressed. If not set, Escape will trigger the first button labeled "Exit", "Close", or "Cancel" (case-insensitive).

**Default Modal:**
If no buttons are provided, a single "OK" button is shown.

## Toast Notifications

Display temporary notification messages in the corner:

```javascript
ui.showToast(
  'Operation successful!', // message
  'success', // type: 'info', 'success', 'warning', 'error'
  3000 // duration in milliseconds
);
```

**Toast Types:**

- `info` - Blue with info icon (ℹ)
- `success` - Green with checkmark (✓)
- `warning` - Orange with warning icon (⚠)
- `error` - Red with X icon (✕)

**Features:**

- Stacks multiple toasts vertically
- Auto-dismisses after duration
- Icon with type-specific color
- Word-wrapped text (supports `\n` for manual line breaks)

## Input Handling

### External Input Handler Requirement

MarkJSCanvasUI does **not** handle input events directly. Instead, it requires an external input handler to manage keyboard, mouse, gamepad, and touch interactions. This design provides flexibility and allows you to use your preferred input management system.

**Recommended Input Handler:** [@markharrison/markjsinput](https://www.npmjs.com/package/@markharrison/markjsinput)

```javascript
import { MarkJSInput } from '@markharrison/markjsinput';
import { MarkJSCanvasUI } from './markjscanvasui.js';

const canvas = document.getElementById('gameCanvas');
const input = new MarkJSInput(canvas);
const ui = new MarkJSCanvasUI(canvas, { input });
```

The input handler must be passed to the MarkJSCanvasUI constructor via the `input` option. Without this, UI controls will not respond to user interaction.

### Supported Input Types

When using the recommended MarkJSInput handler, the following input types are automatically supported:

#### Keyboard Support

- **Tab** / **Shift+Tab**: Navigate between controls
- **Arrow Keys**: Navigate within menus/radios, adjust sliders, move cursor in text inputs
- **Enter** / **Space**: Activate buttons, toggles
- **Escape**: Trigger custom escape handler
- **Text Keys**: Type in text inputs
- **Backspace** / **Delete**: Edit text inputs
- **Home** / **End**: Move cursor in text inputs

#### Mouse Support

- **Click**: Activate controls
- **Hover**: Visual feedback (on compatible controls)
- Automatically accounts for canvas scaling

#### Gamepad Support

- **D-pad Up/Down**: Navigate between controls
- **D-pad Left/Right**: Adjust sliders
- **A Button (button 0)**: Activate control
- Auto-detects connected gamepads

#### Touch Support

- **Tap**: Activate controls (equivalent to mouse click)
- **Touch and drag**: For sliders and scrollable content
- Multi-touch gestures (depending on input handler capabilities)

### Escape Key Handler

Set a custom handler for the Escape key:

```javascript
ui.onEscape = () => {
  console.log('User pressed ESC');
  // Navigate to menu, pause game, etc.
};
```

## Styling and Customization

### Theme System

MarkJSCanvasUI now uses a comprehensive theme system for all UI controls. Theme properties control colors, fonts, borders, and more, with sensible defaults. You can override any property via `setTheme()` or per-control options.

#### Theme Properties

```js
{
    // General control
    controlColor,
    controlSurfaceColor,
    controlTextColor,
    controlBorderColor,
    controlFocusBorderColor,
    controlClickColor,

    // Menu button
    menuButtonColor,
    menuButtonActiveColor,
    menuButtonClickColor,
    menuButtonBorderColor,
    menuButtonFocusBorderColor,
    menuButtonFontSize,

    // Modal
    modalSurfaceColor,
    modalBorderColor,
    modalTextColor,
    modalText2Color,
    modalTextFontSize,
    modalText2FontSize,

    // Panel
    panelSurfaceColor,
    panelBorderColor,

    // Shared
    borderRadius,
    borderWidth,
    fontFamily,
    fontSize,
    padding,
}
```

All controls use these theme values unless explicitly overridden in their options. This ensures consistent styling and easy customization.

#### Example: Setting Theme

```js
ui.setTheme({
  controlColor: '#2196F3',
  menuButtonFontSize: 20,
  borderRadius: 12,
});
```

#### Example: Per-Control Override

```js
const menu = new Menu(x, y, items, {
  menuButtonColor: '#FF9800', // Only this menu uses orange buttons
});
```

#### Defaults

If a theme property is not specified, MarkJSCanvasUI uses its built-in default. See `markjscanvasui.js` for the full list.

#### Using Font Properties

You can specify fonts in two ways:

**1. Complete font string (traditional way):**

```javascript
const menu = new Menu(100, 100, [{ label: 'Click Me', callback }], {
  font: 'bold 20px Arial',
});
```

**2. Individual font properties (uses default font family from theme):**

```javascript
const menu = new Menu(100, 100, [{ label: 'Click Me', callback }], {
  fontSize: 20, // or 'font-size'
  fontWeight: 'bold', // or 'font-weight'
  fontStyle: 'italic', // or 'font-style'
  fontFamily: 'Courier', // or 'font-family' (optional, uses theme default if not specified)
});
```

When using individual properties, the font family from the theme is used unless you specify a `fontFamily` option.

#### Theme Examples

**Blue Theme:**

```javascript
ui.setTheme({
  controlBorderColor: '#1976D2',
  controlFocusBorderColor: '#2196F3',
  controlColor: '#2196F3',
  controlSurfaceColor: '#1E3A5F',
  controlTextColor: '#E3F2FD',
  backgroundColor: '#0D47A1', // Canvas background
  borderRadius: 10,
});
```

**Orange Theme:**

```javascript
ui.setTheme({
  controlBorderColor: '#E65100',
  controlFocusBorderColor: '#FF9800',
  controlColor: '#FF9800',
  controlSurfaceColor: '#4E342E',
  controlTextColor: '#FFF3E0',
  backgroundColor: '#3E2723', // Canvas background
  borderRadius: 10,
});
```

**Purple Theme:**

```javascript
ui.setTheme({
  controlBorderColor: '#6A1B9A',
  controlFocusBorderColor: '#9C27B0',
  controlColor: '#9C27B0',
  controlSurfaceColor: '#4A148C',
  controlTextColor: '#F3E5F5',
  backgroundColor: '#311B92', // Canvas background
  borderRadius: 10,
});
```

### Control Options

All controls accept an `options` object for styling. These options override the theme defaults. All theme property names listed above can be used in control options for per-control customization:

```javascript
const options = {
  // Core color properties (supported by ALL controls):
  controlBorderColor: '#666666', // Color for the normal border
  controlFocusBorderColor: '#4CAF50', // Border color when the control is focused
  controlColor: '#4CAF50', // Main color for control elements (button face, slider thumb/track, toggle on state, etc.)
  controlSurfaceColor: '#333333', // General control background (input field, etc.)
  controlTextColor: '#ffffff', // Color for the label/text inside the control

  // Font options (choose one approach):
  font: '16px Arial', // Complete font string
  // OR individual properties:
  fontSize: 16, // Font size in pixels
  fontFamily: 'Arial', // Font family
  fontWeight: 'normal', // 'normal', 'bold', '100'-'900'
  fontStyle: 'normal', // 'normal', 'italic', 'oblique'

  // Layout properties:
  borderWidth: 2, // Border thickness
  padding: 10, // Internal padding
  borderRadius: 0, // Border radius for rounded corners
};
```

### Color Property Usage by Control

#### All Controls Support

- `controlColor` - Main control element color
- `controlSurfaceColor` - Control background
- `controlTextColor` - Text color
- `controlBorderColor` - Border color
- `controlFocusBorderColor` - Border color when focused
- `controlClickColor` - Color for pressed/clicked state
- `borderRadius`, `borderWidth`, `fontFamily`, `fontSize`, `padding`

#### Menu

- `menuButtonColor`, `menuButtonActiveColor`, `menuButtonClickColor`, `menuButtonBorderColor`, `menuButtonFocusBorderColor`, `menuButtonFontSize`
- Uses menu-specific theme properties for menu items, falling back to general control properties if not specified

#### Toggle

- Uses `controlColor` for the switch background when toggle is on
- Uses `controlSurfaceColor` when off
- White knob color (fixed)

#### TextInput

- Uses `controlTextColor` for input text
- Uses general control theme properties for background, border, etc.

#### Radio

- Uses `controlColor` for the selected radio button fill
- Uses `controlBorderColor` for radio button circles
- Uses `controlTextColor` for labels

#### Carousel

- Uses `controlTextColor` for arrows and current value display
- Uses general control theme properties for background, border, etc.

#### Slider

- Uses `controlColor` for both the slider knob and filled track portion
- Uses `controlFocusBorderColor` for border when focused

#### Panel

- Uses `panelSurfaceColor` for background (falls back to `controlSurfaceColor`)
- Uses `panelBorderColor` for border (falls back to `controlBorderColor`)
- Supports `backgroundColor` and `borderColor` options to override theme defaults

### Colors

Colors can be specified using:

- Hex: `'#4CAF50'`
- RGB: `'rgb(76, 175, 80)'`
- RGBA: `'rgba(76, 175, 80, 0.8)'`
- Named: `'green'`, `'red'`, etc.

### Example: Custom Colored Menu Button

```javascript
const customButton = new Menu(100, 100, [{ label: 'Custom Button', callback: () => console.log('Clicked!') }], {
  menuButtonColor: '#4CAF50', // Green button face
  controlTextColor: '#ffffff', // White text
  menuButtonBorderColor: '#2E7D32', // Dark green border
  menuButtonFocusBorderColor: '#81C784', // Light green when focused
  controlSurfaceColor: '#1B5E20', // Dark background
  borderRadius: 10,
  width: 200,
  height: 60,
});
```

### Example: Custom Colored Slider

```javascript
const customSlider = new Slider(100, 100, 0, 100, 50, 5, 'Volume', (value) => console.log(value), {
  controlColor: '#FF9800', // Orange slider knob and filled track
  controlBorderColor: '#E65100', // Dark orange border
  controlFocusBorderColor: '#FFB74D', // Light orange when focused
  controlSurfaceColor: '#FFF3E0', // Light background
  controlTextColor: '#E65100', // Dark orange text
  borderRadius: 8,
});
```

## API Reference

### MarkJSCanvasUI Class

#### Constructor

```javascript
new MarkJSCanvasUI(canvas, options);
```

**Parameters:**

- `canvas` (HTMLCanvasElement): The canvas element to render UI controls on
- `options` (Object): Configuration options
  - `input` (MarkJSInput): **Required.** Input handler for keyboard, mouse, gamepad, and touch events
  - `backgroundColor` (string): Optional. Default background color
  - `backgroundGradient` (array): Optional. Gradient definition for background

#### Methods

- `addControl(control)` - Add a control to the UI
- `removeControl(control)` - Remove a control from the UI
- `removeAllControls()` - Remove all controls, texts, images, modals, and toasts from the canvas (only background settings are preserved)
- `removeAllControlsExceptToasts()` - Remove all controls, texts, images, and modals from the canvas, but preserve toast notifications (only background settings and toasts are preserved)
- `addText(text, x, y, options)` - Add text display
- `addImage(image, x, y, width, height)` - Add image display
- `setBackground(color)` - Set solid background color
- `setBackgroundGradient(gradient, direction)` - Set gradient background with direction ('horizontal', 'vertical', or 'diagonal')
- `setTheme(themeOptions)` - Set default colors, fonts, and styling for all subsequently created controls
- `showModal(title, message, buttons)` - Display modal dialog
- `closeModal(modal)` - Close specific modal
- `showToast(message, type, duration)` - Display toast notification
- `update(deltaTime)` - Update all controls and animations (call each frame)
- `render()` - Draw all UI elements to canvas (call each frame)

#### Properties

- `canvas` - Reference to canvas element
- `ctx` - Canvas 2D context
- `controls` - Array of all controls
- `onEscape` - Escape key callback function

### Control Classes

All available as exports from `markjscanvasui.js`:

- `Menu(x, y, items, options)` - Can be used as buttons with single items
- `Toggle(x, y, label, initialValue, callback, options)`
- `TextInput(x, y, placeholder, options)`
- `Radio(x, y, items, selectedIndex, label, callback, options)`
- `Carousel(x, y, items, selectedIndex, label, callback, options)`
- `Slider(x, y, min, max, value, step, label, callback, options)`
- `Panel(x, y, options)`

## Examples

### Complete Example

```javascript
// Initialize with input handler
import { MarkJSInput } from '@markharrison/markjsinput';
import { MarkJSCanvasUI, Menu, Toggle } from './markjscanvasui.js';

const canvas = document.getElementById('gameCanvas');
const input = new MarkJSInput(canvas);
const ui = new MarkJSCanvasUI(canvas, { input });

// Add title
ui.addText('My Game', 640, 50, {
  font: 'bold 48px Arial',
  align: 'center',
});

// Add menu
const mainMenu = new Menu(
  540,
  200,
  [
    { label: 'Start', callback: startGame },
    { label: 'Options', callback: showOptions },
    { label: 'Exit', callback: exitGame },
  ],
  { width: 200, height: 60 }
);
ui.addControl(mainMenu);

// Add settings toggle
const musicToggle = new Toggle(
  440,
  450,
  'Background Music',
  true,
  (enabled) => {
    if (enabled) startMusic();
    else stopMusic();
  },
  { width: 400, height: 50 }
);
ui.addControl(musicToggle);

// Set escape handler
ui.onEscape = () => {
  ui.showModal('Pause', 'Game Paused', [
    { label: 'Resume', callback: () => {} },
    { label: 'Quit', callback: exitGame },
  ]);
};

// Show welcome message
ui.showToast('Welcome!', 'success', 3000);
```

## Best Practices

1. **Canvas Size**: Use the recommended 1280x720 for optimal display, but the library works with any size
2. **Responsive Design**: Always make your canvas scale with CSS to support different screen sizes
3. **Control Placement**: Leave adequate spacing between controls for better usability
4. **Focus Order**: Add controls in the order you want users to tab through them
5. **Callbacks**: Keep callback functions lightweight; perform heavy operations asynchronously
6. **Toast Duration**: Use 2-3 seconds for info messages, 4-5 seconds for important warnings
7. **Modal Usage**: Use modals sparingly; they block all other interaction
8. **Testing**: Test with keyboard, mouse, and gamepad if possible

## Troubleshooting

### Controls not responding to input

**Most Common Issue:** Missing or incorrect input handler setup.

MarkJSCanvasUI requires an external input handler. Ensure you:

1. Install the input handler: `npm install @markharrison/markjsinput`
2. Import it correctly: `import { MarkJSInput } from '@markharrison/markjsinput';`
3. Create an instance: `const input = new MarkJSInput(canvas);`
4. Pass it to MarkJSCanvasUI: `const ui = new MarkJSCanvasUI(canvas, { input });`

If controls still don't respond, check the browser console for input-related errors.

### Mouse clicks not registering correctly when canvas is scaled

The library automatically handles canvas scaling. Ensure your canvas uses CSS for scaling:

```css
#gameCanvas {
  width: 100%;
  height: 100%;
}
```

### Controls not receiving keyboard input

Ensure focus management is working:

- Call `ui.addControl()` to add controls properly
- Check browser console for errors
- Verify the canvas or page has focus

### Gamepad not working

- Ensure a gamepad is connected before the page loads
- Check browser console for "Gamepad connected" message
- Not all browsers support gamepad API

### Performance issues

- Limit the number of controls (recommended: < 50)
- Optimize callback functions
- Consider using separate canvases for complex scenes
- Control your game loop frame rate if needed (e.g., skip rendering if not visible)

## License

MIT License - See LICENSE file for details.
