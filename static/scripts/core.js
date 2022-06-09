/* global document */
var accordionLocalStorageKey = 'accordion-id';
var themeLocalStorageKey = 'theme';
var fontSizeLocalStorageKey = 'font-size';
var html = document.querySelector('html');

var MAX_FONT_SIZE = 30;
var MIN_FONT_SIZE = 10;

// eslint-disable-next-line no-undef
var localStorage = window.localStorage;

function getTheme() {
  var body = document.body;

  return body.getAttribute('data-theme');
}

function updateTheme(theme) {
  var body = document.body;
  var svgUse = document.querySelectorAll('.theme-svg-use');
  var icon = theme === 'dark' ? 'light' : 'dark';

  body.setAttribute('data-theme', theme);
  body.classList.remove('dark', 'light');
  body.classList.add(theme);

  svgUse.forEach(function(svg) {
    svg.setAttribute('xlink:href', '#' + icon + '-theme-icon');
  });

  localStorage.setItem(themeLocalStorageKey, theme);
}

function toggleTheme() {
  var body = document.body;
  var theme = body.getAttribute('data-theme');

  var newTheme = theme === 'dark' ? 'light' : 'dark';

  updateTheme(newTheme);
}

(function() {
  var theme = getTheme();

  var themeStoredInLocalStorage = localStorage.getItem(themeLocalStorageKey);

  if (themeStoredInLocalStorage) {
    if (theme === themeStoredInLocalStorage) {
      return;
    }

    updateTheme(themeStoredInLocalStorage);
  } else {
    localStorage.setItem(themeLocalStorageKey, theme);
  }
})();

/**
 * Function to set accordion id to localStorage.
 * @param {string} id Accordion id
 */
function setAccordionIdToLocalStorage(id) {
  /**
     * @type {object}
     */
  var ids = JSON.parse(localStorage.getItem(accordionLocalStorageKey));

  ids[id] = id;
  localStorage.setItem(accordionLocalStorageKey, JSON.stringify(ids));
}

/**
 * Function to remove accordion id from localStorage.
 * @param {string} id Accordion id
 */
function removeAccordionIdFromLocalStorage(id) {
  /**
     * @type {object}
     */
  var ids = JSON.parse(localStorage.getItem(accordionLocalStorageKey));

  delete ids[id];
  localStorage.setItem(accordionLocalStorageKey, JSON.stringify(ids));
}

/**
 * Function to get all accordion ids from localStorage.
 *
 * @returns {object}
 */
function getAccordionIdsFromLocalStorage() {
  /**
     * @type {object}
     */
  var ids = JSON.parse(localStorage.getItem(accordionLocalStorageKey));

  return ids || {};
}

function toggleAccordion(element) {
  var currentNode = element;
  var isCollapsed = currentNode.getAttribute('data-isopen') === 'false';

  if (isCollapsed) {
    currentNode.setAttribute('data-isopen', 'true');
    setAccordionIdToLocalStorage(currentNode.id);
  } else {
    currentNode.setAttribute('data-isopen', 'false');
    removeAccordionIdFromLocalStorage(currentNode.id);
  }
}

function initAccordion() {
  if (
    localStorage.getItem(accordionLocalStorageKey) === undefined ||
        localStorage.getItem(accordionLocalStorageKey) === null
  ) {
    localStorage.setItem(accordionLocalStorageKey, '{}');
  }
  var allAccordion = document.querySelectorAll('.sidebar-section-title');
  var ids = getAccordionIdsFromLocalStorage();

  allAccordion.forEach(function(item) {
    item.addEventListener('click', function() {
      toggleAccordion(item);
    });
    if (item.id in ids) {
      toggleAccordion(item);
    }
  });
}

function isSourcePage() {
  return Boolean(document.querySelector('#source-page'));
}

function bringElementIntoView(element, updateHistory = true) {
  var navbar = document.querySelector('.navbar-container');
  var body = document.querySelector('.main-content');
  var elementTop = element.getBoundingClientRect().top;

  var offset = 16;

  if (navbar) {
    offset += navbar.scrollHeight;
  }

  body.scrollBy(0, elementTop - offset);

  if (updateHistory) {
    // eslint-disable-next-line no-undef
    history.pushState(null, null, '#' + element.id);
  }
}

// eslint-disable-next-line no-unused-vars
function bringLinkToView(event) {
  event.preventDefault();
  event.stopPropagation();
  var id = event.currentTarget.getAttribute('href');

  if (!id) {
    return;
  }

  var element = document.getElementById(id.slice(1));

  if (element) {
    bringElementIntoView(element);
  }
}

function bringIdToViewOnMount() {
  if (isSourcePage()) {
    return;
  }

  // eslint-disable-next-line no-undef
  var id = window.location.hash;

  if (id === '') {
    return;
  }

  var element = document.getElementById(id.slice(1));

  if (element) {
    bringElementIntoView(element, false);
  }
}

function createAnchorElement(id) {
  var anchor = document.createElement('a');

  anchor.textContent = '#';
  anchor.href = '#' + id;
  anchor.classList.add('link-anchor');
  anchor.onclick = bringLinkToView;

  return anchor;
}

function addAnchor() {
  var main = document.querySelector('.main-content').querySelector('section');

  var h1 = main.querySelectorAll('h1');
  var h2 = main.querySelectorAll('h2');
  var h3 = main.querySelectorAll('h3');
  var h4 = main.querySelectorAll('h4');

  var targets = [h1, h2, h3, h4];

  targets.forEach(function(target) {
    target.forEach(function(heading) {
      var anchor = createAnchorElement(heading.id);

      heading.classList.add('has-anchor');
      heading.append(anchor);
    });
  });
}

/**
 *
 * @param {string} value
 */
function copy(value) {
  const el = document.createElement('textarea');

  el.value = value;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function showTooltip(id) {
  var tooltip = document.getElementById(id);

  tooltip.classList.add('show-tooltip');
  setTimeout(function() {
    tooltip.classList.remove('show-tooltip');
  }, 3000);
}

/* eslint-disable-next-line */
function copyFunction(id) {
  // selecting the pre element
  var code = document.getElementById(id);

  // selecting the ol.linenums
  var element = code.querySelector('.linenums');

  if (!element) {
    // selecting the code block
    element = code.querySelector('code');
  }

  // copy
  copy(element.innerText);

  // show tooltip
  showTooltip('tooltip-' + id);
}

function hideTocOnSourcePage() {
  if (isSourcePage()) {
    document.querySelector('.toc-container').style.display = 'none';
  }
}

function getPreTopBar(id, lang) {
  // tooltip
  var tooltip = '<div class="tooltip" id="tooltip-' + id + '">Copied!</div>';

  // template of copy to clipboard icon container
  var copyToClipboard =
        '<div class="code-copy-icon-container" onclick="copyFunction(\'' +
        id +
        '\')"><div><svg class="sm-icon" alt="click to copy"><use xlink:href="#copy-icon"></use></svg>' +
        tooltip +
        '<div></div>';

  var langNameDiv =
        '<div class="code-lang-name-container"><div class="code-lang-name">' +
        lang.toLocaleUpperCase() +
        '</div></div>';

  var topBar =
        '<div class="pre-top-bar-container">' +
        langNameDiv +
        copyToClipboard +
        '</div>';

  return topBar;
}

function getPreDiv() {
  var divElement = document.createElement('div');

  divElement.classList.add('pre-div');

  return divElement;
}

function processAllPre() {
  var targets = document.querySelectorAll('pre');
  var footer = document.querySelector('#footer');
  var navbar = document.querySelector('#navbar');

  var footerHeight = footer.getBoundingClientRect().height;
  var navbarHeight = navbar.getBoundingClientRect().height;

  // eslint-disable-next-line no-undef
  var preMaxHeight = window.innerHeight - navbarHeight - footerHeight - 180;

  // var isSource = isSourcePage();

  targets.forEach(function(pre, idx) {
    var div = getPreDiv();
    var id = 'pre-id' + idx;
    var lang = pre.getAttribute('data-lang');
    var topBar = getPreTopBar(id, lang);

    div.innerHTML = topBar;

    pre.style.maxHeight = preMaxHeight + 'px';
    pre.id = id;
    pre.parentNode.insertBefore(div, pre);
    div.appendChild(pre);
  });
}

function highlightAndBringLineIntoView() {
  // eslint-disable-next-line no-undef
  var lineNumber = window.location.hash.replace('#line', '');

  try {
    var selector = '[data-line-number="' + lineNumber + '"';

    var element = document.querySelector(selector);

    element.scrollIntoView();
    element.parentNode.classList.add('selected');
  } catch (error) {
    console.error(error);
  }
}

function getFontSize() {
  var currentFontSize = 16;

  try {
    currentFontSize = Number.parseInt(
      html.style.fontSize.split('px')[0],
      10
    );
  } catch (error) {
    console.log(error);
  }

  return currentFontSize;
}

function updateFontSize(fontSize) {
  html.style.fontSize = fontSize + 'px';
  localStorage.setItem(fontSizeLocalStorageKey, fontSize);
  var fontSizeText = document.querySelector('#font-size-text');

  if (fontSizeText) {
    fontSizeText.innerHTML = fontSize;
  }
}

(function() {
  var fontSize = getFontSize();
  var fontSizeInLocalStorage = localStorage.getItem(fontSizeLocalStorageKey);

  if (fontSizeInLocalStorage) {
    var n = Number.parseInt(fontSizeInLocalStorage, 10);

    if (n === fontSize) {
      return;
    }
    updateFontSize(n);
  } else {
    localStorage.setItem(fontSizeInLocalStorage, fontSize);
  }
})();

// eslint-disable-next-line no-unused-vars
function incrementFont(event) {
  var n = getFontSize();

  if (n < MAX_FONT_SIZE) {
    updateFontSize(n + 1);
  }
}

// eslint-disable-next-line no-unused-vars
function decrementFont(event) {
  var n = getFontSize();

  if (n > MIN_FONT_SIZE) {
    updateFontSize(n - 1);
  }
}

function fontSizeTooltip() {
  var fontSize = getFontSize();

  return `
  <div class="font-size-tooltip">
    <button class="icon-button ${
  fontSize >= MAX_FONT_SIZE ? 'disabled' : ''
}" onclick="decrementFont(event)">
      <svg>
        <use xlink:href="#minus-icon"></use>
      </svg>
    </button>
    <div class="font-size-text" id="font-size-text">
      ${fontSize}
    </div>
    <button class="icon-button ${
  fontSize <= MIN_FONT_SIZE ? 'disabled' : ''
}" onclick="incrementFont(event)">
      <svg>
        <use xlink:href="#add-icon"></use>
      </svg>
    </button>
    <button class="icon-button" onclick="updateFontSize(16)">
      <svg>
        <use xlink:href="#reset-icon"></use>
      </svg>
    </button>
  </div>

  `;
}

function initTooltip() {
  // add tooltip to navbar item
  // eslint-disable-next-line no-undef
  tippy('.theme-toggle', {
    content: 'Toggle Theme',
    delay: 500
  });

  // eslint-disable-next-line no-undef
  tippy('.search-button', {
    content: 'Search',
    delay: 500
  });

  // eslint-disable-next-line no-undef
  tippy('.font-size', {
    content: 'Change font size',
    delay: 500
  });

  // eslint-disable-next-line no-undef
  tippy('.codepen-button', {
    content: 'Open code in CodePen',
    placement: 'left'
  });

  // eslint-disable-next-line no-undef
  tippy('.font-size', {
    content: fontSizeTooltip(),
    trigger: 'click',
    interactive: true,
    allowHTML: true,
    placement: 'left'
  });
}

function fixTable() {
  var tables = document.querySelectorAll('table');
  var table;

  // eslint-disable-next-line no-undef
  if (window.innerWidth > 900) {
    // Only fixing table if width is smaller than 900px
    return;
  }

  for (table of tables) {
    if (table.classList.contains('hljs-ln')) {
      // don't want to wrap code blocks.
      return;
    }

    var div = document.createElement('div');

    div.classList.add('table-div');
    table.parentNode.insertBefore(div, table);
    div.appendChild(table);
  }
}

function onMobileMenuClick(event) {
  var mobileMenuContainer = document.querySelector('#mobile-sidebar');
  var target = event.currentTarget;
  var svgUse = target.querySelector('use');
  var isOpen = target.getAttribute('data-isopen') === 'true';

  if (mobileMenuContainer) {
    if (isOpen) {
      mobileMenuContainer.classList.remove('show');
      target.setAttribute('data-isopen', 'false');
      svgUse.setAttribute('xlink:href', '#menu-icon');
    } else {
      mobileMenuContainer.classList.add('show');
      target.setAttribute('data-isopen', 'true');
      svgUse.setAttribute('xlink:href', '#close-icon');
    }
  }
}

function initMobileMenu() {
  var menu = document.querySelector('#mobile-menu');

  if (menu) {
    menu.addEventListener('click', onMobileMenuClick);
  }
}

function onDomContentLoaded() {
  var themeButton = document.querySelectorAll('.theme-toggle');

  initMobileMenu();

  if (themeButton) {
    themeButton.forEach(function(button) {
      button.addEventListener('click', toggleTheme);
    });
  }

  // Highlighting code

  // eslint-disable-next-line no-undef
  hljs.addPlugin({
    'after:highlightElement': function(obj) {
      // Replace 'code' with result.language when
      // we are able to cross check the correctness of
      // result.
      obj.el.parentNode.setAttribute('data-lang', 'code');
    }
  });
  // eslint-disable-next-line no-undef
  hljs.highlightAll();
  // eslint-disable-next-line no-undef
  hljs.initLineNumbersOnLoad({
    singleLine: true
  });

  // Highlight complete

  initAccordion();
  addAnchor();
  processAllPre();
  hideTocOnSourcePage();
  setTimeout(function() {
    bringIdToViewOnMount();
    if (isSourcePage()) {
      highlightAndBringLineIntoView();
    }
  }, 1000);
  initTooltip();
  fixTable();
}

// eslint-disable-next-line no-undef
window.addEventListener('DOMContentLoaded', onDomContentLoaded);