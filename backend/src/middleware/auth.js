const { supabase, isConfigured, memoryStore } = require('../config/supabase');

const authenticateUser = async (req, res, next) => {
  // Soporta headers: x-user-id o x-user-role para testing y sesión activa
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (userId) {
    if (isConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          req.user = data;
          return next();
        }
      } catch (err) {
        console.error('Error verificando usuario en Supabase:', err.message);
      }
    }

    const localUser = memoryStore.profiles.find(p => p.id === userId);
    if (localUser) {
      req.user = localUser;
      return next();
    }
  }

  // Si se envió un rol por header de simulación
  if (userRole) {
    const userByRole = memoryStore.profiles.find(p => p.role === userRole) || {
      id: 'demo-user-id',
      email: `${userRole}@nexussac.pe`,
      full_name: `Usuario ${userRole}`,
      role: userRole
    };
    req.user = userByRole;
    return next();
  }

  // Usuario predeterminado si no se envía header (vendedor)
  req.user = memoryStore.profiles[0];
  next();
};

const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`
      });
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  requireRole
};
