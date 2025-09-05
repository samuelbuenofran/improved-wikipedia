// Enhanced Liquid Glass Floating Menu - Minerva (Mobile)

(function() {
    'use strict';
    
    // Configuration for Minerva theme
    const CONFIG = {
        themes: {
            'default': { bg: '#ffffff', text: '#000000', accent: '#0645ad' },
            'dark': { bg: '#1a1a1a', text: '#ffffff', accent: '#4a90e2' },
            'sepia': { bg: '#f4f1ea', text: '#5c4b37', accent: '#8b4513' },
            'blue': { bg: '#e6f3ff', text: '#003d6b', accent: '#0066cc' },
            'green': { bg: '#f0f8f0', text: '#2d5a2d', accent: '#228b22' }
        },
        fonts: {
            'default': 'system-ui, -apple-system, sans-serif',
            'serif': 'Georgia, "Times New Roman", serif',
            'mono': 'Consolas, "Courier New", monospace',
            'dyslexic': 'OpenDyslexic, Arial, sans-serif'
        },
        darkThemes: ['dark'],
        transitions: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        selectors: {
            content: '.mw-body-content, .content, main',
            header: '.minerva-header, header',
            footer: '.minerva-footer, footer',
            sidebar: '.minerva-navigation, nav'
        }
    };
    
    // Cache and state management
    const cache = new Map();
    const state = {
        currentTheme: 'default',
        currentFont: 'default',
        readMode: false,
        citationsHidden: false,
        menuCollapsed: false,
        isDragging: false,
        touchStartPos: null
    };
    
    // DOM element references
    let elements = {
        menu: null,
        statusBar: null,
        content: null,
        header: null,
        footer: null
    };
    
    // Utility functions
    const getElement = (selector) => {
        if (cache.has(selector)) return cache.get(selector);
        const element = document.querySelector(selector);
        if (element) cache.set(selector, element);
        return element;
    };
    
    const batchUpdateStyles = (element, styles) => {
        if (!element) return;
        Object.assign(element.style, styles);
    };
    
    const safeLocalStorage = {
        get: (key, defaultValue = null) => {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {}
        }
    };
    
    // Mobile-specific utilities
    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };
    
    const addTransition = (element, property = 'all') => {
        if (element) {
            element.style.transition = `${property} ${CONFIG.transitions}`;
        }
    };
    
    // Core theme functions
    const applyTheme = (themeName) => {
        const theme = CONFIG.themes[themeName];
        if (!theme) return;
        
        state.currentTheme = themeName;
        const isDark = CONFIG.darkThemes.includes(themeName);
        
        // Apply theme to document
        document.documentElement.style.setProperty('--wiki-bg-color', theme.bg);
        document.documentElement.style.setProperty('--wiki-text-color', theme.text);
        document.documentElement.style.setProperty('--wiki-accent-color', theme.accent);
        
        // Toggle dark theme class
        document.body.classList.toggle('wiki-dark-theme', isDark);
        
        // Apply to content areas
        const contentSelectors = CONFIG.selectors.content.split(', ');
        contentSelectors.forEach(selector => {
            const element = getElement(selector);
            if (element) {
                batchUpdateStyles(element, {
                    backgroundColor: theme.bg,
                    color: theme.text
                });
                addTransition(element, 'background-color, color');
            }
        });
        
        updateMenuColors();
        safeLocalStorage.set('wiki-theme', themeName);
        showStatus(`Theme: ${themeName}`);
    };
    
    const updateMenuColors = () => {
        if (!elements.menu) return;
        
        const isDark = CONFIG.darkThemes.includes(state.currentTheme);
        const menuBg = isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.1)';
        const itemBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)';
        
        batchUpdateStyles(elements.menu, {
            background: menuBg,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'
        });
        
        const menuItems = elements.menu.querySelectorAll('.wiki-menu-item');
        menuItems.forEach(item => {
            if (!item.classList.contains('active')) {
                item.style.background = itemBg;
            }
        });
    };
    
    // Font application
    const applyFont = (fontName) => {
        const font = CONFIG.fonts[fontName];
        if (!font) return;
        
        state.currentFont = fontName;
        
        const contentSelectors = CONFIG.selectors.content.split(', ');
        contentSelectors.forEach(selector => {
            const element = getElement(selector);
            if (element) {
                element.style.fontFamily = font;
                addTransition(element, 'font-family');
            }
        });
        
        safeLocalStorage.set('wiki-font', fontName);
        showStatus(`Font: ${fontName}`);
    };
    
    // Enhanced mode functions
    const toggleReadMode = () => {
        state.readMode = !state.readMode;
        document.body.classList.toggle('wiki-read-mode', state.readMode);
        
        // Minerva-specific read mode adjustments
        const minervaElements = [
            '.minerva-header',
            '.last-modified-bar',
            '.post-content',
            '.minerva-footer'
        ];
        
        minervaElements.forEach(selector => {
            const element = getElement(selector);
            if (element) {
                element.style.display = state.readMode ? 'none' : '';
                addTransition(element, 'opacity');
            }
        });
        
        safeLocalStorage.set('wiki-read-mode', state.readMode);
        showStatus(`Read Mode: ${state.readMode ? 'ON' : 'OFF'}`);
        updateMenuItemState('read-mode', state.readMode);
    };
    
    const toggleCitations = () => {
        state.citationsHidden = !state.citationsHidden;
        
        const citations = document.querySelectorAll('.reference, .cite, sup[id^="cite_ref"], .reflist');
        citations.forEach(citation => {
            citation.style.display = state.citationsHidden ? 'none' : '';
            addTransition(citation, 'opacity');
        });
        
        safeLocalStorage.set('wiki-citations-hidden', state.citationsHidden);
        showStatus(`Citations: ${state.citationsHidden ? 'HIDDEN' : 'VISIBLE'}`);
        updateMenuItemState('citations', !state.citationsHidden);
    };
    
    const toggleMenuCollapse = () => {
        state.menuCollapsed = !state.menuCollapsed;
        elements.menu.classList.toggle('collapsed', state.menuCollapsed);
        safeLocalStorage.set('wiki-menu-collapsed', state.menuCollapsed);
    };
    
    // Status and UI functions
    const showStatus = (message) => {
        if (!elements.statusBar) return;
        
        elements.statusBar.innerHTML = `<span class="material-icons" style="font-size: 16px; margin-right: 8px;">info</span>${message}`;
        elements.statusBar.classList.add('show');
        
        setTimeout(() => {
            elements.statusBar.classList.remove('show');
        }, 2000);
    };
    
    const updateMenuItemState = (itemId, isActive) => {
        const item = elements.menu?.querySelector(`[data-action="${itemId}"]`);
        if (item) {
            item.classList.toggle('active', isActive);
        }
    };
    
    // Preference management
    const restorePreferences = () => {
        const savedTheme = safeLocalStorage.get('wiki-theme', 'default');
        const savedFont = safeLocalStorage.get('wiki-font', 'default');
        const savedReadMode = safeLocalStorage.get('wiki-read-mode', false);
        const savedCitationsHidden = safeLocalStorage.get('wiki-citations-hidden', false);
        const savedMenuCollapsed = safeLocalStorage.get('wiki-menu-collapsed', false);
        
        applyTheme(savedTheme);
        applyFont(savedFont);
        
        if (savedReadMode) toggleReadMode();
        if (savedCitationsHidden) toggleCitations();
        if (savedMenuCollapsed) toggleMenuCollapse();
    };
    
    // Mobile drag functionality
    const saveMenuPosition = () => {
        if (!elements.menu) return;
        const rect = elements.menu.getBoundingClientRect();
        safeLocalStorage.set('wiki-menu-position', {
            top: rect.top,
            left: rect.left
        });
    };
    
    const restoreMenuPosition = () => {
        const position = safeLocalStorage.get('wiki-menu-position');
        if (position && elements.menu) {
            batchUpdateStyles(elements.menu, {
                top: `${Math.max(10, Math.min(position.top, window.innerHeight - 100))}px`,
                left: `${Math.max(10, Math.min(position.left, window.innerWidth - 100))}px`,
                right: 'auto'
            });
        }
    };
    
    // Touch event handlers
    const handleTouchStart = (e) => {
        if (e.target.closest('.wiki-menu-item')) return;
        
        state.isDragging = true;
        state.touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            menuX: elements.menu.offsetLeft,
            menuY: elements.menu.offsetTop
        };
        
        elements.menu.style.transition = 'none';
        e.preventDefault();
    };
    
    const handleTouchMove = (e) => {
        if (!state.isDragging || !state.touchStartPos) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - state.touchStartPos.x;
        const deltaY = touch.clientY - state.touchStartPos.y;
        
        const newX = Math.max(0, Math.min(state.touchStartPos.menuX + deltaX, window.innerWidth - elements.menu.offsetWidth));
        const newY = Math.max(0, Math.min(state.touchStartPos.menuY + deltaY, window.innerHeight - elements.menu.offsetHeight));
        
        batchUpdateStyles(elements.menu, {
            left: `${newX}px`,
            top: `${newY}px`,
            right: 'auto'
        });
        
        e.preventDefault();
    };
    
    const handleTouchEnd = () => {
        if (!state.isDragging) return;
        
        state.isDragging = false;
        state.touchStartPos = null;
        elements.menu.style.transition = CONFIG.transitions;
        saveMenuPosition();
    };
    
    // Interface creation
    const createFloatingMenu = () => {
        // Load Material Icons
        if (!document.querySelector('link[href*="material-icons"]')) {
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        
        const menu = document.createElement('div');
        menu.className = 'wiki-floating-menu';
        menu.innerHTML = `
            <button class="wiki-menu-toggle" onclick="toggleMenuCollapse()">
                <span class="material-icons">menu</span>
            </button>
            ${createMenuButton('palette', 'Theme', 'theme')}
            ${createMenuButton('text_fields', 'Font', 'font')}
            ${createMenuButton('chrome_reader_mode', 'Read Mode', 'read-mode')}
            ${createMenuButton('format_quote', 'Citations', 'citations')}
            ${createMenuButton('refresh', 'Reset', 'reset')}
        `;
        
        // Add touch event listeners for mobile drag
        if (isTouchDevice()) {
            menu.addEventListener('touchstart', handleTouchStart, { passive: false });
            menu.addEventListener('touchmove', handleTouchMove, { passive: false });
            menu.addEventListener('touchend', handleTouchEnd);
        }
        
        document.body.appendChild(menu);
        elements.menu = menu;
        
        // Restore position after creation
        setTimeout(restoreMenuPosition, 100);
        
        return menu;
    };
    
    const createMenuButton = (icon, text, action) => {
        return `
            <button class="wiki-menu-item" data-action="${action}">
                <span class="material-icons">${icon}</span>
                <span>${text}</span>
            </button>
        `;
    };
    
    const createStatusBar = () => {
        const statusBar = document.createElement('div');
        statusBar.className = 'wiki-status-bar';
        document.body.appendChild(statusBar);
        elements.statusBar = statusBar;
        return statusBar;
    };
    
    // Enhanced hotkeys for mobile
    const setupHotkeys = () => {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 't':
                        e.preventDefault();
                        cycleTheme();
                        break;
                    case 'f':
                        e.preventDefault();
                        cycleFont();
                        break;
                    case 'r':
                        e.preventDefault();
                        toggleReadMode();
                        break;
                    case 'h':
                        e.preventDefault();
                        toggleCitations();
                        break;
                    case 'm':
                        e.preventDefault();
                        toggleMenuCollapse();
                        break;
                }
            }
        });
    };
    
    // Cycle functions
    const cycleTheme = () => {
        const themes = Object.keys(CONFIG.themes);
        const currentIndex = themes.indexOf(state.currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        applyTheme(nextTheme);
    };
    
    const cycleFont = () => {
        const fonts = Object.keys(CONFIG.fonts);
        const currentIndex = fonts.indexOf(state.currentFont);
        const nextFont = fonts[(currentIndex + 1) % fonts.length];
        applyFont(nextFont);
    };
    
    // Reset function
    const resetToDefaults = () => {
        applyTheme('default');
        applyFont('default');
        if (state.readMode) toggleReadMode();
        if (state.citationsHidden) toggleCitations();
        if (state.menuCollapsed) toggleMenuCollapse();
        
        // Reset menu position
        batchUpdateStyles(elements.menu, {
            top: '20px',
            right: '20px',
            left: 'auto'
        });
        
        localStorage.removeItem('wiki-menu-position');
        showStatus('Settings reset to defaults');
    };
    
    // Event delegation for menu clicks
    const handleMenuClick = (e) => {
        const button = e.target.closest('.wiki-menu-item');
        if (!button) return;
        
        const action = button.dataset.action;
        switch (action) {
            case 'theme': cycleTheme(); break;
            case 'font': cycleFont(); break;
            case 'read-mode': toggleReadMode(); break;
            case 'citations': toggleCitations(); break;
            case 'reset': resetToDefaults(); break;
        }
    };
    
    // Global function exposure
    window.toggleMenuCollapse = toggleMenuCollapse;
    
    // Initialization
    const init = () => {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Cache important elements
        elements.content = getElement(CONFIG.selectors.content);
        elements.header = getElement(CONFIG.selectors.header);
        elements.footer = getElement(CONFIG.selectors.footer);
        
        // Create interface
        createFloatingMenu();
        createStatusBar();
        
        // Setup event listeners
        elements.menu.addEventListener('click', handleMenuClick);
        setupHotkeys();
        
        // Restore user preferences
        restorePreferences();
        
        // Show welcome message
        setTimeout(() => {
            showStatus('Wikipedia Enhanced - Mobile Ready!');
        }, 1000);
        
        console.log('Wikipedia Enhanced (Minerva) initialized successfully!');
    };
    
    // Start initialization
    init();
    
})();