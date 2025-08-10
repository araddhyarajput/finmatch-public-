// =============== FinMatch public site script.js ===============

// Run after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // ---- Mobile nav (safe no-op if not present)
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks){
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ---- Smooth scroll for internal links (safe if none exist)
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

  // ---- Jobs loader (reads jobs.json at repo root)
  async function loadJobs(){
    const el = document.getElementById('jobsList');
    if(!el) return; // No jobs section present
    try{
      const res = await fetch('jobs.json?ts=' + Date.now()); // cache-bust
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const jobs = await res.json();
      if(!Array.isArray(jobs) || jobs.length === 0){
        el.textContent = 'No jobs yet. Check back soon.';
        return;
      }
      el.innerHTML = jobs.map(j => `
        <div class="job" style="border:1px solid #ddd;padding:12px;margin-bottom:12px;border-radius:6px">
          <h3 style="margin:0 0 4px">${j.title}</h3>
          <p style="margin:0 0 6px;color:#555">${j.company} — ${j.location} • Posted ${j.posted_days ?? '—'}d • Est. ${j.salary || '—'}</p>
          <p style="margin:0 0 8px">${(j.tags || []).slice(0,4).join(' • ')}</p>
          <a href="${j.url}" target="_blank" rel="noopener" style="color:#0ea5a3;font-weight:700;text-decoration:none">Apply</a>
        </div>
      `).join('');
    }catch(e){
      console.error(e);
      el.textContent = 'Error loading jobs. Please try again later.';
    }
  }
  loadJobs();

  // ---- Year in footer (safe if element absent)
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // ---- Waitlist submission (Formspree)
  const form = document.getElementById('waitlistForm');
  const note = document.getElementById('formNote');
  if (form){
    // Optional: capture UTM source if present (?utm_source=LinkedIn)
    const params = new URLSearchParams(location.search);
    const utmSource = params.get('utm_source');
    let hiddenUtm = form.querySelector('input[name="utm_source"]');
    if (utmSource && !hiddenUtm) {
      hiddenUtm = document.createElement('input');
      hiddenUtm.type = 'hidden';
      hiddenUtm.name = 'utm_source';
      hiddenUtm.value = utmSource;
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
          // GA4 event (optional)
          window.gtag && gtag('event', 'waitlist_submit', {
            event_category: 'lead',
            event_label: 'public_site'
          });
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
        if (btn){ btn.disabled = false; btn.textContent = 'Join Waitlist'; }
      }
    });
  }
});
// ========================== end ==========================
