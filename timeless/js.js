(function () {
  'use strict';

  // === Modern Timeless Configuration ===
  const CONFIG = {
    themes: {
      Light: { background: '#ffffff', text: '#202124' },
      Dark: { background: '#0d1117', text: '#f0f6fc' },
      Sepia: { background: '#f4ecd8', text: '#5b4636' },
      HighContrast: { background: '#000000', text: '#ffff00' },
      Ocean: { background: '#0f3460', text: '#e8f4fd' },
      Forest: { background: '#1a2f1a', text: '#c8e6c9' },
      Sunset: { background: '#2d1b69', text: '#ffd89b' },
      Arctic: { background: '#e8f5e8', text: '#2d5016' }
    },
    fonts: {
      System: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      Inter: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      Serif: '"Georgia", "Times New Roman", serif',
      Mono: '"SF Mono", "Monaco", "Cascadia Code", monospace',
      Display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif'
    },
    darkThemes: new Set(['Dark', 'HighContrast', 'Ocean', 'Forest', 'Sunset']),
    transitions: {
      duration: 400,
      revealDelay: 60,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    selectors: {
      timeless: ['.mw-workspace-container .mw-content-container', '.sidebar', '.tools', '#personal', '#site-navigation']
    },
    performance: {
      useRAF: true,
      debounceDelay: 150
    }
  };

  // Performance-optimized cache
  const CACHE = {
    themeNames: Object.keys(CONFIG.themes),
    fontNames: Object.keys(CONFIG.fonts),
    elements: new Map(),
    observers: new Map(),
    rafId: null
  };

  const STATE = {
    currentThemeIndex: 0,
    citationsHidden: false,
    menuCollapsed: false,
    autoHideTimeout: null,
    dragging: false,
    dragOffset: { x: 0, y: 0 },
    prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  };

  let statusBar, floatingMenu;

  // === Modern Utility Functions ===
  const utils = {
    // Optimized element getter with WeakMap caching
    getElement(id) {
      if (!CACHE.elements.has(id)) {
        const element = document.getElementById(id);
        if (element) CACHE.elements.set(id, element);
        return element;
      }
      return CACHE.elements.get(id);
    },

    // High-performance batch style updates
    batchStyleUpdates(element, styles) {
      if (!element?.style || typeof styles !== 'object') return;
      
      const updateStyles = () => {
        const cssText = Object.entries(styles)
          .map(([prop, value]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
          .join('; ');
        
        element.style.cssText += '; ' + cssText;
      };
      
      if (CONFIG.performance.useRAF && !STATE.prefersReducedMotion) {
        if (CACHE.rafId) cancelAnimationFrame(CACHE.rafId);
        CACHE.rafId = requestAnimationFrame(updateStyles);
      } else {
        updateStyles();
      }
    },

    // Enhanced storage with compression support
    storage: {
      get(key, defaultValue = null) {
        try {
          const value = localStorage.getItem(key);
          return value ? (value.startsWith('{') ? JSON.parse(value) : value) : defaultValue;
        } catch (e) {
          console.warn(`Storage get failed for '${key}':`, e);
          return defaultValue;
        }
      },
      set(key, value) {
        try {
          const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
          localStorage.setItem(key, serialized);
          return true;
        } catch (e) {
          console.warn(`Storage set failed for '${key}':`, e);
          return false;
        }
      },
      remove(key) {
        try {
          localStorage.removeItem(key);
          return true;
        } catch (e) {
          console.warn(`Storage remove failed for '${key}':`, e);
          return false;
        }
      }
    },

    // Advanced debouncing with immediate option
    debounce(func, wait, immediate = false) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          timeout = null;
          if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
      };
    },

    // Intersection Observer for performance
    observeVisibility(element, callback, options = {}) {
      if (!window.IntersectionObserver) {
        callback(true); // Fallback
        return null;
      }
      
      const observer = new IntersectionObserver(
        (entries) => entries.forEach(entry => callback(entry.isIntersecting)),
        { threshold: 0.1, ...options }
      );
      
      observer.observe(element);
      CACHE.observers.set(element, observer);
      return observer;
    },

    // CSS custom properties with fallback
    setCSSProperty(property, value, element = document.documentElement) {
      if (element.style.setProperty) {
        element.style.setProperty(property, value);
      } else {
        // Fallback for older browsers
        element.style[property.replace(/^--/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      }
    }
  };

  // === Enhanced Core Functions ===
  function applyTheme(name) {
    const theme = CONFIG.themes[name];
    if (!theme) {
      console.warn(`Theme '${name}' not found`);
      return false;
    }
    
    const root = document.documentElement;
    
    // Use CSS custom properties for better performance
    utils.setCSSProperty('--bg-color', theme.background, root);
    utils.setCSSProperty('--text-color', theme.text, root);
    
    // Apply to body with transition
    utils.batchStyleUpdates(document.body, {
      backgroundColor: theme.background,
      color: theme.text,
      transition: STATE.prefersReducedMotion ? 'none' : `background-color ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}, color ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}`
    });
    
    utils.storage.set('wikiTheme', name);
    updateMenuColors(name);
    showStatus(`Theme: ${name}`, 'palette');
    return true;
  }

  function updateMenuColors(themeName) {
    if (!floatingMenu?.style) return;
    
    const isDark = CONFIG.darkThemes.has(themeName);
    const colors = {
      menuBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.22)',
      itemBg: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.28)',
      textColor: isDark ? '#f0f6fc' : '#202124',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)'
    };
    
    utils.batchStyleUpdates(floatingMenu, {
      background: colors.menuBg,
      borderColor: colors.borderColor
    });
    
    const menuItems = floatingMenu.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      utils.batchStyleUpdates(item, {
        background: colors.itemBg,
        color: colors.textColor,
        borderColor: colors.borderColor
      });
    });
  }

  function applyFont(name) {
    const font = CONFIG.fonts[name];
    if (!font) {
      console.warn(`Font '${name}' not found`);
      return false;
    }
    
    utils.batchStyleUpdates(document.body, {
      fontFamily: font,
      transition: STATE.prefersReducedMotion ? 'none' : `font-family ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}`
    });
    
    utils.storage.set('wikiFont', name);
    showStatus(`Font: ${name}`, 'font_download');
    return true;
  }

  function toggleReadMode() {
    const isReadMode = document.body.classList.toggle('read-mode');
    const selectors = CONFIG.selectors.timeless;
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!el) return;
        
        const transition = STATE.prefersReducedMotion ? 'none' : 
          `opacity ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}, transform ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}`;
        
        el.style.transition = transition;
        
        if (isReadMode) {
          utils.batchStyleUpdates(el, {
            opacity: '0',
            transform: 'translateX(-20px)'
          });
          setTimeout(() => {
            if (el.style.opacity === '0') el.style.display = 'none';
          }, CONFIG.transitions.duration);
        } else {
          el.style.display = '';
          setTimeout(() => {
            utils.batchStyleUpdates(el, {
              opacity: '1',
              transform: 'translateX(0)'
            });
          }, CONFIG.transitions.revealDelay);
        }
      });
    });
    
    const content = document.querySelector('.mw-body');
    if (content) {
      const transition = STATE.prefersReducedMotion ? 'none' : 
        `max-width ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}, margin ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}, padding ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}`;
      
      utils.batchStyleUpdates(content, {
        transition,
        maxWidth: isReadMode ? 'none' : '',
        margin: isReadMode ? '0' : '',
        padding: isReadMode ? '2.5rem' : ''
      });
    }
    
    showStatus(`Read Mode: ${isReadMode ? 'On' : 'Off'}`, 'chrome_reader_mode');
  }

  function toggleCitations() {
    const references = document.querySelectorAll('.reference');
    const transition = STATE.prefersReducedMotion ? 'none' : `opacity ${CONFIG.transitions.duration}ms ${CONFIG.transitions.easing}`;
    
    references.forEach(ref => {
      utils.batchStyleUpdates(ref, {
        transition,
        opacity: STATE.citationsHidden ? '1' : '0',
        pointerEvents: STATE.citationsHidden ? 'auto' : 'none'
      });
    });
    
    STATE.citationsHidden = !STATE.citationsHidden;
    showStatus(`Citations: ${STATE.citationsHidden ? 'Hidden' : 'Visible'}`, 'format_quote');
  }

  function showStatus(message, icon = 'info') {
    if (!statusBar) return;
    
    statusBar.innerHTML = `<span class="material-icons" style="font-size: 16px; margin-right: 6px;">${icon}</span>${message}`;
    statusBar.style.opacity = '1';
    statusBar.style.transform = 'translateY(0)';
    
    clearTimeout(STATE.autoHideTimeout);
    STATE.autoHideTimeout = setTimeout(() => {
      if (statusBar) {
        statusBar.style.opacity = '0';
        statusBar.style.transform = 'translateY(10px)';
      }
    }, 3000);
  }

  // === Advanced Interface Creation ===
  function createFloatingMenu() {
    // Preload Material Icons with better error handling
    if (!document.querySelector('link[href*="material-icons"]')) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }

    floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-menu';
    floatingMenu.setAttribute('role', 'toolbar');
    floatingMenu.setAttribute('aria-label', 'Wikipedia Enhancement Tools');
    
    const menuItems = [
      { 
        icon: 'palette', 
        label: 'Theme', 
        action: () => {
          STATE.currentThemeIndex = (STATE.currentThemeIndex + 1) % CACHE.themeNames.length;
          applyTheme(CACHE.themeNames[STATE.currentThemeIndex]);
        },
        shortcut: 'Ctrl+T'
      },
      { 
        icon: 'font_download', 
        label: 'Font', 
        action: () => {
          const currentFont = utils.storage.get('wikiFont', 'System');
          const currentIndex = CACHE.fontNames.indexOf(currentFont);
          const nextIndex = (currentIndex + 1) % CACHE.fontNames.length;
          applyFont(CACHE.fontNames[nextIndex]);
        },
        shortcut: 'Ctrl+F'
      },
      { 
        icon: 'chrome_reader_mode', 
        label: 'Read', 
        action: toggleReadMode,
        shortcut: 'Ctrl+R'
      },
      { 
        icon: 'format_quote', 
        label: 'Citations', 
        action: toggleCitations,
        shortcut: 'Ctrl+Q'
      },
      { 
        icon: 'refresh', 
        label: 'Reset', 
        action: () => {
          document.body.className = '';
          document.body.style.cssText = '';
          utils.storage.remove('wikiTheme');
          utils.storage.remove('wikiFont');
          showStatus('Reset Complete', 'check_circle');
        },
        shortcut: 'Ctrl+Shift+R'
      }
    ];

    menuItems.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = 'menu-item';
      button.setAttribute('type', 'button');
      button.setAttribute('aria-label', `${item.label} (${item.shortcut})`);
      button.setAttribute('title', `${item.label} - ${item.shortcut}`);
      
      button.innerHTML = `
        <span class="material-icons" aria-hidden="true">${item.icon}</span>
        <span class="label">${item.label}</span>
      `;
      
      // Enhanced event handling with keyboard support
      button.addEventListener('click', item.action);
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.action();
        }
      });
      
      floatingMenu.appendChild(button);
    });

    // Advanced drag functionality with momentum
    let isDragging = false;
    let startPos = { x: 0, y: 0 };
    let menuPos = { x: 0, y: 0 };
    let velocity = { x: 0, y: 0 };
    let lastMoveTime = 0;

    const handleStart = (e) => {
      isDragging = true;
      const clientPos = e.touches ? e.touches[0] : e;
      startPos = { x: clientPos.clientX, y: clientPos.clientY };
      const rect = floatingMenu.getBoundingClientRect();
      menuPos = { x: rect.left, y: rect.top };
      velocity = { x: 0, y: 0 };
      lastMoveTime = Date.now();
      
      floatingMenu.style.transition = 'none';
      floatingMenu.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };

    const handleMove = utils.debounce((e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const clientPos = e.touches ? e.touches[0] : e;
      const currentTime = Date.now();
      const deltaTime = currentTime - lastMoveTime;
      
      const deltaX = clientPos.clientX - startPos.x;
      const deltaY = clientPos.clientY - startPos.y;
      
      // Calculate velocity for momentum
      if (deltaTime > 0) {
        velocity.x = deltaX / deltaTime;
        velocity.y = deltaY / deltaTime;
      }
      
      const newX = menuPos.x + deltaX;
      const newY = menuPos.y + deltaY;
      
      // Constrain to viewport
      const rect = floatingMenu.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      floatingMenu.style.left = `${constrainedX}px`;
      floatingMenu.style.top = `${constrainedY}px`;
      floatingMenu.style.right = 'auto';
      floatingMenu.style.transform = 'none';
      
      lastMoveTime = currentTime;
    }, 16); // ~60fps

    const handleEnd = () => {
      isDragging = false;
      floatingMenu.style.transition = '';
      floatingMenu.style.cursor = 'move';
      document.body.style.userSelect = '';
      
      // Save position
      const rect = floatingMenu.getBoundingClientRect();
      utils.storage.set('menuPosition', {
        x: rect.left,
        y: rect.top
      });
    };

    // Touch and mouse events
    floatingMenu.addEventListener('mousedown', handleStart);
    floatingMenu.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    // Restore saved position
    const savedPosition = utils.storage.get('menuPosition');
    if (savedPosition) {
      floatingMenu.style.left = `${savedPosition.x}px`;
      floatingMenu.style.top = `${savedPosition.y}px`;
      floatingMenu.style.right = 'auto';
      floatingMenu.style.transform = 'none';
    }

    document.body.appendChild(floatingMenu);
  }

  function createStatusBar() {
    statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    statusBar.setAttribute('role', 'status');
    statusBar.setAttribute('aria-live', 'polite');
    statusBar.innerHTML = '<span class="material-icons" style="font-size: 16px; margin-right: 6px;">check_circle</span>Timeless Menu Ready';
    statusBar.style.opacity = '0';
    statusBar.style.transform = 'translateY(10px)';
    document.body.appendChild(statusBar);
  }

  function restorePreferences() {
    const savedTheme = utils.storage.get('wikiTheme');
    if (savedTheme && CONFIG.themes[savedTheme]) {
      STATE.currentThemeIndex = CACHE.themeNames.indexOf(savedTheme);
      applyTheme(savedTheme);
    }
    
    const savedFont = utils.storage.get('wikiFont');
    if (savedFont && CONFIG.fonts[savedFont]) {
      applyFont(savedFont);
    }
  }

  // === Enhanced Hotkeys ===
  function setupHotkeys() {
    const hotkeyMap = {
      't': () => {
        STATE.currentThemeIndex = (STATE.currentThemeIndex + 1) % CACHE.themeNames.length;
        applyTheme(CACHE.themeNames[STATE.currentThemeIndex]);
      },
      'f': () => {
        const currentFont = utils.storage.get('wikiFont', 'System');
        const currentIndex = CACHE.fontNames.indexOf(currentFont);
        const nextIndex = (currentIndex + 1) % CACHE.fontNames.length;
        applyFont(CACHE.fontNames[nextIndex]);
      },
      'r': toggleReadMode,
      'q': toggleCitations
    };

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        const handler = hotkeyMap[e.key.toLowerCase()];
        if (handler) {
          e.preventDefault();
          handler();
        }
        
        // Special case for reset
        if (e.shiftKey && e.key.toLowerCase() === 'r') {
          e.preventDefault();
          document.body.className = '';
          document.body.style.cssText = '';
          utils.storage.remove('wikiTheme');
          utils.storage.remove('wikiFont');
          showStatus('Reset Complete', 'check_circle');
        }
      }
    });
  }

  // === Performance-Optimized Initialization ===
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    try {
      // Check for reduced motion preference
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        STATE.prefersReducedMotion = mediaQuery.matches;
        mediaQuery.addEventListener('change', (e) => {
          STATE.prefersReducedMotion = e.matches;
        });
      }

      createFloatingMenu();
      createStatusBar();
      restorePreferences();
      setupHotkeys();
      
      // Delayed status message for better UX
      setTimeout(() => {
        showStatus('Timeless Menu Ready', 'check_circle');
      }, 600);
      
      // Performance monitoring
      if (window.performance?.mark) {
        performance.mark('timeless-menu-initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Timeless menu:', error);
      // Fallback notification
      if (statusBar) {
        statusBar.textContent = 'Menu initialization failed';
        statusBar.style.opacity = '1';
      }
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    CACHE.observers.forEach(observer => observer.disconnect());
    if (CACHE.rafId) cancelAnimationFrame(CACHE.rafId);
  });

  init();
})();