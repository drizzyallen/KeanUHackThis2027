const { supabaseAuth, supabaseAdmin } = require('../config/supabase');

function requireSupabase(req, res, next) {
  if (!supabaseAuth || !supabaseAdmin) {
    return res.status(500).json({
      success: false,
      error: 'Supabase environment variables are not configured.',
    });
  }

  return next();
}

module.exports = requireSupabase;
