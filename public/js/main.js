/* ============================================================
   Jonisha Thapa Portfolio — Main Site JS
   Loads content from API, renders all sections
   ============================================================ */

(() => {
  'use strict';

  // ── Globals ──────────────────────────────────────────────
  let CONTENT = null;

  // ── Init ─────────────────────────────────────────────────
  async function init() {
    try {
      const res = await fetch('/api/content');
      CONTENT = res.ok ? await res.json() : null;
    } catch (e) {
      console.warn('Could not load content from API, using defaults.');
      CONTENT = null;
    }

    applyTheme();
    renderAll();
    setupNav();
    setupScrollEffects();
    setupAnimations();
    setupContactForm();
    setupModal();
    hideLoader();
  }

  // ── Theme ──────────────────────────────────────────────────
  function applyTheme() {
    const t = CONTENT?.theme || {};
    const root = document.documentElement;
    if (t.colorPrimary) root.style.setProperty('--color-primary', t.colorPrimary);
    if (t.colorAccent)  root.style.setProperty('--color-accent',  t.colorAccent);

    // Load custom fonts if set
    const headingFont = t.fontHeading || 'Playfair Display';
    const bodyFont    = t.fontBody    || 'Inter';
    root.style.setProperty('--font-heading', `'${headingFont}', Georgia, serif`);
    root.style.setProperty('--font-body',    `'${bodyFont}', system-ui, sans-serif`);

    // SEO
    const seo = CONTENT?.seo || {};
    if (seo.title)       document.title = seo.title;
    if (seo.description) setMeta('description', seo.description);
    if (seo.keywords)    setMeta('keywords', seo.keywords);
    if (seo.ogImage)     setMeta('og:image', seo.ogImage, true);
  }

  function setMeta(name, content, og = false) {
    const selector = og ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      if (og) el.setAttribute('property', name);
      else    el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  // ── Render all sections ────────────────────────────────────
  function renderAll() {
    const c  = CONTENT || {};
    const sections = (c.sections?.order) || ['hero','about','skills','projects','experience','education','services','testimonials','certifications','contact'];
    const vis = c.sections?.visibility || {};

    renderNav(c.profile, c.sections);
    renderHero(c.hero, c.profile);
    renderAbout(c.about, c.profile);
    renderSkills(c.skills);
    renderProjects(c.projects);
    renderProcess(c.process);
    renderExperience(c.experience);
    renderEducation(c.education);
    renderServices(c.services);
    renderTestimonials(c.testimonials);
    renderCertifications(c.certifications);
    renderContact(c.contact);
    renderFooter(c.profile, c.social, c.sections);

    // Section ordering
    const main = document.getElementById('main-content');
    if (main) {
      sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) main.appendChild(el);
      });
    }

    // Section visibility
    Object.entries(vis).forEach(([id, show]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = (show === false) ? 'none' : '';
    });
  }

  // Nav
  function renderNav(profile, sections) {
    const nameEl = document.querySelector('.nav-logo-text');
    if (nameEl && profile?.name) {
      const parts = profile.name.split(' ');
      const first = parts[0] || '';
      const rest  = parts.slice(1).join(' ');
      nameEl.innerHTML = `${first}<span>${rest ? ' ' + rest : ''}</span>`;
    }
    const vis   = sections?.visibility || {};
    const order = sections?.order || [];
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    const labels = {
      hero:'Home', about:'About', skills:'Skills', projects:'Work', process:'Process',
      experience:'Experience', education:'Education', services:'Services',
      testimonials:'Testimonials', certifications:'Certifications', contact:'Contact'
    };
    navLinks.innerHTML = '';
    order.forEach(id => {
      if (vis[id] !== false && id !== 'hero') {
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = labels[id] || id;
        navLinks.appendChild(a);
      }
    });
    const cta = document.createElement('a');
    cta.href = '#contact';
    cta.className = 'btn btn-primary btn-sm nav-cta';
    cta.textContent = 'Hire Me';
    navLinks.appendChild(cta);
  }

  // Hero
  function renderHero(hero, profile) {
    const h = hero || {};
    const p = profile || {};
    setText('.hero-eyebrow-text', p.role || 'UI/UX Designer');
    setText('.hero-headline', h.headline || 'Designing experiences that feel effortless.');
    setText('.hero-sub', h.subheadline || '');

    const ctaPrimary = document.querySelector('.hero-cta-primary');
    if (ctaPrimary) { ctaPrimary.textContent = h.ctaPrimary || 'View My Work'; ctaPrimary.href = '#projects'; }
    const ctaSecondary = document.querySelector('.hero-cta-secondary');
    if (ctaSecondary) { ctaSecondary.textContent = h.ctaSecondary || 'Get In Touch'; ctaSecondary.href = '#contact'; }

    // Profile image
    const frame = document.querySelector('.hero-image-frame');
    if (frame && p.profileImage) {
      frame.innerHTML = `<img src="${p.profileImage}" alt="${p.name}" loading="lazy">`;
    }

    // Stats from about highlights
    const about = CONTENT?.about || {};
    setText('.hero-stat-1 .number', about.highlight1?.number || '—');
    setText('.hero-stat-1 .label',  about.highlight1?.label  || 'Projects');
    setText('.hero-stat-2 .number', about.highlight2?.number || '—');
    setText('.hero-stat-2 .label',  about.highlight2?.label  || 'Clients');
    setText('.hero-stat-3 .number', about.highlight3?.number || '—');
    setText('.hero-stat-3 .label',  about.highlight3?.label  || 'Years');
  }

  // About
  function renderAbout(about, profile) {
    const a = about || {};
    const p = profile || {};
    setText('#about .section-heading', a.heading || 'About Me');
    setText('#about .about-content', a.content || '');

    if (p.profileImage) {
      const frame = document.querySelector('.about-image-frame');
      if (frame) frame.innerHTML = `<img src="${p.profileImage}" alt="${p.name}" loading="lazy">`;
    }

    setText('.about-highlight-1 .number', a.highlight1?.number || '—');
    setText('.about-highlight-1 .label',  a.highlight1?.label  || 'Projects Completed');
    setText('.about-highlight-2 .number', a.highlight2?.number || '—');
    setText('.about-highlight-2 .label',  a.highlight2?.label  || 'Happy Clients');
    setText('.about-highlight-3 .number', a.highlight3?.number || '—');
    setText('.about-highlight-3 .label',  a.highlight3?.label  || 'Years Experience');

    // Resume button
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      if (p.resumeUrl) {
        resumeBtn.href = p.resumeUrl;
        resumeBtn.style.display = '';
      } else {
        resumeBtn.style.display = 'none';
      }
    }
  }

  // Skills
  function renderSkills(skills) {
    const grid = document.getElementById('skills-grid');
    if (!grid) return;
    const list = skills || [];
    if (!list.length) {
      grid.innerHTML = emptyState('No skills added yet');
      return;
    }
    grid.innerHTML = list.map(cat => `
      <div class="skill-category fade-in">
        <h3>${escHtml(cat.category || 'Skills')}</h3>
        <div class="skill-tags">
          ${(cat.items || []).map(s => `<span class="skill-tag">${escHtml(s)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  // Projects
  function renderProjects(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    const list = projects || [];
    if (!list.length) {
      grid.innerHTML = emptyState('No projects yet — check back soon!');
      return;
    }
    grid.innerHTML = list.map((p, i) => {
      const img = p.image
        ? `<img src="${p.image}" alt="${escHtml(p.title)}" loading="lazy">`
        : `<div class="project-image-placeholder">✦</div>`;
      const tags = (p.tags || []).map(t => `<span class="project-tag">${escHtml(t)}</span>`).join('');
      return `
        <article class="project-card fade-in fade-in-delay-${(i % 3) + 1}" data-project="${i}" role="button" tabindex="0">
          <div class="project-image">
            ${img}
            ${tags ? `<div class="project-tags-overlay">${tags}</div>` : ''}
          </div>
          <div class="project-body">
            <h3>${escHtml(p.title || 'Untitled Project')}</h3>
            <p>${escHtml(p.description || '')}</p>
            <span class="project-link">View Case Study →</span>
          </div>
        </article>
      `;
    }).join('');

    // Open modal on click
    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => openProjectModal(list[+card.dataset.project]));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openProjectModal(list[+card.dataset.project]); });
    });
  }

  // Design process
  function renderProcess(process) {
    const grid = document.getElementById('process-grid');
    if (!grid) return;
    const steps = process || [];
    grid.innerHTML = steps.length
      ? steps.map((step, index) => `
        <article class="process-step fade-in fade-in-delay-${(index % 3) + 1}">
          <span class="process-number">${escHtml(step.number || String(index + 1).padStart(2, '0'))}</span>
          <h3>${escHtml(step.title || '')}</h3>
          <p>${escHtml(step.description || '')}</p>
        </article>
      `).join('')
      : emptyState('My design process will be added soon.');
  }

  // Experience
  function renderExperience(experience) {
    const timeline = document.getElementById('experience-timeline');
    if (!timeline) return;
    const list = experience || [];
    if (!list.length) {
      timeline.innerHTML = emptyState('Experience will be added soon.');
      return;
    }
    timeline.innerHTML = list.map(e => timelineItem(e)).join('');
  }

  // Education
  function renderEducation(education) {
    const timeline = document.getElementById('education-timeline');
    if (!timeline) return;
    const list = education || [];
    if (!list.length) {
      timeline.innerHTML = emptyState('Education details will be added soon.');
      return;
    }
    timeline.innerHTML = list.map(e => timelineItem(e)).join('');
  }

  function timelineItem(e) {
    return `
      <div class="timeline-item fade-in">
        <div class="timeline-dot"></div>
        <div class="timeline-meta">${escHtml(e.period || '')}</div>
        <div class="timeline-title">${escHtml(e.title || e.degree || '')}</div>
        <div class="timeline-org">${escHtml(e.organization || e.institution || '')}</div>
        ${e.description ? `<p class="timeline-desc">${escHtml(e.description)}</p>` : ''}
      </div>
    `;
  }

  // Services
  function renderServices(services) {
    const grid = document.getElementById('services-grid');
    if (!grid) return;
    const list = services || [];
    if (!list.length) {
      grid.innerHTML = emptyState('Services will be listed here.');
      return;
    }
    grid.innerHTML = list.map((s, i) => `
      <div class="service-card fade-in fade-in-delay-${(i % 3) + 1}">
        <span class="service-icon">${s.icon || '✦'}</span>
        <h3>${escHtml(s.title || '')}</h3>
        <p>${escHtml(s.description || '')}</p>
      </div>
    `).join('');
  }

  // Testimonials
  function renderTestimonials(testimonials) {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;
    const list = testimonials || [];
    if (!list.length) {
      grid.innerHTML = emptyState('Testimonials will appear here once collected.');
      return;
    }
    grid.innerHTML = list.map(t => `
      <div class="testimonial-card fade-in">
        <div class="testimonial-quote">"</div>
        <p class="testimonial-text">${escHtml(t.text || '')}</p>
        <div class="testimonial-author">
          <div class="testimonial-avatar">
            ${t.avatar ? `<img src="${t.avatar}" alt="${escHtml(t.name)}">` : ''}
          </div>
          <div>
            <div class="testimonial-name">${escHtml(t.name || '')}</div>
            <div class="testimonial-role">${escHtml(t.role || '')}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Certifications
  function renderCertifications(certifications) {
    const grid = document.getElementById('certifications-grid');
    if (!grid) return;
    const list = certifications || [];
    if (!list.length) {
      grid.innerHTML = emptyState('Certifications will be added here.');
      return;
    }
    grid.innerHTML = list.map(c => `
      <div class="cert-card fade-in">
        <div class="cert-icon">${c.icon || '🎓'}</div>
        <div class="cert-info">
          <h4>${escHtml(c.title || '')}</h4>
          <div class="issuer">${escHtml(c.issuer || '')}</div>
          ${c.year ? `<div class="year">${escHtml(c.year)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  // Contact
  function renderContact(contact) {
    const c = contact || {};
    setText('#contact .section-heading', c.heading || 'Get In Touch');
    setText('#contact .contact-subheading', c.subheading || '');

    const email    = c.email    || 'jonishathapa23@gmail.com';
    const phone    = c.phone    || '+977-9824223361';
    const whatsapp = c.whatsapp || '+9779824223361';

    const emailLink = document.querySelector('.contact-email-link');
    if (emailLink) {
      emailLink.href = `mailto:${email}`;
      emailLink.textContent = email;
      emailLink.closest('a')?.setAttribute('href', `mailto:${email}`);
    }

    const phoneLink = document.querySelector('.contact-phone-link');
    if (phoneLink) {
      const phoneHref = `tel:${phone.replace(/[\s-]/g,'')}`;
      phoneLink.href = phoneHref;
      phoneLink.textContent = phone;
      phoneLink.closest('a')?.setAttribute('href', phoneHref);
    }

    const waLink = document.querySelector('.contact-whatsapp-link');
    if (waLink) {
      const waNum = whatsapp.replace(/[^\d]/g,'');
      waLink.href = `https://wa.me/${waNum}`;
    }
  }

  // Footer
  function renderFooter(profile, social, sections) {
    const p = profile || {};
    const s = social   || {};

    const nameEl = document.querySelector('.footer-logo-text');
    if (nameEl && p.name) {
      const parts = p.name.split(' ');
      nameEl.innerHTML = `${parts[0]}<span>${parts.slice(1).join(' ') ? ' ' + parts.slice(1).join(' ') : ''}</span>`;
    }

    setText('.footer-tagline', p.tagline || '');

    // Social links
    const socials = [
      { key: 'linkedin',  icon: '𝗶𝗻',     label: 'LinkedIn' },
      { key: 'behance',   icon: '𝗕𝗲',     label: 'Behance' },
      { key: 'dribbble',  icon: '◎',        label: 'Dribbble' },
      { key: 'instagram', icon: '◈',        label: 'Instagram' },
      { key: 'twitter',   icon: '𝗫',        label: 'X/Twitter' },
      { key: 'github',    icon: '⌥',        label: 'GitHub' },
    ];
    const socialContainer = document.querySelector('.footer-social');
    if (socialContainer) {
      socialContainer.innerHTML = socials
        .filter(s2 => s[s2.key])
        .map(s2 => `<a href="${escHtml(s[s2.key])}" aria-label="${s2.label}" target="_blank" rel="noopener noreferrer">${s2.icon}</a>`)
        .join('');
    }

    // Nav links in footer
    const order = sections?.order || [];
    const vis   = sections?.visibility || {};
    const footerNav = document.querySelector('.footer-nav-links');
    const labels = { hero:'Home',about:'About',skills:'Skills',projects:'Work',process:'Process',
      experience:'Experience',education:'Education',services:'Services',
      testimonials:'Testimonials',certifications:'Certifications',contact:'Contact' };
    if (footerNav) {
      footerNav.innerHTML = order
        .filter(id => vis[id] !== false && id !== 'hero')
        .map(id => `<a href="#${id}">${labels[id] || id}</a>`)
        .join('');
    }

    setText('.footer-copy', `© ${new Date().getFullYear()} ${p.name || 'Jonisha Thapa'}. All rights reserved.`);
  }

  // ── Navigation ──────────────────────────────────────────────
  function setupNav() {
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks  = document.getElementById('nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', open);
        document.body.style.overflow = open ? 'hidden' : '';
      });
      navLinks.addEventListener('click', e => {
        if (e.target.tagName === 'A') {
          navLinks.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }
  }

  // ── Scroll effects ──────────────────────────────────────────
  function setupScrollEffects() {
    const navbar   = document.getElementById('navbar');
    const backToTop = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (navbar)   navbar.classList.toggle('scrolled', y > 60);
      if (backToTop) backToTop.classList.toggle('visible', y > 400);
      updateActiveNav();
    }, { passive: true });

    if (backToTop) {
      backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }

  function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const links    = document.querySelectorAll('#nav-links a');
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  }

  // ── Scroll animations ───────────────────────────────────────
  function setupAnimations() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in').forEach(el => io.observe(el));
  }

  // ── Contact form ────────────────────────────────────────────
  function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      const msg = document.getElementById('contact-message');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      if (msg) { msg.className = 'form-message'; msg.textContent = ''; }

      const data = {
        name:    form.contact_name.value.trim(),
        email:   form.contact_email.value.trim(),
        subject: form.contact_subject.value.trim(),
        message: form.contact_message.value.trim(),
      };

      try {
        const res  = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          if (msg) { msg.className = 'form-message success'; msg.textContent = json.message || 'Message sent!'; }
          form.reset();
        } else {
          if (msg) { msg.className = 'form-message error'; msg.textContent = json.error || 'Something went wrong.'; }
        }
      } catch {
        if (msg) { msg.className = 'form-message error'; msg.textContent = 'Network error. Please try emailing directly.'; }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    });
  }

  // ── Project modal ───────────────────────────────────────────
  function setupModal() {
    const overlay = document.getElementById('project-modal');
    if (!overlay) return;
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
    const closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  function openProjectModal(project) {
    if (!project) return;
    const overlay = document.getElementById('project-modal');
    if (!overlay) return;

    overlay.querySelector('.modal-title').textContent = project.title || '';
    const imgEl = overlay.querySelector('.modal-image');
    if (imgEl) {
      imgEl.innerHTML = project.image
        ? `<img src="${project.image}" alt="${escHtml(project.title)}">`
        : `<div class="project-image-placeholder" style="height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;">✦</div>`;
    }
    setText('.modal-desc', project.fullDescription || project.description || '');
    setText('.modal-role', project.role || '');
    setText('.modal-tools', (project.tools || []).join(', '));
    setText('.modal-year', project.year || '');

    const caseStudyEl = overlay.querySelector('.modal-case-study');
    const caseStudyFields = [
      ['Problem', project.problemStatement],
      ['For', project.targetUsers],
      ['Goals', project.designGoals],
      ['Research approach', project.researchApproach],
      ['User flow', project.userFlow],
      ['Wireframing', project.wireframing],
      ['Visual direction', project.visualDesign],
      ['Type & color', project.typographyColor],
      ['Final solution', project.finalSolution],
      ['Key learning', project.keyLearnings],
    ].filter(([, value]) => value);
    if (caseStudyEl) {
      caseStudyEl.innerHTML = caseStudyFields.map(([label, value]) => `
        <article class="case-study-item">
          <h4>${escHtml(label)}</h4>
          <p>${escHtml(value)}</p>
        </article>
      `).join('');
    }
    const linkEl = overlay.querySelector('.modal-live-link');
    if (linkEl) {
      if (project.liveUrl) {
        linkEl.href = project.liveUrl;
        linkEl.style.display = '';
      } else {
        linkEl.style.display = 'none';
      }
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = document.getElementById('project-modal');
    if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  }

  // ── Loader ──────────────────────────────────────────────────
  function hideLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) {
      setTimeout(() => loader.classList.add('hidden'), 300);
      setTimeout(() => loader.remove(), 900);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────
  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function emptyState(msg) {
    return `<div class="empty-state"><p>${msg}</p></div>`;
  }

  // ── Boot ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
