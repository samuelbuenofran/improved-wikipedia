(function () {
  'use strict';

  // === Configuration ===
  var CONFIG = {
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
    darkThemes: ['Dark', 'HighContrast', 'Ocean', 'Forest'],
    transitions: {
      duration: 400,
      revealDelay: 50
    },
    selectors: {
      legacy: ['#column-one', '#p-cactions', '#p-personal', '#footer .portlet']
    }
  };

  // Cache computed values for better performance
  var CACHE = {
    themeNames: Object.keys ? Object.keys(CONFIG.themes) : [],
    fontNames: Object.keys ? Object.keys(CONFIG.fonts) : [],
    elements: {}
  };

  // Initialize theme and font names for older browsers
  if (!Object.keys) {
    CACHE.themeNames = ['Light', 'Dark', 'Sepia', 'HighContrast', 'Ocean', 'Forest'];
    CACHE.fontNames = ['Sans', 'Serif', 'Mono', 'Modern'];
  }

  // State management
  var STATE = {
    currentThemeIndex: 0,
    citationsHidden: false,
    menuCollapsed: false,
    autoHideTimeout: null,
    dragging: false,
    dragOffset: { x: 0, y: 0 }
  };

  // DOM elements
  var statusBar, floatingMenu;

  // === Utility Functions (Legacy Compatible) ===
  var utils = {
    // Element getter with caching
    getElement: function(id) {
      if (!CACHE.elements[id]) {
        CACHE.elements[id] = document.getElementById(id);
      }
      return CACHE.elements[id];
    },

    // Check if array includes value (for older browsers)
    arrayIncludes: function(array, value) {
      if (array.indexOf) {
        return array.indexOf(value) !== -1;
      }
      // Fallback for very old browsers
      for (var i = 0; i < array.length; i++) {
        if (array[i] === value) return true;
      }
      return false;
    },

    // Batch DOM updates for better performance
    batchStyleUpdates: function(element, styles) {
      if (!element || !element.style) return;
      
      // Legacy approach: set properties individually for compatibility
      for (var prop in styles) {
        if (styles.hasOwnProperty && styles.hasOwnProperty(prop)) {
          // Convert camelCase to kebab-case for CSS
          var cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          if (element.style.setProperty) {
            element.style.setProperty(cssProp, styles[prop]);
          } else {
            // Fallback for IE8 and below
            element.style[prop] = styles[prop];
          }
        }
      }
    },

    // Safe localStorage operations with error handling
    storage: {
      get: function(key, defaultValue) {
        defaultValue = defaultValue || null;
        try {
          if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key) || defaultValue;
          }
        } catch (e) {
          console.warn && console.warn('Failed to get localStorage item "' + key + '":', e);
        }
        return defaultValue;
      },
      set: function(key, value) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
            return true;
          }
        } catch (e) {
          console.warn && console.warn('Failed to set localStorage item "' + key + '":', e);
        }
        return false;
      },
      remove: function(key) {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
            return true;
          }
        } catch (e) {
          console.warn && console.warn('Failed to remove localStorage item "' + key + '":', e);
        }
        return false;
      }
    },

    // Debounced function execution (legacy compatible)
    debounce: function(func, wait) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Safe element transition helper
    addTransition: function(element, transition) {
      if (!element || !element.style) return;
      var current = element.style.transition || '';
      if (current.indexOf(transition) === -1) {
        element.style.transition = current ? current + ', ' + transition : transition;
      }
    }
  };

  // === Core Theme Functions ===
  function applyTheme(name) {
    var theme = CONFIG.themes[name];
    if (!theme) {
      console.warn && console.warn('Theme "' + name + '" not found');
      return false;
    }
    
    var root = document.documentElement;
    
    // Legacy browser support for CSS custom properties
    if (root.style.setProperty) {
      root.style.setProperty('--bg-color', theme.background);
      root.style.setProperty('--text-color', theme.text);
    }
    
    // Apply to body
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
    
    // Apply to legacy Wikipedia elements
    var globalWrapper = utils.getElement('globalWrapper');
    if (globalWrapper) {
      globalWrapper.style.backgroundColor = theme.background;
      globalWrapper.style.color = theme.text;
    }
    
    // Save preference and update UI
    utils.storage.set('wikiTheme', name);
    updateMenuColors(name);
    showStatus('Theme: ' + name);
    return true;
  }

  function updateMenuColors(themeName) {
    if (!floatingMenu || !floatingMenu.style || typeof themeName !== 'string') return;
    
    var isDark = utils.arrayIncludes(CONFIG.darkThemes, themeName);
    var colors = {
      menuBg: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
      itemBg: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
      textColor: isDark ? '#fff' : '#000'
    };
    
    floatingMenu.style.background = colors.menuBg;
    
    // Update menu items with legacy-compatible approach
    var menuItems = floatingMenu.querySelectorAll ? 
      floatingMenu.querySelectorAll('.menu-item') : 
      floatingMenu.getElementsByClassName('menu-item');
    
    for (var i = 0; i < menuItems.length; i++) {
      var item = menuItems[i];
      utils.batchStyleUpdates(item, {
        background: colors.itemBg,
        color: colors.textColor
      });
    }
  }

  function applyFont(name) {
    var font = CONFIG.fonts[name];
    if (!font) {
      console.warn && console.warn('Font "' + name + '" not found');
      return false;
    }
    
    document.body.style.fontFamily = font;
    
    // Apply to legacy content area
    var content = utils.getElement('content');
    if (content) {
      content.style.fontFamily = font;
    }
    
    utils.storage.set('wikiFont', name);
    showStatus('Font: ' + name);
    return true;
  }

  // === Enhanced Mode Functions ===
  function toggleReadMode() {
    var isReadMode = document.body.classList ? 
      document.body.classList.toggle('read-mode') :
      toggleClass(document.body, 'read-mode');
    
    var selectors = CONFIG.selectors.legacy;
    
    for (var i = 0; i < selectors.length; i++) {
      var elements = document.querySelectorAll ? 
        document.querySelectorAll(selectors[i]) :
        [document.querySelector(selectors[i])].filter(Boolean);
      
      for (var j = 0; j < elements.length; j++) {
        var el = elements[j];
        if (!el) continue;
        
        utils.addTransition(el, 'opacity 0.4s, transform 0.4s');
        
        if (isReadMode) {
          utils.batchStyleUpdates(el, {
            opacity: '0',
            transform: 'translateX(-20px)'
          });
          setTimeout(function(element) {
            return function() { element.style.display = 'none'; };
          }(el), CONFIG.transitions.duration);
        } else {
          el.style.display = '';
          setTimeout(function(element) {
            return function() {
              utils.batchStyleUpdates(element, {
                opacity: '1',
                transform: 'translateX(0)'
              });
            };
          }(el), CONFIG.transitions.revealDelay);
        }
      }
    }
    
    // Legacy content adjustments
    var columnContent = utils.getElement('column-content');
    var content = utils.getElement('content');
    
    if (columnContent) {
      utils.addTransition(columnContent, 'margin 0.4s');
      utils.batchStyleUpdates(columnContent, {
        marginLeft: isReadMode ? '0' : '',
        marginRight: isReadMode ? '0' : ''
      });
    }
    
    if (content) {
      utils.addTransition(content, 'max-width 0.4s, margin 0.4s');
      utils.batchStyleUpdates(content, {
        maxWidth: isReadMode ? 'none' : '',
        marginLeft: isReadMode ? '0' : ''
      });
    }
    
    showStatus('Read Mode: ' + (isReadMode ? 'On' : 'Off'));
  }

  // Helper function for classList toggle in older browsers
  function toggleClass(element, className) {
    if (element.classList) {
      return element.classList.toggle(className);
    }
    // Fallback for older browsers
    var classes = element.className.split(' ');
    var index = classes.indexOf(className);
    if (index !== -1) {
      classes.splice(index, 1);
      element.className = classes.join(' ');
      return false;
    } else {
      classes.push(className);
      element.className = classes.join(' ');
      return true;
    }
  }

  function toggleCitations() {
    var references = document.querySelectorAll ? 
      document.querySelectorAll('.reference') :
      document.getElementsByClassName('reference');
    
    for (var i = 0; i < references.length; i++) {
      var ref = references[i];
      utils.batchStyleUpdates(ref, {
        transition: 'opacity 0.3s',
        display: STATE.citationsHidden ? '' : 'none'
      });
    }
    
    STATE.citationsHidden = !STATE.citationsHidden;
    showStatus('Citations: ' + (STATE.citationsHidden ? 'Hidden' : 'Visible'));
  }

  function toggleMenuCollapse() {
    STATE.menuCollapsed = !STATE.menuCollapsed;
    var items = floatingMenu.querySelectorAll ? 
      floatingMenu.querySelectorAll('.menu-item') :
      floatingMenu.getElementsByClassName('menu-item');
    var toggleBtn = floatingMenu.querySelector ?
      floatingMenu.querySelector('.toggle-btn') :
      floatingMenu.getElementsByClassName('toggle-btn')[0];
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item === toggleBtn) continue;
      
      item.style.transition = 'all 0.3s ease-in-out';
      
      if (STATE.menuCollapsed) {
        utils.batchStyleUpdates(item, {
          opacity: '0',
          transform: 'translateX(20px)'
        });
        setTimeout(function(element) {
          return function() { element.style.display = 'none'; };
        }(item), 300);
      } else {
        item.style.display = 'flex';
        setTimeout(function(element, index) {
          return function() {
            utils.batchStyleUpdates(element, {
              opacity: '1',
              transform: 'translateX(0)'
            });
          };
        }(item, i), i * 50);
      }
    }
    
    if (toggleBtn) {
      toggleBtn.innerHTML = '<span class="material-icons">' + 
        (STATE.menuCollapsed ? 'expand_more' : 'expand_less') + '</span>';
    }
    showStatus('Menu: ' + (STATE.menuCollapsed ? 'Collapsed' : 'Expanded'));
  }

  // === UI Functions ===
  function showStatus(text) {
    if (!statusBar) return;
    
    statusBar.innerHTML = '<span class="material-icons" style="font-size: 16px; margin-right: 6px;">info</span>' + text;
    
    utils.batchStyleUpdates(statusBar, {
      opacity: '1',
      transform: 'translateY(0)'
    });
    
    clearTimeout(STATE.autoHideTimeout);
    STATE.autoHideTimeout = setTimeout(function() {
      utils.batchStyleUpdates(statusBar, {
        opacity: '0',
        transform: 'translateY(10px)'
      });
    }, 3000);
  }

  function restorePreferences() {
    // Smart theme detection with time-based fallback
    var savedTheme = utils.storage.get('wikiTheme');
    var currentHour = new Date().getHours();
    var autoTheme = (currentHour >= 7 && currentHour < 19) ? 'Light' : 'Dark';
    var theme = savedTheme || autoTheme;
    
    STATE.currentThemeIndex = CACHE.themeNames.indexOf ? 
      CACHE.themeNames.indexOf(theme) : 0;
    applyTheme(theme);

    var font = utils.storage.get('wikiFont', 'Sans');
    applyFont(font);
    
    // Restore menu position with error handling
    var savedPosition = utils.storage.get('wikiMenuPosition');
    if (savedPosition && floatingMenu) {
      try {
        var position = JSON.parse(savedPosition);
        for (var prop in position) {
          if (position.hasOwnProperty && position.hasOwnProperty(prop)) {
            floatingMenu.style[prop] = position[prop];
          }
        }
      } catch (e) {
        console.warn && console.warn('Failed to restore menu position:', e);
      }
    }
  }

  var saveMenuPosition = utils.debounce(function() {
    if (!floatingMenu) return;
    
    var position = {
      left: floatingMenu.style.left || 'unset',
      top: floatingMenu.style.top || 'unset',
      right: floatingMenu.style.right || '20px',
      bottom: floatingMenu.style.bottom || 'unset'
    };
    
    utils.storage.set('wikiMenuPosition', JSON.stringify(position));
  }, 300);

  // === Interface Creation ===
  function createFloatingMenu() {
    // Load Material Icons with fallback for older browsers
    var link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    link.rel = 'stylesheet';
    link.onerror = function() {
      console.warn && console.warn('Failed to load Material Icons');
    };
    document.head.appendChild(link);

    floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-menu';
    
    // Use cssText for better legacy browser support
    floatingMenu.style.cssText = [
      'position: fixed',
      'top: 50%',
      'right: 20px',
      'transform: translateY(-50%)',
      'z-index: 9999',
      'display: flex',
      'flex-direction: column',
      'gap: 8px',
      'padding: 1rem',
      'border-radius: 1.5rem',
      'cursor: move',
      'background: rgba(255,255,255,0.25)',
      'backdrop-filter: blur(10px)',
      '-webkit-backdrop-filter: blur(10px)',
      'isolation: isolate',
      'transition: all 0.4s ease-in-out',
      'box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
    ].join('; ');

    // Enhanced drag functionality
    function handleMouseDown(e) {
      e = e || window.event;
      var target = e.target || e.srcElement;
      
      // Check if clicked on menu item (legacy compatible)
      var isMenuItem = false;
      var parent = target;
      while (parent && parent !== floatingMenu) {
        if (parent.className && parent.className.indexOf('menu-item') !== -1) {
          isMenuItem = true;
          break;
        }
        parent = parent.parentNode;
      }
      
      if (isMenuItem) return;
      
      STATE.dragging = true;
      var rect = floatingMenu.getBoundingClientRect();
      STATE.dragOffset.x = e.clientX - rect.left;
      STATE.dragOffset.y = e.clientY - rect.top;
      floatingMenu.style.transition = 'none';
      floatingMenu.style.cursor = 'grabbing';
    }
    
    function handleMouseMove(e) {
      e = e || window.event;
      if (!STATE.dragging) return;
      
      utils.batchStyleUpdates(floatingMenu, {
        left: (e.clientX - STATE.dragOffset.x) + 'px',
        top: (e.clientY - STATE.dragOffset.y) + 'px',
        right: 'unset',
        bottom: 'unset',
        transform: 'none'
      });
    }
    
    function handleMouseUp() {
      if (STATE.dragging) {
        STATE.dragging = false;
        utils.batchStyleUpdates(floatingMenu, {
          transition: 'all 0.4s ease-in-out',
          cursor: 'move'
        });
        saveMenuPosition();
      }
    }

    // Legacy event listener support
    if (floatingMenu.addEventListener) {
      floatingMenu.addEventListener('mousedown', handleMouseDown);
    } else if (floatingMenu.attachEvent) {
      floatingMenu.attachEvent('onmousedown', handleMouseDown);
    }
    
    if (document.addEventListener) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else if (document.attachEvent) {
      document.attachEvent('onmousemove', handleMouseMove);
      document.attachEvent('onmouseup', handleMouseUp);
    }

    // Enhanced button creation
    function createItem(icon, label, action, isToggle) {
      var item = document.createElement('div');
      item.className = isToggle ? 'menu-item toggle-btn' : 'menu-item';
      item.innerHTML = '<span class="material-icons">' + icon + '</span>' + 
                      (label ? '<span class="label">' + label + '</span>' : '');
      
      item.style.cssText = [
        'display: flex',
        'align-items: center',
        'gap: 8px',
        'font-size: 16px',
        'color: #000',
        'padding: 10px 12px',
        'border-radius: 1rem',
        'background: rgba(255,255,255,0.3)',
        'cursor: pointer',
        'transition: all 0.2s ease-in-out',
        'user-select: none',
        '-webkit-user-select: none',
        '-moz-user-select: none',
        '-ms-user-select: none'
      ].join('; ');
      
      // Legacy-compatible event handlers
      function onMouseOver() {
        utils.batchStyleUpdates(item, {
          background: 'rgba(255,255,255,0.5)',
          transform: 'translateX(-2px)'
        });
      }
      
      function onMouseOut() {
        utils.batchStyleUpdates(item, {
          background: 'rgba(255,255,255,0.3)',
          transform: 'translateX(0)'
        });
      }
      
      if (item.addEventListener) {
        item.addEventListener('mouseover', onMouseOver);
        item.addEventListener('mouseout', onMouseOut);
        item.addEventListener('click', action);
      } else if (item.attachEvent) {
        item.attachEvent('onmouseover', onMouseOver);
        item.attachEvent('onmouseout', onMouseOut);
        item.attachEvent('onclick', action);
      } else {
        item.onmouseover = onMouseOver;
        item.onmouseout = onMouseOut;
        item.onclick = action;
      }
      
      return item;
    }

    // Add menu items
    floatingMenu.appendChild(createItem('expand_less', '', toggleMenuCollapse, true));
    floatingMenu.appendChild(createItem('visibility_off', 'Citations', toggleCitations));
    floatingMenu.appendChild(createItem('chrome_reader_mode', 'Read Mode', toggleReadMode));
    floatingMenu.appendChild(createItem('palette', 'Theme', function() {
      STATE.currentThemeIndex = (STATE.currentThemeIndex + 1) % CACHE.themeNames.length;
      applyTheme(CACHE.themeNames[STATE.currentThemeIndex]);
    }));
    floatingMenu.appendChild(createItem('font_download', 'Font', function() {
      var currentFont = utils.storage.get('wikiFont', 'Sans');
      var currentIndex = CACHE.fontNames.indexOf ? CACHE.fontNames.indexOf(currentFont) : 0;
      var nextIndex = (currentIndex + 1) % CACHE.fontNames.length;
      applyFont(CACHE.fontNames[nextIndex]);
    }));
    floatingMenu.appendChild(createItem('refresh', 'Reset', function() {
      utils.storage.remove('wikiTheme');
      utils.storage.remove('wikiFont');
      utils.storage.remove('wikiMenuPosition');
      location.reload();
    }));

    document.body.appendChild(floatingMenu);
  }

  function createStatusBar() {
    statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    
    if (!document.body) {
      throw new Error('Document body not available');
    }
    
    statusBar.style.cssText = [
      'position: fixed',
      'bottom: 20px',
      'right: 20px',
      'z-index: 9998',
      'padding: 8px 16px',
      'border-radius: 1rem',
      'font-size: 14px',
      'font-family: sans-serif',
      'background: rgba(0,0,0,0.8)',
      'color: #fff',
      'backdrop-filter: blur(10px)',
      '-webkit-backdrop-filter: blur(10px)',
      'box-shadow: 0 4px 20px rgba(0,0,0,0.3)',
      'transition: all 0.3s ease-in-out',
      'opacity: 0',
      'transform: translateY(10px)',
      'display: flex',
      'align-items: center'
    ].join('; ');
    
    document.body.appendChild(statusBar);
  }

  // === Enhanced Hotkeys ===
  function handleKeydown(e) {
    e = e || window.event;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    
    var key = e.key ? e.key.toLowerCase() : String.fromCharCode(e.keyCode).toLowerCase();
    
    if (key === 'r') {
      if (e.preventDefault) e.preventDefault();
      else e.returnValue = false;
      toggleReadMode();
    }
    if (key === 't') {
      if (e.preventDefault) e.preventDefault();
      else e.returnValue = false;
      STATE.currentThemeIndex = (STATE.currentThemeIndex + 1) % CACHE.themeNames.length;
      applyTheme(CACHE.themeNames[STATE.currentThemeIndex]);
    }
    if (key === 'c') {
      if (e.preventDefault) e.preventDefault();
      else e.returnValue = false;
      toggleCitations();
    }
    if (key === 'm') {
      if (e.preventDefault) e.preventDefault();
      else e.returnValue = false;
      toggleMenuCollapse();
    }
  }

  // === Initialization ===
  function initialize() {
    try {
      createStatusBar();
      createFloatingMenu();
      restorePreferences();
      showStatus('Wikipedia Enhanced - Ready!');
    } catch (error) {
      console.error && console.error('Failed to initialize Wikipedia Enhancement:', error);
    }
  }

  // Legacy event listener support
  if (window.addEventListener) {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('load', initialize);
  } else if (window.attachEvent) {
    window.attachEvent('onkeydown', handleKeydown);
    window.attachEvent('onload', initialize);
  } else {
    window.onkeydown = handleKeydown;
    window.onload = initialize;
  }

  // Optional: Load signature helper with error handling
  if (typeof mw !== 'undefined' && mw.loader) {
    try {
      mw.loader.load('//en.wikipedia.org/w/index.php?title=User:SandWafer/sig.js&action=raw&ctype=text/javascript');
    } catch (e) {
      console.warn && console.warn('Failed to load signature helper:', e);
    }
  }
})();