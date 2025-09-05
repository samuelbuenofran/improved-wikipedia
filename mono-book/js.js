(function () {
  'use strict';

  // === Classic MonoBook Configuration ===
  const CONFIG = {
    themes: {
      Light: { background: '#ffffff', text: '#000000' },
      Dark: { background: '#2d2d2d', text: '#ffffff' },
      Sepia: { background: '#f4ecd8', text: '#5b4636' },
      HighContrast: { background: '#000000', text: '#ffff00' },
      Classic: { background: '#f9f9f9', text: '#000000' }
    },
    fonts: {
      Sans: 'sans-serif',
      Serif: 'serif',
      Mono: 'monospace',
      Verdana: 'Verdana, sans-serif'
    },
    darkThemes: new Set(['Dark', 'HighContrast']),
    transitions: {
      duration: 300,
      revealDelay: 50
    },
    selectors: {
      monobook: ['#column-one', '#p-cactions', '#p-personal', '#footer .portlet']
    }
  };

  // Legacy browser compatibility
  const COMPAT = {
    addEventListener: function(element, event, handler) {
      if (element.addEventListener) {
        element.addEventListener(event, handler, false);
      } else if (element.attachEvent) {
        element.attachEvent('on' + event, handler);
      }
    },
    removeEventListener: function(element, event, handler) {
      if (element.removeEventListener) {
        element.removeEventListener(event, handler, false);
      } else if (element.detachEvent) {
        element.detachEvent('on' + event, handler);
      }
    }
  };

  const CACHE = {
    themeNames: Object.keys(CONFIG.themes),
    fontNames: Object.keys(CONFIG.fonts),
    elements: {}
  };

  const STATE = {
    currentThemeIndex: 0,
    citationsHidden: false,
    menuCollapsed: false,
    autoHideTimeout: null,
    dragging: false
  };

  let statusBar, floatingMenu;

  // === Legacy Utility Functions ===
  const utils = {
    getElement: function(id) {
      if (!CACHE.elements[id]) {
        CACHE.elements[id] = document.getElementById(id);
      }
      return CACHE.elements[id];
    },

    setStyles: function(element, styles) {
      if (!element || typeof styles !== 'object') return;
      
      for (var prop in styles) {
        if (styles.hasOwnProperty(prop)) {
          try {
            element.style[prop] = styles[prop];
          } catch (e) {
            // Ignore unsupported properties
          }
        }
      }
    },

    storage: {
      get: function(key, defaultValue) {
        try {
          if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key) || defaultValue;
          }
        } catch (e) {
          // Fallback for browsers without localStorage
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
          // Fallback for browsers without localStorage
        }
        return false;
      }
    },

    addClass: function(element, className) {
      if (!element) return;
      if (element.classList) {
        element.classList.add(className);
      } else {
        var classes = element.className.split(' ');
        if (classes.indexOf(className) === -1) {
          element.className += ' ' + className;
        }
      }
    },

    removeClass: function(element, className) {
      if (!element) return;
      if (element.classList) {
        element.classList.remove(className);
      } else {
        element.className = element.className.replace(
          new RegExp('\\b' + className + '\\b', 'g'), ''
        ).replace(/\s+/g, ' ').trim();
      }
    },

    hasClass: function(element, className) {
      if (!element) return false;
      if (element.classList) {
        return element.classList.contains(className);
      } else {
        return element.className.indexOf(className) !== -1;
      }
    }
  };

  // === Core Functions ===
  function applyTheme(name) {
    var theme = CONFIG.themes[name];
    if (!theme) return false;
    
    utils.setStyles(document.body, {
      backgroundColor: theme.background,
      color: theme.text
    });
    
    utils.storage.set('wikiTheme', name);
    updateMenuColors(name);
    showStatus('Theme: ' + name);
    return true;
  }

  function updateMenuColors(themeName) {
    if (!floatingMenu) return;
    
    var isDark = CONFIG.darkThemes.has ? CONFIG.darkThemes.has(themeName) : false;
    var menuBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.28)';
    var itemBg = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)';
    var textColor = isDark ? '#fff' : '#000';
    
    floatingMenu.style.background = menuBg;
    
    var menuItems = floatingMenu.getElementsByClassName('menu-item');
    for (var i = 0; i < menuItems.length; i++) {
      utils.setStyles(menuItems[i], {
        background: itemBg,
        color: textColor
      });
    }
  }

  function applyFont(name) {
    var font = CONFIG.fonts[name];
    if (!font) return false;
    
    document.body.style.fontFamily = font;
    utils.storage.set('wikiFont', name);
    showStatus('Font: ' + name);
    return true;
  }

  function toggleReadMode() {
    var isReadMode = utils.hasClass(document.body, 'read-mode');
    
    if (isReadMode) {
      utils.removeClass(document.body, 'read-mode');
    } else {
      utils.addClass(document.body, 'read-mode');
    }
    
    var selectors = CONFIG.selectors.monobook;
    for (var i = 0; i < selectors.length; i++) {
      var elements = document.querySelectorAll ? 
        document.querySelectorAll(selectors[i]) : 
        [document.getElementById(selectors[i].replace('#', ''))];
      
      for (var j = 0; j < elements.length; j++) {
        var el = elements[j];
        if (!el) continue;
        
        if (!isReadMode) {
          utils.setStyles(el, {
            opacity: '0',
            display: 'none'
          });
        } else {
          utils.setStyles(el, {
            opacity: '1',
            display: ''
          });
        }
      }
    }
    
    var content = utils.getElement('content');
    if (content) {
      utils.setStyles(content, {
        marginLeft: !isReadMode ? '0' : '',
        padding: !isReadMode ? '1.5rem' : ''
      });
    }
    
    showStatus('Read Mode: ' + (!isReadMode ? 'On' : 'Off'));
  }

  function toggleCitations() {
    var references = document.querySelectorAll ? 
      document.querySelectorAll('.reference') : 
      document.getElementsByClassName('reference');
    
    for (var i = 0; i < references.length; i++) {
      var ref = references[i];
      if (ref) {
        ref.style.display = STATE.citationsHidden ? '' : 'none';
      }
    }
    
    STATE.citationsHidden = !STATE.citationsHidden;
    showStatus('Citations: ' + (STATE.citationsHidden ? 'Hidden' : 'Visible'));
  }

  function showStatus(message) {
    if (!statusBar) return;
    
    statusBar.innerHTML = message;
    statusBar.style.opacity = '1';
    
    if (STATE.autoHideTimeout) {
      clearTimeout(STATE.autoHideTimeout);
    }
    
    STATE.autoHideTimeout = setTimeout(function() {
      if (statusBar) statusBar.style.opacity = '0';
    }, 2000);
  }

  // === Interface Creation ===
  function createFloatingMenu() {
    // Load Material Icons with fallback
    var existingLink = document.querySelector('link[href*="material-icons"]');
    if (!existingLink) {
      var link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-menu';
    
    var menuItems = [
      { icon: 'palette', label: 'Theme', action: function() {
        STATE.currentThemeIndex = (STATE.currentThemeIndex + 1) % CACHE.themeNames.length;
        applyTheme(CACHE.themeNames[STATE.currentThemeIndex]);
      }},
      { icon: 'font_download', label: 'Font', action: function() {
        var currentFont = utils.storage.get('wikiFont', 'Sans');
        var currentIndex = CACHE.fontNames.indexOf(currentFont);
        var nextIndex = (currentIndex + 1) % CACHE.fontNames.length;
        applyFont(CACHE.fontNames[nextIndex]);
      }},
      { icon: 'chrome_reader_mode', label: 'Read', action: toggleReadMode },
      { icon: 'format_quote', label: 'Citations', action: toggleCitations },
      { icon: 'refresh', label: 'Reset', action: function() {
        document.body.className = '';
        document.body.style.cssText = '';
        showStatus('Reset Complete');
      }}
    ];

    for (var i = 0; i < menuItems.length; i++) {
      var item = menuItems[i];
      var button = document.createElement('div');
      button.className = 'menu-item';
      button.innerHTML = 
        '<span class="material-icons">' + item.icon + '</span>' +
        '<span class="label">' + item.label + '</span>';
      
      // Legacy event binding
      (function(action) {
        COMPAT.addEventListener(button, 'click', action);
      })(item.action);
      
      floatingMenu.appendChild(button);
    }

    // Simple drag functionality for legacy browsers
    var isDragging = false;
    var startX, startY, startLeft, startTop;

    COMPAT.addEventListener(floatingMenu, 'mousedown', function(e) {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      var rect = floatingMenu.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      floatingMenu.style.transition = 'none';
    });

    COMPAT.addEventListener(document, 'mousemove', function(e) {
      if (!isDragging) return;
      
      var deltaX = e.clientX - startX;
      var deltaY = e.clientY - startY;
      
      floatingMenu.style.left = (startLeft + deltaX) + 'px';
      floatingMenu.style.top = (startTop + deltaY) + 'px';
      floatingMenu.style.right = 'auto';
      floatingMenu.style.transform = 'none';
    });

    COMPAT.addEventListener(document, 'mouseup', function() {
      isDragging = false;
      floatingMenu.style.transition = '';
    });

    document.body.appendChild(floatingMenu);
  }

  function createStatusBar() {
    statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    statusBar.innerHTML = 'Classic Menu Ready';
    statusBar.style.opacity = '0';
    document.body.appendChild(statusBar);
  }

  function restorePreferences() {
    var savedTheme = utils.storage.get('wikiTheme');
    if (savedTheme && CONFIG.themes[savedTheme]) {
      STATE.currentThemeIndex = CACHE.themeNames.indexOf(savedTheme);
      applyTheme(savedTheme);
    }
    
    var savedFont = utils.storage.get('wikiFont');
    if (savedFont && CONFIG.fonts[savedFont]) {
      applyFont(savedFont);
    }
  }

  // === Legacy Hotkeys ===
  function setupHotkeys() {
    COMPAT.addEventListener(document, 'keydown', function(e) {
      var ctrlKey = e.ctrlKey || e.metaKey;
      if (ctrlKey) {
        var key = String.fromCharCode(e.keyCode).toLowerCase();
        switch (key) {
          case 't':
            if (e.preventDefault) e.preventDefault();
            STATE.currentThemeIndex = (STATE.currentThemeIndex + 1) % CACHE.themeNames.length;
            applyTheme(CACHE.themeNames[STATE.currentThemeIndex]);
            break;
          case 'r':
            if (e.preventDefault) e.preventDefault();
            toggleReadMode();
            break;
        }
      }
    });
  }

  // === Initialization ===
  function init() {
    try {
      createFloatingMenu();
      createStatusBar();
      restorePreferences();
      setupHotkeys();
      
      setTimeout(function() {
        showStatus('Classic Menu Ready');
      }, 500);
    } catch (error) {
      // Silent fallback for legacy browsers
    }
  }

  // Legacy DOM ready detection
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', init);
  } else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', function() {
      if (document.readyState === 'complete') {
        init();
      }
    });
  }
})();