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
      
      root.style.setProperty('--bg-color', t.background);
      root.style.setProperty('--text-color', t.text);
      document.body.style.backgroundColor = t.background;
      document.body.style.color = t.text;
      localStorage.setItem('wikiTheme', name);
      showStatus(`Theme: ${name}`);
      updateMenuColors(name);
    }

  function updateMenuColors(themeName) {
    // Validate inputs
    if (!floatingMenu || !floatingMenu.style || !floatingMenu.querySelectorAll) return;
    if (typeof themeName !== 'string') return;
    
    // Define themes array as constant for better maintainability
    const DARK_THEMES = ['Dark', 'HighContrast', 'Ocean', 'Forest'];
    const isDark = DARK_THEMES.includes(themeName);
    
    const menuBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)';
    const itemBg = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)';
    const textColor = isDark ? '#fff' : '#000';
    
    // Set menu background
    floatingMenu.style.background = menuBg;
    
    // Optimize DOM query and update menu items
    const menuItems = floatingMenu.querySelectorAll('.menu-item');
    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i];
      item.style.background = itemBg;
      item.style.color = textColor;
    }
  }

  function applyFont(name) {
    // Validate input parameter
    if (!name || typeof name !== 'string') {
      console.warn('Invalid font name provided');
      return;
    }
    
    // Check if font exists in fonts object
    if (!fonts || !fonts.hasOwnProperty(name)) {
      console.warn(`Font '${name}' not found in fonts configuration`);
      return;
    }
    
    // Apply font style
    document.body.style.fontFamily = fonts[name];
    
    // Safely store in localStorage with error handling
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
    const selectors = ['#mw-panel', '#mw-head', '#footer', '.vector-menu', '.mw-editsection'];
    const isReadMode = document.body.classList.toggle('read-mode');
  
    // Helper to safely add transition without overwriting existing ones
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
  
    const content = document.getElementById('content');
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
  
    // Guard against missing or broken showStatus
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
    
    // Restore menu position
    const savedPosition = localStorage.getItem('wikiMenuPosition');
    if (savedPosition && floatingMenu) {
      const pos = JSON.parse(savedPosition);
      Object.assign(floatingMenu.style, pos);
    }
  }

  function saveMenuPosition() {
    if (!floatingMenu) return;
    const rect = floatingMenu.getBoundingClientRect();
    const position = {
      left: floatingMenu.style.left || 'unset',
      top: floatingMenu.style.top || 'unset',
      right: floatingMenu.style.right || '20px',
      bottom: floatingMenu.style.bottom || 'unset'
    };
    localStorage.setItem('wikiMenuPosition', JSON.stringify(position));
  }

  // === Enhanced Interface Creation ===
  function createFloatingMenu() {
    // Load Material Icons
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-menu';
    Object.assign(floatingMenu.style, {
      position: 'fixed',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '1rem',
      borderRadius: '1.5rem',
      cursor: 'move',
      background: 'rgba(255,255,255,0.25)',
      backdropFilter: 'blur(10px)',
      isolation: 'isolate',
      transition: 'all 0.4s ease-in-out',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
    });

    // Enhanced drag functionality with position saving
    let dragging = false, offsetX = 0, offsetY = 0;
    floatingMenu.addEventListener('mousedown', e => {
      if (e.target.closest('.menu-item')) return;
      dragging = true;
      offsetX = e.clientX - floatingMenu.getBoundingClientRect().left;
      offsetY = e.clientY - floatingMenu.getBoundingClientRect().top;
      floatingMenu.style.transition = 'none';
      floatingMenu.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      floatingMenu.style.left = `${e.clientX - offsetX}px`;
      floatingMenu.style.top = `${e.clientY - offsetY}px`;
      floatingMenu.style.right = 'unset';
      floatingMenu.style.bottom = 'unset';
      floatingMenu.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        floatingMenu.style.transition = 'all 0.4s ease-in-out';
        floatingMenu.style.cursor = 'move';
        saveMenuPosition();
      }
    });

    // Enhanced button creation
    const createItem = (icon, label, action, isToggle = false) => {
      const item = document.createElement('div');
      item.className = isToggle ? 'menu-item toggle-btn' : 'menu-item';
      item.innerHTML = `<span class="material-icons">${icon}</span>${label ? `<span class="label">${label}</span>` : ''}`;
      Object.assign(item.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '16px',
        color: '#000',
        padding: '10px 12px',
        borderRadius: '1rem',
        background: 'rgba(255,255,255,0.3)',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        userSelect: 'none'
      });
      
      item.onmouseover = () => {
        item.style.background = 'rgba(255,255,255,0.5)';
        item.style.transform = 'translateX(-2px)';
      };
      item.onmouseout = () => {
        item.style.background = 'rgba(255,255,255,0.3)';
        item.style.transform = 'translateX(0)';
      };
      item.onclick = action;
      return item;
    };

    // Add toggle button first
    floatingMenu.appendChild(createItem('expand_less', '', toggleMenuCollapse, true));
    floatingMenu.appendChild(createItem('visibility_off', 'Citations', toggleCitations));
    floatingMenu.appendChild(createItem('chrome_reader_mode', 'Read Mode', toggleReadMode));
    floatingMenu.appendChild(createItem('palette', 'Theme', () => {
      currentThemeIndex = (currentThemeIndex + 1) % themeNames.length;
      applyTheme(themeNames[currentThemeIndex]);
    }));
    floatingMenu.appendChild(createItem('font_download', 'Font', () => {
      const currentFont = localStorage.getItem('wikiFont') || 'Sans';
      const nextIndex = (fontNames.indexOf(currentFont) + 1) % fontNames.length;
      applyFont(fontNames[nextIndex]);
    }));
    floatingMenu.appendChild(createItem('refresh', 'Reset', () => {
      localStorage.removeItem('wikiTheme');
      localStorage.removeItem('wikiFont');
      localStorage.removeItem('wikiMenuPosition');
      location.reload();
    }));

    document.body.appendChild(floatingMenu);
  }

  function createStatusBar() {
    // Declare the variable properly to avoid global pollution
    let statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    
    // Check if document.body exists before appending
    if (!document.body) {
      throw new Error('Document body not available');
    }
    
    // Use CSS text for better performance and maintainability
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
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.3s ease-in-out;
      opacity: 0;
      transform: translateY(10px);
      display: flex;
      align-items: center;
    `;
    
    document.body.appendChild(statusBar);
    
    // Return the element for further manipulation and cleanup
    return statusBar;
  }

  // === Enhanced Hotkeys ===
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    
    const k = e.key.toLowerCase();
    if (k === 'r') {
      e.preventDefault();
      toggleReadMode();
    }
    if (k === 't') {
      e.preventDefault();
      currentThemeIndex = (currentThemeIndex + 1) % themeNames.length;
      applyTheme(themeNames[currentThemeIndex]);
    }
    if (k === 'c') {
      e.preventDefault();
      toggleCitations();
    }
    if (k === 'm') {
      e.preventDefault();
      toggleMenuCollapse();
    }
  });

  // === Entry ===
  window.addEventListener('load', () => {
    createStatusBar();
    createFloatingMenu();
    restorePreferences();
    showStatus('Wikipedia Enhanced - Ready!');
  });

  // Optional: Load signature helper
  if (typeof mw !== 'undefined') {
    mw.loader.load('//en.wikipedia.org/w/index.php?title=User:SandWafer/sig.js&action=raw&ctype=text/javascript');
  }
})();
