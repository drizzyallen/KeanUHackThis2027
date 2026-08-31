const { supabaseAdmin } = require('../config/supabase');
const { getUserFromRequest } = require('../utils/auth');
const { getUserTeam } = require('../services/teamService');

async function getCurrentUser(req, res) {
  const { user, error: authError } = await getUserFromRequest(req);

  if (authError) {
    return res.status(401).json({ success: false, error: authError });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    return res.status(500).json({
      success: false,
      error: 'Profile could not be loaded.',
      details: profileError.message,
    });
  }

  const { data: registration, error: registrationError } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('event_year', 2027)
    .maybeSingle();

  if (registrationError) {
    return res.status(500).json({
      success: false,
      error: 'Registration could not be loaded.',
      details: registrationError.message,
    });
  }

  let team = null;
  try {
    team = await getUserTeam(user.id);
  } catch (teamError) {
    return res.status(500).json({
      success: false,
      error: 'Team could not be loaded.',
      details: teamError.message,
    });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
    },
    registration,
    team,
  });
}

module.exports = {
  getCurrentUser,
};
