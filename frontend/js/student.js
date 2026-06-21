let currentUser = null;
let currentEnrolledCourses = [];
let allCourses = [];

// Timed Test Player States
let testTimerInterval = null;
let testQuestions = [];
let testAnswers = {}; // { questionId: selectedOption }
let currentQuestionIndex = 0;
let testTimeRemaining = 0; // seconds
let activeTestId = null;

// Drawing Board States
let drawingCanvas = null;
let drawingCtx = null;
let isDrawing = false;

window.addEventListener('DOMContentLoaded', async () => {
  currentUser = checkAuthRedirect(['student']);
  if (!currentUser) return;
  
  // Set UI name
  document.getElementById('user-display-name').textContent = currentUser.name;
  document.getElementById('welcome-title').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
  document.getElementById('avatar-letter').textContent = currentUser.name.charAt(0).toUpperCase();

  // Load Initial Panels Data
  await initOverviewPanel();
  setupDrawingBoard();
});

// Sidebar Navigation
function showPanel(panelName) {
  // Toggle sidebar items active state
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const activeItem = document.getElementById(`menu-${panelName}`);
  if (activeItem) activeItem.classList.add('active');

  // Toggle panels visibility
  document.querySelectorAll('.dashboard-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  const activePanel = document.getElementById(`panel-${panelName}`);
  if (activePanel) activePanel.classList.add('active');

  // Reset exam panels if they navigated away
  if (panelName !== 'testing') {
    closeTestResults();
  }

  // Load panel specific details
  if (panelName === 'overview') initOverviewPanel();
  else if (panelName === 'courses') initCoursesPanel();
  else if (panelName === 'classroom') initClassroomPanel();
  else if (panelName === 'testing') initTestingPanel();
  else if (panelName === 'forum') initForumPanel();
  else if (panelName === 'profile') initProfilePanel();
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
    const enrollments = await api.get('/courses/student/history');
    currentEnrolledCourses = enrollments.filter(e => e.status === 'active');
    document.getElementById('stats-enrolled-courses').textContent = currentEnrolledCourses.length;

    const attempts = await api.get('/tests/attempts');
    document.getElementById('stats-tests-taken').textContent = attempts.length;

    let avgScore = 0;
    if (attempts.length > 0) {
      const sum = attempts.reduce((acc, curr) => acc + parseFloat(curr.score), 0);
      avgScore = Math.round(sum / attempts.length);
    }
    document.getElementById('stats-average-score').textContent = `${avgScore}%`;

    // Initialize User Goals & Weak Topics recommendation
    const profile = await api.get('/auth/profile');
    
    // Set Target score progress
    let targetScore = 80;
    let weeklyHours = 10;
    try {
      const goals = JSON.parse(profile.studyGoals || '{}');
      targetScore = goals.targetScore || 80;
      weeklyHours = goals.weeklyHours || 10;
    } catch (e) {}

    document.getElementById('target-score-lbl').textContent = `${targetScore}%`;
    document.getElementById('target-hours-lbl').textContent = `${weeklyHours} hrs`;
    document.getElementById('target-score-progress').style.width = `${Math.min(100, Math.round((avgScore / targetScore) * 100))}%`;

    // Render Weak Topics recommendation
    let weakTopics = [];
    try {
      weakTopics = JSON.parse(profile.weakTopics || '[]');
    } catch (e) {}

    const weakContainer = document.getElementById('weak-topic-content');
    const recContainer = document.getElementById('personalized-recommendation-list');
    recContainer.innerHTML = '';

    if (weakTopics.length === 0) {
      weakContainer.innerHTML = `
        <p style="color: var(--success); font-size: 0.95rem; margin-bottom: 12px;">
          ✨ Outstanding job! No weak areas have been flagged. Maintain your performance!
        </p>
      `;
    } else {
      const weakTags = weakTopics.map(t => `<span class="tag tag-accent" style="margin-right: 6px; font-weight: bold;">${t}</span>`).join('');
      weakContainer.innerHTML = `
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 12px;">
          Based on your mock tests, we identified potential improvement areas in:
        </p>
        <div style="margin-bottom: 16px;">${weakTags}</div>
      `;

      // Generate suggested study sheets
      weakTopics.forEach(topic => {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.padding = '12px 16px';
        item.style.background = 'var(--bg-input)';
        item.style.fontSize = '0.85rem';
        item.innerHTML = `
          <strong>💡 Recommended:</strong> Review the formulas and worksheet for <strong>${topic}</strong> inside Study Resources.
        `;
        recContainer.appendChild(item);
      });
    }

    // Load upcoming scheduled lectures
    const lecturesTbody = document.getElementById('overview-lectures-tbody');
    lecturesTbody.innerHTML = '';
    
    if (currentEnrolledCourses.length === 0) {
      lecturesTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted);">Enroll in a prep course to unlock class schedules.</td>
        </tr>
      `;
      return;
    }

    let allLectures = [];
    for (const ec of currentEnrolledCourses) {
      const lecs = await api.get(`/courses/${ec.courseId}/lectures`);
      allLectures = [...allLectures, ...lecs];
    }

    // Sort by scheduleTime
    allLectures.sort((a, b) => new Date(a.scheduleTime) - new Date(b.scheduleTime));

    if (allLectures.length === 0) {
      lecturesTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-secondary);">No class lectures scheduled for your active enrollments.</td>
        </tr>
      `;
      return;
    }

    allLectures.forEach(l => {
      const isPast = new Date(l.scheduleTime) < new Date();
      const statusLabel = l.isLive ? (isPast ? '🔴 Recorded Archive' : '⚡ Live Broadcast') : '📝 Materials Release';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${l.title}</strong></td>
        <td><span class="tag ${l.isLive ? 'tag-accent' : ''}">${statusLabel}</span></td>
        <td>${formatDate(l.scheduleTime, true)}</td>
        <td>${l.duration} minutes</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="showPanel('classroom')">Enter Classroom</button>
        </td>
      `;
      lecturesTbody.appendChild(tr);
    });

  } catch (error) {
    showNotification('Overview initialization error: ' + error.message, 'error');
  }
}

// -------------------------------------------------------------
// COURSES ENROLLMENT LOGIC
// -------------------------------------------------------------
async function initCoursesPanel() {
  const container = document.getElementById('student-courses-list');
  const historyTbody = document.getElementById('student-enrollment-tbody');
  
  try {
    // 1. Fetch history table
    const enrollments = await api.get('/courses/student/history');
    historyTbody.innerHTML = '';
    
    if (enrollments.length === 0) {
      historyTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted);">No enrollments found.</td>
        </tr>
      `;
    } else {
      enrollments.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${e.course ? e.course.title : 'Deleted Course'}</strong></td>
          <td><span class="tag">${e.batch.toUpperCase()} BATCH</span></td>
          <td>${formatDate(e.createdAt)}</td>
          <td><code>${e.bkashTrxId}</code> (BDT ${e.paidAmount})</td>
          <td><span class="tag" style="background: var(--primary-light); color: var(--primary);">${e.status.toUpperCase()}</span></td>
        `;
        historyTbody.appendChild(tr);
      });
    }

    // 2. Fetch courses catalog
    allCourses = await api.get('/courses');
    container.innerHTML = '';
    
    allCourses.forEach(c => {
      const userEnrollment = enrollments.find(e => e.courseId === c.id);
      
      let buttonHtml = '';
      if (userEnrollment) {
        buttonHtml = `<button class="btn btn-secondary btn-sm" style="width: 100%; cursor: default;" disabled>Active: ${userEnrollment.batch.toUpperCase()}</button>`;
      } else {
        buttonHtml = `<button class="btn btn-primary btn-sm" style="width: 100%;" onclick="openBkashModal(${c.id}, '${c.price}')">Enroll with bKash</button>`;
      }

      let sectionsList = [];
      try {
        sectionsList = JSON.parse(c.sections || '[]');
      } catch (e) {}

      const sectionsHtml = sectionsList.map(s => `<span class="tag tag-accent">Sec ${s}</span>`).join(' ');
      const imageSrc = c.image || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=400&auto=format&fit=crop';

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${imageSrc}" alt="${c.title}" class="course-card-img">
        <h3 style="margin-bottom: 8px; font-size: 1.1rem; height: 50px; overflow: hidden;">${c.title}</h3>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 12px; height: 54px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
          ${c.description}
        </p>
        <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">Target Departments:</div>
        <div class="course-tags" style="margin-bottom: 12px;">
          <span class="tag">${c.departments}</span>
        </div>
        <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">Assessed Exam Sections:</div>
        <div class="course-tags" style="margin-bottom: 12px;">
          ${sectionsHtml}
        </div>
        <div class="course-price">BDT ${parseFloat(c.price).toLocaleString()}</div>
        ${buttonHtml}
      `;
      container.appendChild(card);
    });

  } catch (error) {
    showNotification('Courses load error: ' + error.message, 'error');
  }
}

// bKash Modal Controls
function openBkashModal(courseId, price) {
  document.getElementById('bkash-course-id').value = courseId;
  document.getElementById('bkash-paid-amount').value = price;
  document.getElementById('bkash-pay-amount').textContent = parseFloat(price).toLocaleString();
  document.getElementById('bkash-trxid').value = '';
  document.getElementById('bkash-modal').style.display = 'flex';
}

function closeBkashModal() {
  document.getElementById('bkash-modal').style.display = 'none';
}

async function handleBkashCheckoutSubmit(e) {
  e.preventDefault();
  const courseId = document.getElementById('bkash-course-id').value;
  const paidAmount = document.getElementById('bkash-paid-amount').value;
  const batch = document.getElementById('bkash-batch').value;
  const bkashTrxId = document.getElementById('bkash-trxid').value;

  try {
    const data = await api.post('/courses/enroll', {
      courseId,
      paidAmount,
      batch,
      bkashTrxId
    });
    
    showNotification(data.message, 'success');
    closeBkashModal();
    initCoursesPanel(); // reload lists
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// -------------------------------------------------------------
// CLASSROOM PANEL LOGIC
// -------------------------------------------------------------
async function initClassroomPanel() {
  const sidebarCourses = document.getElementById('classroom-courses-list');
  const lecturesPanel = document.getElementById('classroom-lectures-container');
  const courseHeader = document.getElementById('classroom-selected-course-title');

  try {
    const enrollments = await api.get('/courses/student/history');
    const active = enrollments.filter(e => e.status === 'active');
    
    sidebarCourses.innerHTML = '<h4>Select Enrolled Course</h4>';
    lecturesPanel.innerHTML = '';
    courseHeader.textContent = 'Select a course to view contents';

    if (active.length === 0) {
      sidebarCourses.innerHTML += '<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">You are not enrolled in any courses yet.</p>';
      return;
    }

    active.forEach(ec => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-sm';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.textContent = ec.course.title;
      btn.addEventListener('click', () => {
        // Toggle highlight colors
        sidebarCourses.querySelectorAll('button').forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
        btn.classList.replace('btn-secondary', 'btn-primary');
        loadCourseLectures(ec.courseId, ec.course.title);
      });
      sidebarCourses.appendChild(btn);
    });

  } catch (error) {
    showNotification('Classroom load error: ' + error.message, 'error');
  }
}

async function loadCourseLectures(courseId, courseTitle) {
  const lecturesPanel = document.getElementById('classroom-lectures-container');
  const courseHeader = document.getElementById('classroom-selected-course-title');
  
  courseHeader.textContent = courseTitle;
  lecturesPanel.innerHTML = '<p style="color: var(--text-secondary);">Loading lectures...</p>';

  try {
    const lectures = await api.get(`/courses/${courseId}/lectures`);
    lecturesPanel.innerHTML = '';
    
    if (lectures.length === 0) {
      lecturesPanel.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin: 40px 0;">No lectures or videos have been uploaded for this course yet.</p>';
      return;
    }

    lectures.forEach(l => {
      const attendanceList = JSON.parse(l.attendance || '[]');
      const hasAttended = attendanceList.includes(currentUser.id);
      
      const attendanceBtn = hasAttended 
        ? `<button class="btn btn-secondary btn-sm" disabled style="cursor: default;">✔ Attendance Recorded</button>`
        : `<button class="btn btn-accent btn-sm" onclick="recordAttendance(${l.id}, this)">Mark Attendance</button>`;
      
      const videoEmbed = l.videoUrl 
        ? `<div style="background: #000; border-radius: var(--radius-md); padding: 12px; text-align: center; margin-bottom: 12px;">
             <span style="color: var(--secondary);">🎥 Embedded Lecture Recording Stream:</span> 
             <a href="${l.videoUrl}" target="_blank" style="color: var(--primary); text-decoration: underline; margin-left: 8px;">Watch Video Stream Link</a>
           </div>`
        : '';

      const materialsHtml = l.materialsUrl 
        ? `<div style="margin-bottom: 12px;">
             <strong>📁 Slide / Worksheet:</strong> 
             <a href="${l.materialsUrl}" target="_blank" style="color: var(--secondary); text-decoration: underline;">Download Study Materials (PDF)</a>
           </div>`
        : '';

      const item = document.createElement('div');
      item.className = 'card';
      item.style.border = '1px solid var(--border-color)';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4>${l.title}</h4>
          <span class="tag">${l.isLive ? 'Live Coaching' : 'Recorded Archive'}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
          Scheduled Release Date: ${formatDate(l.scheduleTime, true)} | duration: ${l.duration} minutes
        </p>
        ${videoEmbed}
        ${materialsHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px;">
          <span style="font-size: 0.8rem; color: var(--text-muted);">
            Attendance count: ${attendanceList.length} students
          </span>
          ${attendanceBtn}
        </div>
      `;
      lecturesPanel.appendChild(item);
    });

  } catch (error) {
    lecturesPanel.innerHTML = `<p style="color: var(--danger);">Failed to load lectures: ${error.message}</p>`;
  }
}

async function recordAttendance(lectureId, btnElement) {
  try {
    await api.post(`/courses/lectures/${lectureId}/attendance`);
    showNotification('Attendance marked successfully!', 'success');
    btnElement.textContent = '✔ Attendance Recorded';
    btnElement.disabled = true;
    btnElement.style.cursor = 'default';
    btnElement.className = 'btn btn-secondary btn-sm';
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// -------------------------------------------------------------
// TESTING CENTER LOGIC & QUIZ PLAYER
// -------------------------------------------------------------
async function initTestingPanel() {
  const freeGrid = document.getElementById('student-free-tests-list');
  const premiumGrid = document.getElementById('student-premium-tests-list');
  
  try {
    const data = await api.get('/tests');
    
    // 1. Render Free tests
    freeGrid.innerHTML = '';
    if (data.freeTests.length === 0) {
      freeGrid.innerHTML = '<p style="color: var(--text-muted);">No free tests seeded.</p>';
    } else {
      data.freeTests.forEach(t => {
        const card = document.createElement('div');
        card.className = 'test-card';
        card.innerHTML = `
          <h4>${t.title}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 6px 0 14px 0;">Topic: ${t.topic} | Time: ${t.timeLimit} mins</p>
          <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="startMockTest(${t.id})">Take Test</button>
        `;
        freeGrid.appendChild(card);
      });
    }

    // 2. Render Premium tests
    premiumGrid.innerHTML = '';
    if (data.enrolledTests.length === 0) {
      premiumGrid.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">Enroll in courses to unlock premium timed mock exams.</p>';
    } else {
      data.enrolledTests.forEach(t => {
        const card = document.createElement('div');
        card.className = 'test-card';
        card.style.borderColor = 'var(--primary)';
        card.innerHTML = `
          <div style="font-size: 0.7rem; color: var(--primary); font-weight: 700;">${t.course ? t.course.title.toUpperCase() : 'PREMIUM'}</div>
          <h4 style="margin: 4px 0;">${t.title}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 6px 0 14px 0;">Topic: ${t.topic} | Time: ${t.timeLimit} mins</p>
          <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="startMockTest(${t.id})">Start Mock Exam</button>
        `;
        premiumGrid.appendChild(card);
      });
    }

    // 3. Render Attempts history
    loadAttemptsHistory();

  } catch (error) {
    showNotification('Tests listing error: ' + error.message, 'error');
  }
}

async function loadAttemptsHistory() {
  const list = document.getElementById('test-attempts-history-list');
  try {
    const attempts = await api.get('/tests/attempts');
    list.innerHTML = '';
    
    if (attempts.length === 0) {
      list.innerHTML = '<li style="color: var(--text-muted); text-align: center;">No exams completed yet.</li>';
      return;
    }

    attempts.forEach(a => {
      const li = document.createElement('li');
      li.style.borderBottom = '1px solid var(--border-color)';
      li.style.paddingBottom = '8px';
      
      const badgeClass = a.score >= 80 ? 'color: var(--success);' : (a.score >= 50 ? 'color: var(--warning);' : 'color: var(--danger);');
      
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <strong>${a.test ? a.test.title : 'Deleted Test'}</strong>
          <span style="${badgeClass} font-weight: bold;">${a.score}%</span>
        </div>
        <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">
          Time taken: ${a.timeTaken}s | ${formatDate(a.createdAt)}
        </div>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Failed to load attempts history', error);
  }
}

// TIMED EXAM ENGINE
async function startMockTest(testId) {
  try {
    const test = await api.get(`/tests/${testId}/take`);
    
    activeTestId = testId;
    testQuestions = test.questions;
    testAnswers = {};
    currentQuestionIndex = 0;
    testTimeRemaining = test.timeLimit * 60; // convert to seconds
    
    if (testQuestions.length === 0) {
      showNotification('This test has no questions yet.', 'warning');
      return;
    }

    // Hide dashboard view, show test taker panel
    document.getElementById('testing-center-main').style.display = 'none';
    document.getElementById('test-results-panel').style.display = 'none';
    document.getElementById('test-taker-panel').style.display = 'block';
    
    document.getElementById('test-taker-title').textContent = test.title;

    // Start Timer Interval
    startTestTimer();
    renderTestQuestion();

  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function startTestTimer() {
  if (testTimerInterval) clearInterval(testTimerInterval);
  
  updateTimerUI();
  testTimerInterval = setInterval(() => {
    testTimeRemaining--;
    updateTimerUI();
    
    if (testTimeRemaining <= 0) {
      clearInterval(testTimerInterval);
      showNotification('Time is up! Auto-submitting your test...', 'warning');
      submitActiveTest();
    }
  }, 1000);
}

function updateTimerUI() {
  const minutes = Math.floor(testTimeRemaining / 60);
  const seconds = testTimeRemaining % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('test-taker-timer').textContent = `Time Remaining: ${timeStr}`;
}

function renderTestQuestion() {
  const q = testQuestions[currentQuestionIndex];
  const total = testQuestions.length;
  
  // Progress bar
  const progressPercent = Math.round(((currentQuestionIndex + 1) / total) * 100);
  document.getElementById('test-taker-progress').style.width = `${progressPercent}%`;
  
  // Counter
  document.getElementById('test-taker-counter').textContent = `Question ${currentQuestionIndex + 1} of ${total}`;

  // Navigation button toggles
  document.getElementById('btn-test-prev').style.display = currentQuestionIndex === 0 ? 'none' : 'block';
  if (currentQuestionIndex === total - 1) {
    document.getElementById('btn-test-next').style.display = 'none';
    document.getElementById('btn-test-submit').style.display = 'block';
  } else {
    document.getElementById('btn-test-next').style.display = 'block';
    document.getElementById('btn-test-submit').style.display = 'none';
  }

  // Question container
  const area = document.getElementById('test-taker-question-area');
  const selectedAnswer = testAnswers[q.id.toString()] || '';

  area.innerHTML = `
    <h3 style="margin-bottom: 20px; font-weight: 500;">${q.questionText}</h3>
    <div style="font-size: 0.8rem; color: var(--secondary); font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">Section: ${q.section}</div>
    <div class="question-option-card ${selectedAnswer === 'A' ? 'selected' : ''}" onclick="selectQuestionOption('${q.id}', 'A')">
      <strong>A.</strong> ${q.optionA}
    </div>
    <div class="question-option-card ${selectedAnswer === 'B' ? 'selected' : ''}" onclick="selectQuestionOption('${q.id}', 'B')">
      <strong>B.</strong> ${q.optionB}
    </div>
    <div class="question-option-card ${selectedAnswer === 'C' ? 'selected' : ''}" onclick="selectQuestionOption('${q.id}', 'C')">
      <strong>C.</strong> ${q.optionC}
    </div>
    <div class="question-option-card ${selectedAnswer === 'D' ? 'selected' : ''}" onclick="selectQuestionOption('${q.id}', 'D')">
      <strong>D.</strong> ${q.optionD}
    </div>
  `;
}

function selectQuestionOption(questionId, option) {
  testAnswers[questionId] = option;
  
  // Rerender to show visual highlights
  renderTestQuestion();
}

function testNavigateQuestion(direction) {
  currentQuestionIndex += direction;
  renderTestQuestion();
}

async function submitActiveTest() {
  if (testTimerInterval) clearInterval(testTimerInterval);
  
  // Calculate time taken
  const testObj = testQuestions[0]; // has limit details
  const totalAllocatedSeconds = testQuestions.length * 60; // roughly
  const timeLimitVal = document.getElementById('test-taker-timer').textContent; // string
  const elapsedSeconds = (testTimeRemaining > 0) ? ((testQuestions.length * 60) - testTimeRemaining) : 0; 

  try {
    const result = await api.post(`/tests/${activeTestId}/submit`, {
      answers: testAnswers,
      timeTaken: Math.max(1, elapsedSeconds)
    });

    // Show Results Panel
    document.getElementById('test-taker-panel').style.display = 'none';
    document.getElementById('test-results-panel').style.display = 'block';

    document.getElementById('results-score').textContent = `${result.score}%`;
    document.getElementById('results-meta').textContent = `Correct: ${result.correctCount} of ${result.totalQuestions} questions | Time Elapsed: ${result.timeTaken} seconds`;

    // Weak topics alert
    const weakAlert = document.getElementById('results-weak-topics-alert');
    if (result.weakTopicsIdentified && result.weakTopicsIdentified.length > 0) {
      weakAlert.style.display = 'block';
      document.getElementById('results-weak-topics-list').textContent = result.weakTopicsIdentified.join(', ');
    } else {
      weakAlert.style.display = 'none';
    }

    // Render Answers checklist review
    const resultsContainer = document.getElementById('test-results-list');
    resultsContainer.innerHTML = '';

    result.results.forEach((r, idx) => {
      const isCorrect = r.isCorrect;
      const statusIcon = isCorrect ? '✅ Correct' : '❌ Incorrect';
      const headingColor = isCorrect ? 'var(--success)' : 'var(--danger)';

      const card = document.createElement('div');
      card.className = 'card';
      card.style.background = 'var(--bg-input)';
      card.innerHTML = `
        <h4 style="color: ${headingColor}; margin-bottom: 8px;">Question ${idx + 1}: ${statusIcon}</h4>
        <p style="margin-bottom: 12px; font-weight: 500;">${r.questionText}</p>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
          Your choice: <strong>${r.userAnswer || 'Not Answered'}</strong>
        </div>
        <div style="font-size: 0.85rem; color: var(--success); margin-bottom: 12px;">
          Correct answer: <strong>${r.correctAnswer}</strong>
        </div>
        <div style="border-top: 1px dashed var(--border-color); padding-top: 8px; font-size: 0.85rem; color: var(--text-muted);">
          <strong>Explanation:</strong> ${r.explanation || 'No explanation provided.'}
        </div>
      `;
      resultsContainer.appendChild(card);
    });

  } catch (error) {
    showNotification('Test Submission failed: ' + error.message, 'error');
    closeTestResults();
  }
}

function closeTestResults() {
  document.getElementById('test-results-panel').style.display = 'none';
  document.getElementById('test-taker-panel').style.display = 'none';
  document.getElementById('testing-center-main').style.display = 'block';
  
  if (activeTestId) {
    initTestingPanel(); // reload list details
    activeTestId = null;
  }
}

// -------------------------------------------------------------
// ARCHITECTURAL DRAWING BOARD LOGIC
// -------------------------------------------------------------
function setupDrawingBoard() {
  drawingCanvas = document.getElementById('drawing-board');
  if (!drawingCanvas) return;
  
  drawingCtx = drawingCanvas.getContext('2d');
  
  // Set brush parameters
  drawingCtx.strokeStyle = '#0b0f19';
  drawingCtx.lineWidth = 3;
  drawingCtx.lineCap = 'round';
  
  // Mouse Draw Events
  drawingCanvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = drawingCanvas.getBoundingClientRect();
    drawingCtx.beginPath();
    drawingCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  });

  drawingCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = drawingCanvas.getBoundingClientRect();
    drawingCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    drawingCtx.stroke();
  });

  drawingCanvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  drawingCanvas.addEventListener('mouseleave', () => {
    isDrawing = false;
  });
}

function clearDrawingBoard() {
  if (!drawingCanvas) return;
  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}

function downloadSketch() {
  if (!drawingCanvas) return;
  const link = document.createElement('a');
  link.download = 'bracu-architecture-perspective-sketch.png';
  link.href = drawingCanvas.toDataURL('image/png');
  link.click();
  showNotification('Sketch downloaded successfully!', 'success');
}

// -------------------------------------------------------------
// DISCUSSION FORUM & messaging LOGIC
// -------------------------------------------------------------
async function initForumPanel() {
  await loadForumFeed();
  await loadChatHistory();
}

async function loadForumFeed() {
  const container = document.getElementById('forum-feed-container');
  container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Loading conversations...</p>';

  try {
    const posts = await api.get('/forum');
    container.innerHTML = '';
    
    if (posts.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No public discussion threads started yet.</p>';
      return;
    }

    posts.forEach(p => {
      const thread = document.createElement('div');
      thread.className = 'forum-thread-item';
      thread.innerHTML = `
        <div class="forum-thread-title">${p.title || 'General Forum Post'}</div>
        <p style="font-size: 0.9rem; margin-bottom: 8px; white-space: pre-line;">${p.content}</p>
        <div class="forum-thread-meta">
          <span>By: <strong>${p.author ? p.author.name : 'Unknown User'}</strong> (${p.author ? p.author.role.toUpperCase() : ''})</span>
          <span>Date: ${formatDate(p.createdAt, true)}</span>
          <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;" onclick="toggleCommentsSection(${p.id})">Comments</button>
        </div>
        <div id="comments-section-${p.id}" style="display: none; background: var(--bg-input); padding: 12px; border-radius: var(--radius-md); margin-top: 10px;">
          <div id="comments-list-${p.id}" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;"></div>
          <form onsubmit="postComment(event, ${p.id})" style="display: flex; gap: 8px;">
            <input type="text" class="form-control" placeholder="Write comment..." required style="padding: 8px 12px; font-size: 0.85rem;">
            <button type="submit" class="btn btn-primary btn-sm">Reply</button>
          </form>
        </div>
      `;
      container.appendChild(thread);
    });

  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger);">Failed to load discussion boards.</p>`;
  }
}

async function createForumPost(e) {
  e.preventDefault();
  const title = document.getElementById('forum-post-title').value;
  const content = document.getElementById('forum-post-content').value;

  try {
    await api.post('/forum', { title, content });
    showNotification('Thread posted to discussions board', 'success');
    document.getElementById('forum-post-title').value = '';
    document.getElementById('forum-post-content').value = '';
    loadForumFeed(); // reload
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function toggleCommentsSection(postId) {
  const sec = document.getElementById(`comments-section-${postId}`);
  if (sec.style.display === 'none') {
    sec.style.display = 'block';
    await loadPostComments(postId);
  } else {
    sec.style.display = 'none';
  }
}

async function loadPostComments(postId) {
  const container = document.getElementById(`comments-list-${postId}`);
  container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">Loading comments...</p>';

  try {
    const comments = await api.get(`/forum/${postId}/replies`);
    container.innerHTML = '';
    
    if (comments.length === 0) {
      container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">No replies yet. Be the first to answer!</p>';
      return;
    }

    comments.forEach(c => {
      const div = document.createElement('div');
      div.style.borderLeft = '2px solid var(--primary)';
      div.style.paddingLeft = '8px';
      div.style.fontSize = '0.85rem';
      div.innerHTML = `
        <p style="margin-bottom: 2px;">${c.content}</p>
        <div style="font-size: 0.75rem; color: var(--text-muted);">
          By: <strong>${c.author ? c.author.name : 'Unknown User'}</strong> (${c.author ? c.author.role.toUpperCase() : ''}) | ${formatDate(c.createdAt, true)}
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    container.innerHTML = '<p style="color: var(--danger); font-size: 0.8rem;">Failed to retrieve comments.</p>';
  }
}

async function postComment(e, postId) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const content = input.value;

  try {
    await api.post(`/forum/${postId}/replies`, { content });
    input.value = '';
    await loadPostComments(postId);
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// PRIVATE MESSAGE CONSULTATIONS
async function loadChatHistory() {
  const container = document.getElementById('chat-messages-container');
  const partnerId = document.getElementById('chat-recipient-id').value;

  try {
    const messages = await api.get(`/forum/direct?partnerId=${partnerId}`);
    container.innerHTML = '';
    
    if (messages.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 100px;">Send a private question to the class instructor (Professor BRACU Prep).</div>';
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

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

  } catch (error) {
    console.error('Failed to load chat history', error);
  }
}

async function sendChatMessage(e) {
  e.preventDefault();
  const recipientId = document.getElementById('chat-recipient-id').value;
  const content = document.getElementById('chat-message-input').value;

  try {
    await api.post('/forum/direct', { recipientId, content });
    document.getElementById('chat-message-input').value = '';
    await loadChatHistory();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// -------------------------------------------------------------
// PROFILE SETTINGS LOGIC
// -------------------------------------------------------------
async function initProfilePanel() {
  try {
    const profile = await api.get('/auth/profile');
    
    document.getElementById('profile-name').value = profile.name;
    document.getElementById('profile-email').value = profile.email;
    document.getElementById('profile-phone').value = profile.phone || '';
    document.getElementById('profile-bio').value = profile.bio || '';

    // Set goals
    let goals = { targetScore: 80, weeklyHours: 10 };
    try {
      if (profile.studyGoals) goals = JSON.parse(profile.studyGoals);
    } catch (e) {}

    document.getElementById('goal-target-score').value = goals.targetScore || 80;
    document.getElementById('goal-weekly-hours').value = goals.weeklyHours || 10;

  } catch (error) {
    showNotification('Failed to retrieve profile: ' + error.message, 'error');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const name = document.getElementById('profile-name').value;
  const phone = document.getElementById('profile-phone').value;
  const bio = document.getElementById('profile-bio').value;
  
  const targetScore = document.getElementById('goal-target-score').value;
  const weeklyHours = document.getElementById('goal-weekly-hours').value;
  
  const studyGoals = {
    targetScore: parseInt(targetScore) || 80,
    weeklyHours: parseInt(weeklyHours) || 10
  };

  try {
    const data = await api.put('/auth/profile', {
      name,
      phone,
      bio,
      studyGoals
    });
    
    // Save updated name to memory
    currentUser.name = data.user.name;
    api.setCurrentUser(currentUser);
    document.getElementById('user-display-name').textContent = data.user.name;
    document.getElementById('welcome-title').textContent = `Welcome back, ${data.user.name.split(' ')[0]}!`;

    showNotification('Account settings updated successfully!', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}
