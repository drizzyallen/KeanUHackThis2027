const { getUserFromRequest } = require('../utils/auth');
const { deleteCreatedTeam, getUserTeam, listTeams, removeTeamMember } = require('../services/teamService');

async function getTeams(req, res) {
  try {
    const teams = await listTeams();
    return res.json({ success: true, teams });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Teams could not be loaded.',
    });
  }
}

async function getMyTeam(req, res) {
  const { user, error: authError } = await getUserFromRequest(req);

  if (authError) {
    return res.status(401).json({ success: false, error: authError });
  }

  try {
    const team = await getUserTeam(user.id);
    return res.json({ success: true, team });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Team could not be loaded.',
    });
  }
}

async function deleteTeamMember(req, res) {
  const { user, error: authError } = await getUserFromRequest(req);

  if (authError) {
    return res.status(401).json({ success: false, error: authError });
  }

  try {
    const team = await removeTeamMember({
      teamId: req.params.teamId,
      memberUserId: req.params.userId,
      requesterUserId: user.id,
    });

    return res.json({ success: true, team });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: error.message || 'Team member could not be removed.',
    });
  }
}

async function deleteMyTeam(req, res) {
  const { user, error: authError } = await getUserFromRequest(req);

  if (authError) {
    return res.status(401).json({ success: false, error: authError });
  }

  try {
    await deleteCreatedTeam(user.id);
    return res.json({ success: true, team: null });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: error.message || 'Team could not be deleted.',
    });
  }
}

module.exports = {
  deleteMyTeam,
  deleteTeamMember,
  getMyTeam,
  getTeams,
};
