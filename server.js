// Clean Slate Messaging Tool - Backend API Server
// Express.js server with in-memory storage (can be replaced with database)

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory storage (replace with database in production)
let participants = [];
let participantIdCounter = 1;

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// API Routes

// Get all participants
app.get('/api/participants', (req, res) => {
  res.json(participants);
});

// Get participant by ID
app.get('/api/participants/:id', (req, res) => {
  const participant = participants.find(p => p.id === parseInt(req.params.id));
  if (participant) {
    res.json(participant);
  } else {
    res.status(404).json({ error: 'Participant not found' });
  }
});

// Create new participant
app.post('/api/participants', (req, res) => {
  const newParticipant = {
    id: participantIdCounter++,
    ...req.body,
    timestamp: new Date().toISOString()
  };
  participants.push(newParticipant);
  res.status(201).json(newParticipant);
});

// Get statistics
app.get('/api/statistics', (req, res) => {
  const stats = {
    totalParticipants: participants.length,
    uniqueOffices: [...new Set(participants.map(p => p.congressionalOffice?.split('|')[0]))].length,
    profileDistribution: {},
    concernDistribution: {},
    avgTraitsSelected: 0,
    completionRate: 100,
    lastUpdated: new Date().toISOString()
  };

  participants.forEach(p => {
    stats.profileDistribution[p.audienceProfile] = (stats.profileDistribution[p.audienceProfile] || 0) + 1;
    stats.concernDistribution[p.primaryConcern] = (stats.concernDistribution[p.primaryConcern] || 0) + 1;
  });

  if (participants.length > 0) {
    const totalTraits = participants.reduce((sum, p) => sum + (p.selectedTraits?.length || 0), 0);
    stats.avgTraitsSelected = Math.round(totalTraits / participants.length);
  }

  res.json(stats);
});

// Get participants by congressional office
app.get('/api/participants/office/:office', (req, res) => {
  const officeParticipants = participants.filter(p => 
    p.congressionalOffice?.includes(req.params.office)
  );
  res.json(officeParticipants);
});

// Get participants by profile type
app.get('/api/participants/profile/:profile', (req, res) => {
  const profileParticipants = participants.filter(p => 
    p.audienceProfile === req.params.profile
  );
  res.json(profileParticipants);
});

// Search participants
app.get('/api/participants/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json(participants);

  const searchResults = participants.filter(p => {
    const searchString = `${p.name} ${p.congressionalOffice} ${p.audienceProfile}`.toLowerCase();
    return searchString.includes(q.toLowerCase());
  });

  res.json(searchResults);
});

// Delete all participants (for testing/reset)
app.delete('/api/participants', (req, res) => {
  participants = [];
  participantIdCounter = 1;
  res.json({ message: 'All participants deleted' });
});

// Export data as CSV
app.get('/api/export/csv', (req, res) => {
  let csv = 'ID,Name,Congressional Office,Profile,Primary Concern,Adjectives,Priorities,Selected Traits,Timestamp\n';
  
  participants.forEach(p => {
    const office = p.congressionalOffice?.split('|')[1] || 'Unknown';
    csv += `${p.id},"${p.name}","${office}","${p.audienceProfile}","${p.primaryConcern}",`;
    csv += `"${(p.adjectives || []).join(', ')}","${(p.priorities || []).join('; ')}",`;
    csv += `"${(p.selectedTraits || []).join(', ')}","${p.timestamp}"\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=participants-${Date.now()}.csv`);
  res.send(csv);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    participantCount: participants.length,
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Clean Slate API Server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`Participant Tool: http://localhost:${PORT}/index.html`);
});
