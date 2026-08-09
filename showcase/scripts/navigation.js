// navigation.js - Page switching for showcase

var navItems = document.querySelectorAll('.nav-item');
var previewFrame = document.getElementById('preview-frame');
var pageLabel = document.getElementById('page-label');

// Sidebar click → switch page
navItems.forEach(function(item) {
  item.addEventListener('click', function() {
    var page = item.getAttribute('data-page');
    var label = item.querySelector('.nav-item__label').textContent;
    setActive(page, label);
  });
});

// Global nav function used by in-page bottom tab bars and buttons.
// Pages call parent.navigateTo('pages/xxx.html') from inside the iframe.
window.navigateTo = function(page) {
  var label = page;
  navItems.forEach(function(n) {
    if (n.getAttribute('data-page') === page) {
      label = n.querySelector('.nav-item__label').textContent;
    }
  });
  setActive(page, label);
};

function setActive(page, label) {
  navItems.forEach(function(n) { n.classList.remove('nav-item--active'); });
  navItems.forEach(function(n) {
    if (n.getAttribute('data-page') === page) {
      n.classList.add('nav-item--active');
    }
  });
  previewFrame.src = page;
  pageLabel.textContent = label;
}
