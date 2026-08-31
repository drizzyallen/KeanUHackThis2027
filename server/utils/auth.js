const { supabaseAuth } = require('../config/supabase');

function getBearerToken(req) {
  const authHeader = req.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
}

async function getUserFromRequest(req) {
  const token = getBearerToken(req);

  if (!token) {
    return { error: 'Missing access token.' };
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return { error: error?.message || 'Invalid access token.' };
  }

  return { user: data.user };
}

module.exports = {
  getBearerToken,
  getUserFromRequest,
};
