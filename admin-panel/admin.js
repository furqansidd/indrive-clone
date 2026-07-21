const API = window.location.origin + '/api';
let token = localStorage.getItem('admin_token') || '';

function authHeaders() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.user.role !== 'admin') throw new Error('This account is not an admin');
    token = data.token;
    localStorage.setItem('admin_token', token);
    showDashboard();
  } catch (err) {
    document.getElementById('login-error').textContent = err.message;
  }
}

function logout() {
  localStorage.removeItem('admin_token');
  token = '';
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
}

function closePanel(id) {
  document.getElementById(id).classList.add('hidden');
}

async function showDashboard() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  await Promise.all([loadStats(), loadDrivers(), loadUsers(), loadRides()]);
}

async function loadStats() {
  const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
  const s = await res.json();
  const cards = [
    ['Riders', s.totalUsers],
    ['Drivers', s.totalDrivers],
    ['Pending Docs', s.pendingDrivers],
    ['Total Rides', s.totalRides],
    ['Completed', s.completedRides],
    ['Gross Revenue', `Rs. ${(s.totalRevenue || 0).toFixed(2)}`],
    ['Platform Commission', `Rs. ${(s.totalCommissionRevenue || 0).toFixed(2)}`],
    ['Active Rides', s.activeRides],
  ];
  document.getElementById('stats').innerHTML = cards
    .map(([label, value]) => `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join('');
}

async function loadDrivers() {
  const res = await fetch(`${API}/admin/drivers`, { headers: authHeaders() });
  const drivers = await res.json();
  document.querySelector('#drivers-table tbody').innerHTML = drivers
    .map((d) => {
      const doc = (f) =>
        d.documents?.[f]?.url ? `<a href="${d.documents[f].url}" target="_blank">view</a>` : '—';
      const vt = d.vehicle?.type || '—';
      const vmm = [d.vehicle?.make, d.vehicle?.model].filter(Boolean).join(' ') || '—';
      const plate = d.vehicle?.plateNumber || '—';
      return `<tr>
        <td>${d.user?.name || '—'}</td>
        <td>${d.user?.phone || '—'}</td>
        <td style="text-transform:capitalize">${vt}</td>
        <td>${vmm}</td>
        <td><code>${plate}</code></td>
        <td>${doc('license')}</td>
        <td>${doc('registration')}</td>
        <td>${doc('insurance')}</td>
        <td><span class="badge ${d.verificationStatus}">${d.verificationStatus}</span></td>
        <td>
          <button class="btn-sm btn-approve" onclick="verifyDriver('${d._id}','approved')">Approve</button>
          <button class="btn-sm btn-reject" onclick="verifyDriver('${d._id}','rejected')">Reject</button>
          <button class="btn-sm" onclick="loadDriverRideHistory('${d._id}', '${d.user?.name || 'Driver'}')">Rides</button>
        </td>
      </tr>`;
    })
    .join('');
}

async function verifyDriver(id, decision) {
  await fetch(`${API}/admin/drivers/${id}/verify`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ decision }),
  });
  loadDrivers();
  loadStats();
}

async function loadUsers() {
  const res = await fetch(`${API}/admin/users`, { headers: authHeaders() });
  const users = await res.json();
  document.querySelector('#users-table tbody').innerHTML = users
    .map(
      (u) => `<tr>
        <td>${u.name}</td><td>${u.email}</td><td>${u.phone}</td><td>${u.role}</td>
        <td>${u.isActive !== false ? 'Yes' : 'No'}</td>
        <td><button class="btn-sm ${u.isActive !== false ? 'btn-reject' : 'btn-approve'}" onclick="toggleUser('${u._id}', ${!(u.isActive !== false)})">${u.isActive !== false ? 'Suspend' : 'Activate'}</button></td>
        <td>${u.role === 'rider' ? `<button class="btn-sm" onclick="loadRiderRideHistory('${u._id}', '${u.name}')">View Rides</button>` : '—'}</td>
      </tr>`
    )
    .join('');
}

async function toggleUser(id, isActive) {
  await fetch(`${API}/admin/users/${id}/suspend`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });
  loadUsers();
}

// --- Rider Ride History Drill-Down ---
async function loadRiderRideHistory(riderId, name) {
  const res = await fetch(`${API}/admin/rides?riderId=${riderId}`, { headers: authHeaders() });
  const rides = await res.json();
  document.getElementById('rider-history-title').textContent = `Rides by ${name}`;
  document.querySelector('#rider-rides-table tbody').innerHTML = renderRideRows(rides);
  document.getElementById('rider-history-panel').classList.remove('hidden');
}

// --- Driver Ride History Drill-Down ---
async function loadDriverRideHistory(driverId, name) {
  const res = await fetch(`${API}/admin/rides?driverId=${driverId}`, { headers: authHeaders() });
  const rides = await res.json();
  document.getElementById('driver-history-title').textContent = `Rides by Driver ${name}`;
  document.querySelector('#driver-rides-table tbody').innerHTML = renderRideRows(rides);
  document.getElementById('driver-history-panel').classList.remove('hidden');
}

function renderRideRows(rides) {
  if (!rides.length) return '<tr><td colspan="6" style="text-align:center;color:#999">No rides found</td></tr>';
  return rides.map((r) => `<tr>
    <td>${new Date(r.createdAt).toLocaleString()}</td>
    <td>${r.pickup?.address || '—'}</td>
    <td>${r.dropoff?.address || '—'}</td>
    <td>${r.agreedFare != null ? 'Rs. ' + r.agreedFare.toFixed(2) : '—'}</td>
    <td>${r.commission != null && r.commission > 0 ? 'Rs. ' + r.commission.toFixed(2) : '—'}</td>
    <td><span class="badge ${r.status === 'completed' ? 'approved' : r.status === 'cancelled' ? 'rejected' : 'pending'}">${r.status}</span></td>
  </tr>`).join('');
}

async function loadRides(driverIdFilter) {
  const url = driverIdFilter ? `${API}/admin/rides?driverId=${driverIdFilter}` : `${API}/admin/rides`;
  const res = await fetch(url, { headers: authHeaders() });
  const rides = await res.json();
  document.querySelector('#rides-table tbody').innerHTML = rides
    .map(
      (r) => `<tr>
        <td>${r.rider?.name || '—'}</td>
        <td>${r.driver?.user?.name || '—'}</td>
        <td>${r.pickup?.address || '—'}</td>
        <td>${r.dropoff?.address || '—'}</td>
        <td>${r.agreedFare != null ? 'Rs. ' + r.agreedFare.toFixed(2) : '—'}</td>
        <td>${r.commission != null && r.commission > 0 ? 'Rs. ' + r.commission.toFixed(2) : '—'}</td>
        <td>${r.driverPayout != null && r.driverPayout > 0 ? 'Rs. ' + r.driverPayout.toFixed(2) : '—'}</td>
        <td>${r.paymentMethod || 'cash'}</td>
        <td><span class="badge ${r.status === 'completed' ? 'approved' : r.status === 'cancelled' ? 'rejected' : 'pending'}">${r.status}</span></td>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
      </tr>`
    )
    .join('');
}

async function applyRidesFilter() {
  const driverId = document.getElementById('rides-filter-driver').value.trim();
  await loadRides(driverId || null);
}

async function clearRidesFilter() {
  document.getElementById('rides-filter-driver').value = '';
  await loadRides();
}

// Auto-login if token already saved
if (token) showDashboard().catch(() => logout());
