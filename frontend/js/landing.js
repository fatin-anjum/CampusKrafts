window.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  loadCourses();
  loadUpdates();
  loadFAQs();
});

function setupNavbar() {
  const user = api.getCurrentUser();
  const authBtn = document.getElementById('nav-auth-btn');

  if (user && api.getToken()) {
    authBtn.textContent = 'Go to Dashboard';
    if (user.role === 'admin') {
      authBtn.href = '/admin_dashboard.html';
    } else if (user.role === 'instructor') {
      authBtn.href = '/instructor_dashboard.html';
    } else {
      authBtn.href = '/student_dashboard.html';
    }
  } else {
    authBtn.textContent = 'Sign In / Sign Up';
    authBtn.href = '/auth.html';
  }
}

// Fetch and display active courses
async function loadCourses() {
  const container = document.getElementById('landing-courses-list');
  try {
    const courses = await api.get('/courses');
    if (courses.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No courses are currently available.</div>';
      return;
    }

    container.innerHTML = '';
    courses.forEach(c => {
      // Parse sections
      let sects = [];
      try {
        sects = JSON.parse(c.sections || '[]');
      } catch (e) {
        sects = [];
      }
      
      const sectionsHtml = sects.map(s => `<span class="tag tag-accent">Sec ${s}</span>`).join(' ');
      const imageSrc = c.image || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=400&auto=format&fit=crop';
      
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${imageSrc}" alt="${c.title}" class="course-card-img">
        <h3 style="margin-bottom: 8px;">${c.title}</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; height: 72px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
          ${c.description}
        </p>
        <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Prep Departments:</div>
        <div class="course-tags">
          <span class="tag">${c.departments}</span>
        </div>
        <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Exam Sections:</div>
        <div class="course-tags">
          ${sectionsHtml}
        </div>
        <div class="course-price">BDT ${parseFloat(c.price).toLocaleString()}</div>
        <a href="/auth.html" class="btn btn-primary btn-sm" style="width: 100%; margin-top: 8px;">Enroll & Get Started</a>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger);">Failed to load courses: ${error.message}</div>`;
  }
}

// Fetch and display news announcements/updates
async function loadUpdates() {
  const container = document.getElementById('landing-updates-list');
  try {
    const settings = await api.get('/admin/settings');
    const updateSetting = settings.find(s => s.key === 'admission_updates');
    
    let updates = [
      { date: 'June 25, 2026', title: 'Summer 2026 Admission Circular Published', link: '#' },
      { date: 'July 10, 2026', title: 'CampusKrafts Live Bootcamp Registration Deadline', link: '#' },
      { date: 'August 01, 2026', title: 'Official BRACU Mock Exam Schedule Released', link: '#' }
    ];

    if (updateSetting) {
      try {
        updates = JSON.parse(updateSetting.value);
      } catch (e) {}
    }

    container.innerHTML = '';
    updates.forEach(u => {
      const li = document.createElement('li');
      li.style.borderBottom = '1px solid var(--border-color)';
      li.style.paddingBottom = '12px';
      li.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--secondary); font-weight: 600;">${u.date}</div>
        <h4 style="margin: 4px 0 8px 0;"><a href="${u.link}" style="hover: color(var(--primary));">${u.title}</a></h4>
      `;
      container.appendChild(li);
    });
  } catch (error) {
    console.warn('Failed to load admission updates setting, falling back to static markup', error);
  }
}

// Fetch and display FAQs
async function loadFAQs() {
  const container = document.getElementById('landing-faqs-list');
  try {
    const settings = await api.get('/admin/settings');
    const faqSetting = settings.find(s => s.key === 'homepage_faqs');

    let faqs = [
      { q: 'How many sections are there in the BRACU admission test?', a: 'There are total 6 sections (a to f): English language, English composition, Mathematics, Higher mathematics & physics, Biology & chemistry, and Drawing. Different courses require different sections.' },
      { q: 'Can I choose my batch type for the preparation course?', a: 'Yes! CampusKrafts offers both Online (Recorded self-paced) and Live (Interactive classes with direct consultations) batches during course enrollment.' },
      { q: 'How is payment verified?', a: 'You can buy any premium course using bKash. Just copy the platform Bkash merchant number, pay from your mobile app, and input the transaction ID (TrxID) in the prompt to activate your enrollment instantly.' },
      { q: 'Are there any free resources?', a: 'Yes! Everyone who registers gets immediate access to 4 free assessments covering English language, General Mathematics, STEM Math/Physics, and Bio-Chemistry.' }
    ];

    if (faqSetting) {
      try {
        faqs = JSON.parse(faqSetting.value);
      } catch (e) {}
    }

    container.innerHTML = '';
    faqs.forEach(f => {
      const item = document.createElement('div');
      item.className = 'faq-item';
      item.innerHTML = `
        <div class="faq-question">${f.q} <span>➕</span></div>
        <div class="faq-answer"><p>${f.a}</p></div>
      `;
      item.addEventListener('click', () => {
        item.classList.toggle('active');
        const span = item.querySelector('span');
        span.textContent = item.classList.contains('active') ? '➖' : '➕';
      });
      container.appendChild(item);
    });
  } catch (error) {
    console.warn('Failed to load FAQs setting, falling back to static markup', error);
  }
}
