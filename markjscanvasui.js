/**
 * MarkJSCanvasUI - A JavaScript library for UI controls in HTML Canvas for web games
 * @author Mark Harrison
 */

'use strict';

// Helper function to draw rounded rectangles
export function DrawRoundedRect(ctx, x, y, width, height, radius) {
    if (radius === 0) {
        ctx.rect(x, y, width, height);
        return;
    }

    radius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}

// Helper function to build font string from components
export function BuildFontString(fontOptions, defaultFont) {
    // If font is already a complete string, use it
    if (typeof fontOptions === 'string') {
        return fontOptions;
    }

    // Build font string from components
    const style = fontOptions.style || defaultFont.style || 'normal';
    const weight = fontOptions.weight || defaultFont.weight || 'normal';
    const size = fontOptions.size || defaultFont.size || 16;
    const family = fontOptions.family || defaultFont.family || 'Arial';

    // Combine style and weight if needed
    let prefix = '';
    if (style !== 'normal') prefix += style + ' ';
    if (weight !== 'normal') prefix += weight + ' ';

    return `${prefix}${size}px ${family}`;
}

// Main MarkJSCanvasUI class
export class MarkJSCanvasUI {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.controls = [];
        this.focusIndex = -1;
        this.modals = [];
        this.toasts = [];
        this.images = [];
        this.texts = [];

        // Theme defaults for controls
        // Theme system: all theme properties with sensible defaults
        this.theme = {
            // General control
            controlColor: '#4CAF50',
            controlSurfaceColor: '#333333',
            controlTextColor: '#ffffff',
            controlBorderColor: '#666666',
            controlFocusBorderColor: '#4CAF50',
            controlClickColor: '#388E3C',

            // Menu button
            menuButtonColor: '#4CAF50',
            menuButtonActiveColor: '#388E3C',
            menuButtonClickColor: '#2E7D32',
            menuButtonBorderColor: '#666666',
            menuButtonFocusBorderColor: '#4CAF50',
            menuButtonFontSize: 16,

            // Modal
            modalSurfaceColor: '#222222',
            modalBorderColor: '#888888',
            modalTextColor: '#ffffff',
            modalText2Color: '#cccccc',
            modalTextFontSize: 18,
            modalText2FontSize: 14,

            // Panel
            panelSurfaceColor: '#2a2a2a',
            panelBorderColor: '#4CAF50',

            // Shared
            borderRadius: 6,
            borderWidth: 2,
            fontFamily: 'Arial',
            fontSize: 16,
            padding: 10,
        };

        // Default font properties
        this.defaultFont = {
            family: 'Arial',
            size: 16,
            weight: 'normal',
            style: 'normal',
        };

        // Configuration
        this.options = {
            backgroundColor: options.backgroundColor || '#1a1a1a',
            backgroundGradient: options.backgroundGradient || null,
            ...options,
        };

        // Input manager is required
        if (!options.input) {
            throw new Error('MarkJSCanvasUI requires an input manager. Pass an instance via options.input (e.g., new MarkJSInput(canvas))');
        }

        // Store input manager reference
        this.input = options.input;

        // Share input state references
        this.keys = this.input.keys;
        this.mouse = this.input.mouse;
        this.gamepad = this.input.gamepad;

        // Event callbacks
        this.onEscape = null;

        // Subscribe to input events
        this.inputSubscription = this.input.subscribe(this);
    }

    destroy() {
        // Unsubscribe from input manager
        if (this.inputSubscription) {
            this.inputSubscription.unsubscribe();
            this.inputSubscription = null;
        }

        // Clear collections
        this.controls = [];
        this.modals = [];
        this.toasts = [];
        this.images = [];
        this.texts = [];
        this.focusIndex = -1;
        this.onEscape = null;
    }

    // Get mouse position accounting for canvas scaling
    getCanvasMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    // Subscriber callback: Keyboard down
    onKeyDown(e) {
        this.keys[e.key] = true;

        // Handle escape key
        if (e.key === 'Escape') {
            // Pass to modal first if one exists
            if (this.modals.length > 0) {
                const modal = this.modals[this.modals.length - 1];
                if (modal.handleKeyDown) {
                    modal.handleKeyDown(e);
                }
            } else if (this.onEscape) {
                this.onEscape();
            }
            e.preventDefault();
            return;
        }

        // Pass other keys to modal if one exists
        if (this.modals.length > 0) {
            const modal = this.modals[this.modals.length - 1];
            if (modal.handleKeyDown) {
                modal.handleKeyDown(e);
            }
            return;
        }

        // Handle tab navigation
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                this.focusPrevious();
            } else {
                this.focusNext();
            }
            return;
        }

        // Pass to focused control
        if (this.focusIndex >= 0 && this.focusIndex < this.controls.length) {
            const control = this.controls[this.focusIndex];
            if (control.handleKeyDown) {
                control.handleKeyDown(e);
            }
        }
    }

    // Subscriber callback: Keyboard up
    onKeyUp(e) {
        // Input manager handles key state
    }

    // Subscriber callback: Mouse move
    onMouseMove(x, y) {
        // Input manager handles mouse state
        // Update cursor based on what's under the mouse
        this.updateCursor(x, y);
    }

    updateCursor(x, y) {
        let shouldShowPointer = false;

        // Check modals first (they're on top)
        if (this.modals.length > 0) {
            const modal = this.modals[this.modals.length - 1];
            if (modal.isOverButton && modal.isOverButton(x, y)) {
                shouldShowPointer = true;
            }
        } else {
            // Check controls (from top to bottom, reverse order for correct z-index)
            for (let i = this.controls.length - 1; i >= 0; i--) {
                const control = this.controls[i];
                // Skip panels as they're not interactive
                if (control.constructor.name === 'Panel') {
                    continue;
                }
                // Check if control has a hover detection method
                if (control.isOverInteractiveArea) {
                    if (control.isOverInteractiveArea(x, y)) {
                        shouldShowPointer = true;
                        break;
                    }
                } else if (control.containsPoint(x, y)) {
                    // Fallback to basic containsPoint for controls without specific hover detection
                    shouldShowPointer = true;
                    break;
                }
            }
        }

        // Update canvas cursor
        this.canvas.style.cursor = shouldShowPointer ? 'pointer' : 'default';
    }

    // Subscriber callback: Mouse down
    onMouseDown(x, y, button) {
        // Input manager handles button state
    }

    // Subscriber callback: Mouse up
    onMouseUp(x, y, button) {
        // Input manager handles button state
    }

    // Subscriber callback: Mouse click
    onMouseClick(x, y, button) {
        // Check modals first
        if (this.modals.length > 0) {
            const modal = this.modals[this.modals.length - 1];
            modal.handleClick(x, y, button);
            return;
        }

        // Check controls
        for (let i = this.controls.length - 1; i >= 0; i--) {
            const control = this.controls[i];
            if (control.containsPoint(x, y)) {
                this.focusIndex = i;
                if (control.handleClick) {
                    control.handleClick(x, y, button);
                }
                break;
            }
        }
    }

    onGamepadConnected(e) {}

    // Subscriber callback: Gamepad button pressed
    onGamepadButton(buttonIndex) {
        // Pass to modal first if one exists
        if (this.modals.length > 0) {
            const modal = this.modals[this.modals.length - 1];
            if (modal.handleGamepadButton) {
                modal.handleGamepadButton(buttonIndex);
            }
            return;
        }

        // Button 0 (A/Cross) = Select
        if (buttonIndex === 0) {
            if (this.focusIndex >= 0 && this.focusIndex < this.controls.length) {
                const control = this.controls[this.focusIndex];
                if (control.activate) {
                    control.activate();
                }
            }
        }
        // Button 1 (B/Circle) = Exit/Escape
        else if (buttonIndex === 1) {
            if (this.onEscape) {
                this.onEscape();
            }
        }
        // Button 12 = D-pad up
        else if (buttonIndex === 12) {
            this.focusPrevious();
        }
        // Button 13 = D-pad down
        else if (buttonIndex === 13) {
            this.focusNext();
        }
        // Button 14 = D-pad left
        else if (buttonIndex === 14) {
            if (this.focusIndex >= 0 && this.focusIndex < this.controls.length) {
                const control = this.controls[this.focusIndex];
                if (control.handleGamepadAxis) {
                    control.handleGamepadAxis(-1);
                } else if (control.handleGamepadLeft) {
                    control.handleGamepadLeft();
                }
            }
        }
        // Button 15 = D-pad right
        else if (buttonIndex === 15) {
            if (this.focusIndex >= 0 && this.focusIndex < this.controls.length) {
                const control = this.controls[this.focusIndex];
                if (control.handleGamepadAxis) {
                    control.handleGamepadAxis(1);
                } else if (control.handleGamepadRight) {
                    control.handleGamepadRight();
                }
            }
        }
    }

    focusNext() {
        if (this.controls.length === 0) return;
        this.focusIndex = (this.focusIndex + 1) % this.controls.length;
    }

    focusPrevious() {
        if (this.controls.length === 0) return;
        this.focusIndex = (this.focusIndex - 1 + this.controls.length) % this.controls.length;
    }

    addControl(control) {
        control.manager = this;
        control.applyTheme(); // Apply theme defaults
        this.controls.push(control);
        if (this.focusIndex === -1 && this.controls.length === 1) {
            this.focusIndex = 0;
        }
        return control;
    }

    // Helper method to get theme value with fallback
    getThemeValue(key, fallback) {
        return this.theme[key] !== undefined ? this.theme[key] : fallback;
    }

    removeControl(control) {
        const index = this.controls.indexOf(control);
        if (index > -1) {
            this.controls.splice(index, 1);
            if (this.focusIndex >= this.controls.length) {
                this.focusIndex = this.controls.length - 1;
            }
        }
    }

    removeAllControls() {
        this.controls = [];
        this.focusIndex = -1;
        this.texts = [];
        this.images = [];
        this.modals = [];
        this.toasts = [];
        this.onEscape = null;
    }

    removeAllControlsExceptToasts() {
        this.controls = [];
        this.focusIndex = -1;
        this.texts = [];
        this.images = [];
        this.modals = [];
        this.onEscape = null;
    }

    addText(text, x, y, options = {}) {
        // Use textColor from options, or fall back to theme's textColor
        const textColor = options.textColor || this.theme.textColor;

        // Build font string using BuildFontString helper
        // If user provided complete font string, use it
        // Otherwise build from individual properties with theme defaults
        let font;
        if (options.font) {
            font = options.font;
        } else {
            // Build font from individual properties with theme defaults
            // Only include properties that are explicitly provided by the user
            const fontOptions = {};
            if (options.fontFamily || options.family) {
                fontOptions.family = options.fontFamily || options.family;
            }
            if (options.fontSize || options.size) {
                fontOptions.size = options.fontSize || options.size;
            }
            if (options.fontWeight || options.weight) {
                fontOptions.weight = options.fontWeight || options.weight;
            }
            if (options.fontStyle || options.style) {
                fontOptions.style = options.fontStyle || options.style;
            }
            font = BuildFontString(fontOptions, this.defaultFont);
        }

        const textObj = {
            text,
            x,
            y,
            font,
            color: textColor,
            align: options.align || 'left',
            baseline: options.baseline || 'top',
        };
        this.texts.push(textObj);
        return textObj;
    }

    addImage(image, x, y, width, height) {
        const imageObj = { image, x, y, width, height };
        this.images.push(imageObj);
        return imageObj;
    }

    setBackground(color) {
        this.options.backgroundColor = color;
        this.options.backgroundGradient = null;
        this.options.noBackground = false;
    }

    setBackgroundGradient(gradient, direction = 'diagonal') {
        this.options.backgroundGradient = gradient;
        this.options.gradientDirection = direction; // 'horizontal', 'vertical', or 'diagonal'
        this.options.noBackground = false;
    }

    setBackgroundNone() {
        this.options.noBackground = true;
    }

    setTheme(themeOptions = {}) {
        this.theme = {
            ...this.theme,
            ...themeOptions,
        };

        // If theme includes backgroundColor, update the options as well
        if (themeOptions.backgroundColor) {
            this.options.backgroundColor = themeOptions.backgroundColor;
        }

        // Also support font-related properties in theme
        // Extract font properties if provided and update defaultFont
        if (
            themeOptions.fontFamily ||
            themeOptions.fontSize ||
            themeOptions.fontWeight ||
            themeOptions.fontStyle ||
            themeOptions.family ||
            themeOptions.size ||
            themeOptions.weight ||
            themeOptions.style
        ) {
            this.defaultFont = {
                ...this.defaultFont,
                family: themeOptions.fontFamily || themeOptions.family || this.defaultFont.family,
                size: themeOptions.fontSize || themeOptions.size || this.defaultFont.size,
                weight: themeOptions.fontWeight || themeOptions.weight || this.defaultFont.weight,
                style: themeOptions.fontStyle || themeOptions.style || this.defaultFont.style,
            };
        }
    }

    showModal(title, message, buttons = [], options = {}) {
        const modal = new Modal(this, title, message, buttons, options);
        this.modals.push(modal);
        return modal;
    }

    closeModal(modal) {
        const index = this.modals.indexOf(modal);
        if (index > -1) {
            this.modals.splice(index, 1);
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = new Toast(this, message, type, duration);
        this.toasts.push(toast);

        setTimeout(() => {
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, duration);

        return toast;
    }

    update(deltaTime) {
        // Update controls
        for (let control of this.controls) {
            if (control.update) {
                control.update(deltaTime);
            }
        }

        // Update modals
        for (let modal of this.modals) {
            if (modal.update) {
                modal.update(deltaTime);
            }
        }
    }

    render() {
        if (!this.options.noBackground) {
            if (this.options.backgroundGradient) {
                const direction = this.options.gradientDirection || 'diagonal';
                let gradient;

                // Create gradient based on direction
                if (direction === 'horizontal') {
                    gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
                } else if (direction === 'vertical') {
                    gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                } else {
                    gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
                }

                for (let stop of this.options.backgroundGradient) {
                    gradient.addColorStop(stop.offset, stop.color);
                }
                this.ctx.fillStyle = gradient;
            } else {
                this.ctx.fillStyle = this.options.backgroundColor;
            }
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw panels first (background layer)
        for (let i = 0; i < this.controls.length; i++) {
            const control = this.controls[i];
            if (control.constructor.name === 'Panel') {
                control.draw(this.ctx, false); // Panels never get focus
            }
        }

        // Draw images
        for (let img of this.images) {
            if (img.image.complete) {
                this.ctx.drawImage(img.image, img.x, img.y, img.width, img.height);
            }
        }

        // Draw texts
        for (let text of this.texts) {
            this.ctx.font = text.font;
            this.ctx.fillStyle = text.color;
            this.ctx.textAlign = text.align;
            this.ctx.textBaseline = text.baseline;
            this.ctx.fillText(text.text, text.x, text.y);
        }

        // Draw other controls (interactive layer)
        for (let i = 0; i < this.controls.length; i++) {
            const control = this.controls[i];
            if (control.constructor.name !== 'Panel') {
                const isFocused = i === this.focusIndex;
                control.draw(this.ctx, isFocused);
            }
        }

        // Draw modals
        for (let modal of this.modals) {
            modal.draw(this.ctx);
        }

        // Draw toasts
        for (let i = 0; i < this.toasts.length; i++) {
            const toast = this.toasts[i];
            toast.draw(this.ctx, i);
        }
    }
}

// Base Control class
export class Control {
    constructor(x, y, width, height, options = {}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.manager = null;

        // Store raw options for later theme application
        this._rawOptions = options;

        // Initialize with hardcoded defaults (will be updated when added to manager)
        this.options = {
            controlColor: '#4CAF50',
            controlSurfaceColor: '#333333',
            controlTextColor: '#ffffff',
            controlBorderColor: '#666666',
            controlFocusBorderColor: '#4CAF50',
            controlClickColor: '#388E3C',
            menuButtonColor: '#4CAF50',
            menuButtonActiveColor: '#388E3C',
            menuButtonClickColor: '#2E7D32',
            menuButtonBorderColor: '#666666',
            menuButtonFocusBorderColor: '#4CAF50',
            menuButtonFontSize: 16,
            panelSurfaceColor: '#2a2a2a',
            panelBorderColor: '#4CAF50',
            borderRadius: 6,
            borderWidth: 2,
            fontFamily: 'Arial',
            fontSize: 16,
            padding: 10,
            ...options,
        };
    }

    // Called when control is added to a manager to apply theme defaults
    applyTheme() {
        if (!this.manager) return;

        const theme = this.manager.theme;
        const defaultFont = this.manager.defaultFont;

        // Build the options with theme defaults, then apply user overrides
        const themedOptions = {
            // Control colors
            controlColor: theme.controlColor,
            controlSurfaceColor: theme.controlSurfaceColor,
            controlTextColor: theme.controlTextColor,
            textColor: theme.controlTextColor, // Alias
            controlBorderColor: theme.controlBorderColor,
            controlFocusBorderColor: theme.controlFocusBorderColor,
            controlClickColor: theme.controlClickColor,
            // Menu button colors
            menuButtonColor: theme.menuButtonColor,
            menuButtonActiveColor: theme.menuButtonActiveColor,
            menuButtonClickColor: theme.menuButtonClickColor,
            menuButtonBorderColor: theme.menuButtonBorderColor,
            menuButtonFocusBorderColor: theme.menuButtonFocusBorderColor,
            menuButtonFontSize: theme.menuButtonFontSize,
            // Panel colors
            panelSurfaceColor: theme.panelSurfaceColor,
            panelBorderColor: theme.panelBorderColor,
            // Shared properties
            borderRadius: theme.borderRadius,
            borderWidth: theme.borderWidth,
            fontFamily: theme.fontFamily,
            fontSize: theme.fontSize,
            padding: theme.padding,
        };

        // Handle font string building
        if (this._rawOptions.font) {
            themedOptions.font = this._rawOptions.font;
        } else {
            const fontOptions = {};
            if (this._rawOptions['font-family'] || this._rawOptions.fontFamily) {
                fontOptions.family = this._rawOptions['font-family'] || this._rawOptions.fontFamily;
            }
            if (this._rawOptions['font-size'] || this._rawOptions.fontSize) {
                fontOptions.size = this._rawOptions['font-size'] || this._rawOptions.fontSize;
            }
            if (this._rawOptions['font-weight'] || this._rawOptions.fontWeight) {
                fontOptions.weight = this._rawOptions['font-weight'] || this._rawOptions.fontWeight;
            }
            if (this._rawOptions['font-style'] || this._rawOptions.fontStyle) {
                fontOptions.style = this._rawOptions['font-style'] || this._rawOptions.fontStyle;
            }
            themedOptions.font = BuildFontString(fontOptions, defaultFont);
        }

        // Apply user overrides on top of theme defaults
        this.options = {
            ...themedOptions,
            ...this._rawOptions,
        };

        // Ensure font is set
        if (!this.options.font) {
            this.options.font = BuildFontString({}, defaultFont);
        }
    }

    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
    }

    drawBase(ctx, isFocused) {
        const radius = this.options.borderRadius;

        // Background
        ctx.fillStyle = this.options.controlSurfaceColor;
        if (radius > 0) {
            DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
            ctx.fill();
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Border
        ctx.strokeStyle = isFocused ? this.options.controlFocusBorderColor : this.options.controlBorderColor;
        ctx.lineWidth = this.options.borderWidth;
        if (radius > 0) {
            DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
            ctx.stroke();
        } else {
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    draw(ctx, isFocused) {
        this.drawBase(ctx, isFocused);
    }
}

// Menu Control (vertical or horizontal list of buttons)
export class Menu extends Control {
    constructor(x, y, items, options = {}) {
        const orientation = options.orientation || 'vertical'; // 'vertical' or 'horizontal'
        const gap = options.gap || 0; // Gap between items
        const width = options.width || 200; // Default width for each item
        const height = options.height || 50; // Default height for each item

        let totalWidth, totalHeight;
        if (orientation === 'horizontal') {
            totalWidth = items.length * width + (items.length - 1) * gap;
            totalHeight = height;
        } else {
            totalWidth = width;
            totalHeight = items.length * height + (items.length - 1) * gap;
        }

        // Just call super, do not set menuButtonFontSize here
        super(x, y, totalWidth, totalHeight, options);
        this.itemWidth = width;
        this.itemHeight = height;
        this.items = items;
        this.selectedIndex = 0;
        this.orientation = orientation;
        this.gap = gap;
        this.pressed = false;
        this.pressedTime = 0;
        this.pressedDuration = 300; // milliseconds
    }

    isOverInteractiveArea(x, y) {
        // Check if over any menu item
        for (let i = 0; i < this.items.length; i++) {
            const itemBounds = this.getItemBounds(i);
            if (x >= itemBounds.x && x <= itemBounds.x + itemBounds.width && y >= itemBounds.y && y <= itemBounds.y + itemBounds.height) {
                return true;
            }
        }
        return false;
    }

    handleClick(x, y) {
        for (let i = 0; i < this.items.length; i++) {
            const itemBounds = this.getItemBounds(i);
            if (x >= itemBounds.x && x <= itemBounds.x + itemBounds.width && y >= itemBounds.y && y <= itemBounds.y + itemBounds.height) {
                this.selectedIndex = i;
                this.pressed = true;
                this.pressedTime = 0;
                // Delay callback to allow visual feedback
                if (this.items[i].callback) {
                    setTimeout(() => {
                        this.items[i].callback();
                    }, this.pressedDuration);
                }
                break;
            }
        }
    }

    getItemBounds(index) {
        if (this.orientation === 'horizontal') {
            return {
                x: this.x + index * (this.itemWidth + this.gap),
                y: this.y,
                width: this.itemWidth,
                height: this.itemHeight,
            };
        } else {
            return {
                x: this.x,
                y: this.y + index * (this.itemHeight + this.gap),
                width: this.itemWidth,
                height: this.itemHeight,
            };
        }
    }

    handleKeyDown(e) {
        const isVertical = this.orientation === 'vertical';
        const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
        const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

        if (e.key === prevKey || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
            e.preventDefault();
        } else if (e.key === nextKey || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
            e.preventDefault();
        } else if (e.key === 'Enter' || e.key === ' ') {
            this.pressed = true;
            this.pressedTime = 0;
            // Delay callback to allow visual feedback
            if (this.items[this.selectedIndex].callback) {
                setTimeout(() => {
                    this.items[this.selectedIndex].callback();
                }, this.pressedDuration);
            }
            e.preventDefault();
        }
    }

    handleGamepadLeft() {
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
    }

    handleGamepadRight() {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    }

    activate() {
        this.pressed = true;
        this.pressedTime = 0;
        // Delay callback to allow visual feedback
        if (this.items[this.selectedIndex].callback) {
            setTimeout(() => {
                this.items[this.selectedIndex].callback();
            }, this.pressedDuration);
        }
    }

    update(deltaTime) {
        if (this.pressed) {
            this.pressedTime += deltaTime;
            if (this.pressedTime >= this.pressedDuration) {
                this.pressed = false;
                this.pressedTime = 0;
            }
        }
    }

    draw(ctx, isFocused) {
        const radius = this.options.borderRadius;

        for (let i = 0; i < this.items.length; i++) {
            const bounds = this.getItemBounds(i);
            const isSelected = i === this.selectedIndex;

            // Menu button theme usage
            let fillColor = this.options.menuButtonColor || this.options.controlColor;
            if (isSelected && this.pressed) {
                fillColor = this.options.menuButtonClickColor || this.options.menuButtonActiveColor || this.options.controlClickColor;
            } else if (isSelected && isFocused) {
                fillColor = this.options.menuButtonActiveColor || this.options.controlColor;
            } else if (isSelected) {
                fillColor = this.options.menuButtonColor || this.options.controlColor;
            } else {
                fillColor = this.options.controlSurfaceColor;
            }
            ctx.fillStyle = fillColor;

            if (radius > 0) {
                DrawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, radius);
                ctx.fill();
            } else {
                ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }

            // Border
            let borderColor = this.options.menuButtonBorderColor || this.options.controlBorderColor;
            if (isFocused && isSelected) {
                borderColor = this.options.menuButtonFocusBorderColor || this.options.controlFocusBorderColor;
            }
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = this.options.borderWidth;
            if (radius > 0) {
                DrawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, radius);
                ctx.stroke();
            } else {
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            }

            // Label
            ctx.font = `${this.options.menuButtonFontSize || this.options.fontSize}px ${this.options.fontFamily}`;
            ctx.fillStyle = this.options.controlTextColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.items[i].label, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        }
    }
}

// Toggle Control
export class Toggle extends Control {
    constructor(x, y, label, initialValue, callback, options = {}) {
        const width = options.width || 250; // Default width
        const height = options.height || 50; // Default height
        super(x, y, width, height, options);
        this.label = label;
        this.value = initialValue;
        this.callback = callback;
    }

    isOverInteractiveArea(x, y) {
        // Check if over the toggle switch area, not the entire control
        const switchWidth = 50;
        const switchHeight = 25;
        const switchX = this.x + this.width - switchWidth - this.options.padding;
        const switchY = this.y + (this.height - switchHeight) / 2;

        return x >= switchX && x <= switchX + switchWidth && y >= switchY && y <= switchY + switchHeight;
    }

    handleClick(x, y) {
        this.toggle();
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            this.toggle();
            e.preventDefault();
        }
    }

    activate() {
        this.toggle();
    }

    toggle() {
        this.value = !this.value;
        if (this.callback) {
            this.callback(this.value);
        }
    }

    draw(ctx, isFocused) {
        this.drawBase(ctx, isFocused);

        // Draw label
        ctx.font = this.options.font;
        ctx.fillStyle = this.options.textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x + this.options.padding, this.y + this.height / 2);

        // Draw toggle switch with proper spacing
        const switchWidth = 50;
        const switchHeight = 25;
        const labelPadding = 15; // Space between label and switch
        const rightPadding = 8; // Extra padding from right edge to prevent overlap
        const switchX = this.x + this.width - switchWidth - this.options.padding - rightPadding;
        const switchY = this.y + (this.height - switchHeight) / 2;
        const switchRadius = this.options.borderRadius > 0 ? Math.min(switchHeight / 2, this.options.borderRadius) : switchHeight / 2;

        // Switch background - use controlColor when on, controlSurfaceColor when off
        ctx.fillStyle = this.value ? this.options.controlColor : this.options.controlSurfaceColor;
        DrawRoundedRect(ctx, switchX, switchY, switchWidth, switchHeight, switchRadius);
        ctx.fill();

        // Switch knob - smaller with more padding to prevent overflow
        const knobSize = 18; // Reduced from 20 to 18 to provide more clearance
        const knobPadding = 3; // Increased padding inside the switch track from 2 to 3
        const knobX = this.value ? switchX + switchWidth - knobSize - knobPadding : switchX + knobPadding;
        const knobY = switchY + (switchHeight - knobSize) / 2;
        const knobRadius = this.options.borderRadius > 0 ? Math.min(knobSize / 2, this.options.borderRadius) : knobSize / 2;

        // Knob fill - white when ON, controlColor when OFF
        ctx.fillStyle = this.value ? '#ffffff' : '#cccccc'; // light gray knob when off
        DrawRoundedRect(ctx, knobX, knobY, knobSize, knobSize, knobRadius);
        ctx.fill();

        // Knob border - darker shade for contrast
        ctx.strokeStyle = this.value ? this.options.controlColor : '#888888'; // gray border when off
        ctx.lineWidth = 2;
        DrawRoundedRect(ctx, knobX, knobY, knobSize, knobSize, knobRadius);
        ctx.stroke();

        // Switch border for better contrast in 'off' state
        if (!this.value) {
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 2;
            DrawRoundedRect(ctx, switchX, switchY, switchWidth, switchHeight, switchRadius);
            ctx.stroke();
        }
    }
}

// TextInput Control
export class TextInput extends Control {
    constructor(x, y, placeholder, options = {}) {
        const width = options.width || 300; // Default width
        const height = options.height || 50; // Default height
        super(x, y, width, height, options);
        this.placeholder = placeholder;
        this.value = '';
        this.cursorPos = 0;
        this.cursorVisible = true;
        this.cursorBlinkTime = 0;
    }

    handleClick(x, y) {
        // Calculate cursor position based on click
        const textX = this.x + this.options.padding;
        // For simplicity, just put cursor at end
        this.cursorPos = this.value.length;
    }

    handleKeyDown(e) {
        if (e.key === 'Backspace') {
            if (this.cursorPos > 0) {
                this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
                this.cursorPos--;
            }
            e.preventDefault();
        } else if (e.key === 'Delete') {
            if (this.cursorPos < this.value.length) {
                this.value = this.value.slice(0, this.cursorPos) + this.value.slice(this.cursorPos + 1);
            }
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            this.cursorPos = Math.max(0, this.cursorPos - 1);
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            this.cursorPos = Math.min(this.value.length, this.cursorPos + 1);
            e.preventDefault();
        } else if (e.key === 'Home') {
            this.cursorPos = 0;
            e.preventDefault();
        } else if (e.key === 'End') {
            this.cursorPos = this.value.length;
            e.preventDefault();
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            this.value = this.value.slice(0, this.cursorPos) + e.key + this.value.slice(this.cursorPos);
            this.cursorPos++;
            e.preventDefault();
        }

        this.cursorVisible = true;
        this.cursorBlinkTime = 0;
    }

    update(deltaTime) {
        this.cursorBlinkTime += deltaTime;
        if (this.cursorBlinkTime >= 500) {
            this.cursorVisible = !this.cursorVisible;
            this.cursorBlinkTime = 0;
        }
    }

    draw(ctx, isFocused) {
        this.drawBase(ctx, isFocused);

        // Draw text or placeholder
        ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const textX = this.x + this.options.padding;
        const textY = this.y + this.height / 2;

        if (this.value) {
            ctx.fillStyle = this.options.textColor;
            ctx.fillText(this.value, textX, textY);

            // Draw cursor if focused
            if (isFocused && this.cursorVisible) {
                const textBeforeCursor = this.value.slice(0, this.cursorPos);
                const cursorX = textX + ctx.measureText(textBeforeCursor).width;
                ctx.strokeStyle = this.options.textColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cursorX, this.y + this.options.padding);
                ctx.lineTo(cursorX, this.y + this.height - this.options.padding);
                ctx.stroke();
            }
        } else if (!isFocused) {
            ctx.fillStyle = this.options.controlColor;
            ctx.fillText(this.placeholder, textX, textY);
        } else if (this.cursorVisible) {
            // Draw cursor at start when empty
            ctx.strokeStyle = this.options.textColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(textX, this.y + this.options.padding);
            ctx.lineTo(textX, this.y + this.height - this.options.padding);
            ctx.stroke();
        }
    }
}

// Radio Control
export class Radio extends Control {
    constructor(x, y, items, selectedIndex, label, callback, options = {}) {
        const orientation = options.orientation || 'vertical'; // 'vertical' or 'horizontal'
        const gap = options.gap || 0; // Gap between items
        const width = options.width || 250; // Default width for each item
        const height = options.height || 45; // Default height for each item

        // Calculate label height if label is provided
        const labelHeight = label ? 30 : 0; // Height to reserve for label

        let totalWidth, totalHeight;
        if (orientation === 'horizontal') {
            totalWidth = items.length * width + (items.length - 1) * gap;
            totalHeight = height + labelHeight;
        } else {
            totalWidth = width;
            totalHeight = items.length * height + (items.length - 1) * gap + labelHeight;
        }

        super(x, y, totalWidth, totalHeight, options);
        this.itemWidth = width;
        this.itemHeight = height;
        this.items = items;
        this.selectedIndex = selectedIndex;
        this.label = label;
        this.labelHeight = labelHeight;
        this.callback = callback;
        this.orientation = orientation;
        this.gap = gap;
    }

    getItemBounds(index) {
        if (this.orientation === 'horizontal') {
            return {
                x: this.x + index * (this.itemWidth + this.gap),
                y: this.y + this.labelHeight,
                width: this.itemWidth,
                height: this.itemHeight,
            };
        } else {
            return {
                x: this.x,
                y: this.y + this.labelHeight + index * (this.itemHeight + this.gap),
                width: this.itemWidth,
                height: this.itemHeight,
            };
        }
    }

    isOverInteractiveArea(x, y) {
        // Check if over any radio button circle
        const radioSize = 16;
        for (let i = 0; i < this.items.length; i++) {
            const bounds = this.getItemBounds(i);
            const radioX = bounds.x + this.options.padding + radioSize / 2;
            const radioY = bounds.y + bounds.height / 2;

            // Check if mouse is within the radio button circle area (a bit larger for easier clicking)
            const distance = Math.sqrt(Math.pow(x - radioX, 2) + Math.pow(y - radioY, 2));
            if (distance <= radioSize) {
                return true;
            }
        }
        return false;
    }

    handleClick(x, y) {
        for (let i = 0; i < this.items.length; i++) {
            const bounds = this.getItemBounds(i);
            if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
                this.selectedIndex = i;
                if (this.callback) {
                    this.callback(this.selectedIndex, this.items[this.selectedIndex]);
                }
                break;
            }
        }
    }

    handleKeyDown(e) {
        const isVertical = this.orientation === 'vertical';
        const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
        const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

        if (e.key === prevKey) {
            this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
            if (this.callback) {
                this.callback(this.selectedIndex, this.items[this.selectedIndex]);
            }
            e.preventDefault();
        } else if (e.key === nextKey) {
            this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
            if (this.callback) {
                this.callback(this.selectedIndex, this.items[this.selectedIndex]);
            }
            e.preventDefault();
        }
    }

    handleGamepadLeft() {
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
        if (this.callback) {
            this.callback(this.selectedIndex, this.items[this.selectedIndex]);
        }
    }

    handleGamepadRight() {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        if (this.callback) {
            this.callback(this.selectedIndex, this.items[this.selectedIndex]);
        }
    }

    draw(ctx, isFocused) {
        const radius = this.options.borderRadius;

        // Draw background for entire control with rounded corners
        ctx.fillStyle = this.options.controlSurfaceColor;
        if (radius > 0) {
            DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
            ctx.fill();
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Draw label at top-left if provided
        if (this.label) {
            ctx.font = this.options.font;
            ctx.fillStyle = this.options.textColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(this.label, this.x + this.options.padding, this.y + this.options.padding);
        }

        // Draw individual radio items
        for (let i = 0; i < this.items.length; i++) {
            const bounds = this.getItemBounds(i);
            const isSelected = i === this.selectedIndex;

            // Radio button circle
            const radioSize = 16;
            const radioX = bounds.x + this.options.padding + radioSize / 2;
            const radioY = bounds.y + bounds.height / 2;

            ctx.strokeStyle = this.options.controlBorderColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(radioX, radioY, radioSize / 2, 0, Math.PI * 2);
            ctx.stroke();

            // Fill if selected - use controlColor
            if (isSelected) {
                ctx.fillStyle = this.options.controlColor;
                ctx.beginPath();
                ctx.arc(radioX, radioY, radioSize / 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Label
            ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
            ctx.fillStyle = this.options.controlTextColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.items[i], radioX + radioSize, radioY);
        }

        // Draw outer border around entire control
        ctx.strokeStyle = isFocused ? this.options.controlFocusBorderColor : this.options.controlBorderColor;
        ctx.lineWidth = this.options.borderWidth;
        if (radius > 0) {
            DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
            ctx.stroke();
        } else {
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}

// Carousel Control
export class Carousel extends Control {
    constructor(x, y, items, selectedIndex, label, callback, options = {}) {
        const orientation = options.orientation || 'horizontal';
        const width = options.width || 250;
        const height = options.height || 60;

        super(x, y, width, height, options);
        this.items = items;
        this.selectedIndex = selectedIndex;
        this.label = label;
        this.callback = callback;
        this.orientation = orientation;
        this.arrowSize = options.arrowSize || 12;
    }

    getArrowBounds() {
        if (this.orientation === 'horizontal') {
            return {
                left: {
                    x: this.x + this.options.padding,
                    y: this.y,
                    width: this.arrowSize * 2,
                    height: this.height,
                },
                right: {
                    x: this.x + this.width - this.options.padding - this.arrowSize * 2,
                    y: this.y,
                    width: this.arrowSize * 2,
                    height: this.height,
                },
            };
        } else {
            return {
                up: {
                    x: this.x,
                    y: this.y + this.options.padding,
                    width: this.width,
                    height: this.arrowSize * 2,
                },
                down: {
                    x: this.x,
                    y: this.y + this.height - this.options.padding - this.arrowSize * 2,
                    width: this.width,
                    height: this.arrowSize * 2,
                },
            };
        }
    }

    containsPointInBounds(x, y, bounds) {
        return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
    }

    isOverInteractiveArea(x, y) {
        const arrows = this.getArrowBounds();
        if (this.orientation === 'horizontal') {
            return this.containsPointInBounds(x, y, arrows.left) || this.containsPointInBounds(x, y, arrows.right);
        } else {
            return this.containsPointInBounds(x, y, arrows.up) || this.containsPointInBounds(x, y, arrows.down);
        }
    }

    handleClick(x, y) {
        const arrows = this.getArrowBounds();
        if (this.orientation === 'horizontal') {
            if (this.containsPointInBounds(x, y, arrows.left)) {
                this.selectPrevious();
            } else if (this.containsPointInBounds(x, y, arrows.right)) {
                this.selectNext();
            }
        } else {
            if (this.containsPointInBounds(x, y, arrows.up)) {
                this.selectPrevious();
            } else if (this.containsPointInBounds(x, y, arrows.down)) {
                this.selectNext();
            }
        }
    }

    selectPrevious() {
        this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
        if (this.callback) {
            this.callback(this.selectedIndex, this.items[this.selectedIndex]);
        }
    }

    selectNext() {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        if (this.callback) {
            this.callback(this.selectedIndex, this.items[this.selectedIndex]);
        }
    }

    handleKeyDown(e) {
        if (this.orientation === 'horizontal') {
            if (e.key === 'ArrowLeft') {
                this.selectPrevious();
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                this.selectNext();
                e.preventDefault();
            }
        } else {
            if (e.key === 'ArrowUp') {
                this.selectPrevious();
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                this.selectNext();
                e.preventDefault();
            }
        }
    }

    handleGamepadLeft() {
        this.selectPrevious();
    }

    handleGamepadRight() {
        this.selectNext();
    }

    drawTriangle(ctx, centerX, centerY, direction) {
        const size = this.arrowSize;

        ctx.fillStyle = this.options.controlColor;
        ctx.beginPath();

        if (direction === 'left') {
            ctx.moveTo(centerX + size / 2, centerY - size / 2);
            ctx.lineTo(centerX + size / 2, centerY + size / 2);
            ctx.lineTo(centerX - size / 2, centerY);
        } else if (direction === 'right') {
            ctx.moveTo(centerX - size / 2, centerY - size / 2);
            ctx.lineTo(centerX - size / 2, centerY + size / 2);
            ctx.lineTo(centerX + size / 2, centerY);
        } else if (direction === 'up') {
            ctx.moveTo(centerX - size / 2, centerY + size / 2);
            ctx.lineTo(centerX + size / 2, centerY + size / 2);
            ctx.lineTo(centerX, centerY - size / 2);
        } else if (direction === 'down') {
            ctx.moveTo(centerX - size / 2, centerY - size / 2);
            ctx.lineTo(centerX + size / 2, centerY - size / 2);
            ctx.lineTo(centerX, centerY + size / 2);
        }

        ctx.closePath();
        ctx.fill();
    }

    draw(ctx, isFocused) {
        const radius = this.options.borderRadius;

        // Draw background
        ctx.fillStyle = this.options.controlSurfaceColor;
        if (radius > 0) {
            DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
            ctx.fill();
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Calculate the vertical center for carousel content
        // If label exists, position content below it with proper spacing
        let contentCenterY;
        let labelHeight = 0;
        let contentStartY = this.y; // For vertical orientation arrow positioning

        if (this.label) {
            // Draw label at top-left
            ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
            ctx.fillStyle = this.options.controlTextColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(this.label, this.x + this.options.padding, this.y + this.options.padding);

            // Calculate label height and spacing
            const metrics = ctx.measureText(this.label);
            // Use 16 as fallback approximation (standard font height) if metrics not available
            const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || 16;
            labelHeight = textHeight + this.options.padding * 1.0; // label height + reduced spacing
            contentStartY = this.y + labelHeight;

            // Center content in remaining space below label
            const remainingHeight = this.height - labelHeight;
            contentCenterY = contentStartY + remainingHeight / 2;
        } else {
            // No label - center content vertically in entire control
            contentCenterY = this.y + this.height / 2;
        }

        if (this.orientation === 'horizontal') {
            // Draw left arrow
            const leftArrowX = this.x + this.options.padding + this.arrowSize;
            this.drawTriangle(ctx, leftArrowX, contentCenterY, 'left');

            // Draw right arrow
            const rightArrowX = this.x + this.width - this.options.padding - this.arrowSize;
            this.drawTriangle(ctx, rightArrowX, contentCenterY, 'right');

            // Draw current value in center
            ctx.font = this.options.font;
            ctx.fillStyle = this.options.textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.items[this.selectedIndex], this.x + this.width / 2, contentCenterY);
        } else {
            // Vertical orientation - position arrows within content area (below label if present)
            const contentHeight = this.height - labelHeight;
            const upArrowX = this.x + this.width / 2;
            const upArrowY = contentStartY + this.options.padding + this.arrowSize;
            this.drawTriangle(ctx, upArrowX, upArrowY, 'up');

            // Down arrow positioned from bottom of content area
            const downArrowX = this.x + this.width / 2;
            const downArrowY = this.y + this.height - this.options.padding - this.arrowSize;
            this.drawTriangle(ctx, downArrowX, downArrowY, 'down');

            // Draw current value in center of content area
            ctx.font = this.options.font;
            ctx.fillStyle = this.options.textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.items[this.selectedIndex], this.x + this.width / 2, contentCenterY);
        }

        // Draw border
        ctx.strokeStyle = isFocused ? this.options.controlFocusBorderColor : this.options.controlBorderColor;
        ctx.lineWidth = this.options.borderWidth;
        if (radius > 0) {
            DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
            ctx.stroke();
        } else {
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}

// Slider Control
export class Slider extends Control {
    constructor(x, y, min, max, value, step, label, callback, options = {}) {
        const width = options.width || 300; // Default width
        const height = options.height || 80; // Default height
        super(x, y, width, height, options);
        this.min = min;
        this.max = max;
        this.value = value;
        this.step = step;
        this.label = label;
        this.callback = callback;
        this.dragging = false;
    }

    isOverInteractiveArea(x, y) {
        // Check if over the slider track or knob area
        const trackY = this.y + this.height / 2;
        const trackX = this.x + this.options.padding;
        const trackWidth = this.width - this.options.padding * 2;
        const trackHeight = 4;

        // Calculate knob position
        const percent = (this.value - this.min) / (this.max - this.min);
        const knobSize = 20;
        const knobX = trackX + trackWidth * percent - knobSize / 2;
        const knobY = trackY - knobSize / 2;

        // Check if over knob (with some extra margin for easier interaction)
        const knobMargin = 5;
        if (x >= knobX - knobMargin && x <= knobX + knobSize + knobMargin && y >= knobY - knobMargin && y <= knobY + knobSize + knobMargin) {
            return true;
        }

        // Check if over track
        if (x >= trackX && x <= trackX + trackWidth && y >= trackY - trackHeight * 2 && y <= trackY + trackHeight * 2) {
            return true;
        }

        return false;
    }

    handleClick(x, y) {
        this.updateValueFromX(x);
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') {
            this.value = Math.max(this.min, this.value - this.step);
            if (this.callback) {
                this.callback(this.value);
            }
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            this.value = Math.min(this.max, this.value + this.step);
            if (this.callback) {
                this.callback(this.value);
            }
            e.preventDefault();
        }
    }

    handleGamepadAxis(direction) {
        if (direction < 0) {
            this.value = Math.max(this.min, this.value - this.step);
        } else {
            this.value = Math.min(this.max, this.value + this.step);
        }
        if (this.callback) {
            this.callback(this.value);
        }
    }

    updateValueFromX(x) {
        const sliderX = this.x + this.options.padding;
        const sliderWidth = this.width - this.options.padding * 2;
        const percent = Math.max(0, Math.min(1, (x - sliderX) / sliderWidth));

        let newValue = this.min + percent * (this.max - this.min);
        newValue = Math.round(newValue / this.step) * this.step;
        newValue = Math.max(this.min, Math.min(this.max, newValue));

        if (newValue !== this.value) {
            this.value = newValue;
            if (this.callback) {
                this.callback(this.value);
            }
        }
    }

    draw(ctx, isFocused) {
        this.drawBase(ctx, isFocused);

        // Draw label
        ctx.font = this.options.font;
        ctx.fillStyle = this.options.textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this.label, this.x + this.options.padding, this.y + this.options.padding);

        // Draw slider track
        const trackY = this.y + this.height / 2;
        const trackX = this.x + this.options.padding;
        const trackWidth = this.width - this.options.padding * 2;
        const trackHeight = 4;
        const trackRadius = this.options.borderRadius > 0 ? Math.min(trackHeight / 2, this.options.borderRadius / 2) : trackHeight / 2;

        ctx.fillStyle = '#666666';
        DrawRoundedRect(ctx, trackX, trackY - trackHeight / 2, trackWidth, trackHeight, trackRadius);
        ctx.fill();

        // Draw filled portion - use controlColor for active part
        const percent = (this.value - this.min) / (this.max - this.min);
        ctx.fillStyle = this.options.controlColor;
        DrawRoundedRect(ctx, trackX, trackY - trackHeight / 2, trackWidth * percent, trackHeight, trackRadius);
        ctx.fill();

        // Draw slider knob - use controlColor to match the filled track
        const knobSize = 20;
        // Calculate knob position based on value percentage
        const knobCenterX = trackX + trackWidth * percent;
        const knobLeftEdge = knobCenterX - knobSize / 2;
        // Constrain knob position to stay within control borders
        const minKnobX = trackX;
        const maxKnobX = trackX + trackWidth - knobSize;
        const knobX = Math.max(minKnobX, Math.min(maxKnobX, knobLeftEdge));
        const knobY = trackY - knobSize / 2;
        const knobRadius = this.options.borderRadius > 0 ? Math.min(knobSize / 2, this.options.borderRadius) : knobSize / 2;

        ctx.fillStyle = this.options.controlColor;
        DrawRoundedRect(ctx, knobX, knobY, knobSize, knobSize, knobRadius);
        ctx.fill();

        // Use controlColor for knob border to match the control, regardless of focus state
        ctx.strokeStyle = this.options.controlColor;
        ctx.lineWidth = 2;
        DrawRoundedRect(ctx, knobX, knobY, knobSize, knobSize, knobRadius);
        ctx.stroke();

        // Draw value
        ctx.font = this.options.font;
        ctx.fillStyle = this.options.textColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.value.toString(), this.x + this.width - this.options.padding, this.y + this.height - this.options.padding);
    }
}

// Panel Control - for grouping other controls with a background
export class Panel extends Control {
    constructor(x, y, options = {}) {
        const width = options.width || 500; // Default width
        const height = options.height || 500; // Default height
        // If manager is available, get theme values
        let themePanelSurfaceColor, themePanelBorderColor;
        if (options.manager && options.manager.theme) {
            themePanelSurfaceColor = options.manager.theme.panelSurfaceColor;
            themePanelBorderColor = options.manager.theme.panelBorderColor;
        }
        super(x, y, width, height, {
            ...options,
            panelSurfaceColor: options.panelSurfaceColor || themePanelSurfaceColor,
            panelBorderColor: options.panelBorderColor || themePanelBorderColor,
        });
    }

    draw(ctx, isFocused) {
        const radius = this.options.borderRadius || 0;

        // Background - use backgroundColor if provided, otherwise fall back to panelSurfaceColor, then controlSurfaceColor
        ctx.fillStyle = this.options.backgroundColor || this.options.panelSurfaceColor || this.options.controlSurfaceColor;
        if (radius > 0) {
            DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
            ctx.fill();
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // Optional border - use borderColor if provided, otherwise fall back to panelBorderColor, then controlBorderColor
        if (this.options.borderWidth > 0) {
            ctx.strokeStyle = this.options.borderColor || this.options.panelBorderColor || this.options.controlBorderColor;
            ctx.lineWidth = this.options.borderWidth;
            if (radius > 0) {
                DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
                ctx.stroke();
            } else {
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        }
    }

    // Panels don't receive focus or input
    containsPoint(x, y) {
        return false;
    }
}

// Modal Dialog
export class Modal {
    constructor(manager, title, message, buttons = [], options = {}) {
        this.manager = manager;
        this.title = title;
        this.message = message;
        this.buttons = buttons.length > 0 ? buttons : [{ label: 'OK', callback: () => this.close() }];

        // Support custom escape button label
        this.escapeButtonLabel = options.escapeButtonLabel || null;

        // Color and style configuration - use theme modal attributes, allow override
        const theme = manager.theme;
        this.colors = {
            modalSurfaceColor: options.modalSurfaceColor || theme.modalSurfaceColor,
            modalBorderColor: options.modalBorderColor || theme.modalBorderColor,
            modalTextColor: options.modalTextColor || theme.modalTextColor,
            modalText2Color: options.modalText2Color || theme.modalText2Color,

            menuButtonColor: options.menuButtonColor || theme.menuButtonColor,
            menuButtonActiveColor: options.menuButtonActiveColor || theme.menuButtonActiveColor,
            menuButtonClickColor: options.menuButtonClickColor || theme.menuButtonClickColor,
            menuButtonBorderColor: options.menuButtonBorderColor || theme.menuButtonBorderColor,
            menuButtonFocusBorderColor: options.menuButtonFocusBorderColor || theme.menuButtonFocusBorderColor,
        };

        this.textFontColor = options.textFontColor || theme.controlTextColor;
        this.textFontSize = options.modalTextFontSize || theme.modalTextFontSize;
        this.text2FontColor = options.text2FontColor || theme.controlTextColor;
        this.text2FontSize = options.modalText2FontSize || theme.modalText2FontSize;

        // Style configuration
        this.borderWidth = options.borderWidth || theme.borderWidth;
        this.borderRadius = options.borderRadius || theme.borderRadius;

        // Calculate dimensions - allow custom sizing
        const canvas = manager.canvas;
        this.overlayAlpha = 0.7;

        // Use provided dimensions or calculate based on content
        if (options.width && options.height) {
            this.width = Math.min(options.width, canvas.width * 0.9);
            this.height = Math.min(options.height, canvas.height * 0.9);
        } else {
            // Auto-size based on content
            const ctx = canvas.getContext('2d');
            ctx.font = '18px Arial';
            const words = message.split(' ');
            const maxWidth = Math.min(600, canvas.width * 0.8) - 40;
            let lineCount = 1;
            let line = '';

            for (let word of words) {
                const testLine = line + word + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && line !== '') {
                    lineCount++;
                    line = word + ' ';
                } else {
                    line = testLine;
                }
            }

            // Calculate height based on content
            const titleHeight = 60;
            const messageHeight = lineCount * 25 + 40;
            const buttonsHeight = 90;
            const minHeight = 200;

            this.height = Math.max(minHeight, Math.min(titleHeight + messageHeight + buttonsHeight, canvas.height * 0.8));
            this.width = Math.min(600, canvas.width * 0.8);
        }

        this.x = (canvas.width - this.width) / 2;
        this.y = (canvas.height - this.height) / 2;

        // Create Menu control for buttons
        const buttonHeight = 50;
        const buttonWidth = 150;
        const buttonSpacing = 20;
        const totalButtonWidth = this.buttons.length * buttonWidth + (this.buttons.length - 1) * buttonSpacing;
        const buttonsX = this.x + (this.width - totalButtonWidth) / 2;
        const buttonsY = this.y + this.height - buttonHeight - 20;

        // Convert button array to menu items format with wrapper callbacks
        const menuItems = this.buttons.map((button) => ({
            label: button.label,
            callback: () => {
                if (button.callback) {
                    button.callback();
                }
                this.close();
            },
        }));

        // Create menu with custom styling to match modal theme
        const { menuButtonColor, menuButtonActiveColor, menuButtonClickColor, menuButtonBorderColor, menuButtonFocusBorderColor } = options;
        this.buttonMenu = new Menu(buttonsX, buttonsY, menuItems, {
            orientation: 'horizontal',
            width: buttonWidth,
            height: buttonHeight,
            gap: buttonSpacing,
            menuButtonColor: menuButtonColor || manager.theme.menuButtonColor,
            menuButtonActiveColor: menuButtonActiveColor || manager.theme.menuButtonActiveColor,
            menuButtonClickColor: menuButtonClickColor || manager.theme.menuButtonClickColor,
            menuButtonBorderColor: menuButtonBorderColor || manager.theme.menuButtonBorderColor,
            menuButtonFocusBorderColor: menuButtonFocusBorderColor || manager.theme.menuButtonFocusBorderColor,
            menuButtonFontSize: options.menuButtonFontSize || manager.theme.menuButtonFontSize,
            controlTextColor: this.textFontColor,
            fontSize: this.textFontSize,
            borderWidth: this.borderWidth,
            borderRadius: this.borderRadius,
            padding: 10,
        });

        // Set manager for the menu to enable theme application
        this.buttonMenu.manager = manager;
        this.buttonMenu.applyTheme();
    }

    handleClick(x, y) {
        // Delegate click handling to the menu
        if (this.buttonMenu.isOverInteractiveArea(x, y)) {
            this.buttonMenu.handleClick(x, y);
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            // Use escapeButtonLabel if provided, else fallback to default
            let escapeBtn = null;
            if (this.escapeButtonLabel) {
                escapeBtn = this.buttons.find((b) => b.label.toLowerCase() === this.escapeButtonLabel.toLowerCase());
            } else {
                escapeBtn = this.buttons.find((b) => ['exit', 'close', 'cancel'].includes(b.label.toLowerCase()));
            }
            if (escapeBtn && escapeBtn.callback) escapeBtn.callback();
            this.close();
            e.preventDefault();
        } else {
            // Delegate all other key handling to the menu
            this.buttonMenu.handleKeyDown(e);
        }
    }

    handleGamepadButton(buttonIndex) {
        // Button 1 (B/Circle) = Exit/Cancel like ESC
        if (buttonIndex === 1) {
            const exitButton = this.buttons.find(
                (b) => b.label.toLowerCase() === 'exit' || b.label.toLowerCase() === 'close' || b.label.toLowerCase() === 'cancel'
            );
            if (exitButton && exitButton.callback) {
                exitButton.callback();
            }
            this.close();
        } else {
            // Delegate gamepad handling to the menu
            if (buttonIndex === 0) {
                this.buttonMenu.activate();
            } else if (buttonIndex === 14) {
                this.buttonMenu.handleGamepadLeft();
            } else if (buttonIndex === 15) {
                this.buttonMenu.handleGamepadRight();
            }
        }
    }

    close() {
        this.manager.closeModal(this);
    }

    update(deltaTime) {
        // Update the button menu
        if (this.buttonMenu.update) {
            this.buttonMenu.update(deltaTime);
        }
    }

    isOverButton(x, y) {
        // Check if over the button menu
        return this.buttonMenu.isOverInteractiveArea(x, y);
    }

    draw(ctx) {
        const modalRadius = this.borderRadius;

        // Draw overlay
        ctx.fillStyle = `rgba(0, 0, 0, ${this.overlayAlpha})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw modal background
        ctx.fillStyle = this.colors.modalSurfaceColor;
        DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, modalRadius);
        ctx.fill();

        // Draw border
        ctx.strokeStyle = this.colors.modalBorderColor;
        ctx.lineWidth = this.borderWidth;
        DrawRoundedRect(ctx, this.x, this.y, this.width, this.height, modalRadius);
        ctx.stroke();

        // Draw title
        ctx.font = `bold 24px Arial`;
        ctx.fillStyle = this.colors.modalTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.title, this.x + this.width / 2, this.y + 20);

        // Draw message (main text)
        ctx.font = `${this.textFontSize}px Arial`;
        ctx.fillStyle = this.colors.modalTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Word wrap message
        const maxWidth = this.width - 40;
        const lineHeight = this.textFontSize + 7;
        const words = this.message.split(' ');
        let line = '';
        let y = this.y + 80;

        for (let word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line, this.x + this.width / 2, y);
                line = word + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, this.x + this.width / 2, y);

        // Optionally draw secondary text if provided in this.options
        if (this.colors.modalText2Color && this.options && this.options.text2) {
            ctx.font = `${this.text2FontSize}px Arial`;
            ctx.fillStyle = this.colors.modalText2Color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(this.options.text2, this.x + this.width / 2, y + lineHeight + 10);
        }

        // Draw the button menu (it handles all button rendering)
        if (this.buttonMenu && this.buttonMenu.draw) {
            this.buttonMenu.draw(ctx, true); // Always draw as focused since modal has focus
        }
    }
}

// Toast Notification
// Toast Notification class
export class Toast {
    constructor(manager, message, type, duration) {
        this.manager = manager;
        this.message = message;
        this.type = type;
        this.duration = duration;

        this.width = 300;
        this.height = 80;
        this.padding = 15;

        // Type-specific colors and icons
        this.typeConfig = {
            info: { color: '#2196F3', icon: 'ℹ' },
            success: { color: '#4CAF50', icon: '✓' },
            warning: { color: '#FF9800', icon: '⚠' },
            error: { color: '#F44336', icon: '✕' },
        };

        this.config = this.typeConfig[type] || this.typeConfig.info;
    }

    draw(ctx, index) {
        const canvas = ctx.canvas;
        const x = canvas.width - this.width - 20;
        const y = 20 + index * (this.height + 10);

        // Background
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x, y, this.width, this.height);

        // Border with type color
        ctx.strokeStyle = this.config.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, this.width, this.height);

        // Icon circle
        const iconSize = 40;
        const iconX = x + this.padding + iconSize / 2;
        const iconY = y + this.height / 2;

        ctx.fillStyle = this.config.color;
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.icon, iconX, iconY);

        // Message
        ctx.font = '14px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Word wrap
        const maxWidth = this.width - iconSize - this.padding * 3;
        const messageX = x + iconSize + this.padding * 2;
        const words = this.message.split(' ');
        let line = '';
        let lines = [];

        for (let word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                lines.push(line);
                line = word + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // Draw lines centered vertically
        const lineHeight = 18;
        const totalHeight = lines.length * lineHeight;
        let messageY = y + (this.height - totalHeight) / 2 + lineHeight / 2;

        for (let line of lines) {
            ctx.fillText(line.trim(), messageX, messageY);
            messageY += lineHeight;
        }
    }
}
