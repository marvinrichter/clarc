/* clarc Hub — client-side search + filter */
/* eslint-disable no-undef */
(function () {
  const searchInput = document.getElementById('search');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.card');
  const noResults = document.getElementById('no-results');

  let activeFilter = 'all';
  let searchQuery = '';

  function applyFilters() {
    let visible = 0;
    cards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const category = (card.dataset.category || '').toLowerCase();
      const desc = (card.querySelector('.card-desc')?.textContent || '').toLowerCase();
      const when = (card.querySelector('.card-when')?.textContent || '').toLowerCase();

      const matchesSearch = !searchQuery ||
        name.includes(searchQuery) ||
        desc.includes(searchQuery) ||
        when.includes(searchQuery);

      const matchesFilter = activeFilter === 'all' ||
        category === activeFilter.toLowerCase();

      if (matchesSearch && matchesFilter) {
        card.classList.remove('hidden');
        visible++;
      } else {
        card.classList.add('hidden');
      }
    });

    if (noResults) {
      noResults.style.display = visible === 0 ? 'block' : 'none';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      applyFilters();
    });
  });
})();
