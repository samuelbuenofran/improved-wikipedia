(function () {
  'use strict';

  // === Configuration ===
  const CONFIG = {
    themes: {
      Light: { background: '#ffffff', text: '#202124' },
      Dark: { background: '#121212', text: '#eaeaea' },
      Sepia: { background: '#f4ecd8', text: '#5b4636' },
      HighContrast: { background: '#000000', text: '#ffff00' },
      Ocean: { background: '#0f3460', text: '#e8f4fd' },
      Forest: { background: '#1a2f1a', text: '#c8e6c9' }
    },
    fonts: {
      Sans: '"Segoe UI", "Helvetica Neue", sans-serif',
      Serif: '"Georgia", "Times New Roman", serif',
      Mono: '"Courier New", monospace',
      Modern: '"Inter", "SF Pro Display", sans-serif'
    },
    darkThemes: new Set(['Dark', 'HighContrast', 'Ocean', 'Forest']),
    transitions: {
      duration: 400,
      revealDelay: 50
    },
    selectors: {
      modern: ['#mw-panel', '#mw-head', '#footer', '.vector-menu', '.mw-editsection'],
      legacy: ['#column-one', '#p-cactions', '#p-personal', '#footer .portlet']
    }
  };

  // Cache DOM queries and computed values
  const CACHE = {
    themeNames: Object.keys(CONFIG.themes),
    fontNames: Object.keys(CONFIG.fonts),
    elements: new Map()
  };

  // State management
  const STATE = {
    currentThemeIndex: 0,
    citationsHidden: false,
    menuCollapsed: false,
    autoHideTimeout: null,
    dragging: false,
    dragOffset: { x: 0, y: 0 }
  };

  // DOM elements
  let statusBar, floatingMenu;

  // === Utility Functions ===
  const utils = {
    // Memoized element getter with caching
    getElement(id) {
      if (!CACHE.elements.has(id)) {
        CACHE.elements.set(id, document.getElementById(id));
      }
      return CACHE.elements.get(id);
    },

    // Batch DOM updates for better performance
    batchStyleUpdates(element, styles) {
      if (!element || typeof styles !== 'object') return;
      
      // Use cssText for better performance when setting multiple properties
      const cssText = Object.entries(styles)
        .map(([prop, value]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');
      
      element.style.cssText += '; ' + cssText;
    },

    // Safe localStorage operations with error handling
    storage: {
      get(key, defaultValue = null) {
        try {
          return localStorage.getItem(key) || defaultValue;
        } catch (e) {
          console.warn(`Failed to get localStorage item '${key}':`, e);
          return defaultValue;
        }
      },
      set(key, value) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (e) {
          console.warn(`Failed to set localStorage item '${key}':`, e);
          return false;
        }
      },
      remove(key) {
        try {
          localStorage.removeItem(key);
          return true;
        } catch (e) {
          console.warn(`Failed to remove localStorage item '${key}':`, e);
          return false;
        }
      }
    },

    // Debounced function execution
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Safe element transition helper
    addTransition(element, transition) {
      if (!element?.style) return;
      const current = element.style.transition;
      if (!current.includes(transition)) {
        element.style.transition = current ? `${current}, ${transition}` : transition;
      }
    }
  };

  // === Core Theme Functions ===
  function applyTheme(name) {
    const theme = CONFIG.themes[name];
    if (!theme) {
      console.warn(`Theme '${name}' not found`);
      return false;
    }
    
    const root = document.documentElement;
    
    // Batch CSS custom property updates
    utils.batchStyleUpdates(root, {
      '--bg-color': theme.background,
      '--text-color': theme.text
    });
    
    // Apply to body
    utils.batchStyleUpdates(document.body, {
      backgroundColor: theme.background,
      color: theme.text
    });
    
    // Save preference and update UI
    utils.storage.set('wikiTheme', name);
    updateMenuColors(name);
    showStatus(`Theme: ${name}`);
    return true;
  }

  function updateMenuColors(themeName) {
    if (!floatingMenu?.style || typeof themeName !== 'string') return;
    
    const isDark = CONFIG.darkThemes.has(themeName);
    const colors = {
      menuBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
      itemBg: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
      textColor: isDark ? '#fff' : '#000'
    };
    
    floatingMenu.style.background = colors.menuBg;
    
    // Use more efficient query and update
    const menuItems = floatingMenu.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      utils.batchStyleUpdates(item, {
        background: colors.itemBg,
        color: colors.textColor
      });
    });
  }

  function applyFont(name) {
    const font = CONFIG.fonts[name];
    if (!font) {
      console.warn(`Font '${name}' not found`);
      return false;
    }
    
    document.body.style.fontFamily = font;
    utils.storage.set('wikiFont', name);
    showStatus(`Font: ${name}`);
    return true;
  }

  // === Enhanced Mode Functions ===
  function toggleReadMode() {
    const isReadMode = document.body.classList.toggle('read-mode');
    const selectors = CONFIG.selectors.modern;
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!el) return;
        
        utils.addTransition(el, 'opacity 0.4s, transform 0.4s');
        
        if (isReadMode) {
          utils.batchStyleUpdates(el, {
            opacity: '0',
            transform: 'translateX(-20px)'
          });
          setTimeout(() => el.style.display = 'none', CONFIG.transitions.duration);
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
    
    // Handle content area
    const content = utils.getElement('content');
    if (content) {
      utils.addTransition(content, 'max-width 0.4s, margin 0.4s');
      utils.batchStyleUpdates(content, {
        maxWidth: isReadMode ? 'none' : '',
        marginLeft: isReadMode ? '0' : ''
      });
    }
    
    showStatus(`Read Mode: ${isReadMode ? 'On' : 'Off'}`);
  }

  function toggleCitations() {
    const references = document.querySelectorAll('.reference');
    references.forEach(ref => {
      utils.batchStyleUpdates(ref, {
        transition: 'opacity 0.3s',
        display: STATE.citationsHidden ? '' : 'none'
      });
    });
    
    STATE.citationsHidden = !STATE.citationsHidden;
    showStatus(`Citations: ${STATE.citationsHidden ? 'Hidden' : 'Visible'}`);
  }

  function toggleMenuCollapse() {
    STATE.menuCollapsed = !STATE.menuCollapsed;
    const items = floatingMenu.querySelectorAll('.menu-item');
    const toggleBtn = floatingMenu.querySelector('.toggle-btn');
    
    items.forEach((item, index) => {
      if (item === toggleBtn) return;
      
      item.style.transition = 'all 0.3s ease-in-out';
      
      if (STATE.menuCollapsed) {
        utils.batchStyleUpdates(item, {
          opacity: '0',
          transform: 'translateX(20px)'
        });
        setTimeout(() => item.style.display = 'none', 300);
      } else {
        item.style.display = 'flex';
        setTimeout(() => {
          utils.batchStyleUpdates(item, {
            opacity: '1',
            transform: 'translateX(0)'
          });
        }, index * 50);
      }
    });
    
    toggleBtn.innerHTML = `<span class="material-icons">${STATE.menuCollapsed ? 'expand_more' : 'expand_less'}</span>`;
    showStatus(`Menu: ${STATE.menuCollapsed ? 'Collapsed' : 'Expanded'}`);
  }

  // === UI Functions ===
  function showStatus(text) {
    if (!statusBar) return;
    
    statusBar.innerHTML = `<span class="material-icons" style="font-size: 16px; margin-right: 6px;">info</span>${text}`;
    
    utils.batchStyleUpdates(statusBar, {
      opacity: '1',
      transform: 'translateY(0)'
    });
    
    clearTimeout(STATE.autoHideTimeout);
    STATE.autoHideTimeout = setTimeout(() => {
      utils.batchStyleUpdates(statusBar, {
        opacity: '0',
        transform: 'translateY(10px)'
      });
    }, 3000);
  }

  function restorePreferences() {
    // Smart theme detection with time-based fallback
    const savedTheme = utils.storage.get('wikiTheme');
    const autoTheme = new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'Light' : 'Dark';
    const theme = savedTheme || autoTheme;
    
    STATE.currentThemeIndex = CACHE.themeNames.indexOf(theme);
    applyTheme(theme);

    const font = utils.storage.get('wikiFont', 'Sans');
    applyFont(font);
    
    // Restore menu position with error handling
    const savedPosition = utils.storage.get('wikiMenuPosition');
    if (savedPosition && floatingMenu) {
      try {
        const position = JSON.parse(savedPosition);
        Object.assign(floatingMenu.style, position);
      } catch (e) {
        console.warn('Failed to restore menu position:', e);
      }
    }
  }

  const saveMenuPosition = utils.debounce(() => {
    if (!floatingMenu) return;
    
    const position = {
      left: floatingMenu.style.left || 'unset',
      top: floatingMenu.style.top || 'unset',
      right: floatingMenu.style.right || '20px',
      bottom: floatingMenu.style.bottom || 'unset'
    };
    
    utils.storage.set('wikiMenuPosition', JSON.stringify(position));
  }, 300);

  // === Interface Creation ===
  function createFloatingMenu() {
    // Load Material Icons with error handling
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    link.rel = 'stylesheet';
    link.onerror = () => console.warn('Failed to load Material Icons');
    document.head.appendChild(link);

    floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-menu';
    
    // Use cssText for better performance
    floatingMenu.style.cssText = `
      position: fixed; top: 50%; right: 20px; transform: translateY(-50%);
      z-index: 9999; display: flex; flex-direction: column; gap: 8px;
      padding: 1rem; border-radius: 1.5rem; cursor: move;
      background: rgba(255,255,255,0.25); backdrop-filter: blur(10px);
      isolation: isolate; transition: all 0.4s ease-in-out;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2);
    `;

    // Enhanced drag functionality
    const handleMouseDown = (e) => {
      if (e.target.closest('.menu-item')) return;
      STATE.dragging = true;
      const rect = floatingMenu.getBoundingClientRect();
      STATE.dragOffset.x = e.clientX - rect.left;
      STATE.dragOffset.y = e.clientY - rect.top;
      floatingMenu.style.transition = 'none';
      floatingMenu.style.cursor = 'grabbing';
    };
    
    const handleMouseMove = (e) => {
      if (!STATE.dragging) return;
      utils.batchStyleUpdates(floatingMenu, {
        left: `${e.clientX - STATE.dragOffset.x}px`,
        top: `${e.clientY - STATE.dragOffset.y}px`,
        right: 'unset',
        bottom: 'unset',
        transform: 'none'
      });
    };
    
    const handleMouseUp = () => {
      if (STATE.dragging) {
        STATE.dragging = false;
        utils.batchStyleUpdates(floatingMenu, {
          transition: 'all 0.4s ease-in-out',
          cursor: 'move'
        });
        saveMenuPosition();
      }
    };

    floatingMenu.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Enhanced button creation with better performance
    const createItem = (icon, label, action, isToggle = false) => {
      const item = document.createElement('div');
      item.className = isToggle ? 'menu-item toggle-btn' : 'menu-item';
      item.innerHTML = `<span class="material-icons">${icon}</span>${label ? `<span class="label">${label}</span>` : ''}`;
      
      item.style.cssText = `
        display: flex; align-items: center; gap: 8px; font-size: 16px;
        color: #000; padding: 10px 12px; border-radius: 1rem;
        background: rgba(255,255,255,0.3); cursor: pointer;
        transition: all 0.2s ease-in-out; user-select: none;
      `;
      
      // Use more efficient event handlers
      item.addEventListener('mouseenter', () => {
        utils.batchStyleUpdates(item, {
          background: 'rgba(255,255,255,0.5)',
          transform: 'translateX(-2px)'
        });
      });
      
      item.addEventListener('mouseleave', () => {
        utils.batchStyleUpdates(item, {
          background: 'rgba(255,255,255,0.3)',
          transform: 'translateX(0)'
        });
      });
      
      item.addEventListener('click', action);
      return item;
    };

    // Menu items with optimized actions
    const menuItems = [
      ['expand_less', '', toggleMenuCollapse, true],
      ['visibility_off', 'Citations', toggleCitations],
      ['chrome_reader_mode', 'Read Mode', toggleReadMode],
      ['palette', 'Theme', () => {
        STATE.currentThemeIndex = (STATE.currentThemeIndex + 1) % CACHE.themeNames.length;
        applyTheme(CACHE.themeNames[STATE.currentThemeIndex]);
      }],
      ['font_download', 'Font', () => {
        const currentFont = utils.storage.get('wikiFont', 'Sans');
        const nextIndex = (CACHE.fontNames.indexOf(currentFont) + 1) % CACHE.fontNames.length;
        applyFont(CACHE.fontNames[nextIndex]);
      }],
      ['refresh', 'Reset', () => {
        ['wikiTheme', 'wikiFont', 'wikiMenuPosition'].forEach(key => utils.storage.remove(key));
        location.reload();
      }]
    ];

    menuItems.forEach(([icon, label, action, isToggle]) => {
      floatingMenu.appendChild(createItem(icon, label, action, isToggle));
    });

    document.body.appendChild(floatingMenu);
  }

  function createStatusBar() {
    statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    
    if (!document.body) {
      throw new Error('Document body not available');
    }
    
    statusBar.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 9998;
      padding: 8px 16px; border-radius: 1rem; font-size: 14px;
      font-family: sans-serif; background: rgba(0,0,0,0.8); color: #fff;
      backdrop-filter: blur(10px); box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.3s ease-in-out; opacity: 0; transform: translateY(10px);
      display: flex; align-items: center;
    `;
    
    document.body.appendChild(statusBar);
  }

  // === Enhanced Hotkeys ===
  const keyActions = {
    r: toggleReadMode,
    t: () => {
      STATE.currentThemeIndex = (STATE.currentThemeIndex + 1) % CACHE.themeNames.length;
      applyTheme(CACHE.themeNames[STATE.currentThemeIndex]);
    },
    c: toggleCitations,
    m: toggleMenuCollapse
  };

  const handleKeydown = (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    
    const action = keyActions[e.key.toLowerCase()];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  // === Initialization ===
  const initialize = () => {
    try {
      createStatusBar();
      createFloatingMenu();
      restorePreferences();
      showStatus('Wikipedia Enhanced - Ready!');
    } catch (error) {
      console.error('Failed to initialize Wikipedia Enhancement:', error);
    }
  };

  // Event listeners
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('load', initialize);

  // Optional: Load signature helper with error handling
  if (typeof mw !== 'undefined' && mw.loader) {
    try {
      mw.loader.load('//en.wikipedia.org/w/index.php?title=User:SandWafer/sig.js&action=raw&ctype=text/javascript');
    } catch (e) {
      console.warn('Failed to load signature helper:', e);
    }
  }
})();
