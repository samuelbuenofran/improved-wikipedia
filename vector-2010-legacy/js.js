(function () {
  'use strict';

  // === Configuration ===
  const themes = {
    Light: { background: '#ffffff', text: '#202124' },
    Dark: { background: '#121212', text: '#eaeaea' },
    Sepia: { background: '#f4ecd8', text: '#5b4636' },
    HighContrast: { background: '#000000', text: '#ffff00' },
    Ocean: { background: '#0f3460', text: '#e8f4fd' },
    Forest: { background: '#1a2f1a', text: '#c8e6c9' }
  };

  const fonts = {
    Sans: '"Segoe UI", "Helvetica Neue", sans-serif',
    Serif: '"Georgia", "Times New Roman", serif',
    Mono: '"Courier New", monospace',
    Modern: '"Inter", "SF Pro Display", sans-serif'
  };

  const themeNames = Object.keys(themes);
  const fontNames = Object.keys(fonts);

  let currentThemeIndex = 0;
  let citationsHidden = false;
  let statusBar, floatingMenu;
  let menuCollapsed = false;
  let autoHideTimeout;

  // === Enhanced Core Features ===
  function applyTheme(name) {
    if (!name || !themes[name]) {
      console.warn(`Theme '${name}' not found`);
      return;
    }
    
    const t = themes[name];
    const root = document.documentElement;
    
    // Legacy browser support
    if (root.style.setProperty) {
      root.style.setProperty('--bg-color', t.background);
      root.style.setProperty('--text-color', t.text);
    }
    
    document.body.style.backgroundColor = t.background;
    document.body.style.color = t.text;
    
    // Apply to legacy Wikipedia elements
    const globalWrapper = document.getElementById('globalWrapper');
    if (globalWrapper) {
      globalWrapper.style.backgroundColor = t.background;
      globalWrapper.style.color = t.text;
    }
    
    localStorage.setItem('wikiTheme', name);
    showStatus(`Theme: ${name}`);
    updateMenuColors(name);
  }

  function updateMenuColors(themeName) {
    if (!floatingMenu || !floatingMenu.style || !floatingMenu.querySelectorAll) return;
    if (typeof themeName !== 'string') return;
    
    const DARK_THEMES = ['Dark', 'HighContrast', 'Ocean', 'Forest'];
    const isDark = DARK_THEMES.includes(themeName);
    
    const menuBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)';
    const itemBg = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)';
    const textColor = isDark ? '#fff' : '#000';
    
    floatingMenu.style.background = menuBg;
    
    const menuItems = floatingMenu.querySelectorAll('.menu-item');
    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i];
      item.style.background = itemBg;
      item.style.color = textColor;
    }
  }

  function applyFont(name) {
    if (!name || typeof name !== 'string') {
      console.warn('Invalid font name provided');
      return;
    }
    
    if (!fonts || !fonts.hasOwnProperty(name)) {
      console.warn(`Font '${name}' not found in fonts configuration`);
      return;
    }
    
    document.body.style.fontFamily = fonts[name];
    
    // Apply to legacy content area
    const content = document.getElementById('content');
    if (content) {
      content.style.fontFamily = fonts[name];
    }
    
    try {
      localStorage.setItem('wikiFont', name);
    } catch (e) {
      console.warn('Failed to save font preference to localStorage:', e);
    }
    
    showStatus(`Font: ${name}`);
  }

  function toggleReadMode() {
    const TRANSITION_DURATION = 400;
    const REVEAL_DELAY = 50;
    
    // Legacy Vector 2010 selectors
    const selectors = ['#column-one', '#p-cactions', '#p-personal', '#footer .portlet'];
    const isReadMode = document.body.classList.toggle('read-mode');
  
    function addTransition(element, transition) {
      const current = element.style.transition;
      if (!current.includes(transition)) {
        element.style.transition = current ? `${current}, ${transition}` : transition;
      }
    }
  
    selectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
  
      addTransition(el, 'opacity 0.4s, transform 0.4s');
  
      if (isReadMode) {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-20px)';
        setTimeout(() => el.style.display = 'none', TRANSITION_DURATION);
      } else {
        el.style.display = '';
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateX(0)';
        }, REVEAL_DELAY);
      }
    });
  
    // Legacy content adjustments
    const columnContent = document.getElementById('column-content');
    const content = document.getElementById('content');
    
    if (columnContent) {
      addTransition(columnContent, 'margin 0.4s');
      if (isReadMode) {
        columnContent.style.marginLeft = '0';
        columnContent.style.marginRight = '0';
      } else {
        columnContent.style.marginLeft = '';
        columnContent.style.marginRight = '';
      }
    }
    
    if (content) {
      addTransition(content, 'max-width 0.4s, margin 0.4s');
      if (isReadMode) {
        content.style.maxWidth = 'none';
        content.style.marginLeft = '0';
      } else {
        content.style.maxWidth = '';
        content.style.marginLeft = '';
      }
    }
  
    if (typeof showStatus === 'function') {
      showStatus(`Read Mode: ${isReadMode ? 'On' : 'Off'}`);
    }
  }

  function toggleCitations() {
    document.querySelectorAll('.reference').forEach(ref => {
      ref.style.transition = 'opacity 0.3s';
      ref.style.display = citationsHidden ? '' : 'none';
    });
    citationsHidden = !citationsHidden;
    showStatus(`Citations: ${citationsHidden ? 'Hidden' : 'Visible'}`);
  }

  function toggleMenuCollapse() {
    menuCollapsed = !menuCollapsed;
    const items = floatingMenu.querySelectorAll('.menu-item');
    const toggleBtn = floatingMenu.querySelector('.toggle-btn');
    
    items.forEach((item, index) => {
      if (item === toggleBtn) return;
      item.style.transition = 'all 0.3s ease-in-out';
      if (menuCollapsed) {
        item.style.opacity = '0';
        item.style.transform = 'translateX(20px)';
        setTimeout(() => item.style.display = 'none', 300);
      } else {
        item.style.display = 'flex';
        setTimeout(() => {
          item.style.opacity = '1';
          item.style.transform = 'translateX(0)';
        }, index * 50);
      }
    });
    
    toggleBtn.innerHTML = `<span class="material-icons">${menuCollapsed ? 'expand_more' : 'expand_less'}</span>`;
    showStatus(`Menu: ${menuCollapsed ? 'Collapsed' : 'Expanded'}`);
  }

  function showStatus(text) {
    if (!statusBar) return;
    statusBar.innerHTML = `<span class="material-icons" style="font-size: 16px; margin-right: 6px;">info</span>${text}`;
    statusBar.style.opacity = '1';
    statusBar.style.transform = 'translateY(0)';
    
    clearTimeout(autoHideTimeout);
    autoHideTimeout = setTimeout(() => {
      statusBar.style.opacity = '0';
      statusBar.style.transform = 'translateY(10px)';
    }, 3000);
  }

  function restorePreferences() {
    const theme = localStorage.getItem('wikiTheme') || 
      (new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'Light' : 'Dark');
    currentThemeIndex = themeNames.indexOf(theme);
    applyTheme(theme);

    const font = localStorage.getItem('wikiFont') || 'Sans';
    applyFont(font);
    
    const savedPosition = localStorage.getItem('wikiMenuPosition');
    if (savedPosition && floatingMenu) {
      try {
        const pos = JSON.parse(savedPosition);
        Object.assign(floatingMenu.style, pos);
      } catch (e) {
        console.warn('Failed to restore menu position:', e);
      }
    }
  }

  function saveMenuPosition() {
    if (!floatingMenu) return;
    const position = {
      left: floatingMenu.style.left || 'unset',
      top: floatingMenu.style.top || 'unset',
      right: floatingMenu.style.right || '20px',
      bottom: floatingMenu.style.bottom || 'unset'
    };
    try {
      localStorage.setItem('wikiMenuPosition', JSON.stringify(position));
    } catch (e) {
      console.warn('Failed to save menu position:', e);
    }
  }

  // === Enhanced Interface Creation ===
  function createFloatingMenu() {
    // Load Material Icons with fallback
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    link.rel = 'stylesheet';
    link.onerror = function() {
      console.warn('Failed to load Material Icons');
    };
    document.head.appendChild(link);

    floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-menu';
    
    // Use cssText for better legacy browser support
    floatingMenu.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 1rem;
      border-radius: 1.5rem;
      cursor: move;
      background: rgba(255,255,255,0.25);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      isolation: isolate;
      transition: all 0.4s ease-in-out;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2);
    `;

    // Enhanced drag functionality
    let dragging = false, offsetX = 0, offsetY = 0;
    
    floatingMenu.addEventListener('mousedown', function(e) {
      if (e.target.closest('.menu-item')) return;
      dragging = true;
      offsetX = e.clientX - floatingMenu.getBoundingClientRect().left;
      offsetY = e.clientY - floatingMenu.getBoundingClientRect().top;
      floatingMenu.style.transition = 'none';
      floatingMenu.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      floatingMenu.style.left = (e.clientX - offsetX) + 'px';
      floatingMenu.style.top = (e.clientY - offsetY) + 'px';
      floatingMenu.style.right = 'unset';
      floatingMenu.style.bottom = 'unset';
      floatingMenu.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', function() {
      if (dragging) {
        dragging = false;
        floatingMenu.style.transition = 'all 0.4s ease-in-out';
        floatingMenu.style.cursor = 'move';
        saveMenuPosition();
      }
    });

    // Enhanced button creation
    function createItem(icon, label, action, isToggle) {
      const item = document.createElement('div');
      item.className = isToggle ? 'menu-item toggle-btn' : 'menu-item';
      item.innerHTML = '<span class="material-icons">' + icon + '</span>' + 
                      (label ? '<span class="label">' + label + '</span>' : '');
      
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        color: #000;
        padding: 10px 12px;
        border-radius: 1rem;
        background: rgba(255,255,255,0.3);
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      `;
      
      item.onmouseover = function() {
        item.style.background = 'rgba(255,255,255,0.5)';
        item.style.transform = 'translateX(-2px)';
      };
      
      item.onmouseout = function() {
        item.style.background = 'rgba(255,255,255,0.3)';
        item.style.transform = 'translateX(0)';
      };
      
      item.onclick = action;
      return item;
    }

    // Add menu items
    floatingMenu.appendChild(createItem('expand_less', '', toggleMenuCollapse, true));
    floatingMenu.appendChild(createItem('visibility_off', 'Citations', toggleCitations));
    floatingMenu.appendChild(createItem('chrome_reader_mode', 'Read Mode', toggleReadMode));
    floatingMenu.appendChild(createItem('palette', 'Theme', function() {
      currentThemeIndex = (currentThemeIndex + 1) % themeNames.length;
      applyTheme(themeNames[currentThemeIndex]);
    }));
    floatingMenu.appendChild(createItem('font_download', 'Font', function() {
      const currentFont = localStorage.getItem('wikiFont') || 'Sans';
      const nextIndex = (fontNames.indexOf(currentFont) + 1) % fontNames.length;
      applyFont(fontNames[nextIndex]);
    }));
    floatingMenu.appendChild(createItem('refresh', 'Reset', function() {
      localStorage.removeItem('wikiTheme');
      localStorage.removeItem('wikiFont');
      localStorage.removeItem('wikiMenuPosition');
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
    
    statusBar.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9998;
      padding: 8px 16px;
      border-radius: 1rem;
      font-size: 14px;
      font-family: sans-serif;
      background: rgba(0,0,0,0.8);
      color: #fff;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.3s ease-in-out;
      opacity: 0;
      transform: translateY(10px);
      display: flex;
      align-items: center;
    `;
    
    document.body.appendChild(statusBar);
  }

  // === Enhanced Hotkeys ===
  function handleKeydown(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    
    const k = e.key ? e.key.toLowerCase() : String.fromCharCode(e.keyCode).toLowerCase();
    
    if (k === 'r') {
      if (e.preventDefault) e.preventDefault();
      toggleReadMode();
    }
    if (k === 't') {
      if (e.preventDefault) e.preventDefault();
      currentThemeIndex = (currentThemeIndex + 1) % themeNames.length;
      applyTheme(themeNames[currentThemeIndex]);
    }
    if (k === 'c') {
      if (e.preventDefault) e.preventDefault();
      toggleCitations();
    }
    if (k === 'm') {
      if (e.preventDefault) e.preventDefault();
      toggleMenuCollapse();
    }
  }

  // Legacy event listener support
  if (window.addEventListener) {
    window.addEventListener('keydown', handleKeydown);
  } else if (window.attachEvent) {
    window.attachEvent('onkeydown', handleKeydown);
  }

  // === Entry ===
  function initialize() {
    createStatusBar();
    createFloatingMenu();
    restorePreferences();
    showStatus('Wikipedia Enhanced - Ready!');
  }

  // Legacy load event support
  if (window.addEventListener) {
    window.addEventListener('load', initialize);
  } else if (window.attachEvent) {
    window.attachEvent('onload', initialize);
  } else {
    window.onload = initialize;
  }

  // Optional: Load signature helper with error handling
  if (typeof mw !== 'undefined' && mw.loader) {
    try {
      mw.loader.load('//en.wikipedia.org/w/index.php?title=User:SandWafer/sig.js&action=raw&ctype=text/javascript');
    } catch (e) {
      console.warn('Failed to load signature helper:', e);
    }
  }
})();