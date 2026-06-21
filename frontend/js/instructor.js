let currentUser = null;
let instructorCourses = [];
let allTests = [];

window.addEventListener('DOMContentLoaded', async () => {
  currentUser = checkAuthRedirect(['instructor']);
  if (!currentUser) return;

  // Set header
  document.getElementById('user-display-name').textContent = currentUser.name;
  document.getElementById('welcome-title').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
  document.getElementById('avatar-letter').textContent = currentUser.name.charAt(0).toUpperCase();

  // Load Overview
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

  // Panel triggers
  if (panelName === 'overview') initOverviewPanel();
  else if (panelName === 'courses') initCoursesPanel();
  else if (panelName === 'exams') initExamsPanel();
  else if (panelName === 'students') initGradebookPanel();
  else if (panelName === 'consult') initConsultationPanel();
}

function handleLogout() {
  api.clearToken();
  showNotification('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 500);
}

// -------------------------------------------------------------
// OVERVIEW PANEL LOGIC
// -------------------------------------------------------------
async function initOverviewPanel() {
  try {
    // 1. Fetch courses
    const courses = await api.get('/courses');
    instructorCourses = courses.filter(c => c.instructorId === currentUser.id);
    document.getElementById('stats-my-courses').textContent = instructorCourses.length;

    // 2. Fetch tests
    const tests = await api.get('/tests');
    // For instructor, tests will be returned
    const testsList = Array.isArray(tests) ? tests : (tests.enrolledTests || []).concat(tests.freeTests || []);
    allTests = testsList;
    document.getElementById('stats-total-exams').textContent = allTests.length;

    // 3. Fetch attempts
    const attempts = await api.get('/tests/attempts/all');
    document.getElementById('stats-graded-attempts').textContent = attempts.length;

  } catch (error) {
    console.error('Overview panels stats error', error);
  }
}

// -------------------------------------------------------------
// COURSE BUILDER LOGIC
// -------------------------------------------------------------
async function initCoursesPanel() {
  await loadInstructorCourses();
  setupCourseDropdowns();
}

async function loadInstructorCourses() {
  const container = document.getElementById('instructor-courses-list');
  container.innerHTML = '<p style="color: var(--text-secondary);">Loading courses...</p>';

  try {
    const courses = await api.get('/courses');
    instructorCourses = courses.filter(c => c.instructorId === currentUser.id);
    container.innerHTML = '';

    if (instructorCourses.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">You have not created any courses yet.</p>';
      return;
    }

    instructorCourses.forEach(c => {
      let sects = [];
      try {
        sects = JSON.parse(c.sections || '[]');
      } catch (e) {}

      const sectsHtml = sects.map(s => `<span class="tag tag-accent">Sec ${s}</span>`).join(' ');
      const statusBadge = c.status === 'approved' 
        ? `<span class="tag" style="background: var(--success); color: #fff;">APPROVED</span>`
        : `<span class="tag" style="background: var(--warning); color: #fff;">PENDING APPROVAL</span>`;

      const div = document.createElement('div');
      div.className = 'card';
      div.style.background = 'var(--bg-input)';
      div.style.padding = '14px';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h4 style="font-size: 0.95rem;">${c.title}</h4>
          ${statusBadge}
        </div>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">Depts: ${c.departments}</p>
        <div class="course-tags" style="margin-bottom: 8px;">${sectsHtml}</div>
        <strong style="color: var(--secondary); font-size: 0.85rem;">BDT ${parseFloat(c.price).toLocaleString()}</strong>
      `;
      container.appendChild(div);
    });

  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger);">Load error: ${error.message}</p>`;
  }
}

function setupCourseDropdowns() {
  const lectureSelect = document.getElementById('lecture-course-id');
  lectureSelect.innerHTML = '<option value="">-- Select Active Course --</option>';

  instructorCourses.forEach(c => {
    // Only approved courses can add lectures (or all courses for testing ease)
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.title;
    lectureSelect.appendChild(opt);
  });
}

async function handleCreateCourse(e) {
  e.preventDefault();
  const title = document.getElementById('course-title').value;
  const description = document.getElementById('course-desc').value;
  const price = document.getElementById('course-price').value;
  const departments = document.getElementById('course-depts').value;
  const image = document.getElementById('course-image').value;

  // Multiple selection parsing
  const select = document.getElementById('course-sections');
  const sections = Array.from(select.selectedOptions).map(option => option.value);

  try {
    await api.post('/courses', {
      title,
      description,
      price: parseFloat(price) || 0.0,
      departments,
      sections,
      image
    });

    showNotification('Course prep program submitted! Pending admin approval.', 'success');
    
    // Reset form
    document.getElementById('create-course-form').reset();
    await initCoursesPanel(); // reload list

  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function handleCreateLecture(e) {
  e.preventDefault();
  const courseId = document.getElementById('lecture-course-id').value;
  const title = document.getElementById('lecture-title').value;
  const scheduleTime = document.getElementById('lecture-time').value;
  const isLive = document.getElementById('lecture-is-live').value === 'true';
  const videoUrl = document.getElementById('lecture-video-url').value;
  const materialsUrl = document.getElementById('lecture-materials').value;

  if (!courseId) {
    showNotification('Please select a course track', 'warning');
    return;
  }

  try {
    await api.post('/courses/lectures', {
      courseId,
      title,
      scheduleTime,
      isLive,
      videoUrl,
      materialsUrl
    });

    showNotification('Class lecture added and study materials uploaded!', 'success');
    document.getElementById('create-lecture-form').reset();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// -------------------------------------------------------------
// EXAM CREATOR LOGIC
// -------------------------------------------------------------
async function initExamsPanel() {
  await loadExamsDropdowns();
}

async function loadExamsDropdowns() {
  // Populate course list choices in exam builder
  const examCourseSelect = document.getElementById('test-course-id');
  examCourseSelect.innerHTML = `
    <option value="free">Free Test (No Enrollment Required)</option>
  `;

  // Fetch approved/active courses to associate test
  try {
    const courses = await api.get('/courses');
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `Premium: ${c.title}`;
      examCourseSelect.appendChild(opt);
    });

    // Populate active tests select dropdown
    const testsSelect = document.getElementById('question-test-select');
    testsSelect.innerHTML = '<option value="">-- Choose Timed Test --</option>';

    const tests = await api.get('/tests');
    const testsList = Array.isArray(tests) ? tests : (tests.enrolledTests || []).concat(tests.freeTests || []);
    
    testsList.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.title} [Topic: ${t.topic}]`;
      testsSelect.appendChild(opt);
    });

  } catch (error) {
    console.error('Failed to load exam dropdown lists', error);
  }
}

async function handleCreateTest(e) {
  e.preventDefault();
  const title = document.getElementById('test-title').value;
  const topic = document.getElementById('test-topic').value;
  const targetMap = document.getElementById('test-course-id').value;
  const timeLimit = document.getElementById('test-limit').value;

  const payload = {
    title,
    topic,
    timeLimit: parseInt(timeLimit) || 30,
    isFree: targetMap === 'free',
    courseId: targetMap === 'free' ? null : parseInt(targetMap)
  };

  try {
    await api.post('/tests', payload);
    showNotification('Exam slot created successfully!', 'success');
    document.getElementById('create-test-form').reset();
    await loadExamsDropdowns(); // refresh dropdowns
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function loadTestQuestions() {
  const testId = document.getElementById('question-test-select').value;
  const checklist = document.getElementById('test-questions-checklist');

  if (!testId) {
    checklist.innerHTML = '<p style="color: var(--text-muted);">Please select a test above to review questions.</p>';
    return;
  }

  checklist.innerHTML = '<p style="color: var(--text-secondary);">Loading questions list...</p>';

  try {
    const questions = await api.get(`/tests/${testId}/questions`);
    checklist.innerHTML = '';
    
    if (questions.length === 0) {
      checklist.innerHTML = '<p style="color: var(--text-muted);">This exam has no questions. Write one below to add!</p>';
      return;
    }

    questions.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'card';
      div.style.background = 'var(--bg-input)';
      div.style.padding = '12px';
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px;">
          <span>MCQ ${index + 1}: [Section: ${q.section}]</span>
          <span style="color: var(--success);">Key: ${q.correctAnswer}</span>
        </div>
        <p style="margin-bottom: 8px;">${q.questionText}</p>
        <div style="font-size: 0.8rem; color: var(--text-secondary); display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px;">
          <span>A. ${q.optionA}</span>
          <span>B. ${q.optionB}</span>
          <span>C. ${q.optionC}</span>
          <span>D. ${q.optionD}</span>
        </div>
        <div style="border-top: 1px dashed var(--border-color); padding-top: 6px; font-size: 0.75rem; color: var(--text-muted);">
          <strong>Explanation:</strong> ${q.explanation || 'None'}
        </div>
      `;
      checklist.appendChild(div);
    });

  } catch (error) {
    checklist.innerHTML = `<p style="color: var(--danger);">Failed to load questions: ${error.message}</p>`;
  }
}

async function handleAddQuestion(e) {
  e.preventDefault();
  const testId = document.getElementById('question-test-select').value;
  
  if (!testId) {
    showNotification('Please select a timed test first', 'warning');
    return;
  }

  const questionText = document.getElementById('q-text').value;
  const optionA = document.getElementById('q-optA').value;
  const optionB = document.getElementById('q-optB').value;
  const optionC = document.getElementById('q-optC').value;
  const optionD = document.getElementById('q-optD').value;
  const correctAnswer = document.getElementById('q-correct').value;
  const section = document.getElementById('q-section').value;
  const explanation = document.getElementById('q-explanation').value;

  try {
    await api.post(`/tests/${testId}/questions`, {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      section,
      explanation
    });

    showNotification('MCQ added to exam paper!', 'success');
    
    // Clear question form inputs (except test selector)
    document.getElementById('q-text').value = '';
    document.getElementById('q-optA').value = '';
    document.getElementById('q-optB').value = '';
    document.getElementById('q-optC').value = '';
    document.getElementById('q-optD').value = '';
    document.getElementById('q-explanation').value = '';

    await loadTestQuestions(); // reload list
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// -------------------------------------------------------------
// GRADEBOOK PANEL LOGIC
// -------------------------------------------------------------
async function initGradebookPanel() {
  const tbody = document.getElementById('instructor-attempts-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Loading gradebook data...</td></tr>';

  try {
    const attempts = await api.get('/tests/attempts/all');
    tbody.innerHTML = '';

    if (attempts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No student test attempts found.</td></tr>';
      return;
    }

    attempts.forEach(a => {
      const studentName = a.student ? a.student.name : 'Unknown Student';
      const studentEmail = a.student ? a.student.email : 'N/A';
      const testTitle = a.test ? a.test.title : 'Deleted Test';
      const topic = a.test ? a.test.topic : 'N/A';
      const badgeStyle = a.score >= 80 ? 'background: var(--primary-light); color: var(--primary); font-weight: bold;' : (a.score >= 50 ? 'background: var(--secondary-light); color: var(--secondary);' : 'background: rgba(239, 68, 68, 0.1); color: var(--danger);');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${studentName}</strong></td>
        <td><code>${studentEmail}</code></td>
        <td>${testTitle}</td>
        <td><span class="tag">${topic}</span></td>
        <td><span class="tag" style="${badgeStyle}">${a.score}%</span></td>
        <td>${a.timeTaken} seconds</td>
        <td>${formatDate(a.createdAt, true)}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to load gradebook: ${error.message}</td></tr>`;
  }
}

// -------------------------------------------------------------
// CONSULTATIONS INBOX LOGIC
// -------------------------------------------------------------
async function initConsultationPanel() {
  setupStudentsList();
}

function setupStudentsList() {
  const list = document.getElementById('consultation-students-list');
  list.innerHTML = '';

  // Seeded Student: ID 3 (John Doe)
  const studentItem = document.createElement('button');
  studentItem.className = 'btn btn-secondary btn-sm';
  studentItem.style.width = '100%';
  studentItem.style.textAlign = 'left';
  studentItem.innerHTML = `
    <strong>John Doe (Student)</strong><br>
    <span style="font-size: 0.75rem; color: var(--text-muted);">student@campuskrafts.com</span>
  `;
  studentItem.addEventListener('click', () => {
    // highlight selected
    list.querySelectorAll('button').forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
    studentItem.classList.replace('btn-secondary', 'btn-primary');

    document.getElementById('consult-recipient-id').value = '3'; // John Doe
    document.getElementById('consult-chat-header').textContent = 'Chatting with John Doe';
    loadConsultationMessages('3');
  });

  list.appendChild(studentItem);
}

async function loadConsultationMessages(studentId) {
  const container = document.getElementById('consult-chat-messages');
  container.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 120px;">Retrieving message threads...</p>';

  try {
    const messages = await api.get(`/forum/direct?partnerId=${studentId}`);
    container.innerHTML = '';
    
    if (messages.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 120px;">No message logs found. Say hello to initiate consultation!</div>';
      return;
    }

    messages.forEach(m => {
      const isMe = m.userId === currentUser.id;
      const align = isMe ? 'align-self: flex-end; background: var(--primary-light); color: var(--text-primary); border-radius: 12px 12px 0 12px;' : 'align-self: flex-start; background: var(--bg-card); border-radius: 12px 12px 12px 0; border: 1px solid var(--border-color);';
      
      const div = document.createElement('div');
      div.style.cssText = `max-width: 80%; padding: 8px 12px; margin-bottom: 4px; ${align}`;
      div.innerHTML = `
        <div style="font-weight: 600; font-size: 0.75rem; color: ${isMe ? 'var(--primary)' : 'var(--secondary)'};">${m.author ? m.author.name : 'User'}</div>
        <div style="margin: 2px 0;">${m.content}</div>
        <div style="font-size: 0.65rem; text-align: right; color: var(--text-muted);">${formatDate(m.createdAt, true)}</div>
      `;
      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;

  } catch (error) {
    console.error('Failed to load consultation logs', error);
  }
}

async function sendConsultationReply(e) {
  e.preventDefault();
  const recipientId = document.getElementById('consult-recipient-id').value;
  const content = document.getElementById('consult-message-input').value;

  if (!recipientId) {
    showNotification('Please select a student thread from the left panel', 'warning');
    return;
  }

  try {
    await api.post('/forum/direct', { recipientId, content });
    document.getElementById('consult-message-input').value = '';
    await loadConsultationMessages(recipientId);
  } catch (error) {
    showNotification(error.message, 'error');
  }
}
