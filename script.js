// =============== FinMatch public site script.js ===============

document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks){
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Smooth scroll
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

  // Jobs loader
  async function loadJobs(){
    const el = document.getElementById('jobsList');
    if(!el) return;
    try{
      const res = await fetch('jobs.json?ts=' + Date.now());
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const jobs = await res.json();
      if(!Array.isArray(jobs) || jobs.length === 0){
        el.textContent = 'No jobs yet. Check back soon.';
        return;
      }
      el.innerHTML = jobs.map(j => `
        <div class="job">
          <h3>${j.title}</h3>
          <p>${j.company} — ${j.location} • Posted ${j.posted_days ?? '—'}d • Est. ${j.salary || '—'}</p>
          <p>${(j.tags || []).slice(0,4).join(' • ')}</p>
          <a href="${j.url}" target="_blank" rel="noopener" class="apply-link">Apply</a>
        </div>
      `).join('');
    }catch(e){
      console.error(e);
      el.textContent = 'Error loading jobs. Please try again later.';
    }
  }
  loadJobs();

  // Track Apply clicks (GA4 optional)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.apply-link');
    if (!a) return;
    window.gtag && gtag('event', 'apply_click', {
      event_category: 'engagement',
      event_label: a.href
    });
  });

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Waitlist (Formspree) + UTM capture
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
          // Optional redirect:
          // window.location.href = 'thanks.html';
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
