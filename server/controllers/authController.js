const { supabaseAuth, supabaseAdmin } = require('../config/supabase');

async function signup(req, res) {
  const { email, password, first_name, last_name } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const firstName = typeof first_name === 'string' ? first_name.trim() : '';
  const lastName = typeof last_name === 'string' ? last_name.trim() : '';

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ success: false, error: 'A valid email is required.' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ success: false, error: 'First name and last name are required.' });
  }

  const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (authError || !authData.user) {
    return res.status(400).json({
      success: false,
      error: authError?.message || 'Could not create user.',
    });
  }

  const userId = authData.user.id;
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
    });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);

    return res.status(500).json({
      success: false,
      error: 'User was created, but profile creation failed.',
      details: profileError.message,
    });
  }

  return res.status(201).json({
    success: true,
    user: {
      id: userId,
      email: authData.user.email,
      first_name: firstName,
      last_name: lastName,
      email_confirmed: Boolean(authData.user.email_confirmed_at),
    },
    session: authData.session ? {
      access_token: authData.session.access_token,
      expires_at: authData.session.expires_at,
    } : null,
  });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (authError || !authData.user || !authData.session) {
    return res.status(401).json({
      success: false,
      error: authError?.message || 'Invalid email or password.',
    });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', authData.user.id)
    .single();

  if (profileError) {
    return res.status(500).json({
      success: false,
      error: 'Login succeeded, but profile could not be loaded.',
      details: profileError.message,
    });
  }

  return res.json({
    success: true,
    token: authData.session.access_token,
    expiresAt: authData.session.expires_at ? authData.session.expires_at * 1000 : null,
    user: {
      id: authData.user.id,
      email: authData.user.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
    },
  });
}

module.exports = {
  signup,
  login,
};
