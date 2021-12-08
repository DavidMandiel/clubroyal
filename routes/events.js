const epxpress = require('express');
const router = epxpress.Router();
const { check, validationResult } = require('express-validator');
const authUser = require('../middlewares/authUser');
const isManager = require('../middlewares/isManager');
// Import Models
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');
const deleteEvent = require('../utilities/deleteEvent');
const { events } = require('../models/Club');

// @Route /api/events
// Desc Get all events
// Access Private
router.get('/', authUser, async (req, res) => {
	let events = [];
	try {
		const allClubs = await Club.find()
			.where('manager')
			.ne(req.user)
			.populate({
				path: 'events',
				populate: { path: 'club', select: ' clubLogo name' },
			});

		allClubs.map((club) => {
			events = [...events, ...club.events];
		});
		return res.json(events);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route /api/events/all
// Desc Get all events from event module - NOT IS USE FOR THE MOMENT
// Access Private
router.get('/all', authUser, async (req, res) => {
	try {
		const events = await Event.find().populate({
			path: 'club',
			select: 'manager members clubLogo name',
		});
		return res.json(events);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route /api/event/register-events/:eventId
// Desc Get one registered event
// Access Private
router.get('/register-events/:eventId', authUser, async (req, res) => {
	try {
		const event = await Event.findById(req.params.eventId);
		return res.json(event);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route /api/event/members-events/:clubId
// @Desc Get all events from registered club
// @Access Private
// TODO - Not sure we need this route, potential to delete, all events populate from clubs
router.get('/members-events/:clubId', authUser, async (req, res) => {
	try {
		const events = await Club.findById(req.params.clubId)
			.select('events name clubLogo')
			.populate('events');
		return res.json(events);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// TODO - manager routes ( add players, remove players)

// @Route POST api/event/:club_id
// @Desc create new event
// @Private
const eventValidationOptions = [
	check('eventName', 'Event name is required').not().isEmpty(),
	check('eventDate', 'Event date is required').not().isEmpty(),
	check('location', 'Location is required').not().isEmpty(),
	check('gameType', 'Game type is required').not().isEmpty(),
	check('playersPerTable', 'Players per table is required').not().isEmpty(),
	// check('address.country', 'Country is required').not().isEmpty(),
	// check('address.city', 'City is required').not().isEmpty(),
	check('eventType', 'Event type is required').not().isEmpty(),
];
router.post(
	'/:club_id',
	authUser,
	isManager,
	eventValidationOptions,
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			club,
			eventName,
			eventDate,
			location,
			description,
			gameType,
			playersPerTable,
			numberOfTables,
			currency,
			remarks,
			eventType,
			smallBlind,
			bigBlind,
			minBuyin,
			maxBuyin,
			buyIn,
			startingChips,
			ante,
			timePerLevel,
			registerUntil,
			numberOfRe_entry,
		} = req.body;
		try {
			const club = await Club.findById({ _id: req.params.club_id });
			if (club === null) {
				return res.status(400).json({ errors: [{ msg: 'No club found' }] });
			}
			const newEvent = new Event({
				club: club._id,
				eventName,
				eventDate,
				location,
				description,
				gameType,
				playersPerTable,
				numberOfTables,
				currency,
				remarks,
				tournament: {},
				cashGame: {},
			});

			if (eventType.toLowerCase() === 'tournament') {
				newEvent.tournament = {
					buyIn,
					startingChips,
					startingBlinds: {
						smallBlind,
						bigBlind,
						ante,
					},
					timePerLevel,
					registerUntil,
					numberOfRe_entry,
				};
			} else if (eventType.toLowerCase() === 'cash game') {
				// (newEvent.tournament.startingChips = 20),
				// 	(newEvent.tournament.timePerLevel = 'adsf'),
				newEvent.cashGame = {
					smallBlind,
					bigBlind,
					minBuyin,
					maxBuyin,
				};
			} else {
				return res.status(400).json({
					errors: [{ msg: 'event type must be cash game or tournament' }],
				});
			}
			await newEvent.save();
			club.events.push(newEvent._id);
			await club.save();
			return res.json(newEvent);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ msg: 'Server error' });
		}
	}
);

// @Route PUT api/events/update-event/:club_id
// @Desc Update event
// @Private
router.put('/update-event/:club_id', authUser, isManager, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	const updatedEvent = req.body;
	updatedEvent.club = req.params.club_id;

	try {
		const club = await Club.findById({ _id: req.params.club_id });
		if (club == null) {
			return res.status(400).json({ errors: [{ msg: 'No club found' }] });
		}
		let event = await Event.findById({ _id: req.body._id });
		if (event == null) {
			return res.status(400).json({ errors: [{ msg: 'No event found' }] });
		}

		let updated = event.dateUpdated;
		updated.push(Date.now());
		updatedEvent.dateUpdated = updated;

		await Event.findByIdAndUpdate(
			{ _id: event._id },
			updatedEvent,
			{ new: true },
			(err, response) => {
				return res.json(response);
			}
		);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route DELETE api/events/:event_id
// Desc delete event
// Access Private
router.delete('/:club_id/:event_id', authUser, isManager, async (req, res) => {
	try {
		let club = deleteEvent(req.params.event_id);
		return res.json(club);
	} catch (error) {
		console.error(error.message);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route PUT /api/events/join-event/:event_id
// @Desc user register to event
// @Access Private
router.put('/join-event/:event_id', authUser, async (req, res) => {
	try {
		let event = await Event.findById({ _id: req.params.event_id });
		const user = await User.findById(req.user);

		if (event === null) {
			return res.status(400).json({ errors: [{ msg: 'Event not found' }] });
		}

		if (!user.regclubs.includes(event.club)) {
			return res
				.status(401)
				.json({ errors: [{ msg: 'You are not a member of this club' }] });
		}

		if (
			event.players.filter(
				(player) => JSON.stringify(player._id) === JSON.stringify(user._id)
			).length > 0
		) {
			return res
				.status(402)
				.json({ errors: [{ msg: 'You are already register' }] });
		}

		// Add player to event model
		event.players.push(req.user);
		// // Add event to user model
		// TODO - not sure if we need to save event to user model, can be populated from event
		user.regevents.push(event._id);

		await user.save();
		await event.save();

		return res.json({ event: event, user: user });
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ errors: [{ msg: 'Event not founded' }] });
		}
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route DELETE /api/events/unjoin/:event_id
// @Desc user register to event
// @Access Private
router.put('/unjoin/:event_id', authUser, async (req, res) => {
	try {
		let event = await Event.findById({ _id: req.params.event_id });
		if (event === null) {
			return res.status(400).json({ errors: [{ msg: 'Event not found' }] });
		}
		// Remove player from Event model
		index = event.players.findIndex(
			(player) => player._id.toString() === req.user
		);
		if (index === -1) {
			return res
				.status(401)
				.json({ errors: [{ msg: 'You are not register' }] });
		}
		event.players.splice(index, 1);

		// Remove event from User model
		// TODO - not sure if we need to save event to user model, can be populated from event
		let user = await User.findById(req.user);
		const indexOfEvent = user.regevents.findIndex(
			(userEvent) => userEvent._id.toString() === event._id.toString()
		);
		user.regevents.splice(indexOfEvent, 1);
		await user.save();
		await event.save();
		return res.json(user);
	} catch (error) {
		console.error(error.message);
		if ((error.kind = 'ObjectId')) {
			return res.status(402).json({ errors: [{ msg: 'Event not found' }] });
		}
		return res.status(500).json({ msg: 'Server error' });
	}
});

module.exports = router;
