const express = require('express');
const connectDB = require('./db');
const cors = require('cors');
require('dotenv').config();

const app = express();

connectDB();

// routes
const usersRoute = require('./routes/users');
const clubsRoute = require('./routes/clubs');
const eventsRoute = require('./routes/events');

const PORT = process.env.PORT || 5000;

app.use(express.json({ extended: false }));
app.use(cors());

// API Routes
app.use('/api/users', usersRoute);
app.use('/api/clubs', clubsRoute);
app.use('/api/events', eventsRoute);

app.get('/', (req, res) => {
	res.send('Welcome to api');
	console.log(req);
});
app.listen(PORT, () => {
	console.log(`Server running on port...${PORT} `);
});
// TODO - add git
// TODO - change jwtSecret?
