// FinMatch basic interactivity: mobile nav, smooth scroll, simple waitlist handler
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle){
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('show');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el){
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth', block:'start'});
      navLinks?.classList.remove('show');
    }
  });
});

// Year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Simple waitlist submission (no backend): replace with your Formspree or API later
const form = document.getElementById('waitlistForm');
const note = document.getElementById('formNote');
if (form){
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    // Basic validation
    if (!data.name || !data.email){
      note.textContent = 'Please enter your name and email.';
      return;
    }
    // Store locally as a demo; replace with fetch(...) to send to your backend
    try {
      const existing = JSON.parse(localStorage.getItem('finmatch_waitlist') || '[]');
      existing.push({...data, ts: new Date().toISOString()});
      localStorage.setItem('finmatch_waitlist', JSON.stringify(existing));
      form.reset();
      note.textContent = 'Thanks! You’re on the list — we’ll email you when beta opens.';
    } catch(err){
      note.textContent = 'Saved locally. Connect a form endpoint for production.';
    }
  });
}
