const STORAGE = {
  centros: 'misas_centros',
  sacerdotes: 'misas_sacerdotes',
  usuarios: 'misas_usuarios',
  plan: 'misas_plan',
  currentUser: 'misas_current_user'
};

const dataStore = {
  centros: [],
  sacerdotes: [],
  usuarios: [],
  plan: {}
};

const homeCalendarState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDate: new Date()
};

const elements = {
  loginScreen: document.getElementById('login-screen'),
  mainScreen: document.getElementById('main-screen'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginError: document.getElementById('login-error'),
  currentUser: document.getElementById('current-user'),
  subtitle: document.getElementById('subtitle'),
  logoutBtn: document.getElementById('logout-btn'),
  adminTab: document.getElementById('admin-tab'),
  printHome: document.getElementById('print-home'),
  homeView: document.getElementById('home-view'),
  adminView: document.getElementById('admin-view'),
  adminSections: {
    centros: document.getElementById('admin-centros'),
    sacerdotes: document.getElementById('admin-sacerdotes'),
    misas: document.getElementById('admin-misas'),
    usuarios: document.getElementById('admin-usuarios')
  },
  adminTabs: document.querySelectorAll('[data-admin-view]'),
  viewButtons: document.querySelectorAll('[data-view]'),
  printContainer: document.getElementById('print-container')
};

function getData(key, fallback = []) {
  return dataStore[key] || fallback;
}

function saveData(key, data) {
  dataStore[key] = data;
  if (window.db) {
    if (key === 'plan') {
      // Para plan, guardar cada mes como documento
      Object.keys(data).forEach(async (monthKey) => {
        const docRef = doc(window.db, 'plan', monthKey);
        await setDoc(docRef, data[monthKey]).catch(console.error);
      });
    } else {
      // Para arrays, guardar cada item como documento
      data.forEach(async (item) => {
        const docRef = doc(window.db, key, item.id.toString());
        await setDoc(docRef, item).catch(console.error);
      });
    }
  } else {
    localStorage.setItem(STORAGE[key], JSON.stringify(data));
  }
}


async function initData() {
  const initialCentros = [
    { id: 1, nombre: 'Centro San Juan', ubicacion: 'Calle Mayor 1', observaciones: 'Parroquia central', horaSemana: '19:00', horaFinSemana: '12:00' },
    { id: 2, nombre: 'Centro Santa María', ubicacion: 'Plaza de la Paz 5', observaciones: 'Misa familiar', horaSemana: '20:00', horaFinSemana: '11:30' }
  ];
  const initialSacerdotes = [
    { id: 1, nombre: 'Padre Pedro', telefono: '600123456' },
    { id: 2, nombre: 'Padre Mateo', telefono: '600654321' }
  ];
  const initialUsuarios = [
    { id: 1, nombre: 'Administrador', correo: 'admin@misas.local', contraseña: 'admin12', tipo: 'administrador', centroId: null },
    { id: 2, nombre: 'Usuario Centro 1', correo: 'centro1@misas.local', contraseña: 'centro1', tipo: 'centro', centroId: 1 },
    { id: 3, nombre: 'Sacerdote', correo: 'padre1@misas.local', contraseña: 'padre1', tipo: 'sacerdote', centroId: null }
  ];
  const initialPlan = {};

  if (window.db) {
    try {
      // Cargar centros
      const centrosSnap = await getDocs(collection(window.db, 'centros'));
      if (centrosSnap.empty) {
        for (const centro of initialCentros) {
          await setDoc(doc(window.db, 'centros', centro.id.toString()), centro);
        }
      }
      dataStore.centros = centrosSnap.docs.map(doc => doc.data()) || initialCentros;

      // Cargar sacerdotes
      const sacerdotesSnap = await getDocs(collection(window.db, 'sacerdotes'));
      if (sacerdotesSnap.empty) {
        for (const sacerdote of initialSacerdotes) {
          await setDoc(doc(window.db, 'sacerdotes', sacerdote.id.toString()), sacerdote);
        }
      }
      dataStore.sacerdotes = sacerdotesSnap.docs.map(doc => doc.data()) || initialSacerdotes;

      // Cargar usuarios
      const usuariosSnap = await getDocs(collection(window.db, 'usuarios'));
      if (usuariosSnap.empty) {
        for (const usuario of initialUsuarios) {
          await setDoc(doc(window.db, 'usuarios', usuario.id.toString()), usuario);
        }
      }
      dataStore.usuarios = usuariosSnap.docs.map(doc => doc.data()) || initialUsuarios;

      // Cargar plan
      const planSnap = await getDocs(collection(window.db, 'plan'));
      dataStore.plan = {};
      planSnap.forEach(doc => {
        dataStore.plan[doc.id] = doc.data();
      });

    } catch (error) {
      console.error('Error loading data from Firebase:', error);
      // Fallback
      dataStore.centros = getDataFromLocal(STORAGE.centros, initialCentros);
      dataStore.sacerdotes = getDataFromLocal(STORAGE.sacerdotes, initialSacerdotes);
      dataStore.usuarios = getDataFromLocal(STORAGE.usuarios, initialUsuarios);
      dataStore.plan = getDataFromLocal(STORAGE.plan, initialPlan);
    }
  } else {
    // Fallback a localStorage
    dataStore.centros = getDataFromLocal(STORAGE.centros, initialCentros);
    dataStore.sacerdotes = getDataFromLocal(STORAGE.sacerdotes, initialSacerdotes);
    dataStore.usuarios = getDataFromLocal(STORAGE.usuarios, initialUsuarios);
    dataStore.plan = getDataFromLocal(STORAGE.plan, initialPlan);
  }
}

function getDataFromLocal(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) || fallback; } catch { return fallback; }
}

function login(event) {
  event.preventDefault();
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value.trim();
  const usuarios = getData(STORAGE.usuarios);
  const user = usuarios.find((u) => u.correo.toLowerCase() === email.toLowerCase() && u.contraseña === password);

  if (!user) {
    elements.loginError.textContent = 'Usuario o contraseña incorrectos';
    return;
  }

  localStorage.setItem(STORAGE.currentUser, JSON.stringify(user));
  elements.loginError.textContent = '';
  elements.loginForm.reset();
  showMain(user);
}

function logout() {
  localStorage.removeItem(STORAGE.currentUser);
  elements.mainScreen.classList.add('hidden');
  elements.loginScreen.classList.remove('hidden');
  elements.homeView.innerHTML = '';
  elements.subtitle.textContent = '';
}

function showMain(user) {
  elements.loginScreen.classList.add('hidden');
  elements.mainScreen.classList.remove('hidden');
  elements.currentUser.textContent = `${user.nombre} (${user.tipo})`;
  elements.subtitle.textContent = user.tipo === 'centro' ? 'Usuario de centro' : 'Visor de misas de ciudad';

  if (user.tipo === 'administrador') {
    elements.adminTab.classList.remove('hidden');
  } else {
    elements.adminTab.classList.add('hidden');
  }

  renderHome();
}

function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE.currentUser);
  return raw ? JSON.parse(raw) : null;
}

function formatDay(date) {
  const options = { weekday: 'long', day: 'numeric', month: 'numeric' };
  return date.toLocaleDateString('es-ES', options);
}

function getWeekDates(startDate = new Date()) {
  const result = [];
  const current = new Date(startDate);
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(current);
    d.setDate(current.getDate() + i);
    result.push(d);
  }
  return result;
}

function renderHome() {
  const user = getCurrentUser();
  if (!user) return;

  const centros = getData(STORAGE.centros);
  const plan = getData(STORAGE.plan);
  const sacerdotes = getData(STORAGE.sacerdotes);

  const visibleCenters = user.tipo === 'centro' ? centros.filter(c => c.id === user.centroId) : centros;
  const currentDate = homeCalendarState.selectedDate;
  const selectedKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const selectedDay = currentDate.getDate();

  const todayMisas = visibleCenters.map(centro => {
    const sacerdoteId = plan[selectedKey]?.[selectedDay]?.[centro.id] || null;
    const sacerdote = sacerdotes.find(s => s.id === sacerdoteId);
    return {
      centro: centro.nombre,
      sacerdote: sacerdote ? sacerdote.nombre : null,
      hora: (currentDate.getDay() === 0 || currentDate.getDay() === 6) ? centro.horaFinSemana : centro.horaSemana
    };
  });

  const weekDates = getWeekDates(currentDate);
  const weekHtml = weekDates.map(d => {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const key = `${d.getFullYear()}-${String(month).padStart(2, '0')}`;
    const misas = visibleCenters.map(centro => {
      const sacerdoteId = plan[key]?.[day]?.[centro.id] || null;
      const sacerdote = sacerdotes.find(s => s.id === sacerdoteId);
      return {
        centro: centro.nombre,
        sacerdote: sacerdote ? sacerdote.nombre : null
      };
    }).filter(item => item.sacerdote);

    const content = misas.length
      ? misas.map(item => `<li>${item.centro}: <strong>${item.sacerdote}</strong></li>`).join('')
      : '<p class="empty-state">No hay misas programadas.</p>';

    return `
      <article class="week-card">
        <h3>${formatDay(d)}</h3>
        <ul>${content}</ul>
      </article>
    `;
  }).join('');

  const calendarHtml = renderCalendar(homeCalendarState.year, homeCalendarState.month, currentDate);

  const selectedLabel = currentDate.toDateString() === new Date().toDateString()
    ? 'Misas de hoy'
    : `Misas de ${formatDay(currentDate)}`;

  const todayContent = todayMisas.some(m => m.sacerdote)
    ? `<ul>${todayMisas.map(m => `<li>${m.centro} — ${m.hora} — <strong>${m.sacerdote}</strong></li>`).join('')}</ul>`
    : '<p class="empty-state">No hay misas programadas para este día.</p>';

  const printButtonHtml = user.tipo === 'centro'
    ? '<button id="print-center-month" class="secondary">Imprimir misas del mes de mi centro</button>'
    : '<button id="print-all-month" class="secondary">Imprimir misas del mes de todos los centros</button>';

  const html = `
    <section class="home-header card">
      <div>
        <p class="eyebrow">${selectedLabel}</p>
        <h2>${formatDay(currentDate)}</h2>
        ${todayContent}
      </div>
      <div class="home-header-actions">
        ${printButtonHtml}
      </div>
    </section>

    <section class="home-grid">
      <div class="card calendar-card">
        <div class="calendar-header">
          <h3>${new Date(homeCalendarState.year, homeCalendarState.month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
          <div class="calendar-nav">
            <button id="month-prev" class="nav-btn">&#8249;</button>
            <button id="month-next" class="nav-btn">&#8250;</button>
          </div>
        </div>
        ${calendarHtml}
      </div>
      <div class="card week-panel">
        <div class="week-panel-header">
          <h3>Misas semana</h3>
          <span>${formatDay(weekDates[0])} al ${formatDay(weekDates[6])}</span>
        </div>
        <div class="week-list">
          ${weekHtml}
        </div>
      </div>
    </section>
  `;

  elements.homeView.innerHTML = html;

  // Usar event delegation en lugar de listeners directos
  elements.homeView.addEventListener('click', (e) => {
    if (e.target.id === 'month-prev') {
      e.preventDefault();
      changeHomeCalendarMonth(-1);
    }
    if (e.target.id === 'month-next') {
      e.preventDefault();
      changeHomeCalendarMonth(1);
    }
    if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('empty')) {
      const dayNumber = Number(e.target.textContent.trim());
      selectHomeCalendarDay(homeCalendarState.year, homeCalendarState.month, dayNumber);
    }
  });

  // Event listeners para botones de impresión
  const printCenterBtn = document.getElementById('print-center-month');
  const printAllBtn = document.getElementById('print-all-month');
  
  if (printCenterBtn && user.tipo === 'centro') {
    printCenterBtn.addEventListener('click', () => printSchedule(user.centroId));
  }
  if (printAllBtn && user.tipo !== 'centro') {
    printAllBtn.addEventListener('click', () => printSchedule());
  }
}

function renderCalendar(year, month, selectedDate) {
  const daysInMonth = getDaysInMonth(year, month + 1);
  const firstDay = new Date(year, month, 1).getDay();
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  let daysHtml = '';

  for (let i = 0; i < offset; i += 1) {
    daysHtml += '<div class="calendar-day empty"></div>';
  }

  const today = new Date();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isSelected = selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
    daysHtml += `<div class="calendar-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}">${day}</div>`;
  }

  return `
    <div class="calendar-grid">
      ${dayNames.map(name => `<div class="calendar-weekday">${name}</div>`).join('')}
      ${daysHtml}
    </div>
  `;
}

function changeHomeCalendarMonth(delta) {
  const date = new Date(homeCalendarState.year, homeCalendarState.month + delta, 1);
  homeCalendarState.year = date.getFullYear();
  homeCalendarState.month = date.getMonth();
  homeCalendarState.selectedDate = new Date(date.getFullYear(), date.getMonth(), 1);
  renderHome();
}

function selectHomeCalendarDay(year, month, day) {
  homeCalendarState.selectedDate = new Date(year, month, day);
  renderHome();
}

function setupAdminTabs() {
  elements.adminTabs.forEach(button => {
    button.addEventListener('click', () => {
      elements.adminTabs.forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      const target = button.dataset.adminView;
      Object.keys(elements.adminSections).forEach(key => {
        elements.adminSections[key].classList.toggle('hidden', key !== target);
      });

      if (target === 'centros') renderCentros();
      if (target === 'sacerdotes') renderSacerdotes();
      if (target === 'misas') renderMisasMes();
      if (target === 'usuarios') renderUsuarios();
    });
  });
}

function renderCentros() {
  const centros = getData(STORAGE.centros);
  let html = '<h3>Gestión de centros</h3>';
  html += `<button id="add-centro-btn" class="secondary">Añadir centro</button>`;
  html += '<table><thead><tr><th>Nombre</th><th>Ubicación</th><th>Observaciones</th><th>Hora semana</th><th>Hora fin de semana</th><th>Acciones</th></tr></thead><tbody>';

  centros.forEach(centro => {
    html += `<tr><td>${centro.nombre}</td><td>${centro.ubicacion}</td><td>${centro.observaciones}</td><td>${centro.horaSemana}</td><td>${centro.horaFinSemana}</td><td><button class="edit-centro" data-id="${centro.id}">Editar</button><button class="delete-centro" data-id="${centro.id}">Eliminar</button></td></tr>`;
  });

  html += '</tbody></table><div id="centro-form-container"></div>';
  elements.adminSections.centros.innerHTML = html;

  document.getElementById('add-centro-btn').addEventListener('click', () => editCentro(null));
  elements.adminSections.centros.querySelectorAll('.edit-centro').forEach(btn => {
    btn.addEventListener('click', () => editCentro(Number(btn.dataset.id)));
  });
  elements.adminSections.centros.querySelectorAll('.delete-centro').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteCentro(Number(btn.dataset.id));
    });
  });
}

function editCentro(id) {
  const centros = getData(STORAGE.centros);
  const centro = id ? centros.find(c => c.id === id) : { nombre: '', ubicacion: '', observaciones: '', horaSemana: '19:00', horaFinSemana: '12:00' };
  const formHtml = `
    <h4>${id ? 'Editar' : 'Añadir'} centro</h4>
    <form id="centro-form">
      <label>Nombre</label><input name="nombre" value="${centro.nombre || ''}" required />
      <label>Ubicación</label><input name="ubicacion" value="${centro.ubicacion || ''}" required />
      <label>Observaciones</label><input name="observaciones" value="${centro.observaciones || ''}" />
      <label>Hora misa entre semana</label><input name="horaSemana" type="time" value="${centro.horaSemana}" required />
      <label>Hora misa fin de semana</label><input name="horaFinSemana" type="time" value="${centro.horaFinSemana}" required />
      <button type="submit">Guardar</button>
      <button type="button" id="cancel-centro" class="secondary">Cancelar</button>
      <p class="error" id="centro-error"></p>
    </form>`;

  const container = document.getElementById('centro-form-container');
  container.innerHTML = formHtml;

  document.getElementById('cancel-centro').addEventListener('click', () => { container.innerHTML = ''; });
  document.getElementById('centro-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      id: id || Date.now(),
      nombre: form.nombre.value.trim(),
      ubicacion: form.ubicacion.value.trim(),
      observaciones: form.observaciones.value.trim(),
      horaSemana: form.horaSemana.value,
      horaFinSemana: form.horaFinSemana.value
    };
    if (!data.nombre || !data.ubicacion) {
      document.getElementById('centro-error').textContent = 'Nombre y ubicación obligatorios';
      return;
    }

    if (id) {
      const idx = centros.findIndex(c => c.id === id);
      centros[idx] = data;
    } else {
      centros.push(data);
    }

    saveData(STORAGE.centros, centros);
    container.innerHTML = '';
    renderCentros();
  });
}

function deleteCentro(id) {
  if (!confirm('¿Eliminar centro?')) return;
  const centros = getData(STORAGE.centros).filter(c => c.id !== id);
  saveData(STORAGE.centros, centros);
  renderCentros();
}

function renderSacerdotes() {
  const sacerdotes = getData(STORAGE.sacerdotes);
  let html = '<h3>Gestión de sacerdotes</h3>';
  html += '<button id="add-sacerdote-btn" class="secondary">Añadir sacerdote</button>';
  html += '<table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Acciones</th></tr></thead><tbody>';

  sacerdotes.forEach(s => {
    html += `<tr><td>${s.nombre}</td><td>${s.telefono}</td><td><button class="edit-sacerdote" data-id="${s.id}">Editar</button><button class="delete-sacerdote" data-id="${s.id}">Eliminar</button></td></tr>`;
  });
  html += '</tbody></table><div id="sacerdote-form-container"></div>';
  elements.adminSections.sacerdotes.innerHTML = html;

  document.getElementById('add-sacerdote-btn').addEventListener('click', () => editSacerdote(null));
  elements.adminSections.sacerdotes.querySelectorAll('.edit-sacerdote').forEach(btn => {
    btn.addEventListener('click', () => editSacerdote(Number(btn.dataset.id)));
  });
  elements.adminSections.sacerdotes.querySelectorAll('.delete-sacerdote').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('¿Eliminar sacerdote?')) return;
      const restantes = sacerdotes.filter(s => s.id !== Number(btn.dataset.id));
      saveData(STORAGE.sacerdotes, restantes);
      renderSacerdotes();
    });
  });
}

function editSacerdote(id) {
  const sacerdotes = getData(STORAGE.sacerdotes);
  const sacerdote = id ? sacerdotes.find(s => s.id === id) : { nombre: '', telefono: '' };
  const formHtml = `
    <h4>${id ? 'Editar' : 'Añadir'} sacerdote</h4>
    <form id="sacerdote-form">
      <label>Nombre</label><input name="nombre" value="${sacerdote.nombre || ''}" required />
      <label>Teléfono</label><input name="telefono" value="${sacerdote.telefono || ''}" />
      <button type="submit">Guardar</button>
      <button type="button" id="cancel-sacerdote" class="secondary">Cancelar</button>
      <p class="error" id="sacerdote-error"></p>
    </form>`;

  const container = document.getElementById('sacerdote-form-container');
  container.innerHTML = formHtml;

  document.getElementById('cancel-sacerdote').addEventListener('click', () => { container.innerHTML = ''; });
  document.getElementById('sacerdote-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      id: id || Date.now(),
      nombre: form.nombre.value.trim(),
      telefono: form.telefono.value.trim()
    };
    if (!data.nombre) {
      document.getElementById('sacerdote-error').textContent = 'Nombre obligatorio';
      return;
    }

    if (id) {
      const idx = sacerdotes.findIndex(s => s.id === id);
      sacerdotes[idx] = data;
    } else {
      sacerdotes.push(data);
    }

    saveData(STORAGE.sacerdotes, sacerdotes);
    container.innerHTML = '';
    renderSacerdotes();
  });
}

function renderUsuarios() {
  const usuarios = getData(STORAGE.usuarios);
  const centros = getData(STORAGE.centros);

  let html = '<h3>Gestión de usuarios</h3>';
  html += '<button id="add-usuario-btn" class="secondary">Añadir usuario</button>';
  html += '<table><thead><tr><th>Nombre</th><th>Correo</th><th>Centro</th><th>Tipo</th><th>Contraseña</th><th>Acciones</th></tr></thead><tbody>';

  usuarios.forEach(u => {
    const centro = centros.find(c => c.id === u.centroId);
    html += `<tr><td>${u.nombre}</td><td>${u.correo}</td><td>${centro ? centro.nombre : '-'}</td><td>${u.tipo}</td><td>${u.contraseña}</td><td><button class="edit-usuario" data-id="${u.id}">Editar</button><button class="delete-usuario" data-id="${u.id}">Eliminar</button></td></tr>`;
  });

  html += '</tbody></table><div id="usuario-form-container"></div>';
  elements.adminSections.usuarios.innerHTML = html;

  document.getElementById('add-usuario-btn').addEventListener('click', () => editUsuario(null));
  elements.adminSections.usuarios.querySelectorAll('.edit-usuario').forEach(btn => {
    btn.addEventListener('click', () => editUsuario(Number(btn.dataset.id)));
  });
  elements.adminSections.usuarios.querySelectorAll('.delete-usuario').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('¿Eliminar usuario?')) return;
      const restantes = usuarios.filter(u => u.id !== Number(btn.dataset.id));
      saveData(STORAGE.usuarios, restantes);
      renderUsuarios();
    });
  });
}

function editUsuario(id) {
  const usuarios = getData(STORAGE.usuarios);
  const centros = getData(STORAGE.centros);
  const usuario = id ? usuarios.find(u => u.id === id) : { nombre: '', correo: '', contraseña: '', tipo: 'centro', centroId: centros[0]?.id || null };

  let centroOptions = '<option value="">-</option>';
  centros.forEach(c => {
    centroOptions += `<option value="${c.id}" ${usuario.centroId === c.id ? 'selected' : ''}>${c.nombre}</option>`;
  });

  const formHtml = `
    <h4>${id ? 'Editar' : 'Añadir'} usuario</h4>
    <form id="usuario-form">
      <label>Nombre</label><input name="nombre" value="${usuario.nombre || ''}" required />
      <label>Correo</label><input name="correo" type="email" value="${usuario.correo || ''}" required />
      <label>Contraseña</label><input name="contraseña" type="text" value="${usuario.contraseña || ''}" required />
      <label>Tipo</label>
      <select name="tipo" required>
        <option value="administrador" ${usuario.tipo === 'administrador' ? 'selected' : ''}>administrador</option>
        <option value="centro" ${usuario.tipo === 'centro' ? 'selected' : ''}>centro</option>
        <option value="sacerdote" ${usuario.tipo === 'sacerdote' ? 'selected' : ''}>sacerdote</option>
      </select>
      <label>Centro</label>
      <select name="centroId">${centroOptions}</select>
      <button type="submit">Guardar</button>
      <button type="button" id="cancel-usuario" class="secondary">Cancelar</button>
      <p class="error" id="usuario-error"></p>
    </form>`;

  const container = document.getElementById('usuario-form-container');
  container.innerHTML = formHtml;

  document.getElementById('cancel-usuario').addEventListener('click', () => { container.innerHTML = ''; });
  document.getElementById('usuario-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      id: id || Date.now(),
      nombre: form.nombre.value.trim(),
      correo: form.correo.value.trim(),
      contraseña: form.contraseña.value.trim(),
      tipo: form.tipo.value,
      centroId: form.centroId.value ? Number(form.centroId.value) : null
    };

    if (!data.nombre || !data.correo || !data.contraseña) {
      document.getElementById('usuario-error').textContent = 'Todos los campos obligatorios';
      return;
    }

    if (data.tipo !== 'centro') data.centroId = null;

    if (id) {
      const idx = usuarios.findIndex(u => u.id === id);
      usuarios[idx] = data;
    } else {
      usuarios.push(data);
    }

    saveData(STORAGE.usuarios, usuarios);
    container.innerHTML = '';
    renderUsuarios();
  });
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function renderMisasMes() {
  const centros = getData(STORAGE.centros);
  const sacerdotes = getData(STORAGE.sacerdotes);
  const plan = getData(STORAGE.plan);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const days = getDaysInMonth(year, month);

  let html = `<h3>Gestión misas del mes</h3>`;
  html += '<label>Mes</label><input id="mes-input" type="month" value="' + `${year}-${String(month).padStart(2, '0')}` + '" />';
  html += '<button id="load-mesas-btn" class="secondary">Cargar mes</button>';
  html += '<table id="misas-table"><thead><tr><th>Día</th>';
  centros.forEach(c => html += `<th>${c.nombre}</th>`);
  html += '</tr></thead><tbody>';

  for (let d = 1; d <= days; d += 1) {
    html += `<tr><td>${d}</td>`;
    centros.forEach(c => {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const assigned = plan[key]?.[d]?.[c.id] || '';
      html += '<td><select data-dia="' + d + '" data-centro="' + c.id + '" data-previous-value="' + assigned + '">';
      html += '<option value="">--</option>';
      sacerdotes.forEach(s => {
        html += `<option value="${s.id}" ${s.id == assigned ? 'selected' : ''}>${s.nombre}</option>`;
      });
      html += '</select></td>';
    });
    html += '</tr>';
  }

  html += '</tbody></table>';
  html += '<button id="save-misas-btn">Guardar mes</button> <button id="print-misas-btn" class="secondary">Imprimir tabla</button>';
  html += '<p class="error" id="misas-error"></p>';
  elements.adminSections.misas.innerHTML = html;

  // Inicializar selects
  document.querySelectorAll('#misas-table tbody tr').forEach(row => updateSelectsForDay(row, sacerdotes));

  document.querySelectorAll('#misas-table select').forEach(select => {
    select.addEventListener('change', (e) => {
      const row = e.target.closest('tr');
      updateSelectsForDay(row, sacerdotes);
    });
  });

  document.getElementById('load-mesas-btn').addEventListener('click', () => renderMisasMes());
  document.getElementById('save-misas-btn').addEventListener('click', () => saveMisasMonth());
  document.getElementById('print-misas-btn').addEventListener('click', () => printSchedule());
}

function updateSelectsForDay(row, sacerdotes) {
  const selects = Array.from(row.querySelectorAll('select'));
  const assigned = new Set();

  // Recopilar sacerdotes ya asignados en esta fila
  selects.forEach(select => {
    if (select.value) assigned.add(select.value);
  });

  // Para cada select, actualizar opciones
  selects.forEach(select => {
    const currentValue = select.value;
    // Limpiar opciones excepto la vacía y la seleccionada
    const options = select.querySelectorAll('option');
    options.forEach(option => {
      if (option.value === '' || option.value === currentValue) return;
      if (assigned.has(option.value) && option.value !== currentValue) {
        option.style.display = 'none';
      } else {
        option.style.display = '';
      }
    });
  });
}

function updateMisasValidation() {
  const errorElement = document.getElementById('misas-error');
  if (!errorElement) return;

  const rows = document.querySelectorAll('#misas-table tbody tr');
  let errorMessage = '';

  rows.forEach(row => {
    const assigned = {};
    row.querySelectorAll('select').forEach(select => {
      const value = select.value;
      if (!value) return;
      assigned[value] = assigned[value] || 0;
      assigned[value] += 1;
    });

    const duplicate = Object.values(assigned).some(count => count > 1);
    if (duplicate) {
      errorMessage = 'Un mismo sacerdote no puede estar asignado en más de un centro el mismo día.';
    }
  });

  errorElement.textContent = errorMessage;
}

function saveMisasMonth() {
  const centros = getData(STORAGE.centros);
  const plan = getData(STORAGE.plan);

  const monthInput = document.getElementById('mes-input').value;
  if (!monthInput) return;

  const [year, month] = monthInput.split('-').map(Number);
  const days = getDaysInMonth(year, month);
  const key = `${year}-${String(month).padStart(2, '0')}`;

  if (!plan[key]) plan[key] = {};

  for (let d = 1; d <= days; d += 1) {
    if (!plan[key][d]) plan[key][d] = {};
    centros.forEach(c => {
      const select = document.querySelector(`select[data-dia="${d}"][data-centro="${c.id}"]`);
      if (select) {
        plan[key][d][c.id] = select.value ? Number(select.value) : null;
      }
    });
  }

  saveData(STORAGE.plan, plan);
  alert('Misas del mes guardadas');
}

function renderAdminTab() {
  renderCentros();
  setupAdminTabs();
}

function printSchedule(centroId = null) {
  const plan = getData(STORAGE.plan);
  const centros = getData(STORAGE.centros);
  const sacerdotes = getData(STORAGE.sacerdotes);

  const monthInput = document.getElementById('mes-input') ? document.getElementById('mes-input').value : null;
  const now = new Date();
  const monthYear = monthInput || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, month] = monthYear.split('-').map(Number);
  const days = getDaysInMonth(year, month);

  let printHtml = `<h2>Misas del mes ${month}/${year}</h2>`;
  printHtml += '<table><thead><tr><th>Día</th>';

  const filteredCenters = centroId ? centros.filter(c => c.id === centroId) : centros;
  filteredCenters.forEach(c => (printHtml += `<th>${c.nombre}</th>`));
  printHtml += '</tr></thead><tbody>';

  for (let d = 1; d <= days; d += 1) {
    printHtml += `<tr><td>${d}</td>`;
    filteredCenters.forEach(c => {
      const assigned = plan[monthYear]?.[d]?.[c.id] || null;
      const sacerdote = sacerdotes.find(s => s.id === assigned);
      const text = sacerdote ? sacerdote.nombre : '';
      printHtml += `<td>${text}</td>`;
    });
    printHtml += '</tr>';
  }

  printHtml += '</tbody></table>';

  if (centroId) {
    const theCenter = centros.find(c => c.id === centroId);
    printHtml = `<h2>Misas mes de ${theCenter?.nombre || 'Centro'}</h2>` + printHtml;
  }

  elements.printContainer.innerHTML = printHtml;
  elements.printContainer.classList.remove('hidden');
  window.print();
  elements.printContainer.classList.add('hidden');
}

function bindEvents() {
  elements.loginForm.addEventListener('submit', login);
  elements.logoutBtn.addEventListener('click', logout);
  elements.viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.view === 'home') {
        elements.homeView.classList.remove('hidden');
        elements.adminView.classList.add('hidden');
        renderHome();
      } else if (btn.dataset.view === 'admin') {
        elements.homeView.classList.add('hidden');
        elements.adminView.classList.remove('hidden');
        renderAdminTab();
      }
    });
  });

  elements.printHome.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) return;
    if (user.tipo === 'centro') {
      printSchedule(user.centroId);
    } else {
      printSchedule();
    }
  });
}

async function initApp() {
  await initData();
  bindEvents();

  const currentUser = getCurrentUser();
  if (currentUser) {
    showMain(currentUser);
  }
}

initApp();
