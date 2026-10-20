// ==========================================================
// NEXUS SAC - GESTOR DE AUTENTICACIÓN Y ROLES
// ==========================================================

const Auth = {
  defaultUsers: [
    { id: '11111111-1111-1111-1111-111111111111', email: 'vendedor@nexussac.pe', full_name: 'Carlos Mendoza (Ventas)', role: 'vendedor' },
    { id: '22222222-2222-2222-2222-222222222222', email: 'supervisor@nexussac.pe', full_name: 'Elena Ramos (Supervisora Comercial)', role: 'supervisor' },
    { id: '33333333-3333-3333-3333-333333333333', email: 'admin@nexussac.pe', full_name: 'Administrador Nexus SAC', role: 'administrador' }
  ],

  getCurrentUser() {
    const raw = localStorage.getItem('nexus_user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        this.updateUserUI(user);
        return user;
      } catch (e) {
        console.error('Error parsing stored user', e);
      }
    }

    // Si estamos en index.html y no hay usuario autenticado, redirigir a login.html
    const isLoginPage = window.location.pathname.endsWith('login.html');
    if (!isLoginPage) {
      window.location.href = 'login.html';
      return null;
    }

    return null;
  },

  setCurrentUser(user, token = '') {
    localStorage.setItem('nexus_user', JSON.stringify(user));
    if (window.API?.usesSupabase) {
      localStorage.removeItem('nexus_token');
    } else {
      localStorage.setItem('nexus_token', token || localStorage.getItem('nexus_token') || `token-${user.id}`);
    }
    this.updateUserUI(user);
  },

  switchRole(role) {
    if (window.API?.usesSupabase) {
      UI.showToast('El rol se determina por tu perfil de Supabase.', 'warning');
      return;
    }
    const user = this.defaultUsers.find(u => u.role === role) || this.defaultUsers[0];
    this.setCurrentUser(user);
    if (window.App) {
      window.App.onRoleChanged(user);
    }
    UI.showToast(`Rol cambiado a: ${user.role.toUpperCase()} (${user.full_name})`, 'info');
  },

  async logout() {
    try {
      if (window.API?.usesSupabase) await API.logout();
    } catch (error) {
      console.error('Error al cerrar sesión de Supabase:', error);
      UI.showToast(`No se pudo cerrar la sesión: ${error.message}`, 'error');
      return;
    }
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_token');
    window.location.href = 'login.html';
  },

  updateUserUI(user) {
    const nameEl = document.getElementById('current-user-name');
    const roleBadgeEl = document.getElementById('current-user-role-badge');
    const avatarEl = document.getElementById('current-user-avatar');

    if (nameEl) nameEl.textContent = user.full_name;
    if (roleBadgeEl) {
      roleBadgeEl.textContent = user.role;
      roleBadgeEl.className = `user-role-badge role-${user.role}`;
    }
    if (avatarEl) {
      const initials = user.full_name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('');
      avatarEl.textContent = initials || 'NX';
    }

    // Controlar visibilidad de pestañas según rol
    const approvalsTab = document.querySelector('[data-view="approvals"]');
    if (approvalsTab) {
      if (user.role === 'vendedor') {
        approvalsTab.style.display = 'none';
      } else {
        approvalsTab.style.display = 'flex';
      }
    }

    // Regla de Negocio: Solo el administrador puede modificar catálogos maestros (Productos, Clientes, Tarifas)
    const isAdmin = user.role === 'administrador';
    document.querySelectorAll('.admin-only-action').forEach(el => {
      const tableCell = el.tagName === 'TD' || el.tagName === 'TH';
      el.style.display = isAdmin ? (tableCell ? 'table-cell' : 'inline-flex') : 'none';
    });
    document.querySelectorAll('.non-admin-notice').forEach(el => {
      el.style.display = isAdmin ? 'none' : 'inline-flex';
    });
  },

  hasRole(allowedRoles = []) {
    const user = this.getCurrentUser();
    return user && allowedRoles.includes(user.role);
  }
};
