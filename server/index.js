require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json()); // Allow parsing JSON requests

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register Endpoint
app.post('/api/register', async (req, res) => {
  try {
    const {
      email, firstName, lastName, password, phone, age, gender,
      school, major, year, level, teamStatus, teamName,
      teammate1, teammate2, teammate3, track, tshirt,
      dietary, hearAbout, notes, photoConsent, confirmationCode
    } = req.body;

    // 1. Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email is already registered' });
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Insert user into Supabase
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email: email.toLowerCase().trim(),
          first_name: firstName,
          last_name: lastName,
          password_hash: passwordHash,
          phone_number: phone,
          age: parseInt(age) || null,
          gender: gender,
          university: school,
          major: major,
          grade: year,
          level_of_study: level,
          team_status: teamStatus,
          team_name: teamName,
          teammate_1: teammate1,
          teammate_2: teammate2,
          teammate_3: teammate3,
          intended_track: track,
          tshirt_size: tshirt,
          dietary_restrictions: dietary,
          how_did_you_hear_about_us: hearAbout,
          additional_info: notes,
          agreed_to_terms: photoConsent === 'Yes' || photoConsent === true
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Insert Error:', insertError);
      return res.status(500).json({ success: false, error: 'Failed to create user account' });
    }

    // 4. Create JWT session token
    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 5. Return success and user data (excluding password)
    res.json({
      success: true,
      user: {
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        teamStatus: newUser.team_status,
        confirmationCode: 'KUH-' + newUser.id.split('-')[0].toUpperCase(),
        status: 'Registered',
        school: newUser.university,
        major: newUser.major,
        year: newUser.grade,
        level: newUser.level_of_study,
        age: newUser.age,
        phone: newUser.phone_number,
        teamName: newUser.team_name,
        teammate1: newUser.teammate_1,
        teammate2: newUser.teammate_2,
        teammate3: newUser.teammate_3,
        track: newUser.intended_track,
        tshirt: newUser.tshirt_size,
        dietary: newUser.dietary_restrictions
      },
      token
    });

  } catch (err) {
    console.error('Registration Exception:', err);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (fetchError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // 3. Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 4. Return user data and token
    res.json({
      success: true,
      user: {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        teamStatus: user.team_status,
        confirmationCode: 'KUH-' + user.id.split('-')[0].toUpperCase(),
        status: user.team_status === 'Cancelled' ? 'Cancelled' : 'Registered',
        school: user.university,
        major: user.major,
        year: user.grade,
        level: user.level_of_study,
        age: user.age,
        phone: user.phone_number,
        teamName: user.team_name,
        teammate1: user.teammate_1,
        teammate2: user.teammate_2,
        teammate3: user.teammate_3,
        track: user.intended_track,
        tshirt: user.tshirt_size,
        dietary: user.dietary_restrictions
      },
      token
    });

  } catch (err) {
    console.error('Login Exception:', err);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// Get User Endpoint
app.get('/api/user', async (req, res) => {
  try {
    const { email, token } = req.query;
    if (!token) return res.status(401).json({ success: false, error: 'No token' });

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({
      success: true,
      user: {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        teamStatus: user.team_status,
        confirmationCode: 'KUH-' + user.id.split('-')[0].toUpperCase(),
        status: user.team_status === 'Cancelled' ? 'Cancelled' : 'Registered',
        school: user.university,
        major: user.major,
        year: user.grade,
        level: user.level_of_study,
        age: user.age,
        phone: user.phone_number,
        teamName: user.team_name,
        teammate1: user.teammate_1,
        teammate2: user.teammate_2,
        teammate3: user.teammate_3,
        track: user.intended_track,
        tshirt: user.tshirt_size,
        dietary: user.dietary_restrictions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Update Registration Endpoint
app.post('/api/update', async (req, res) => {
  try {
    const { email, teamStatus, teamName, teammate1, teammate2, teammate3, track, tshirt, dietary } = req.body;
    
    const { error } = await supabase
      .from('users')
      .update({
        team_status: teamStatus,
        team_name: teamName,
        teammate_1: teammate1,
        teammate_2: teammate2,
        teammate_3: teammate3,
        intended_track: track,
        tshirt_size: tshirt,
        dietary_restrictions: dietary
      })
      .eq('email', email.toLowerCase().trim());

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Cancel Registration Endpoint
app.post('/api/cancel', async (req, res) => {
  try {
    const { email } = req.body;
    
    const { error } = await supabase
      .from('users')
      .update({
        team_status: 'Cancelled'
      })
      .eq('email', email.toLowerCase().trim());

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
