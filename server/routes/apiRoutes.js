const express = require('express');
const requireSupabase = require('../middleware/requireSupabase');
const { signup, login } = require('../controllers/authController');
const { getCurrentUser } = require('../controllers/userController');
const { createRegistration, updateRegistration } = require('../controllers/registrationController');
const { deleteMyTeam, deleteTeamMember, getMyTeam, getTeams } = require('../controllers/teamController');

const router = express.Router();

router.use(requireSupabase);

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', getCurrentUser);
router.get('/teams', getTeams);
router.get('/my-team', getMyTeam);
router.post('/register', createRegistration);
router.patch('/register', updateRegistration);
router.delete('/teams/:teamId', deleteMyTeam);
router.delete('/teams/:teamId/members/:userId', deleteTeamMember);

module.exports = router;
