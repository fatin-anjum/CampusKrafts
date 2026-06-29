import React, { useState, useEffect } from 'react';

export default function Dashboard({ auth, handleLogout }) {
  const [classes, setClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [exams, setExams] = useState([]); 
  
  // Admin Specific State Layout Tracker
  const [users, setUsers] = useState([]);

  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [activeNotification, setActiveNotification] = useState(null); 

  // Exam Creation states (Teacher)
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examFormLink, setExamFormLink] = useState('');

  // Exam Submission file state (Student)
  const [selectedFile, setSelectedFile] = useState({});

  const [classTitle, setClassTitle] = useState('');
  const [classLink, setClassLink] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialLink, setMaterialLink] = useState('');

  const token = localStorage.getItem('token');
  const currentUserId = auth?.id || localStorage.getItem('id');

  const fetchData = async () => {
    const headers = { 'Authorization': token };
    try {
      const cRes = await fetch('http://localhost:5000/api/classes', { headers });
      const cData = await cRes.json();
      if (Array.isArray(cData)) setClasses(cData);

      const mRes = await fetch('http://localhost:5000/api/materials', { headers });
      const mData = await mRes.json();
      if (Array.isArray(mData)) setMaterials(mData);

      const aRes = await fetch('http://localhost:5000/api/announcements', { headers });
      const aData = await aRes.json();
      if (Array.isArray(aData)) setAnnouncements(aData);

      const eRes = await fetch('http://localhost:5000/api/exams', { headers });
      const eData = await eRes.json();
      if (Array.isArray(eData)) setExams(eData);

      // Fetch system accounts profile records if the logged-in user is an admin
      if (auth?.role === 'admin') {
        const uRes = await fetch('http://localhost:5000/api/admin/users', { headers });
        const uData = await uRes.json();
        if (Array.isArray(uData)) setUsers(uData);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePostClass = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ title: classTitle, link: classLink }),
    });
    if (res.ok) { setClassTitle(''); setClassLink(''); fetchData(); }
  };

  const handlePostMaterial = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ title: materialTitle, link: materialLink }),
    });
    if (res.ok) { setMaterialTitle(''); setMaterialLink(''); fetchData(); }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ title: annTitle, message: annMessage }),
    });
    if (res.ok) { setAnnTitle(''); setAnnMessage(''); fetchData(); }
  };

  const handlePostExam = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ title: examTitle, description: examDesc, formLink: examFormLink }),
    });
    if (res.ok) { setExamTitle(''); setExamDesc(''); setExamFormLink(''); fetchData(); }
  };

  // Admin Change Role Command
  const handleChangeRole = async (userId, newRole) => {
    const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      fetchData();
    } else {
      const errData = await res.json();
      alert(errData.message || "Failed to update role");
    }
  };

  // Admin Delete User Account Command
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you absolutely sure you want to permanently delete this user account? This cannot be undone.")) return;
    const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': token }
    });
    if (res.ok) {
      fetchData();
    } else {
      const errData = await res.json();
      alert(errData.message || "Failed to delete user");
    }
  };

  const handleUploadSubmission = async (examId) => {
    const fileToUpload = selectedFile[examId];
    if (!fileToUpload) return alert("Please pick an image file first.");

    const formData = new FormData();
    formData.append('answerImage', fileToUpload);

    const res = await fetch(`http://localhost:5000/api/exams/${examId}/submit`, {
      method: 'POST',
      headers: { 'Authorization': token },
      body: formData
    });

    if (res.ok) {
      alert("Answer script uploaded successfully!");
      setSelectedFile(prev => ({ ...prev, [examId]: null }));
      fetchData();
    } else {
      alert("Upload failed. Make sure it's an image.");
    }
  };

  const handleOpenNotification = async (announcement) => {
    setActiveNotification(announcement);
    await markAsReadInBackend(announcement._id);
  };

  const markAsReadInBackend = async (id, e) => {
    if (e) e.stopPropagation();
    setAnnouncements(prev => prev.map(ann => {
      if (ann._id === id && !ann.readBy.includes(currentUserId)) {
        return { ...ann, readBy: [...ann.readBy, currentUserId] };
      }
      return ann;
    }));
    try {
      await fetch(`http://localhost:5000/api/announcements/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
    } catch (err) {}
  };

  const handleDeleteAnnouncement = async (id, e) => {
    e.stopPropagation(); 
    if (!window.confirm("Delete announcement?")) return;
    const res = await fetch(`http://localhost:5000/api/announcements/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
    if (res.ok) fetchData();
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm("Delete class link?")) return;
    const res = await fetch(`http://localhost:5000/api/classes/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
    if (res.ok) fetchData();
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Delete material?")) return;
    const res = await fetch(`http://localhost:5000/api/materials/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
    if (res.ok) fetchData();
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm("Delete this exam?")) return;
    const res = await fetch(`http://localhost:5000/api/exams/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
    if (res.ok) fetchData();
  };

  const unreadCount = announcements.filter(a => currentUserId ? !a.readBy.includes(currentUserId) : false).length;

  return (
    <div className="dashboard-container">
      <div className="header-row">
        <h2>Welcome, {auth.name || 'User'} <span style={{ textTransform: 'capitalize', fontSize: '14px', color: 'var(--text-muted)' }}>({auth.role})</span></h2>
        <button onClick={handleLogout} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>Logout</button>
      </div>

      {/* ======================================================================= */}
      {/* 👑 ADMIN GLOBAL COMMAND PLATFORM PLATFORM LAYER */}
      {/* ======================================================================= */}
      {auth.role === 'admin' && (
        <div className="card" style={{ background: '#f8fafc', border: '2px solid #cbd5e1', marginBottom: '30px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>👑 Platform Administration Command Center</h3>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>Global view control privileges to reassign institution operational access structural parameters and clean directories.</p>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f1f5f9' }}>
                  <th style={{ padding: '10px' }}>User Name</th>
                  <th style={{ padding: '10px' }}>Email Profile</th>
                  <th style={{ padding: '10px' }}>Current Access Designation Role</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Destructive Clean Operations</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{user.name}</td>
                    <td style={{ padding: '10px', color: '#475569' }}>{user.email}</td>
                    <td style={{ padding: '10px' }}>
                      <select 
                        value={user.role} 
                        disabled={user._id === currentUserId}
                        onChange={(e) => handleChangeRole(user._id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: user._id === currentUserId ? 'not-allowed' : 'pointer' }}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      {user._id === currentUserId && <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>(You)</span>}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={user._id === currentUserId}
                        style={{ background: 'none', color: user._id === currentUserId ? '#cbd5e1' : '#ef4444', border: 'none', cursor: user._id === currentUserId ? 'not-allowed' : 'pointer', fontWeight: '600', padding: 0 }}
                      >
                        Purge Account Account Account ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- NOTIFICATION HUB BAR --- */}
      <div className="notification-hub">
        <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🔔 Notifications 
          {unreadCount > 0 && <span style={{ background: 'var(--color-danger)', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>{unreadCount} New</span>}
        </h3>
        <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '10px' }}>
          {announcements.length === 0 ? <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No updates posted.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {announcements.map((a) => {
                const isUnread = currentUserId ? !a.readBy.includes(currentUserId) : false;
                return (
                  <div 
                    key={a._id} 
                    onClick={() => handleOpenNotification(a)}
                    className="notification-row"
                    style={{ borderLeft: isUnread ? '4px solid var(--color-primary)' : '4px solid var(--border-color)' }}
                  >
                    <span style={{ fontWeight: isUnread ? '600' : '400', fontSize: '14px' }}>
                      {a.title} <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '400' }}>— by {a.createdBy?.name}</span>
                    </span>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {isUnread && (
                        <button onClick={(e) => markAsReadInBackend(a._id, e)} style={{ background: 'var(--bg-panel)', fontSize: '11px', padding: '4px 8px' }}>
                          Mark as read
                        </button>
                      )}
                      {(auth.role === 'teacher' || auth.role === 'admin') && (
                        <button onClick={(e) => handleDeleteAnnouncement(a._id, e)} style={{ background: 'none', color: 'var(--color-danger)', padding: 0 }}>✕</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- TEACHER PANEL CONTROLS --- */}
      {auth.role === 'teacher' && (
        <div className="panel-teacher">
          <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--color-primary)' }}>🛠️ Instructor Toolkit</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="grid-layout" style={{ marginTop: 0, gap: '20px' }}>
              <form onSubmit={handlePostClass} className="card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px' }}>Post Live Class</h4>
                <input type="text" placeholder="Class Title" value={classTitle} onChange={e => setClassTitle(e.target.value)} required /><br /><br />
                <input type="url" placeholder="Zoom/Meet URL" value={classLink} onChange={e => setClassLink(e.target.value)} required /><br /><br />
                <button type="submit" style={{ background: 'var(--color-primary)', color: 'white', width: '100%' }}>Post Link</button>
              </form>

              <form onSubmit={handlePostMaterial} className="card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px' }}>Upload Material</h4>
                <input type="text" placeholder="Material Name" value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} required /><br /><br />
                <input type="url" placeholder="Google Drive Share Link" value={materialLink} onChange={e => setMaterialLink(e.target.value)} required /><br /><br />
                <button type="submit" style={{ background: 'var(--color-info)', color: 'white', width: '100%' }}>Upload Link</button>
              </form>

              <form onSubmit={handlePostAnnouncement} className="card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px' }}>Broadcast Announcement</h4>
                <input type="text" placeholder="Heading" value={annTitle} onChange={e => setAnnTitle(e.target.value)} required /><br /><br />
                <textarea placeholder="Message body..." value={annMessage} onChange={e => setAnnMessage(e.target.value)} required style={{ height: '44px', resize: 'none' }} /><br /><br />
                <button type="submit" style={{ background: 'var(--color-warning)', color: 'white', width: '100%' }}>Broadcast</button>
              </form>
            </div>

            {/* Post Exam Form */}
            <form onSubmit={handlePostExam} className="card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '15px', color: 'var(--color-primary)', marginBottom: '15px' }}>📝 Schedule New Assessment / Exam Questions</h4>
              <div className="grid-layout" style={{ marginTop: 0, gap: '15px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div>
                  <input type="text" placeholder="Exam Name (e.g. Quiz 01)" value={examTitle} onChange={e => setExamTitle(e.target.value)} required /><br /><br />
                  <textarea placeholder="Type Question details or prompts here..." value={examDesc} onChange={e => setExamDesc(e.target.value)} required style={{ height: '44px', resize: 'none' }} />
                </div>
                <div>
                  <input type="url" placeholder="Google Form Alternate link (Optional)" value={examFormLink} onChange={e => setExamFormLink(e.target.value)} />
                </div>
              </div>
              <button type="submit" style={{ background: 'var(--text-main)', color: 'white', marginTop: '15px', width: '200px' }}>Publish Exam</button>
            </form>

          </div>
        </div>
      )}

      {/* --- EXAMS FEED & SUBMISSIONS PORTAL --- */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>📝 Exams & Answer Scripts</h3>
        {exams.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No exams listed.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
            {exams.map((exam) => {
              const mySubmission = exam.submissions?.find(sub => sub.studentId === currentUserId);
              
              return (
                <div key={exam._id} className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{exam.title}</h4>
                      <p style={{ fontSize: '14px', margin: '0 0 15px 0', color: '#334155', whiteSpace: 'pre-wrap' }}>{exam.description}</p>
                    </div>
                    {(auth.role === 'teacher' || auth.role === 'admin') && (
                      <button onClick={() => handleDeleteExam(exam._id)} style={{ background: 'none', color: 'var(--color-danger)', alignSelf: 'flex-start', padding: 0 }}>Delete Exam</button>
                    )}
                  </div>

                  {exam.formLink && (
                    <div style={{ marginBottom: '15px' }}>
                      <a href={exam.formLink} target="_blank" rel="noopener noreferrer">
                        <button style={{ background: 'var(--color-success)', color: 'white' }}>Open Google Form Option</button>
                      </a>
                    </div>
                  )}

                  {/* STUDENT WORKSPACE: Upload Photo Paper */}
                  {auth.role === 'student' && (
                    <div style={{ background: 'var(--bg-surface)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '10px' }}>
                      <h5 style={{ margin: '0 0 10px 0', fontSize: '13px' }}>📷 Submit Handwritten Answer (JPG/PNG)</h5>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                        <input 
                          key={selectedFile[exam._id] ? 'selected' : 'empty'}
                          type="file" 
                          accept=".jpg,.jpeg,.png,image/jpg,image/jpeg,image/png" 
                          onChange={(e) => setSelectedFile(prev => ({ ...prev, [exam._id]: e.target.files[0] }))}
                          style={{ fontSize: '13px' }}
                        />

                        {selectedFile[exam._id] && (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button onClick={() => handleUploadSubmission(exam._id)} style={{ background: 'var(--color-primary)', color: 'white', padding: '6px 12px', fontSize: '13px' }}>
                              Upload Answer script
                            </button>
                            <button 
                              onClick={() => setSelectedFile(prev => ({ ...prev, [exam._id]: null }))} 
                              style={{ background: 'var(--bg-panel)', color: 'var(--color-danger)', padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border-color)' }}
                            >
                              Clear File ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {mySubmission && (
                        <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          ✅ Your script has been uploaded! 
                          <a href={`http://localhost:5000${mySubmission.imagePath}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>View Submission</a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* INSTRUCTOR WORKSPACE: View incoming scripts */}
                  {(auth.role === 'teacher' || auth.role === 'admin') && (
                    <div style={{ marginTop: '15px', borderTop: '1px dashed var(--border-color)', paddingTop: '15px' }}>
                      <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--color-primary)' }}>📥 Student Submissions ({exam.submissions?.length || 0})</h5>
                      {(!exam.submissions || exam.submissions.length === 0) ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No scripts submitted yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px', marginTop: '10px' }}>
                          {exam.submissions.map((sub, idx) => (
                            <div key={idx} style={{ background: 'white', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.studentName}</div>
                              <a href={`http://localhost:5000${sub.imagePath}`} target="_blank" rel="noreferrer">
                                <img 
                                  src={`http://localhost:5000${sub.imagePath}`} 
                                  alt="Student script" 
                                  style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee' }} 
                                />
                                <div style={{ fontSize: '11px', marginTop: '5px', color: 'var(--color-primary)' }}>Click to Expand</div>
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- CONTENT LAYOUTS --- */}
      <div className="grid-layout">
        <div className="card">
          <h3>📅 Active Live Classes</h3>
          {classes.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No active streams listed.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {classes.map((c) => (
                <div key={c._id} className="list-item">
                  <div>
                    <span style={{ fontWeight: '600' }}>{c.title}</span>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Posted by {c.createdBy?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}><button style={{ background: 'var(--color-primary)', color: 'white', width: '100%' }}>Join Session</button></a>
                    {(auth.role === 'teacher' || auth.role === 'admin') && <button onClick={() => handleDeleteClass(c._id)} style={{ background: 'var(--bg-panel)', color: 'var(--color-danger)' }}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>📚 Shared Coursework</h3>
          {materials.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No materials uploaded yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {materials.map((m) => (
                <div key={m._id} className="list-item">
                  <div>
                    <span style={{ fontWeight: '600' }}>{m.title}</span>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Uploaded by {m.createdBy?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}><button style={{ background: 'var(--color-info)', color: 'white', width: '100%' }}>Open Resource</button></a>
                    {(auth.role === 'teacher' || auth.role === 'admin') && <button onClick={() => handleDeleteMaterial(m._id)} style={{ background: 'var(--bg-panel)', color: 'var(--color-danger)' }}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- OVERLAY MODAL --- */}
      {activeNotification && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>{activeNotification.title}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0' }}>From: Instructor ({activeNotification.createdBy?.name})</p>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px', color: '#334155' }}>{activeNotification.message}</p>
            <button onClick={() => setActiveNotification(null)} style={{ background: 'var(--color-primary)', color: 'white', float: 'right', marginTop: '10px' }}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}