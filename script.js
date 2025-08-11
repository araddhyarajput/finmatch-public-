// =============== FinMatch public site script.js ===============
document.addEventListener('DOMContentLoaded', () => {
  // --- Mobile nav
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks){
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // --- Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el){
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        navLinks && navLinks.classList.remove('show');
      }
    });
  });

  // ===== Jobs loader + filters =====
  const elList = document.getElementById('jobsList');
  const elUpdated = document.getElementById('jobsUpdated');
  const elCount = document.getElementById('resultsCount');
  const moreWrap = document.getElementById('jobsMoreWrap');
  const moreBtn  = document.getElementById('jobsMore');

  // Filter controls
  const fRole = document.getElementById('f_role');
  const fCompany = document.getElementById('f_company');
  const fLocation = document.getElementById('f_location');
  const fRemote = document.getElementById('f_remote');
  const fPosted = document.getElementById('f_posted');
  const fClear = document.getElementById('f_clear');

  let allJobs = [];           // raw from jobs.json
  let filtered = [];          // after filters
  let page = 1;
  const PAGE_SIZE = 10;

  function normalize(s){ return (s || '').toString().trim().toLowerCase(); }

  function applyFilters(){
    const role = normalize(fRole?.value);
    const companyQ = normalize(fCompany?.value);
    const locQ = normalize(fLocation?.value);
    const remoteOnly = !!(fRemote && fRemote.checked);
    const postedDays = parseInt(fPosted?.value || '', 10);

    filtered = allJobs.filter(j => {
      const title = normalize(j.title);
      const company = normalize(j.company);
      const location = normalize(j.location);
      const tags = (j.tags || []).map(normalize);

      // Role (contains)
      if (role && !(title.includes(role) || tags.some(t => t.includes(role)))) return false;

      // Company (contains)
      if (companyQ && !company.includes(companyQ)) return false;

      // Location text (contains)
      if (locQ && !(location.includes(locQ))) return false;

      // Remote only
      if (remoteOnly && !(location.includes('remote') || tags.includes('remote'))) return false;

      // Posted within N days
      if (!isNaN(postedDays) && (j.posted_days ?? 999) > postedDays) return false;

      return true;
    });

    // reset paging and render
    page = 1;
    render();
  }

  function render(){
    if (!elList) return;

    // Count
    if (elCount) elCount.textContent = (filtered?.length || 0);

    if (!filtered.length){
      elList.textContent = 'No jobs match your filters. Try clearing or widening filters.';
      moreWrap && (moreWrap.style.display = 'none');
      return;
    }

    const end = page * PAGE_SIZE;
    const slice = filtered.slice(0, end);

    elList.innerHTML = slice.map(j => `
      <div class="job">
        <h3>${j.title}</h3>
        <p>${j.company} — ${j.location} • Posted ${j.posted_days ?? '—'}d • Est. ${j.salary || '—'}</p>
        <p>${(j.tags || []).slice(0,4).join(' • ')}</p>
        <a href="${j.url}" target="_blank" rel="noopener" class="apply-link">Apply</a>
      </div>
    `).join('');

    // Show/hide Load more
    if (moreWrap){
      moreWrap.style.display = filtered.length > end ? 'block' : 'none';
    }
  }

  function debounce(fn, ms=250){
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  async function loadJobs(){
    if (!elList) return;
    try{
      const res = await fetch('jobs.json?ts=' + Date.now());
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const jobs = Array.isArray(data) ? data : (data.jobs || []);
      const updated = data.meta?.updated_at;

      // Show updated badge
      if (elUpdated && updated){
        const dt = new Date(updated);
        elUpdated.textContent = `Last updated ${dt.toLocaleString()}`;
      }

      allJobs = jobs;
      filtered = jobs.slice();
      render();
    }catch(e){
      console.error(e);
      elList.textContent = 'Error loading jobs. Please try again later.';
      elUpdated && (elUpdated.textContent = '');
    }
  }
  loadJobs();

  // Load more
  if (moreBtn){
    moreBtn.addEventListener('click', () => { page += 1; render(); });
  }

  // Filter events
  if (fRole)    fRole.addEventListener('change', applyFilters);
  if (fPosted)  fPosted.addEventListener('change', applyFilters);
  if (fRemote)  fRemote.addEventListener('change', applyFilters);

  const debouncedFilter = debounce(applyFilters, 250);
  if (fCompany)  fCompany.addEventListener('input', debouncedFilter);
  if (fLocation) fLocation.addEventListener('input', debouncedFilter);

  if (fClear){
    fClear.addEventListener('click', () => {
      if (fRole) fRole.value = '';
      if (fCompany) fCompany.value = '';
      if (fLocation) fLocation.value = '';
      if (fRemote) fRemote.checked = false;
      if (fPosted) fPosted.value = '';
      filtered = allJobs.slice();
      page = 1;
      render();
    });
  }

  // --- GA4: track Apply clicks (optional)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.apply-link');
    if (!a) return;
    window.gtag && gtag('event', 'apply_click', {
      event_category: 'engagement',
      event_label: a.href
    });
  });

  // --- Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // --- Waitlist (Formspree) + UTM capture
  const form = document.getElementById('waitlistForm');
  const note = document.getElementById('formNote');
  if (form){
    const params = new URLSearchParams(location.search);
    const utmSource = params.get('utm_source');
    if (utmSource && !form.querySelector('input[name="utm_source"]')) {
      const hiddenUtm = document.createElement('input');
      hiddenUtm.type = 'hidden'; hiddenUtm.name = 'utm_source'; hiddenUtm.value = utmSource;
      form.appendChild(hiddenUtm);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (note) note.textContent = 'Submitting…';
      const btn = form.querySelector('button[type="submit"]');
      if (btn){ btn.disabled = true; btn.textContent = 'Submitting…'; }

      try {
        const res = await fetch('https://formspree.io/f/movlyeba', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });

        if (res.ok) {
          form.reset();
          if (note) note.textContent = 'Thanks! You’re on the list — we’ll email you when beta opens.';
          window.gtag && gtag('event', 'waitlist_submit', { event_category: 'lead', event_label: 'public_site' });
          // window.location.href = '/finmatch-public-/thanks.html'; // enable if you added thanks.html
        } else {
          let msg = 'Something went wrong. Please try again.';
          try {
            const data = await res.json();
            if (data?.errors?.[0]?.message) msg = data.errors[0].message;
          } catch {}
          if (note) note.textContent = msg;
        }
      } catch {
        if (note) note.textContent = 'Network error. Please try again.';
      } finally {
        const btn2 = form.querySelector('button[type="submit"]');
        if (btn2){ btn2.disabled = false; btn2.textContent = 'Join Waitlist'; }
      }
    });
  }

  // --- Pricing card interactivity (click to select/deselect)
  const plans = document.querySelectorAll('.pricing .plan');
  let selected = null;
  plans.forEach((card) => {
    card.tabIndex = 0;
    const toggle = () => {
      if (selected === card) {
        card.classList.remove('is-selected'); selected = null;
      } else {
        selected?.classList.remove('is-selected');
        card.classList.add('is-selected'); selected = card;
      }
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
});
// ========================== end ==========================
