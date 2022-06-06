/* global document */
(function() {
  var article = document.querySelector('article');
  var targets = document.querySelectorAll('pre');
  var footer = document.querySelector('#footer');
  var navbar = document.querySelector('#navbar');

  var footerHeight = footer.getBoundingClientRect().height;
  var navbarHeight = navbar.getBoundingClientRect().height;

  // eslint-disable-next-line no-undef
  var divMaxHeight = window.innerHeight - navbarHeight - footerHeight - 168;

  setTimeout(function() {
    targets.forEach(function(item) {
      var innerHTML = item.innerHTML;
      var divElement = document.createElement('div');

      if (article.childElementCount === 1) {
        // this means we are on code page.
        item.style.margin = 0;
      }

      divElement.style.maxHeight = divMaxHeight + 'px';
      divElement.style.marginTop = '2rem';
      divElement.innerHTML = innerHTML;

      item.innerHTML = '';
      item.appendChild(divElement);
    });

    // See if we have to move something into view
    // eslint-disable-next-line no-undef
    var location = window.location.href.split('#')[1];

    if (location && location.length > 0) {
      try {
        var element = document.querySelector(
          '#'.concat(decodeURI(location))
        );

        element.scrollIntoView();
      } catch (error) {
        console.log(error);
      }
    }
  }, 300);
})();
