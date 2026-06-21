let activeTab = 'login';
let pendingVerificationEmail = '';

// Check if already logged in and redirect accordingly
window.addEventListener('DOMContentLoaded', () => {
  const user = api.getCurrentUser();
  if (user && api.getToken()) {
    routeUserDashboard(user.role);
  }
});

function switchAuthTab(tab) {
  activeTab = tab;
  
  const loginTabBtn = document.getElementById('tab-login');
  const signupTabBtn = document.getElementById('tab-signup');
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  
  if (tab === 'login') {
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  } else {
    loginTabBtn.classList.remove('active');
    signupTabBtn.classList.add('active');
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
  }
}

// Redirect utility
function routeUserDashboard(role) {
  if (role === 'admin') {
    window.location.href = '/admin_dashboard.html';
  } else if (role === 'instructor') {
    window.location.href = '/instructor_dashboard.html';
  } else {
    window.location.href = '/student_dashboard.html';
  }
}

// Submit login form
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const data = await api.post('/auth/login', { email, password });
    api.setToken(data.token);
    api.setCurrentUser(data.user);
    showNotification('Logged in successfully!', 'success');
    
    setTimeout(() => {
      routeUserDashboard(data.user.role);
    }, 800);
  } catch (error) {
    if (error.needsVerification) {
      showNotification(error.message, 'warning');
      showOtpVerificationPanel(error.email);
    } else {
      showNotification(error.message, 'error');
    }
  }
}

// Submit signup form
async function handleSignupSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const role = document.getElementById('signup-role').value;

  if (password.length < 6) {
    showNotification('Password must be at least 6 characters long', 'error');
    return;
  }

  try {
    const data = await api.post('/auth/signup', { name, email, password, role });
    showNotification(data.message, 'success');
    showOtpVerificationPanel(email);
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// Switch view to OTP Panel
function showOtpVerificationPanel(email) {
  pendingVerificationEmail = email;
  document.getElementById('otp-target-email').textContent = email;
  document.getElementById('auth-main-panel').style.display = 'none';
  document.getElementById('auth-otp-panel').style.display = 'block';
  document.getElementById('auth-footer-text').style.display = 'none';
  
  // Clear any existing OTP values and focus first box
  const inputs = document.querySelectorAll('.otp-input');
  inputs.forEach(input => input.value = '');
  inputs[0].focus();
}

// Revert OTP view
function cancelOtpFlow() {
  document.getElementById('auth-main-panel').style.display = 'block';
  document.getElementById('auth-otp-panel').style.display = 'none';
  document.getElementById('auth-footer-text').style.display = 'block';
  switchAuthTab('login');
}

// Focus redirection for OTP code text fields
function otpInputNavigate(element, event) {
  const index = Array.from(element.parentElement.children).indexOf(element);
  const key = event.key;
  
  if (key === 'Backspace' || key === 'Delete') {
    if (element.value === '' && index > 0) {
      element.parentElement.children[index - 1].focus();
    }
  } else if (element.value.match(/^[0-9]$/)) {
    if (index < 5) {
      element.parentElement.children[index + 1].focus();
    }
  } else {
    // Only accept numeric entries
    element.value = '';
  }
}

// Submit OTP verification code
async function handleOtpSubmit(e) {
  e.preventDefault();
  
  const inputs = document.querySelectorAll('.otp-input');
  let otpCode = '';
  inputs.forEach(input => otpCode += input.value);

  if (otpCode.length !== 6) {
    showNotification('Please fill in all 6 numbers', 'error');
    return;
  }

  try {
    const data = await api.post('/auth/verify-otp', {
      email: pendingVerificationEmail,
      otpCode
    });
    
    api.setToken(data.token);
    api.setCurrentUser(data.user);
    
    showNotification('Email verified and logged in!', 'success');
    setTimeout(() => {
      routeUserDashboard(data.user.role);
    }, 1000);
  } catch (error) {
    showNotification(error.message, 'error');
  }
}
