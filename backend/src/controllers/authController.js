const { supabase, isConfigured, memoryStore } = require('../config/supabase');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'El correo electrónico es requerido' });
    }

    // Normalización de email y soporte de alias (admin, administrador, supervisor, vendedor)
    const rawInput = email.trim().toLowerCase();
    let normalizedEmail = rawInput;

    if (rawInput === 'admin' || rawInput === 'administrador' || rawInput === 'admin@nexussac.pe' || rawInput === 'administrador@nexussac.pe') {
      normalizedEmail = 'admin@nexussac.pe';
    } else if (rawInput === 'supervisor' || rawInput === 'supervisor@nexussac.pe' || rawInput.includes('elena')) {
      normalizedEmail = 'supervisor@nexussac.pe';
    } else if (rawInput === 'vendedor' || rawInput === 'vendedor@nexussac.pe' || rawInput.includes('carlos')) {
      normalizedEmail = 'vendedor@nexussac.pe';
    }

    // Si Supabase Auth está configurado con usuario real
    if (isConfigured && password) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (!authError && authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          return res.json({
            success: true,
            user: profile || { id: authData.user.id, email: authData.user.email, role: 'vendedor' },
            token: authData.session?.access_token || 'supabase-token'
          });
        }
      } catch (err) {
        console.warn('Fallo login Supabase Auth, intentando coincidencia en profiles:', err.message);
      }
    }

    // Búsqueda en profiles (en Supabase o en memoryStore)
    if (isConfigured) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${normalizedEmail},email.eq.${rawInput}`)
        .single();

      if (!error && profile) {
        return res.json({
          success: true,
          user: profile,
          token: `token-${profile.id}`
        });
      }
    }

    // Modo local / demo: encontrar por email normalizado o rol
    const localUser = memoryStore.profiles.find(
      p => p.email.toLowerCase() === normalizedEmail ||
           p.email.toLowerCase() === rawInput ||
           p.role.toLowerCase() === rawInput
    );

    if (localUser) {
      return res.json({
        success: true,
        user: localUser,
        token: `token-${localUser.id}`
      });
    }

    // Si no coincide con ninguna cuenta conocida
    return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas. Usa una de las cuentas disponibles: vendedor@nexussac.pe, supervisor@nexussac.pe o admin@nexussac.pe'
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error interno en el servidor de autenticación' });
  }
};

const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

const getDemoUsers = async (req, res) => {
  if (isConfigured) {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data && data.length > 0) {
        return res.json({ success: true, users: data });
      }
    } catch (err) {
      console.warn('Error trayendo perfiles de Supabase:', err.message);
    }
  }

  res.json({
    success: true,
    users: memoryStore.profiles
  });
};

module.exports = {
  login,
  getMe,
  getDemoUsers
};
