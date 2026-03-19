(function () {
  var search = document.getElementById('search');
  var filterBtns = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('.card');
  var noResults = document.getElementById('no-results');
  var gridMeta = document.getElementById('grid-meta');
  var total = cards.length;

  var activeFilter = 'all';
  var query = '';

  function applyFilters() {
    var visible = 0;
    cards.forEach(function(card) {
      var name = (card.dataset.name || '').toLowerCase();
      var cat  = (card.dataset.category || '').toLowerCase();
      var descEl = card.querySelector('.card-desc');
      var desc = descEl ? descEl.textContent.toLowerCase() : '';
      var matchSearch = !query || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1 || cat.indexOf(query) !== -1;
      var matchFilter = activeFilter === 'all' || cat === activeFilter.toLowerCase();
      var show = matchSearch && matchFilter;
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
    if (gridMeta) {
      gridMeta.textContent = (query || activeFilter !== 'all')
        ? visible + ' of ' + total + ' results'
        : total + ' total · A–Z';
    }
  }

  if (search) {
    search.addEventListener('input', function(e) {
      query = e.target.value.toLowerCase().trim();
      applyFilters();
    });
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        search.focus();
        search.select();
      }
    });
  }

  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      applyFilters();
    });
  });

  if (gridMeta) gridMeta.textContent = total + ' total · A–Z';
})();
