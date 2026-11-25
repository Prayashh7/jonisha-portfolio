/* ============================================================
   Admin Dashboard — JavaScript
   Manages all site content via API
   ============================================================ */

(() => {
  'use strict';

  // ── State ─────────────────────────────────────────────────
  let CSRF = '';
  let CONTENT = {};
  let currentSection = 'dashboard';

  // ── Boot ──────────────────────────────────────────────────
  async function boot() {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated) {
        CSRF = data.csrfToken;
        await loadContent();
        showApp();
      } else {
        showAuth();
      }
    } catch {
      showAuth();
    }
  }

  // ── Auth ──────────────────────────────────────────────────
  function showAuth() {
    document.getElementById('auth-screen').style.display = '';
    document.getElementById('admin-app').classList.remove('show');
  }

  function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('admin-app').classList.add('show');
    renderNavigation();
    navigateTo('dashboard');
  }

  document.getElementById('login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    const err = document.getElementById('login-error');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    err.classList.remove('show');

    const password = document.getElementById('admin-password').value;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        CSRF = data.csrfToken;
        await loadContent();
        showApp();
      } else {
        err.textContent = data.error || 'Login failed.';
        err.classList.add('show');
      }
    } catch {
      err.textContent = 'Network error. Try again.';
      err.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    CSRF = '';
    CONTENT = {};
    location.reload();
  });

  // ── Content load / save ────────────────────────────────────
  async function loadContent() {
    const res = await fetch('/api/content', { credentials: 'include' });
    CONTENT = res.ok ? await res.json() : {};
    CONTENT.profile       = CONTENT.profile       || {};
    CONTENT.social        = CONTENT.social        || {};
    CONTENT.hero          = CONTENT.hero          || {};
    CONTENT.about         = CONTENT.about         || {};
    CONTENT.skills        = CONTENT.skills        || [];
    CONTENT.projects      = CONTENT.projects      || [];
    CONTENT.experience    = CONTENT.experience    || [];
    CONTENT.education     = CONTENT.education     || [];
    CONTENT.services      = CONTENT.services      || [];
    CONTENT.process       = CONTENT.process       || [];
    CONTENT.testimonials  = CONTENT.testimonials  || [];
    CONTENT.certifications= CONTENT.certifications|| [];
    CONTENT.contact       = CONTENT.contact       || {};
    CONTENT.seo           = CONTENT.seo           || {};
    CONTENT.theme         = CONTENT.theme         || {};
    CONTENT.sections      = CONTENT.sections      || { order:[], visibility:{} };
  }

  async function saveContent(updates) {
    try {
      setSaving(true);
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': CSRF,
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await readJson(res);
      if (res.ok && data.ok && data.content) {
        CONTENT = data.content;
        showToast('Saved to Netlify Blobs.', 'success');
        return true;
      }
      if (res.status === 401 || res.status === 403) {
        CSRF = '';
        showToast(data.error || 'Your session expired. Please sign in again.', 'error');
        setTimeout(showAuth, 400);
      } else {
        showToast(data.error || `Save failed (${res.status}).`, 'error');
      }
      return false;
    } catch (error) {
      console.error('Content save failed:', error);
      showToast('Network error: your changes were not saved.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ── Navigation ─────────────────────────────────────────────
  const NAV_SECTIONS = [
    { id: 'dashboard',      label: 'Dashboard',      icon: '⊞',  group: 'Overview' },
    { id: 'profile',        label: 'Profile',         icon: '👤', group: 'Content' },
    { id: 'hero',           label: 'Hero Section',    icon: '★',  group: 'Content' },
    { id: 'about',          label: 'About',           icon: '☺',  group: 'Content' },
    { id: 'skills',         label: 'Skills',          icon: '⚡', group: 'Content' },
    { id: 'projects',       label: 'Projects',        icon: '◈',  group: 'Content' },
    { id: 'process',        label: 'Design Process',  icon: '◌',  group: 'Content' },
    { id: 'experience',     label: 'Experience',      icon: '💼', group: 'Content' },
    { id: 'education',      label: 'Education',       icon: '🎓', group: 'Content' },
    { id: 'services',       label: 'Services',        icon: '🎨', group: 'Content' },
    { id: 'testimonials',   label: 'Testimonials',    icon: '💬', group: 'Content' },
    { id: 'certifications', label: 'Certifications',  icon: '🏆', group: 'Content' },
    { id: 'contact',        label: 'Contact',         icon: '✉',  group: 'Content' },
    { id: 'sections',       label: 'Section Order',   icon: '≡',  group: 'Settings' },
    { id: 'theme',          label: 'Theme & Colors',  icon: '🎨', group: 'Settings' },
    { id: 'seo',            label: 'SEO Settings',    icon: '🔍', group: 'Settings' },
    { id: 'social',         label: 'Social Links',    icon: '🔗', group: 'Settings' },
  ];

  function renderNavigation() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    const groups = {};
    NAV_SECTIONS.forEach(s => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push(s);
    });
    nav.innerHTML = Object.entries(groups).map(([group, items]) => `
      <div class="nav-group">
        <div class="nav-group-label">${group}</div>
        ${items.map(s => `
          <button class="nav-item" data-section="${s.id}" onclick="window.adminNav('${s.id}')">
            <span class="icon">${s.icon}</span>
            ${s.label}
          </button>
        `).join('')}
      </div>
    `).join('');
  }

  window.adminNav = function(section) {
    navigateTo(section);
    // Close sidebar on mobile
    document.querySelector('.admin-sidebar')?.classList.remove('open');
  };

  function navigateTo(section) {
    currentSection = section;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    const title = NAV_SECTIONS.find(s => s.id === section)?.label || section;
    setText('#topbar-title', title);
    renderSection(section);
  }

  // ── Section routing ─────────────────────────────────────────
  function renderSection(id) {
    const container = document.getElementById('admin-content');
    switch (id) {
      case 'dashboard':      renderDashboard(container); break;
      case 'profile':        renderProfile(container); break;
      case 'hero':           renderHero(container); break;
      case 'about':          renderAbout(container); break;
      case 'skills':         renderSkills(container); break;
      case 'projects':       renderProjects(container); break;
      case 'process':        renderProcess(container); break;
      case 'experience':     renderExperience(container); break;
      case 'education':      renderEducation(container); break;
      case 'services':       renderServices(container); break;
      case 'testimonials':   renderTestimonials(container); break;
      case 'certifications': renderCertifications(container); break;
      case 'contact':        renderContact(container); break;
      case 'sections':       renderSections(container); break;
      case 'theme':          renderTheme(container); break;
      case 'seo':            renderSEO(container); break;
      case 'social':         renderSocial(container); break;
      default:               container.innerHTML = `<p>Section not found.</p>`;
    }
  }

  // ── DASHBOARD ──────────────────────────────────────────────
  function renderDashboard(c) {
    c.innerHTML = `
      <div class="page-header">
        <h2>Welcome back 👋</h2>
        <a href="/" target="_blank" class="btn btn-outline btn-sm">View Site ↗</a>
      </div>
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon">◈</div>
          <div><div class="stat-number">${CONTENT.projects.length}</div><div class="stat-label">Projects</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💼</div>
          <div><div class="stat-number">${CONTENT.experience.length}</div><div class="stat-label">Experience</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💬</div>
          <div><div class="stat-number">${CONTENT.testimonials.length}</div><div class="stat-label">Testimonials</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div><div class="stat-number">${CONTENT.certifications.length}</div><div class="stat-label">Certifications</div></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Quick Links</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;">
          ${[
            ['Profile', 'profile'],['Projects', 'projects'],
            ['Experience', 'experience'],['Skills', 'skills'],
            ['Theme', 'theme'],['SEO', 'seo'],
          ].map(([label, id]) => `
            <button onclick="window.adminNav('${id}')" class="btn btn-outline" style="justify-content:center">
              ${label}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Deployment Notes</div>
        <p style="font-size:0.85rem;color:var(--muted);line-height:1.75">
          All content changes save instantly to Netlify Blobs.<br>
          No rebuild required. Your live site updates within seconds.<br>
          <strong>Profile image and resume</strong> are stored as files in Netlify Blobs.
        </p>
      </div>
    `;
  }

  // ── PROFILE ────────────────────────────────────────────────
  function renderProfile(c) {
    const p = CONTENT.profile;
    c.innerHTML = `
      <div class="page-header"><h2>Profile</h2></div>
      <div class="panel">
        <div class="panel-title">Profile Photo</div>
        ${uploadArea('profile-photo', 'image', p.profileImage, 'Upload profile photo (JPG, PNG, WebP — max 5MB)')}
      </div>
      <div class="panel">
        <div class="panel-title">Brand Assets</div>
        <div class="form-row">
          <div>
            <label style="display:block;font-size:.8rem;font-weight:600;margin-bottom:.4rem">Logo</label>
            ${uploadArea('logo-upload', 'image', p.logoUrl, 'Upload logo (JPG, PNG, WebP — max 5MB)')}
          </div>
          <div>
            <label style="display:block;font-size:.8rem;font-weight:600;margin-bottom:.4rem">Favicon</label>
            ${uploadArea('favicon-upload', 'image', p.faviconUrl, 'Upload favicon (JPG, PNG, WebP — max 5MB)')}
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Basic Information</div>
        <div class="form-row">
          ${field('Full Name', 'p_name', p.name || '', 'text', 'Jonisha Thapa')}
          ${field('Role / Title', 'p_role', p.role || '', 'text', 'UI/UX Designer')}
        </div>
        ${field('Tagline', 'p_tagline', p.tagline || '', 'text', 'Designing experiences that feel effortless.')}
        ${field('Short Bio', 'p_bio', p.bio || '', 'textarea', 'Tell your story…')}
        <div class="form-row">
          ${field('Email', 'p_email', p.email || '', 'email', 'you@example.com')}
          ${field('Phone', 'p_phone', p.phone || '', 'text', '+977-9800000000')}
        </div>
        ${field('Location', 'p_location', p.location || '', 'text', 'Kathmandu, Nepal')}
        <button class="btn btn-primary" onclick="saveProfile()">Save Profile</button>
      </div>
      <div class="panel">
        <div class="panel-title">Resume / CV</div>
        ${uploadArea('resume-upload', 'resume', p.resumeUrl, 'Upload resume PDF (max 10MB)', 'application/pdf')}
      </div>
    `;
    setupUpload('profile-photo', 'image', url => {
      CONTENT.profile.profileImage = url;
      saveContent({ profile: { ...CONTENT.profile, profileImage: url } });
    });
    setupUpload('resume-upload', 'resume', url => {
      CONTENT.profile.resumeUrl = url;
      saveContent({ profile: { ...CONTENT.profile, resumeUrl: url } });
    });
    setupUpload('logo-upload', 'image', url => {
      CONTENT.profile.logoUrl = url;
      saveContent({ profile: { ...CONTENT.profile, logoUrl: url } });
    });
    setupUpload('favicon-upload', 'image', url => {
      CONTENT.profile.faviconUrl = url;
      saveContent({ profile: { ...CONTENT.profile, faviconUrl: url } });
    });
  }

  window.saveProfile = async () => {
    const updates = {
      name:     val('p_name'),
      role:     val('p_role'),
      tagline:  val('p_tagline'),
      bio:      val('p_bio'),
      email:    val('p_email'),
      phone:    val('p_phone'),
      location: val('p_location'),
    };
    await saveContent({ profile: { ...CONTENT.profile, ...updates } });
  };

  // ── HERO ───────────────────────────────────────────────────
  function renderHero(c) {
    const h = CONTENT.hero;
    c.innerHTML = `
      <div class="page-header"><h2>Hero Section</h2></div>
      <div class="panel">
        ${field('Headline', 'h_headline', h.headline || '', 'text', 'Designing experiences that feel effortless.')}
        ${field('Subheadline', 'h_sub', h.subheadline || '', 'text', 'Description shown below headline')}
        <div class="form-row">
          ${field('Primary Button Text', 'h_cta1', h.ctaPrimary || '', 'text', 'View My Work')}
          ${field('Secondary Button Text', 'h_cta2', h.ctaSecondary || '', 'text', 'Get In Touch')}
        </div>
        <button class="btn btn-primary" onclick="saveHero()">Save Hero</button>
      </div>
    `;
  }
  window.saveHero = () => saveContent({
    hero: { headline: val('h_headline'), subheadline: val('h_sub'), ctaPrimary: val('h_cta1'), ctaSecondary: val('h_cta2') }
  });

  // ── ABOUT ──────────────────────────────────────────────────
  function renderAbout(c) {
    const a = CONTENT.about;
    c.innerHTML = `
      <div class="page-header"><h2>About Section</h2></div>
      <div class="panel">
        ${field('Section Heading', 'ab_heading', a.heading || '', 'text', 'About Me')}
        ${field('Bio Content', 'ab_content', a.content || '', 'textarea', 'Write your detailed story…', 6)}
        <div class="panel-title" style="margin-top:1.5rem">Highlight Stats</div>
        <div class="form-row">
          ${field('Stat 1 Number', 'ab_h1n', a.highlight1?.number || '', 'text', '20+')}
          ${field('Stat 1 Label', 'ab_h1l', a.highlight1?.label || '', 'text', 'Projects Completed')}
        </div>
        <div class="form-row">
          ${field('Stat 2 Number', 'ab_h2n', a.highlight2?.number || '', 'text', '15+')}
          ${field('Stat 2 Label', 'ab_h2l', a.highlight2?.label || '', 'text', 'Happy Clients')}
        </div>
        <div class="form-row">
          ${field('Stat 3 Number', 'ab_h3n', a.highlight3?.number || '', 'text', '3+')}
          ${field('Stat 3 Label', 'ab_h3l', a.highlight3?.label || '', 'text', 'Years Experience')}
        </div>
        <button class="btn btn-primary" onclick="saveAbout()">Save About</button>
      </div>
    `;
  }
  window.saveAbout = () => saveContent({
    about: {
      heading: val('ab_heading'), content: val('ab_content'),
      highlight1: { number: val('ab_h1n'), label: val('ab_h1l') },
      highlight2: { number: val('ab_h2n'), label: val('ab_h2l') },
      highlight3: { number: val('ab_h3n'), label: val('ab_h3l') },
    }
  });

  // ── SKILLS ─────────────────────────────────────────────────
  function renderSkills(c) {
    c.innerHTML = `
      <div class="page-header">
        <h2>Skills</h2>
        <button class="btn btn-primary btn-sm" onclick="addSkillCategory()">+ Add Category</button>
      </div>
      <div id="skills-editor"></div>
    `;
    renderSkillsEditor();
  }

  function renderSkillsEditor() {
    const el = document.getElementById('skills-editor');
    if (!el) return;
    el.innerHTML = (CONTENT.skills || []).map((cat, ci) => `
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <input value="${escHtml(cat.category || '')}" onchange="CONTENT.skills[${ci}].category=this.value"
            style="font-size:0.875rem;font-weight:600;border:none;background:transparent;color:var(--charcoal);width:200px;outline:none;padding:0"
            placeholder="Category name">
          <button class="btn-icon danger" onclick="removeSkillCategory(${ci})" title="Remove category">✕</button>
        </div>
        <div class="skill-editor" id="skill-tags-${ci}">
          ${(cat.items || []).map((sk, si) => `
            <span class="skill-editor-tag">
              ${escHtml(sk)}
              <button onclick="removeSkill(${ci},${si})" title="Remove">✕</button>
            </span>
          `).join('')}
          <input class="skill-editor-input form-group input"
            placeholder="Add skill, press Enter"
            onkeydown="addSkillTag(event,${ci})">
        </div>
      </div>
    `).join('') + `
      <button class="btn btn-primary" onclick="saveSkills()">Save Skills</button>
    `;
  }

  window.addSkillCategory = () => {
    CONTENT.skills.push({ category: 'New Category', items: [] });
    renderSkillsEditor();
  };
  window.removeSkillCategory = (ci) => {
    CONTENT.skills.splice(ci, 1);
    renderSkillsEditor();
  };
  window.removeSkill = (ci, si) => {
    CONTENT.skills[ci].items.splice(si, 1);
    renderSkillsEditor();
  };
  window.addSkillTag = (e, ci) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const v = e.target.value.trim();
    if (v) { CONTENT.skills[ci].items.push(v); e.target.value = ''; renderSkillsEditor(); }
  };
  window.saveSkills = () => saveContent({ skills: CONTENT.skills });

  // ── PROJECTS ───────────────────────────────────────────────
  function renderProjects(c) {
    c.innerHTML = `
      <div class="page-header">
        <h2>Projects</h2>
        <button class="btn btn-primary btn-sm" onclick="openProjectEditor(-1)">+ Add Project</button>
      </div>
      <div id="projects-list"></div>
      <div id="project-editor" style="display:none"></div>
    `;
    renderProjectList();
  }

  function renderProjectList() {
    const el = document.getElementById('projects-list');
    if (!el) return;
    if (!CONTENT.projects.length) {
      el.innerHTML = `<div class="panel" style="text-align:center;color:var(--muted)">No projects yet. Add your first one!</div>`;
      return;
    }
    el.innerHTML = CONTENT.projects.map((p, i) => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-title">${escHtml(p.title || 'Untitled')}</div>
          <div class="list-item-sub">${escHtml((p.tags||[]).join(', '))}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn-icon" onclick="openProjectEditor(${i})" title="Edit">✏</button>
          <button class="btn-icon danger" onclick="deleteProject(${i})" title="Delete">✕</button>
        </div>
      </div>
    `).join('');
  }

  window.openProjectEditor = (idx) => {
    const el = document.getElementById('project-editor');
    const listEl = document.getElementById('projects-list');
    if (!el) return;
    const p = idx >= 0 ? CONTENT.projects[idx] : {};
    el.style.display = '';
    if (listEl) listEl.style.display = 'none';
    el.innerHTML = `
      <div class="page-header">
        <h2>${idx >= 0 ? 'Edit' : 'Add'} Project</h2>
        <button class="btn btn-outline btn-sm" onclick="closeProjectEditor()">← Back</button>
      </div>
      <div class="panel">
        ${field('Project Title', 'pj_title', p.title||'', 'text', 'My Awesome Project')}
        ${field('Short Description', 'pj_desc', p.description||'', 'textarea', 'Brief description shown on cards…', 3)}
        ${field('Full Case Study Introduction', 'pj_full', p.fullDescription||'', 'textarea', 'Detailed case-study introduction…', 5)}
        ${field('Problem Statement', 'pj_problem', p.problemStatement||'', 'textarea', 'What challenge does this concept address?', 3)}
        ${field('Target Users', 'pj_users', p.targetUsers||'', 'textarea', 'Who is this concept designed for?', 2)}
        ${field('Design Goals', 'pj_goals', p.designGoals||'', 'textarea', 'What should the experience accomplish?', 2)}
        ${field('Research Approach', 'pj_research', p.researchApproach||'', 'textarea', 'How did you explore the problem?', 3)}
        ${field('User Flow', 'pj_flow', p.userFlow||'', 'textarea', 'Describe the main user journey…', 2)}
        ${field('Wireframing Process', 'pj_wireframes', p.wireframing||'', 'textarea', 'How did wireframes shape the structure?', 2)}
        ${field('Visual Design Decisions', 'pj_visual', p.visualDesign||'', 'textarea', 'Describe layout, hierarchy, and imagery decisions…', 2)}
        ${field('Typography & Color Choices', 'pj_typecolor', p.typographyColor||'', 'textarea', 'Describe the visual system…', 2)}
        ${field('Final Solution', 'pj_solution', p.finalSolution||'', 'textarea', 'What is the resulting concept?', 2)}
        ${field('Key Learnings', 'pj_learnings', p.keyLearnings||'', 'textarea', 'What did you learn through this project?', 2)}
        <div class="form-row">
          ${field('My Role', 'pj_role', p.role||'', 'text', 'Lead UI/UX Designer')}
          ${field('Year', 'pj_year', p.year||'', 'text', '2024')}
        </div>
        ${field('Tools Used (comma separated)', 'pj_tools', (p.tools||[]).join(', '), 'text', 'Figma, Miro, Notion')}
        ${field('Tags (comma separated)', 'pj_tags', (p.tags||[]).join(', '), 'text', 'Mobile, UX Research')}
        ${field('Live URL (optional)', 'pj_url', p.liveUrl||'', 'url', 'https://yourproject.com')}
      </div>
      <div class="panel">
        <div class="panel-title">Project Image</div>
        ${uploadArea('project-img', 'image', p.image, 'Upload project image (JPG, PNG — max 5MB)')}
      </div>
      <button class="btn btn-primary" onclick="saveProject(${idx})">Save Project</button>
    `;
    setupUpload('project-img', 'image', url => {
      const editingIdx = parseInt(el.querySelector('[onclick*="saveProject"]')?.getAttribute('onclick')?.match(/\d+|-\d+/)?.[0] ?? '-1');
      if (editingIdx >= 0) CONTENT.projects[editingIdx].image = url;
      window._pendingProjectImage = url;
    });
  };

  window.closeProjectEditor = () => {
    const el = document.getElementById('project-editor');
    const listEl = document.getElementById('projects-list');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    if (listEl) listEl.style.display = '';
    renderProjectList();
    window._pendingProjectImage = null;
  };

  window.saveProject = async (idx) => {
    const proj = {
      title:           val('pj_title'),
      description:     val('pj_desc'),
      fullDescription: val('pj_full'),
      problemStatement: val('pj_problem'),
      targetUsers: val('pj_users'),
      designGoals: val('pj_goals'),
      researchApproach: val('pj_research'),
      userFlow: val('pj_flow'),
      wireframing: val('pj_wireframes'),
      visualDesign: val('pj_visual'),
      typographyColor: val('pj_typecolor'),
      finalSolution: val('pj_solution'),
      keyLearnings: val('pj_learnings'),
      role:            val('pj_role'),
      year:            val('pj_year'),
      tools:  val('pj_tools').split(',').map(s=>s.trim()).filter(Boolean),
      tags:   val('pj_tags').split(',').map(s=>s.trim()).filter(Boolean),
      liveUrl: val('pj_url') || undefined,
    };
    if (window._pendingProjectImage) proj.image = window._pendingProjectImage;
    else if (idx >= 0) proj.image = CONTENT.projects[idx]?.image;

    if (idx >= 0) CONTENT.projects[idx] = proj;
    else CONTENT.projects.push(proj);

    const ok = await saveContent({ projects: CONTENT.projects });
    if (ok) window.closeProjectEditor();
  };

  window.deleteProject = async (idx) => {
    if (!confirm('Delete this project?')) return;
    CONTENT.projects.splice(idx, 1);
    await saveContent({ projects: CONTENT.projects });
    renderProjectList();
  };

  // ── DESIGN PROCESS ─────────────────────────────────────────
  function renderProcess(c) {
    c.innerHTML = `
      <div class="page-header"><h2>Design Process</h2><button class="btn btn-primary btn-sm" onclick="addProcessStep()">+ Add Step</button></div>
      <p style="color:var(--muted);font-size:.85rem;margin:-1rem 0 1.25rem">Keep the process editable and order the steps as they appear on the public portfolio.</p>
      <div id="process-editor"></div>
    `;
    renderProcessEditor();
  }

  function renderProcessEditor() {
    const el = document.getElementById('process-editor');
    if (!el) return;
    el.innerHTML = (CONTENT.process || []).map((step, index) => `
      <div class="panel" style="padding:1.25rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
          <strong style="font-size:.875rem">Step ${index + 1}</strong>
          <button class="btn-icon danger" onclick="removeProcessStep(${index})" title="Remove step">✕</button>
        </div>
        <div class="form-row">
          ${field('Step Number', `proc_${index}_number`, step.number || String(index + 1).padStart(2, '0'), 'text', '01')}
          ${field('Step Title', `proc_${index}_title`, step.title || '', 'text', 'Discover')}
        </div>
        ${field('Description', `proc_${index}_description`, step.description || '', 'textarea', 'Describe this stage…', 2)}
      </div>
    `).join('') + `<button class="btn btn-primary" onclick="saveProcess()">Save Design Process</button>`;
  }

  window.addProcessStep = () => { CONTENT.process.push({ number: String(CONTENT.process.length + 1).padStart(2, '0'), title: '', description: '' }); renderProcessEditor(); };
  window.removeProcessStep = (index) => { CONTENT.process.splice(index, 1); renderProcessEditor(); };
  window.saveProcess = () => {
    CONTENT.process = CONTENT.process.map((_, index) => ({
      number: val(`proc_${index}_number`),
      title: val(`proc_${index}_title`),
      description: val(`proc_${index}_description`),
    }));
    saveContent({ process: CONTENT.process });
  };

  // ── EXPERIENCE ─────────────────────────────────────────────
  function renderExperience(c) {
    renderTimelineSection(c, 'experience', 'Experience', ['title','organization','period','description'], ['Job Title','Company Name','2022 – Present','What you did…']);
  }

  // ── EDUCATION ──────────────────────────────────────────────
  function renderEducation(c) {
    renderTimelineSection(c, 'education', 'Education', ['degree','institution','period','description'], ['Degree','University Name','2018 – 2022','What you studied…'], true);
  }

  function renderTimelineSection(c, key, title, fieldKeys, placeholders, isEdu=false) {
    c.innerHTML = `
      <div class="page-header">
        <h2>${title}</h2>
        <button class="btn btn-primary btn-sm" onclick="addTimelineItem('${key}','${title}')">+ Add</button>
      </div>
      <div id="${key}-list"></div>
    `;
    renderTimelineList(key, fieldKeys, placeholders);
  }

  function renderTimelineList(key, fieldKeys, placeholders) {
    const el = document.getElementById(`${key}-list`);
    if (!el) return;
    const items = CONTENT[key] || [];
    if (!items.length) {
      el.innerHTML = `<div class="panel" style="text-align:center;color:var(--muted)">Nothing added yet.</div>`;
      return;
    }
    el.innerHTML = items.map((item, i) => `
      <div class="panel" style="padding:1.25rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <strong style="font-size:0.875rem">${escHtml(item[fieldKeys[0]]||item.title||item.degree||'Untitled')}</strong>
          <button class="btn-icon danger" onclick="deleteTimelineItem('${key}',${i})">✕</button>
        </div>
        ${fieldKeys.map((fk, fi) => {
          const id = `${key}_${i}_${fk}`;
          return fk === 'description'
            ? `<div class="form-group"><label>${capitalize(fk)}</label><textarea id="${id}" rows="3">${escHtml(item[fk]||'')}</textarea></div>`
            : `<div class="form-group"><label>${capitalize(fk)}</label><input id="${id}" value="${escHtml(item[fk]||'')}" placeholder="${escHtml(placeholders[fi]||'')}"></div>`;
        }).join('')}
        <button class="btn btn-primary btn-sm" onclick="saveTimelineItem('${key}',${i},[${fieldKeys.map(k=>`'${k}'`).join(',')}])">Save</button>
      </div>
    `).join('');
  }

  window.addTimelineItem = (key, title) => {
    if (!CONTENT[key]) CONTENT[key] = [];
    CONTENT[key].unshift({});
    renderSection(key);
  };
  window.deleteTimelineItem = async (key, idx) => {
    if (!confirm('Delete this entry?')) return;
    CONTENT[key].splice(idx, 1);
    await saveContent({ [key]: CONTENT[key] });
    renderSection(key);
  };
  window.saveTimelineItem = async (key, idx, fieldKeys) => {
    const item = {};
    fieldKeys.forEach(fk => {
      const el = document.getElementById(`${key}_${idx}_${fk}`);
      if (el) item[fk] = el.value;
    });
    CONTENT[key][idx] = { ...CONTENT[key][idx], ...item };
    await saveContent({ [key]: CONTENT[key] });
  };

  // ── SERVICES ───────────────────────────────────────────────
  function renderServices(c) {
    c.innerHTML = `
      <div class="page-header"><h2>Services</h2><button class="btn btn-primary btn-sm" onclick="addService()">+ Add</button></div>
      <div id="services-editor"></div>
    `;
    renderServicesEditor();
  }

  function renderServicesEditor() {
    const el = document.getElementById('services-editor');
    if (!el) return;
    el.innerHTML = (CONTENT.services||[]).map((s, i) => `
      <div class="panel" style="padding:1.25rem">
        <div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem">
          <button class="btn-icon danger" onclick="removeService(${i})">✕</button>
        </div>
        <div class="form-row">
          ${field('Icon (emoji)', `svc_${i}_icon`, s.icon||'', 'text', '🎨')}
          ${field('Title', `svc_${i}_title`, s.title||'', 'text', 'Service Name')}
        </div>
        ${field('Description', `svc_${i}_desc`, s.description||'', 'textarea', 'Brief description…', 2)}
      </div>
    `).join('') + `<button class="btn btn-primary" onclick="saveServices()">Save All Services</button>`;
  }

  window.addService = () => { CONTENT.services.push({ icon:'✦', title:'', description:'' }); renderServicesEditor(); };
  window.removeService = (i) => { CONTENT.services.splice(i,1); renderServicesEditor(); };
  window.saveServices = () => {
    CONTENT.services = CONTENT.services.map((s, i) => ({
      icon:        val(`svc_${i}_icon`),
      title:       val(`svc_${i}_title`),
      description: val(`svc_${i}_desc`),
    }));
    saveContent({ services: CONTENT.services });
  };

  // ── TESTIMONIALS ───────────────────────────────────────────
  function renderTestimonials(c) {
    c.innerHTML = `
      <div class="page-header"><h2>Testimonials</h2><button class="btn btn-primary btn-sm" onclick="addTestimonial()">+ Add</button></div>
      <div id="testimonials-editor"></div>
    `;
    renderTestimonialsEditor();
  }

  function renderTestimonialsEditor() {
    const el = document.getElementById('testimonials-editor');
    if (!el) return;
    el.innerHTML = (CONTENT.testimonials||[]).map((t, i) => `
      <div class="panel" style="padding:1.25rem">
        <div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem">
          <button class="btn-icon danger" onclick="removeTestimonial(${i})">✕</button>
        </div>
        ${field('Quote / Testimonial Text', `tm_${i}_text`, t.text||'', 'textarea', 'What they said about your work…', 3)}
        <div class="form-row">
          ${field('Client Name', `tm_${i}_name`, t.name||'', 'text', 'Jane Smith')}
          ${field('Role / Company', `tm_${i}_role`, t.role||'', 'text', 'CEO, Company Name')}
        </div>
      </div>
    `).join('') + `<button class="btn btn-primary" onclick="saveTestimonials()">Save All Testimonials</button>`;
  }

  window.addTestimonial  = () => { CONTENT.testimonials.push({}); renderTestimonialsEditor(); };
  window.removeTestimonial=(i) => { CONTENT.testimonials.splice(i,1); renderTestimonialsEditor(); };
  window.saveTestimonials = () => {
    CONTENT.testimonials = CONTENT.testimonials.map((t, i) => ({
      text: val(`tm_${i}_text`),
      name: val(`tm_${i}_name`),
      role: val(`tm_${i}_role`),
    }));
    saveContent({ testimonials: CONTENT.testimonials });
  };

  // ── CERTIFICATIONS ─────────────────────────────────────────
  function renderCertifications(c) {
    c.innerHTML = `
      <div class="page-header"><h2>Certifications</h2><button class="btn btn-primary btn-sm" onclick="addCert()">+ Add</button></div>
      <div id="certs-editor"></div>
    `;
    renderCertsEditor();
  }

  function renderCertsEditor() {
    const el = document.getElementById('certs-editor');
    if (!el) return;
    el.innerHTML = (CONTENT.certifications||[]).map((cert, i) => `
      <div class="panel" style="padding:1.25rem">
        <div style="display:flex;justify-content:flex-end;margin-bottom:0.75rem">
          <button class="btn-icon danger" onclick="removeCert(${i})">✕</button>
        </div>
        <div class="form-row">
          ${field('Icon (emoji)', `cert_${i}_icon`, cert.icon||'', 'text', '🏆')}
          ${field('Year', `cert_${i}_year`, cert.year||'', 'text', '2024')}
        </div>
        <div class="form-row">
          ${field('Certificate Title', `cert_${i}_title`, cert.title||'', 'text', 'Google UX Design Certificate')}
          ${field('Issuing Organization', `cert_${i}_issuer`, cert.issuer||'', 'text', 'Google / Coursera')}
        </div>
      </div>
    `).join('') + `<button class="btn btn-primary" onclick="saveCerts()">Save All Certifications</button>`;
  }

  window.addCert    = () => { CONTENT.certifications.push({}); renderCertsEditor(); };
  window.removeCert = (i) => { CONTENT.certifications.splice(i,1); renderCertsEditor(); };
  window.saveCerts  = () => {
    CONTENT.certifications = CONTENT.certifications.map((_, i) => ({
      icon:   val(`cert_${i}_icon`),
      year:   val(`cert_${i}_year`),
      title:  val(`cert_${i}_title`),
      issuer: val(`cert_${i}_issuer`),
    }));
    saveContent({ certifications: CONTENT.certifications });
  };

  // ── CONTACT ────────────────────────────────────────────────
  function renderContact(c) {
    const ct = CONTENT.contact;
    c.innerHTML = `
      <div class="page-header"><h2>Contact Info</h2></div>
      <div class="panel">
        ${field('Section Heading', 'ct_heading', ct.heading||'', 'text', 'Get In Touch')}
        ${field('Subheading', 'ct_sub', ct.subheading||'', 'text', 'Have a project in mind? I\'d love to hear from you.')}
        ${field('Email Address', 'ct_email', ct.email||'', 'email', 'you@example.com')}
        ${field('Phone Number', 'ct_phone', ct.phone||'', 'text', '+977-9800000000')}
        ${field('WhatsApp Number (with country code)', 'ct_wa', ct.whatsapp||'', 'text', '+9779800000000')}
        <button class="btn btn-primary" onclick="saveContact()">Save Contact</button>
      </div>
    `;
  }
  window.saveContact = () => saveContent({
    contact: { heading:val('ct_heading'), subheading:val('ct_sub'), email:val('ct_email'), phone:val('ct_phone'), whatsapp:val('ct_wa') }
  });

  // ── SECTION ORDER & VISIBILITY ─────────────────────────────
  function renderSections(c) {
    const sections = CONTENT.sections;
    const order = sections.order || ['hero','about','skills','projects','experience','education','services','testimonials','certifications','contact'];
    const vis   = sections.visibility || {};
    const labels = {
      hero:'Hero',about:'About',skills:'Skills',projects:'Projects',process:'Design Process',
      experience:'Experience',education:'Education',services:'Services',
      testimonials:'Testimonials',certifications:'Certifications',contact:'Contact'
    };

    c.innerHTML = `
      <div class="page-header"><h2>Section Order &amp; Visibility</h2></div>
      <div class="panel">
        <div class="panel-title">Drag to reorder &amp; toggle visibility</div>
        <ul class="section-drag-list" id="section-drag-list">
          ${order.map(id => `
            <li class="section-drag-item" data-id="${id}" draggable="true">
              <span style="color:var(--muted-light);font-size:1.2rem">⋮⋮</span>
              <span style="flex:1;font-size:0.875rem;font-weight:500">${labels[id]||id}</span>
              <label class="toggle-switch">
                <input type="checkbox" ${vis[id]!==false?'checked':''} onchange="toggleSection('${id}',this.checked)">
                <span class="toggle-slider"></span>
              </label>
            </li>
          `).join('')}
        </ul>
        <div style="margin-top:1.25rem">
          <button class="btn btn-primary" onclick="saveSectionOrder()">Save Order</button>
        </div>
      </div>
    `;
    setupDragDrop('section-drag-list');
  }

  function setupDragDrop(listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    let dragEl = null;
    list.addEventListener('dragstart', e => {
      dragEl = e.target.closest('[draggable]');
      if (dragEl) { setTimeout(() => dragEl.classList.add('dragging'), 0); }
    });
    list.addEventListener('dragend', () => {
      if (dragEl) dragEl.classList.remove('dragging');
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragEl = null;
    });
    list.addEventListener('dragover', e => {
      e.preventDefault();
      const target = e.target.closest('[draggable]');
      if (!target || target === dragEl) return;
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      target.classList.add('drag-over');
      const rect = target.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      if (after) target.after(dragEl);
      else target.before(dragEl);
    });
  }

  window.toggleSection = async (id, show) => {
    CONTENT.sections.visibility[id] = show;
    await saveContent({ sections: CONTENT.sections });
  };

  window.saveSectionOrder = async () => {
    const list = document.getElementById('section-drag-list');
    if (!list) return;
    const order = [...list.querySelectorAll('[data-id]')].map(el => el.dataset.id);
    CONTENT.sections.order = order;
    await saveContent({ sections: CONTENT.sections });
  };

  // ── THEME ──────────────────────────────────────────────────
  function renderTheme(c) {
    const t = CONTENT.theme;
    c.innerHTML = `
      <div class="page-header"><h2>Theme &amp; Colors</h2></div>
      <div class="panel">
        <div class="panel-title">Brand Colors</div>
        <div class="color-row">
          <input type="color" id="th_primary" value="${t.colorPrimary||'#c8a96e'}">
          <div>
            <div style="font-size:0.85rem;font-weight:600">Primary Accent</div>
            <div style="font-size:0.75rem;color:var(--muted)">Used for links, highlights, CTAs</div>
          </div>
        </div>
        <div class="color-row">
          <input type="color" id="th_accent" value="${t.colorAccent||'#8b6914'}">
          <div>
            <div style="font-size:0.85rem;font-weight:600">Dark Accent</div>
            <div style="font-size:0.75rem;color:var(--muted)">Used for hover states</div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Typography</div>
        ${field('Heading Font (Google Font name)', 'th_hfont', t.fontHeading||'Playfair Display', 'text', 'Playfair Display')}
        ${field('Body Font (Google Font name)', 'th_bfont', t.fontBody||'Inter', 'text', 'Inter')}
        <p class="form-help">Use any <a href="https://fonts.google.com" target="_blank" style="color:var(--gold-dark)">Google Fonts</a> name. E.g. "Cormorant Garamond", "Lora", "DM Sans"</p>
        <button class="btn btn-primary" style="margin-top:1rem" onclick="saveTheme()">Save Theme</button>
      </div>
    `;
  }
  window.saveTheme = () => saveContent({
    theme: {
      colorPrimary: val('th_primary'),
      colorAccent:  val('th_accent'),
      fontHeading:  val('th_hfont'),
      fontBody:     val('th_bfont'),
    }
  });

  // ── SEO ────────────────────────────────────────────────────
  function renderSEO(c) {
    const s = CONTENT.seo;
    c.innerHTML = `
      <div class="page-header"><h2>SEO Settings</h2></div>
      <div class="panel">
        ${field('Page Title', 'seo_title', s.title||'', 'text', 'Jonisha Thapa — UI/UX Designer')}
        ${field('Meta Description (≤160 chars)', 'seo_desc', s.description||'', 'textarea', 'Brief description for search engines…', 2)}
        ${field('Keywords (comma separated)', 'seo_kw', s.keywords||'', 'text', 'UI/UX Designer, Nepal, Figma')}
        <button class="btn btn-primary" onclick="saveSEO()">Save SEO</button>
      </div>
    `;
  }
  window.saveSEO = () => saveContent({
    seo: { title:val('seo_title'), description:val('seo_desc'), keywords:val('seo_kw') }
  });

  // ── SOCIAL ─────────────────────────────────────────────────
  function renderSocial(c) {
    const s = CONTENT.social;
    const socials = ['linkedin','behance','dribbble','instagram','twitter','github'];
    c.innerHTML = `
      <div class="page-header"><h2>Social Links</h2></div>
      <div class="panel">
        ${socials.map(k => field(capitalize(k)+' URL', `sc_${k}`, s[k]||'', 'url', `https://${k}.com/yourprofile`)).join('')}
        <button class="btn btn-primary" onclick="saveSocial()">Save Social Links</button>
      </div>
    `;
  }
  window.saveSocial = () => {
    const s = {};
    ['linkedin','behance','dribbble','instagram','twitter','github'].forEach(k => { s[k] = val(`sc_${k}`); });
    saveContent({ social: s });
  };

  // ── File Upload helper ─────────────────────────────────────
  function setupUpload(areaId, type, callback) {
    const area = document.getElementById(areaId);
    if (!area) return;
    const input = area.querySelector('input[type=file]');
    if (!input) return;

    input.addEventListener('change', () => {
      if (input.files[0]) doUpload(input.files[0], type, area, callback);
    });

    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('dragover');
      if (e.dataTransfer.files[0]) doUpload(e.dataTransfer.files[0], type, area, callback);
    });
  }

  async function doUpload(file, type, area, callback) {
    const statusEl = area.querySelector('.upload-text');
    const input = area.querySelector('input[type=file]');
    const maxBytes = type === 'resume' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    const allowed = type === 'resume'
      ? ['application/pdf']
      : ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowed.includes(file.type) || file.size > maxBytes) {
      const kind = type === 'resume' ? 'a PDF under 10 MB' : 'a JPG, PNG, or WebP image under 5 MB';
      showToast(`Please choose ${kind}.`, 'error');
      if (input) input.value = '';
      return;
    }

    if (statusEl) statusEl.textContent = 'Uploading and verifying…';
    if (input) input.disabled = true;

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('type', type);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'X-CSRF-Token': CSRF },
        credentials: 'include',
        body: formData,
      });
      const data = await readJson(response);
      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.error || `Upload failed (${response.status}).`);
      }

      // The function verifies Blob persistence, and this HEAD request confirms the
      // public endpoint can retrieve the same stored object before CMS data updates.
      const verification = await fetch(data.url, { method: 'HEAD', cache: 'no-store' });
      if (!verification.ok) throw new Error('The uploaded file could not be retrieved after saving.');

      const preview = document.querySelector(`#${area.id} + .upload-preview .upload-preview-img`);
      if (preview && type === 'image') {
        preview.src = data.url;
        preview.style.display = '';
      }
      if (statusEl) statusEl.textContent = 'Upload verified. Click or drag to replace.';
      await callback(data.url);
      showToast('File stored and verified.', 'success');
    } catch (error) {
      console.error('Upload failed:', error);
      showToast(error.message || 'Upload failed. Your file was not saved.', 'error');
      if (statusEl) statusEl.textContent = 'Click or drag to upload';
    } finally {
      if (input) { input.disabled = false; input.value = ''; }
    }
  }

  // ── Save and request feedback ──────────────────────────────
  function setSaving(saving) {
    document.querySelectorAll('.admin-content .btn-primary').forEach(button => {
      if (saving) {
        button.dataset.originalText = button.dataset.originalText || button.textContent;
        button.disabled = true;
        button.textContent = 'Saving…';
      } else if (button.dataset.originalText) {
        button.disabled = false;
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    });
  }

  async function readJson(response) {
    try { return await response.json(); } catch { return {}; }
  }

  // ── Toast ──────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  // ── Helpers ────────────────────────────────────────────────
  function field(label, id, value, type='text', placeholder='', rows=3) {
    if (type === 'textarea') {
      return `<div class="form-group"><label for="${id}">${label}</label><textarea id="${id}" rows="${rows}" placeholder="${placeholder}">${escHtml(value)}</textarea></div>`;
    }
    return `<div class="form-group"><label for="${id}">${label}</label><input type="${type}" id="${id}" value="${escHtml(value)}" placeholder="${placeholder}"></div>`;
  }

  function uploadArea(id, type, currentUrl, hint, accept='image/*') {
    const previewHtml = currentUrl
      ? `<div class="upload-preview"><img class="upload-preview-img" src="${currentUrl}" alt="Current file" style="max-height:160px;border-radius:8px;margin-top:1rem"></div>`
      : `<div class="upload-preview"><img class="upload-preview-img" src="" alt="" style="display:none;max-height:160px;border-radius:8px;margin-top:1rem"></div>`;
    return `
      <div class="upload-area" id="${id}">
        <input type="file" accept="${accept}" aria-label="${hint}">
        <div class="upload-icon">${type==='resume'?'📄':'🖼️'}</div>
        <div class="upload-text">${hint}</div>
        <div class="upload-hint">Click or drag &amp; drop</div>
      </div>
      ${previewHtml}
    `;
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setText(sel, text) {
    const el = document.querySelector(sel);
    if (el) el.textContent = text;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ── Mobile sidebar toggle ──────────────────────────────────
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.querySelector('.admin-sidebar')?.classList.toggle('open');
  });

  // ── Boot ──────────────────────────────────────────────────
  boot();
})();
