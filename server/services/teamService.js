const { supabaseAdmin } = require('../config/supabase');

const TEAM_MAX_MEMBERS = 4;
const EVENT_YEAR = 2027;

function fullName(profile) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
}

async function getAuthEmail(userId) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email || null;
}

async function getProfilesByUserId(userIds) {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds);

  if (error) throw error;

  return new Map((data || []).map(profile => [profile.user_id, profile]));
}

async function listTeams() {
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('teams')
    .select('id, team_name, creator_id, event_year, created_at')
    .eq('event_year', EVENT_YEAR)
    .order('id', { ascending: true });

  if (teamsError) throw teamsError;
  if (!teams?.length) return [];

  const teamIds = teams.map(team => team.id);
  const creatorIds = [...new Set(teams.map(team => team.creator_id))];

  const [{ data: members, error: membersError }, profiles] = await Promise.all([
    supabaseAdmin
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds),
    getProfilesByUserId(creatorIds),
  ]);

  if (membersError) throw membersError;

  const counts = (members || []).reduce((acc, member) => {
    acc[member.team_id] = (acc[member.team_id] || 0) + 1;
    return acc;
  }, {});

  return teams.map(team => {
    const creatorProfile = profiles.get(team.creator_id);
    const memberCount = counts[team.id] || 0;

    return {
      id: team.id,
      teamName: team.team_name,
      creatorId: team.creator_id,
      creatorName: fullName(creatorProfile) || 'Unknown Creator',
      memberCount,
      maxMembers: TEAM_MAX_MEMBERS,
      isFull: memberCount >= TEAM_MAX_MEMBERS,
    };
  });
}

async function getTeamDetails(teamId, currentUserId) {
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id, team_name, creator_id, event_year, created_at')
    .eq('id', teamId)
    .single();

  if (teamError) throw teamError;

  const { data: members, error: membersError } = await supabaseAdmin
    .from('team_members')
    .select('user_id, joined_at')
    .eq('team_id', team.id)
    .order('joined_at', { ascending: true });

  if (membersError) throw membersError;

  const userIds = (members || []).map(member => member.user_id);
  const profiles = await getProfilesByUserId(userIds);

  const enrichedMembers = await Promise.all((members || []).map(async member => {
    const profile = profiles.get(member.user_id);

    return {
      userId: member.user_id,
      name: fullName(profile) || 'Unknown Member',
      email: await getAuthEmail(member.user_id),
      isCreator: member.user_id === team.creator_id,
      joinedAt: member.joined_at,
    };
  }));

  const creator = enrichedMembers.find(member => member.isCreator);

  return {
    id: team.id,
    teamName: team.team_name,
    creatorId: team.creator_id,
    creatorName: creator?.name || 'Unknown Creator',
    creatorEmail: creator?.email || null,
    memberCount: enrichedMembers.length,
    maxMembers: TEAM_MAX_MEMBERS,
    isFull: enrichedMembers.length >= TEAM_MAX_MEMBERS,
    isCreator: currentUserId === team.creator_id,
    members: enrichedMembers,
  };
}

async function getUserTeam(userId) {
  const { data: membership, error } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!membership) return null;

  return getTeamDetails(membership.team_id, userId);
}

async function leaveCurrentTeam(userId) {
  const { data: createdTeam, error: createdTeamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('creator_id', userId)
    .eq('event_year', EVENT_YEAR)
    .maybeSingle();

  if (createdTeamError) throw createdTeamError;

  if (createdTeam) {
    const { data: members, error: membersError } = await supabaseAdmin
      .from('team_members')
      .select('user_id')
      .eq('team_id', createdTeam.id);

    if (membersError) throw membersError;

    const { error } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', createdTeam.id);

    if (error) throw error;

    const teammateIds = (members || [])
      .map(member => member.user_id)
      .filter(memberUserId => memberUserId !== userId);

    if (teammateIds.length > 0) {
      const { error: registrationError } = await supabaseAdmin
        .from('registrations')
        .update({ team_status: 'Find at event' })
        .in('user_id', teammateIds)
        .eq('event_year', EVENT_YEAR);

      if (registrationError) throw registrationError;
    }

    return;
  }

  const { error } = await supabaseAdmin
    .from('team_members')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

async function createTeamForUser(userId, teamName) {
  const cleanTeamName = String(teamName || '').trim();
  if (!cleanTeamName) {
    const error = new Error('Team name is required.');
    error.statusCode = 400;
    throw error;
  }

  const { data: existingCreatedTeam, error: existingCreatedTeamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('creator_id', userId)
    .eq('event_year', EVENT_YEAR)
    .maybeSingle();

  if (existingCreatedTeamError) throw existingCreatedTeamError;

  if (existingCreatedTeam) {
    const { error } = await supabaseAdmin
      .from('teams')
      .update({ team_name: cleanTeamName })
      .eq('id', existingCreatedTeam.id);

    if (error) throw error;

    return getTeamDetails(existingCreatedTeam.id, userId);
  }

  await leaveCurrentTeam(userId);

  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .insert({
      team_name: cleanTeamName,
      creator_id: userId,
      event_year: EVENT_YEAR,
    })
    .select('id')
    .single();

  if (teamError) throw teamError;

  const { error: memberError } = await supabaseAdmin
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: userId,
    });

  if (memberError) throw memberError;

  return getTeamDetails(team.id, userId);
}

async function deleteCreatedTeam(userId) {
  const { data: createdTeam, error: createdTeamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('creator_id', userId)
    .eq('event_year', EVENT_YEAR)
    .maybeSingle();

  if (createdTeamError) throw createdTeamError;

  if (!createdTeam) {
    const error = new Error('No created team found.');
    error.statusCode = 404;
    throw error;
  }

  await leaveCurrentTeam(userId);

  const { error: registrationError } = await supabaseAdmin
    .from('registrations')
    .update({ team_status: 'Solo' })
    .eq('user_id', userId)
    .eq('event_year', EVENT_YEAR);

  if (registrationError) throw registrationError;
}

async function joinTeamForUser(userId, teamId) {
  const parsedTeamId = Number(teamId);
  if (!Number.isInteger(parsedTeamId)) {
    const error = new Error('A valid team is required.');
    error.statusCode = 400;
    throw error;
  }

  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('creator_id')
    .eq('id', parsedTeamId)
    .single();

  if (teamError) throw teamError;

  if (team.creator_id === userId) {
    const error = new Error('Team creators cannot join their own team.');
    error.statusCode = 400;
    throw error;
  }

  await leaveCurrentTeam(userId);

  const { error } = await supabaseAdmin
    .from('team_members')
    .insert({
      team_id: parsedTeamId,
      user_id: userId,
    });

  if (error) throw error;

  return getTeamDetails(parsedTeamId, userId);
}

async function removeTeamMember({ teamId, memberUserId, requesterUserId }) {
  const team = await getTeamDetails(Number(teamId), requesterUserId);

  if (team.creatorId !== requesterUserId) {
    const error = new Error('Only the team creator can remove members.');
    error.statusCode = 403;
    throw error;
  }

  if (memberUserId === requesterUserId) {
    const error = new Error('Team creators cannot remove themselves. Change team status instead.');
    error.statusCode = 400;
    throw error;
  }

  const { error } = await supabaseAdmin
    .from('team_members')
    .delete()
    .eq('team_id', Number(teamId))
    .eq('user_id', memberUserId);

  if (error) throw error;

  return getTeamDetails(Number(teamId), requesterUserId);
}

async function applyTeamSelection(userId, teamStatus, { teamName, teamId } = {}) {
  if (teamStatus === 'Create a Team') {
    return createTeamForUser(userId, teamName);
  }

  if (teamStatus === 'Join a Team') {
    return joinTeamForUser(userId, teamId);
  }

  if (teamStatus === 'Solo' || teamStatus === 'Find at event') {
    await leaveCurrentTeam(userId);
    return null;
  }

  return getUserTeam(userId);
}

module.exports = {
  TEAM_MAX_MEMBERS,
  applyTeamSelection,
  deleteCreatedTeam,
  getUserTeam,
  listTeams,
  removeTeamMember,
};
