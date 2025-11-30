// Tab switching logic
function showTab(name) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(name).classList.add('active');
}
showTab('notes'); // Default

//------ NOTES ------
let notes = JSON.parse(localStorage.getItem('notes') || '[]');
let editingNoteIndex = null;
function renderNotes() {
  const list = document.getElementById('notes-list');
  list.innerHTML = '';
  notes.forEach((note, idx) => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <div class="note-title">${note.title || "(Untitled Note)"}</div>
      <div class="note-date">${note.date}</div>
      <div>${note.content.replace(/\\n/g,"<br>")}</div>
      <span class="note-actions">
        <button onclick="editNote(${idx})">✏️</button>
        <button onclick="delNote(${idx})">🗑️</button>
      </span>
    `;
    list.appendChild(card);
  });
}
function newNote() {
  editingNoteIndex = null;
  document.getElementById('note-content').value = '';
  document.getElementById('note-editor').classList.add('show');
}
function editNote(idx) {
  editingNoteIndex = idx;
  document.getElementById('note-content').value = notes[idx].content;
  document.getElementById('note-editor').classList.add('show');
}
function closeEditor() {
  document.getElementById('note-editor').classList.remove('show');
}
function saveNote() {
  let content = document.getElementById('note-content').value;
  let title = content.trim().split('\\n')[0].slice(0,28);
  let date = new Date().toLocaleString('sv').replace('T',' ');
  if (editingNoteIndex === null) {
    notes.unshift({ title, content, date });
  } else {
    notes[editingNoteIndex] = { title, content, date };
  }
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
  closeEditor();
}
function delNote(idx) {
  if (confirm('Delete this note?')) {
    notes.splice(idx, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
    renderNotes();
  }
}
renderNotes();

//------ TASKS ------
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
function renderTasks() {
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  tasks.forEach((task, i) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' task-completed' : '');
    li.innerHTML = \`
      <span><input type="checkbox" onchange="toggleTask(${i})" \${task.done && 'checked'}>
        \${task.text}
        \${task.date ? '<span class="task-date">'+task.date+'</span>':''}
      </span>
      <span class="task-actions"><button onclick="delTask(${i})">🗑️</button></span>
    \`;
    list.appendChild(li);
  });
}
function addTask(e) {
  e.preventDefault();
  let text = document.getElementById('task-input').value.trim();
  let date = document.getElementById('task-date').value;
  if (!text) return;
  tasks.unshift({text,date,done:false});
  localStorage.setItem('tasks', JSON.stringify(tasks));
  renderTasks();
  e.target.reset();
}
function toggleTask(i) {
  tasks[i].done = !tasks[i].done;
  localStorage.setItem('tasks', JSON.stringify(tasks));
  renderTasks();
}
function delTask(i) {
  if (confirm('Delete task?')) {
    tasks.splice(i, 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
  }
}
renderTasks();

//------ PLANNER ------
function renderPlanner() {
  const monthIn = document.getElementById('planner-month');
  const div = document.getElementById('planner-view');
  let now = monthIn.value ? new Date(monthIn.value+'-01') : new Date();
  let y = now.getFullYear(), m = now.getMonth();
  let first = new Date(y, m, 1).getDay() || 7;
  let last = new Date(y,m+1,0).getDate();
  let today = new Date();
  let selDay = (d) => y === today.getFullYear() && m===today.getMonth() && d===today.getDate();
  div.innerHTML = '';
  for(let d=1; d<first; ++d) div.innerHTML += `<span class='planner-day' style='visibility:hidden'></span>`;
  for(let d=1; d<=last; ++d) {
    div.innerHTML += \`<span class="planner-day\${selDay(d) ? ' today' : ''}">\${d}</span>\`;
  }
}
renderPlanner();

//------ DATABASE ------
let dbRows = JSON.parse(localStorage.getItem('dbRows') || '[]');
function renderDB() {
  const tbody = document.querySelector('#db-table tbody');
  tbody.innerHTML = '';
  dbRows.forEach((row,i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = \`
      <td><input value="\${row.name}" onchange="dbRows[\${i}].name=this.value;saveDB()" /></td>
      <td><input value="\${row.value}" onchange="dbRows[\${i}].value=this.value;saveDB()" /></td>
      <td><button onclick="delRow(\${i})">🗑️</button></td>
    \`;
    tbody.appendChild(tr);
  });
}
function addRow() {
  dbRows.push({ name:'', value:'' });
  saveDB();
}
function delRow(i) {
  dbRows.splice(i, 1);
  saveDB();
}
function saveDB() {
  localStorage.setItem('dbRows', JSON.stringify(dbRows));
  renderDB();
}
renderDB();
