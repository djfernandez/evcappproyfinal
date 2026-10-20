const { supabase, isConfigured, memoryStore } = require('../config/supabase');

const authenticateUser = async (req, res, next) => {
  if (isConfigured) {
    const authorization = req.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'Debes iniciar sesión para continuar.' });
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !authData.user) {
        return res.status(401).json({ success: false, message: 'La sesión no es válida o ha expirado.' });
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) {
        return res.status(403).json({ success: false, message: 'La cuenta no tiene un perfil de Nexus asignado.' });
      }

      req.user = profile;
      return next();
    } catch (error) {
      console.error('Error verificando sesión de Supabase:', error.message);
      return res.status(500).json({ success: false, message: 'No se pudo verificar la sesión.' });
    }
  }

  // Headers de rol solo se permiten en el almacenamiento local de demostración.
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (userId) {
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
