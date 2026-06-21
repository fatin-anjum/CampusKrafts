let currentUser = null;
let currentFAQs = [];
let currentUpdates = [];

window.addEventListener('DOMContentLoaded', async () => {
  currentUser = checkAuthRedirect(['admin']);
  if (!currentUser) return;

  // Header display
  document.getElementById('user-display-name').textContent = currentUser.name;
  document.getElementById('welcome-title').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
  document.getElementById('avatar-letter').textContent = currentUser.name.charAt(0).toUpperCase();

  // Load Overview Data
  await initOverviewPanel();
});

function showPanel(panelName) {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const activeItem = document.getElementById(`menu-${panelName}`);
  if (activeItem) activeItem.classList.add('active');

  document.querySelectorAll('.dashboard-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  const activePanel = document.getElementById(`panel-${panelName}`);
  if (activePanel) activePanel.classList.add('active');

  // Load specific details
  if (panelName === 'overview') initOverviewPanel();
  else if (panelName === 'users') initUsersPanel();
  else if (panelName === 'courses') initCoursesPanel();
  else if (panelName === 'content') initContentPanel();
}

function handleLogout() {
  api.clearToken();
  showNotification('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 500);
}

// -------------------------------------------------------------
// ANALYTICS & STATS PANEL LOGIC
// -------------------------------------------------------------
async function initOverviewPanel() {
  try {
    const data = await api.get('/admin/stats');
    
    // Set dashboard metric cards
    document.getElementById('admin-stats-revenue').textContent = `BDT ${parseFloat(data.metrics.totalRevenue).toLocaleString()}`;
    document.getElementById('admin-stats-students').textContent = data.metrics.studentCount;
    document.getElementById('admin-stats-instructors').textContent = data.metrics.instructorCount;

    // Set batch breakdown progress bars
    const totalEnrollments = data.metrics.activeEnrollments;
    document.getElementById('metric-enrollments-count').textContent = totalEnrollments;
    document.getElementById('metric-courses-count').textContent = data.metrics.courseCount;
    
    // Total users approximation
    const totalUsers = data.metrics.studentCount + data.metrics.instructorCount + 1; // plus admin
    document.getElementById('metric-verified-count').textContent = totalUsers;

    // Set bars
    const onlinePct = totalEnrollments > 0 ? Math.round((data.batches.online / totalEnrollments) * 100) : 0;
    const livePct = totalEnrollments > 0 ? Math.round((data.batches.live / totalEnrollments) * 100) : 0;

    document.getElementById('batch-online-count').textContent = `${data.batches.online} Enrollments (${onlinePct}%)`;
    document.getElementById('batch-online-bar').style.width = `${onlinePct}%`;

    document.getElementById('batch-live-count').textContent = `${data.batches.live} Enrollments (${livePct}%)`;
    document.getElementById('batch-live-bar').style.width = `${livePct}%`;

  } catch (error) {
    showNotification('Stats fetch failed: ' + error.message, 'error');
  }
}

// -------------------------------------------------------------
// USER MANAGEMENT PANEL LOGIC
// -------------------------------------------------------------
async function initUsersPanel() {
  const tbody = document.getElementById('admin-users-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Loading accounts list...</td></tr>';

  try {
    const users = await api.get('/admin/users');
    tbody.innerHTML = '';

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No users found.</td></tr>';
      return;
    }

    users.forEach(u => {
      // Don't show delete options for current admin to prevent lockout
      const isMe = u.id === currentUser.id;
      
      const roleSelector = isMe 
        ? `<span class="tag" style="background: var(--primary-light); color: var(--primary);">ADMIN (YOU)</span>`
        : `<select class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: auto;" onchange="updateUserRole(${u.id}, this.value)">
             <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
             <option value="instructor" ${u.role === 'instructor' ? 'selected' : ''}>Instructor</option>
             <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
           </select>`;

      const verifyBtn = u.isVerified 
        ? `<button class="btn btn-secondary btn-sm" onclick="toggleUserVerify(${u.id}, false)">Unverify Email</button>`
        : `<button class="btn btn-accent btn-sm" onclick="toggleUserVerify(${u.id}, true)">Verify Email</button>`;

      const deleteBtn = isMe 
        ? '' 
        : `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">Delete</button>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${u.name}</strong></td>
        <td><code>${u.email}</code></td>
        <td>${roleSelector}</td>
        <td>
          <span class="tag" style="background: ${u.isVerified ? 'var(--primary-light)' : 'var(--bg-input)'}; color: ${u.isVerified ? 'var(--primary)' : 'var(--text-muted)'}; font-weight: bold;">
            ${u.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
          </span>
        </td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            ${verifyBtn}
            ${deleteBtn}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Failed to retrieve users: ${error.message}</td></tr>`;
  }
}

async function updateUserRole(userId, newRole) {
  try {
    await api.put(`/admin/users/${userId}`, { role: newRole });
    showNotification('User role updated successfully!', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
    initUsersPanel(); // reload reset values
  }
}

async function toggleUserVerify(userId, isVerifiedState) {
  try {
    await api.put(`/admin/users/${userId}`, { isVerified: isVerifiedState });
    showNotification(isVerifiedState ? 'User email verified!' : 'User marked unverified.', 'success');
    initUsersPanel(); // refresh
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm('Are you sure you want to permanently delete this user account?')) return;

  try {
    const data = await api.delete(`/admin/users/${userId}`);
    showNotification(data.message, 'success');
    initUsersPanel(); // reload list
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// -------------------------------------------------------------
// COURSE APPROVALS PANEL LOGIC
// -------------------------------------------------------------
async function initCoursesPanel() {
  const tbody = document.getElementById('admin-courses-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Loading courses...</td></tr>';

  try {
    const courses = await api.get('/courses');
    tbody.innerHTML = '';

    if (courses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No courses found.</td></tr>';
      return;
    }

    courses.forEach(c => {
      const isApproved = c.status === 'approved';
      const statusBadge = isApproved 
        ? `<span class="tag" style="background: var(--primary-light); color: var(--primary);">APPROVED</span>`
        : `<span class="tag" style="background: var(--warning); color: #fff;">PENDING</span>`;

      const approveBtn = isApproved 
        ? `<button class="btn btn-secondary btn-sm" disabled style="opacity: 0.5; cursor: not-allowed;">Approved</button>`
        : `<button class="btn btn-primary btn-sm" onclick="approveCourse(${c.id})">Approve Now</button>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.title}</strong></td>
        <td style="max-width: 200px; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.description}</td>
        <td>BDT ${parseFloat(c.price).toLocaleString()}</td>
        <td><span class="tag">${c.departments}</span></td>
        <td><strong>${c.instructor ? c.instructor.name : 'Unknown Instructor'}</strong></td>
        <td>${statusBadge}</td>
        <td>${approveBtn}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to load courses: ${error.message}</td></tr>`;
  }
}

async function approveCourse(courseId) {
  try {
    await api.put(`/admin/courses/${courseId}/approve`);
    showNotification('Course approved and launched live!', 'success');
    initCoursesPanel(); // refresh
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// -------------------------------------------------------------
// CMS / PORTAL CONFIG PANEL LOGIC
// -------------------------------------------------------------
async function initContentPanel() {
  try {
    const settings = await api.get('/admin/settings');

    // 1. Banner text settings
    const titleSetting = settings.find(s => s.key === 'homepage_banner_title');
    const subtitleSetting = settings.find(s => s.key === 'homepage_banner_subtitle');
    
    document.getElementById('banner-title').value = titleSetting ? titleSetting.value : 'Shape Your Future at BRAC University';
    document.getElementById('banner-subtitle').value = subtitleSetting ? subtitleSetting.value : 'CampusKrafts is the premier prep portal...';

    // 2. FAQs list
    const faqSetting = settings.find(s => s.key === 'homepage_faqs');
    currentFAQs = [];
    if (faqSetting) {
      try {
        currentFAQs = JSON.parse(faqSetting.value || '[]');
      } catch (e) {}
    }
    renderFAQsChecklist();

    // 3. Admission Updates list
    const updatesSetting = settings.find(s => s.key === 'admission_updates');
    currentUpdates = [];
    if (updatesSetting) {
      try {
        currentUpdates = JSON.parse(updatesSetting.value || '[]');
      } catch (e) {}
    }
    renderUpdatesChecklist();

  } catch (error) {
    showNotification('Config load error: ' + error.message, 'error');
  }
}

async function saveHeroBannerSettings(e) {
  e.preventDefault();
  const title = document.getElementById('banner-title').value;
  const subtitle = document.getElementById('banner-subtitle').value;

  try {
    await api.put('/admin/settings', { key: 'homepage_banner_title', value: title });
    await api.put('/admin/settings', { key: 'homepage_banner_subtitle', value: subtitle });
    showNotification('Homepage Hero elements updated!', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// FAQs Checklist CMS
function renderFAQsChecklist() {
  const container = document.getElementById('admin-faq-checklist');
  container.innerHTML = '';

  if (currentFAQs.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">No FAQs configured.</p>';
    return;
  }

  currentFAQs.forEach((item, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'background: var(--bg-input); padding: 8px 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);';
    div.innerHTML = `
      <div style="max-width: 80%;">
        <strong>Q: ${item.q}</strong><br>
        <span style="font-size: 0.75rem; color: var(--text-secondary);">${item.a.substring(0, 80)}...</span>
      </div>
      <button class="btn btn-danger btn-sm" style="padding: 2px 8px; font-size: 0.75rem;" onclick="deleteFAQItem(${index})">Remove</button>
    `;
    container.appendChild(div);
  });
}

async function addFAQItem(e) {
  e.preventDefault();
  const q = document.getElementById('faq-q').value;
  const a = document.getElementById('faq-a').value;

  currentFAQs.push({ q, a });

  try {
    await api.put('/admin/settings', { key: 'homepage_faqs', value: JSON.stringify(currentFAQs) });
    showNotification('FAQ item appended!', 'success');
    document.getElementById('faq-form').reset();
    renderFAQsChecklist();
  } catch (error) {
    showNotification('Failed to add FAQ: ' + error.message, 'error');
    currentFAQs.pop(); // revert
  }
}

async function deleteFAQItem(index) {
  const removed = currentFAQs.splice(index, 1);

  try {
    await api.put('/admin/settings', { key: 'homepage_faqs', value: JSON.stringify(currentFAQs) });
    showNotification('FAQ item deleted!', 'success');
    renderFAQsChecklist();
  } catch (error) {
    showNotification('Delete failed: ' + error.message, 'error');
    currentFAQs.splice(index, 0, removed[0]); // revert
  }
}

// Circulars Checklist CMS
function renderUpdatesChecklist() {
  const container = document.getElementById('admin-updates-checklist');
  container.innerHTML = '';

  if (currentUpdates.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">No circulars posted.</p>';
    return;
  }

  currentUpdates.forEach((item, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'background: var(--bg-input); padding: 8px 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);';
    div.innerHTML = `
      <div>
        <span style="font-size: 0.75rem; color: var(--secondary); font-weight: bold;">[${item.date}]</span>
        <strong>${item.title}</strong>
      </div>
      <button class="btn btn-danger btn-sm" style="padding: 2px 8px; font-size: 0.75rem;" onclick="deleteCircularUpdate(${index})">Remove</button>
    `;
    container.appendChild(div);
  });
}

async function addCircularUpdate(e) {
  e.preventDefault();
  const date = document.getElementById('up-date').value;
  const title = document.getElementById('up-title').value;

  currentUpdates.unshift({ date, title, link: '#' }); // Prepend recent

  try {
    await api.put('/admin/settings', { key: 'admission_updates', value: JSON.stringify(currentUpdates) });
    showNotification('Circular announcement posted live!', 'success');
    document.getElementById('update-post-form').reset();
    renderUpdatesChecklist();
  } catch (error) {
    showNotification('Posting failed: ' + error.message, 'error');
    currentUpdates.shift(); // revert
  }
}

async function deleteCircularUpdate(index) {
  const removed = currentUpdates.splice(index, 1);

  try {
    await api.put('/admin/settings', { key: 'admission_updates', value: JSON.stringify(currentUpdates) });
    showNotification('Circular deleted.', 'success');
    renderUpdatesChecklist();
  } catch (error) {
    showNotification('Delete failed: ' + error.message, 'error');
    currentUpdates.splice(index, 0, removed[0]); // revert
  }
}
