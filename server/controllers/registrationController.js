const { supabaseAdmin } = require('../config/supabase');
const { getUserFromRequest } = require('../utils/auth');
const { applyTeamSelection, getUserTeam } = require('../services/teamService');

async function createRegistration(req, res) {
  const { user, error: authError } = await getUserFromRequest(req);

  if (authError) {
    return res.status(401).json({ success: false, error: authError });
  }

  const {
    phone,
    age,
    gender,
    college_university,
    major,
    year_of_study,
    level_of_study,
    team_status,
    intended_track,
    tshirt_size,
    dietary_restrictions,
    referral_source,
    additional_info,
    terms_accepted,
    team_name,
    team_id,
  } = req.body || {};

  const parsedAge = Number(age);

  if (!phone || !Number.isInteger(parsedAge)) {
    return res.status(400).json({ success: false, error: 'Phone and valid age are required.' });
  }

  if (!college_university || !major || !team_status || !intended_track || !tshirt_size) {
    return res.status(400).json({
      success: false,
      error: 'School, major, team status, intended track, and T-shirt size are required.',
    });
  }

  if (terms_accepted !== true) {
    return res.status(400).json({ success: false, error: 'Terms must be accepted.' });
  }

  const { data: registration, error: registrationError } = await supabaseAdmin
    .from('registrations')
    .insert({
      user_id: user.id,
      event_year: 2027,
      phone: String(phone).trim(),
      age: parsedAge,
      gender: gender || null,
      college_university: String(college_university).trim(),
      major: String(major).trim(),
      year_of_study: year_of_study || null,
      level_of_study: level_of_study || null,
      team_status,
      intended_track,
      tshirt_size,
      dietary_restrictions: dietary_restrictions || null,
      referral_source: referral_source || null,
      additional_info: additional_info || null,
      terms_accepted,
    })
    .select('id, user_id, event_year')
    .single();

  if (registrationError) {
    return res.status(400).json({
      success: false,
      error: registrationError.message,
    });
  }

  try {
    const team = await applyTeamSelection(user.id, team_status, {
      teamName: team_name,
      teamId: team_id,
    });

    return res.status(201).json({
      success: true,
      registration,
      team,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: error.message || 'Team could not be saved.',
    });
  }
}

async function updateRegistration(req, res) {
  const { user, error: authError } = await getUserFromRequest(req);

  if (authError) {
    return res.status(401).json({ success: false, error: authError });
  }

  const {
    first_name,
    last_name,
    phone,
    age,
    gender,
    college_university,
    major,
    year_of_study,
    level_of_study,
    team_status,
    intended_track,
    tshirt_size,
    dietary_restrictions,
    referral_source,
    additional_info,
    team_name,
    team_id,
  } = req.body || {};

  const profileUpdates = {};
  const updates = {};

  if (first_name !== undefined) {
    const firstName = String(first_name).trim();
    if (!firstName) return res.status(400).json({ success: false, error: 'First name is required.' });
    profileUpdates.first_name = firstName;
  }

  if (last_name !== undefined) {
    const lastName = String(last_name).trim();
    if (!lastName) return res.status(400).json({ success: false, error: 'Last name is required.' });
    profileUpdates.last_name = lastName;
  }

  if (phone !== undefined) {
    const trimmedPhone = String(phone).trim();
    if (!trimmedPhone) return res.status(400).json({ success: false, error: 'Phone is required.' });
    updates.phone = trimmedPhone;
  }

  if (age !== undefined) {
    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge)) {
      return res.status(400).json({ success: false, error: 'Valid age is required.' });
    }
    updates.age = parsedAge;
  }

  if (gender !== undefined) updates.gender = gender || null;
  if (college_university !== undefined) {
    const school = String(college_university).trim();
    if (!school) return res.status(400).json({ success: false, error: 'School is required.' });
    updates.college_university = school;
  }
  if (major !== undefined) {
    const trimmedMajor = String(major).trim();
    if (!trimmedMajor) return res.status(400).json({ success: false, error: 'Major is required.' });
    updates.major = trimmedMajor;
  }
  if (year_of_study !== undefined) updates.year_of_study = year_of_study || null;
  if (level_of_study !== undefined) updates.level_of_study = level_of_study || null;
  if (team_status !== undefined) updates.team_status = team_status;
  if (intended_track !== undefined) updates.intended_track = intended_track;
  if (tshirt_size !== undefined) updates.tshirt_size = tshirt_size;
  if (dietary_restrictions !== undefined) updates.dietary_restrictions = dietary_restrictions || null;
  if (referral_source !== undefined) updates.referral_source = referral_source || null;
  if (additional_info !== undefined) updates.additional_info = additional_info || null;

  if (Object.keys(profileUpdates).length === 0 && Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'No registration updates provided.' });
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('user_id', user.id);

    if (profileError) {
      return res.status(400).json({
        success: false,
        error: profileError.message,
      });
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: registrationError } = await supabaseAdmin
      .from('registrations')
      .update(updates)
      .eq('user_id', user.id)
      .eq('event_year', 2027);

    if (registrationError) {
      return res.status(400).json({
        success: false,
        error: registrationError.message,
      });
    }
  }

  let team = null;
  if (team_status !== undefined) {
    try {
      team = await applyTeamSelection(user.id, team_status, {
        teamName: team_name,
        teamId: team_id,
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Team could not be saved.',
      });
    }
  } else {
    try {
      team = await getUserTeam(user.id);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Team could not be loaded.',
      });
    }
  }

  const { data: profile, error: savedProfileError } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single();

  if (savedProfileError) {
    return res.status(400).json({
      success: false,
      error: savedProfileError.message,
    });
  }

  const { data: registration, error: savedRegistrationError } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('event_year', 2027)
    .single();

  if (savedRegistrationError) {
    return res.status(400).json({
      success: false,
      error: savedRegistrationError.message,
    });
  }

  return res.json({
    success: true,
    profile,
    registration,
    team,
  });
}

module.exports = {
  createRegistration,
  updateRegistration,
};
