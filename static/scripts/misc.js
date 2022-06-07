/* global document */
var accordionLocalStorageKey = 'accordion-id';

// eslint-disable-next-line no-undef
var localStorage = window.localStorage;

/**
 *
 * @param {string} value
 */
function copy(value) {
  const el = document.createElement('textarea');
  const editedValue = value.replace(/JAVASCRIPT\nCopied!$/, '');

  el.value = editedValue;
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

(function() {
  // capturing all pre element on the page
  var allPre = document.getElementsByTagName('pre');

  var i, classList;

  for (i = 0; i < allPre.length; i++) {
    // get the list of class in current pre element
    classList = allPre[i].classList;
    var id = 'pre-id-' + i;

    // tooltip
    var tooltip =
            '<div class="tooltip" id="tooltip-' + id + '">Copied!</div>';

    // template of copy to clipboard icon container
    var copyToClipboard =
            '<div class="code-copy-icon-container" onclick="copyFunction(\'' +
            id +
            '\')"><div><svg class="sm-icon" alt="click to copy"><use xlink:href="#copy-icon"></use></svg>' +
            tooltip +
            '<div></div>';

    // extract the code language
    var langName = classList[classList.length - 1];

    if (typeof langName === 'string') {
      langName = langName.split('-')[1];
    }

    /**
         * By default language name is javascript.
         */
    if (langName === undefined) {
      langName = 'JavaScript';
    }

    // if(langName != undefined)
    var langNameDiv =
            '<div class="code-lang-name-container"><div class="code-lang-name">' +
            langName.toLocaleUpperCase() +
            '</div></div>';
    // else langNameDiv = '';

    // appending everything to the current pre element
    allPre[i].innerHTML +=
            '<div class="pre-top-bar-container">' +
            langNameDiv +
            copyToClipboard +
            '</div>';
    allPre[i].setAttribute('id', id);
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

(function() {
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
})();

/**
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} navbar
 */
function toggleNavbar(element, navbar) {
  /**
     * If class is present than it is expanded.
     */
  var isExpanded = element.classList.contains('expanded');

  if (isExpanded) {
    element.classList.remove('expanded');
    navbar.classList.remove('expanded');
  } else {
    element.classList.add('expanded');
    navbar.classList.add('expanded');
  }
}

/**
 * Navbar ham
 */
(function() {
  var navbarHam = document.querySelector('#navbar-ham');
  var navbar = document.querySelector('#navbar');

  if (navbarHam && navbar) {
    navbarHam.addEventListener('click', function() {
      toggleNavbar(navbarHam, navbar);
    });
  }
})();

// function bringIdToView() {
//   var id = window.location.hash

//   if(id === '') return
// }

function createAnchorElement(id) {
  var anchor = document.createElement('a');

  anchor.textContent = '#';
  anchor.href = '#' + id;
  anchor.classList.add('link-anchor');

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

function onDomContentLoaded() {
  addAnchor();
}

// eslint-disable-next-line no-undef
window.addEventListener('DOMContentLoaded', onDomContentLoaded);
