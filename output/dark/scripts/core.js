/* global document */
var accordionLocalStorageKey = 'accordion-id';

// eslint-disable-next-line no-undef
var localStorage = window.localStorage;

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
  var preMaxHeight = window.innerHeight - navbarHeight - footerHeight - 168;

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

function onDomContentLoaded() {
  // Highlighting code

  // eslint-disable-next-line no-undef
  hljs.addPlugin({
    'after:highlightElement': function(obj) {
      obj.el.parentNode.setAttribute('data-lang', obj.result.language);
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
}

// eslint-disable-next-line no-undef
window.addEventListener('DOMContentLoaded', onDomContentLoaded);
