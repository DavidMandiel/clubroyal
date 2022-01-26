const express = require('express');
const { check, validationResult } = require('express-validator');
const authUser = require('../middlewares/authUser');
const isManager = require('../middlewares/isManager');
const Club = require('../models/Club');
const User = require('../models/User');
const Event = require('../models/Event');
const deleteEvent = require('../utilities/deleteEvent');
const deleteClubMembers = require('../utilities/deleteClubMembers');
const router = express.Router();

// ----------------------------------------Club Manager Routes-------------------------------------

// @GET /api/clubs/
// @Desc get created club by id
// @Access Private
router.get('/created-club/:club_id', authUser, async (req, res) => {
	try {
		const club = await Club.findById(req.params.club_id)
			.select('-manager')
			.populate({
				path: 'pendingRequest.user',
				select: 'name email avatar',
			})
			.populate({
				model: 'user',
				path: 'members.user',
				select: 'name email avatar',
			})
			.populate({
				path: 'events',
				select: 'eventName eventType gameType eventDate _id',
			});

		if (club.length <= 0) {
			return res
				.status(400)
				.json({ errors: [{ msg: 'No clubs created under your name' }] });
		}
		res.json(club);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ errors: [{ msg: 'No Records Found' }] });
		}
		return res.status(500).json({ errors: [{ msg: 'Server error' }] });
	}
});

// @GET /api/clubs/created-clubs
// @Desc get all user created club
// @Access Private
router.get('/created-club', authUser, async (req, res) => {
	try {
		const club = await Club.find()
			.where('manager')
			.equals(req.user)
			.populate([
				{
					model: 'user',
					path: 'pendingRequest.user',
					select: 'name email avatar events',
				},
				{
					model: 'user',
					path: 'members.user',
					select: 'name email avatar events',
				},
				{
					model: 'event',
					path: 'events',
				},
			]);

		if (club.length <= 0) {
			return res
				.status(400)
				.json({ errors: [{ msg: 'No clubs created under your name' }] });
		}
		res.json(club);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ errors: [{ msg: 'No Records Found' }] });
		}
		return res.status(500).json({ errors: [{ msg: 'Server error' }] });
	}
});

// @PUT /api/clubs/approve-request/:club_id/:user_id
// @Desc approve club join request by user id
// @Access Private
router.put('/approve-request/:club_id/:user_id', authUser, async (req, res) => {
	try {
		let club = await Club.findById(req.params.club_id);
		let user = await User.findById(req.params.user_id);

		// user pending request and join club handler
		user.pendingclubrequest = user.pendingclubrequest.filter(
			(club) => club.toString() !== req.params.club_id
		);
		user.regclubs.push(req.params.club_id);
		await user.save();

		// club pending request and join club handler
		club.pendingRequest = club.pendingRequest.filter(
			(user) => user.user.toString() !== req.params.user_id
		);
		club.members.push({ user: req.params.user_id });
		await club.save();

		res.json(club);
	} catch (error) {
		console.log(error);
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ errors: [{ msg: 'Club not found' }] });
		}
		return res.status(500).json({ errors: [{ msg: 'Server error' }] });
	}
});

// @PUT /api/clubs/decline-request/:club_id/:user_id
// @Desc decline club join request by user id
// @Access Private
router.put('/decline-request/:club_id/:user_id', authUser, async (req, res) => {
	try {
		let club = await Club.findById(req.params.club_id);
		let user = await User.findById(req.params.user_id);
		const clubIndex = user.pendingclubrequest
			.map((club) => club)
			.toString()
			.indexOf(req.params.club_id);
		user.pendingclubrequest.splice(clubIndex, 1);
		await user.save();
		// club pending request and join club handler
		const userIndex = club.pendingRequest
			.map((user) => user.user)
			.toString()
			.indexOf(req.params.user_id);
		club.pendingRequest.splice(userIndex, 1);
		await club.save();
		res.json(club);
	} catch (error) {
		console.log(error);
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ errors: [{ msg: 'Club not found' }] });
		}
		return res.status(500).json({ errors: [{ msg: 'Server error' }] });
	}
});

// @POST /api/clubs
// @Desc create new club
// @Access Private
const clubValidationOptions = [check('name', 'Club name is needed')];
router.post('/', authUser, clubValidationOptions, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	const { name, clubLogo, description } = req.body;
	try {
		// Create new Club
		let club = new Club({
			name,
			manager: req.user,
			clubLogo,
			description,
		});
		await club.save();
		// Add Club id to manager club list
		const user = await User.findById(req.user);
		let managerClubs = user.createdclubs;
		managerClubs.push(club._id);
		user.createdclubs = managerClubs;
		await user.save();
		return res.json(club);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			console.error(error.message);
			return res
				.status(400)
				.json({ errors: [{ msg: 'Could not create a club' }] });
		}
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @DELETE /api/clubs/:club_id
// @Desc delete club
// @Access Private
router.delete('/:club_id', authUser, isManager, async (req, res) => {
	try {
		let club = await Club.findById(req.params.club_id).populate({
			path: 'events',
			model: 'event',
		});

		if (club === null) {
			return res.status(400).json({ msg: 'Club not found' });
		}
		// Delete club from memebers
		deleteClubMembers(club);
		// Delete all events related to club
		club.events.map((event) => {
			key = event._id;
			deleteEvent(event._id);
		});
		// TODO - need to delete club from all users - and send a message
		await Club.findByIdAndDelete(
			{ _id: req.params.club_id },
			(err, response) => {
				if (err) {
					console.log(err);
					return res.status(400).json({ msg: err.message });
				}
				if (response == null) {
					return res.status(400).json({ msg: 'Club not found' });
				}
				return res.json({ msg: 'Club Deleted' });
			}
		);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ msg: 'Club not found' });
		}
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route PUT api/clubs/:club_id
// @Desc update club
// @Access Private
router.put(
	'/:club_id',
	authUser,
	isManager,
	clubValidationOptions,
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		const { name, clubLogo, description } = req.body;
		try {
			let club = await Club.findById(req.params.club_id);
			if (name) {
				club.name = name;
			}
			if (clubLogo) {
				club.clubLogo = clubLogo;
			}
			if (description) {
				club.description = description;
			}
			await club.save();
			return res.json(club);
		} catch (error) {
			if ((error.kind = 'ObjectId')) {
				return res.status(400).json({ errors: [{ msg: 'Club not found' }] });
			}
			return res.status(500).json({ msg: 'Server error' });
		}
	}
);

// @DELETE /api/clubs/remove_member/:club_id/:user_id
// @Desc user leave a club
// @Access Private
router.delete(
	'/remove_member/:club_id/:user_id',
	authUser,
	async (req, res) => {
		const clubId = req.params.club_id;
		const userId = req.params.user_id;
		try {
			const club = await Club.findById({ _id: clubId });
			if (club == null) {
				return res.status(400).json({ errors: [{ msg: 'Club not found' }] });
			}
			if (
				club.members.filter((member) => member.user.toString() === userId)
					.length <= 0
			) {
				return res
					.status(400)
					.json({ errors: [{ msg: 'User is not a member' }] });
			}

			// Remove Club from User model
			const user = await User.findById(userId);
			const userClubIndex = user.regclubs.indexOf(clubId);
			user.regclubs.splice(userClubIndex, 1);
			await user.save();

			// Remove User from Club model
			const userIndex = club.members.findIndex(
				(member) => member.user.toString() === req.user
			);
			club.members.splice(userIndex, 1);
			await club.save();
			return res.json(club);
		} catch (error) {
			console.log(error);
			if ((error.kind = 'ObjectId')) {
				return res
					.status(400)
					.json({ errors: [{ msg: 'Club not found on server' }] });
			}
			return res.status(500).json({ errors: [{ msg: 'Server error' }] });
		}
	}
);
// ----------------------------------------User Club Routes-------------------------------------

// @GET /api/clubs/
// @Desc Get all clubs
// @Access Private
router.get('/', authUser, async (req, res) => {
	try {
		const filteredClubs = [];
		const clubs = await Club.find()
			.where('manager')
			.ne(req.user)
			.populate({
				path: 'events',
				populate: {
					path: 'club',
					model: 'club',
					select: 'name clubLogo _id',
				},
			});
		clubs.map((club) => {
			if (
				club.pendingRequest.find((pend) => pend.user.toString() !== req.user)
			) {
				console.log(true, club._id);
			}
		});
		// TODO - fix logic to find clubs that user is pending
		res.json(clubs);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ errors: [{ msg: 'No Clubs found' }] });
		}
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @GET /api/clubs/
// @Desc get user registered clubs
// @Access Private
router.get('/registered-clubs', authUser, async (req, res) => {
	try {
		const clubs = await Club.find().select('-manager').populate('events');
		if (clubs.length <= 0) {
			return res.status(400).json({ msg: 'No clubs availble' });
		}
		res.json(clubs);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ errors: [{ msg: 'No Clubs found' }] });
		}
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @PUT /api/clubs/join/:club_id
// @Desc user request to join club
// @Access Private
router.put('/join/:club_id', authUser, async (req, res) => {
	try {
		const club = await Club.findById({ _id: req.params.club_id });
		if (club === null) {
			return res.status(400).json({ msg: 'No Club Found' });
		}
		if (club.manager.toString() === req.user) {
			return res.status(400).json({ msg: 'You are the club manager' });
		}
		let clubMembers = club.members;
		let pendingRequests = club.pendingRequest;
		if (
			clubMembers.filter((member) => member.user.toString() == req.user)
				.length > 0
		) {
			return res
				.status(400)
				.json({ msg: 'You are already a member of this club' });
		}
		if (
			pendingRequests.filter((member) => member.user.toString() == req.user)
				.length > 0
		) {
			return res
				.status(400)
				.json({ msg: 'You are already sent a request to this club' });
		}
		// Add Club id to user pendingclubrequest
		const user = await User.findById(req.user);
		user.pendingclubrequest.push(club);
		await user.save();

		// Add User to Club pendingRequest
		club.pendingRequest.push({ user: req.user, date: Date.now() });
		await club.save();
		return res.json(user);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			console.log(error);
			return res.status(400).json({ errors: [{ msg: 'No Clubs found' }] });
		}
		return res.status(500).json({ errors: [{ msg: 'Server error' }] });
	}
});

// @DELETE /api/clubs/un_join/:club_id
// @Desc user leave a club
// @Access Private
router.delete('/un_join/:club_id', authUser, async (req, res) => {
	try {
		const club = await Club.findById(req.params.club_id);
		const user = await User.findById(req.user);

		if (club == null) {
			return res.status(400).json({ errors: [{ msg: 'Club does not exits' }] });
		}
		if (
			club.members.filter((member) => member.user.toString() === req.user)
				.length <= 0
		) {
			return res
				.status(400)
				.json({ errors: [{ msg: 'You are not a member of this club' }] });
		}
		// TODO- refactor unJoin function with filter
		// Remove Club from User model
		user.regclubs = user.regclubs.filter(
			(club) => club.toString() !== req.params.club_id
		);
		await user.save();

		// Remove User from Club model
		club.members = club.members.filter(
			(mem) => mem.user.toString() !== req.user
		);
		await club.save();

		return res.json(club);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			return res.status(400).json({ errors: [{ msg: 'No Clubs found' }] });
		}
		return res.status(500).json({ errors: [{ msg: 'Server Error' }] });
	}
});

// @PUT /api/clubs/cancel-join-request/:club_id
// @Desc cancel a join request sent to club
// @Access Private
router.put('/cancel-join-request/:club_id', authUser, async (req, res) => {
	try {
		let club = await Club.findById({ _id: req.params.club_id });
		if (club === null) {
			return res.status(400).json({ errors: [{ msg: 'Club does not exits' }] });
		}
		if (
			(club.pendingRequest.filter((user) => user.user === req.user).length = 0)
		) {
			return res.status(400).json({ errors: [{ msg: 'User does not exits' }] });
		}
		// Remove Club from User model
		const user = await User.findById(req.user);
		user.pendingclubrequest = user.pendingclubrequest.filter(
			(club) => club.toString() !== req.params.club_id
		);
		await user.save();

		// Remove User from Club model
		club.pendingRequest = club.pendingRequest.filter(
			(user) => user.user.toString() !== req.user
		);
		await club.save();
		return res.json(club);
	} catch (error) {
		if ((error.kind = 'ObjectId')) {
			console.log(error);
			return res.status(400).json({ errors: [{ msg: 'No Clubs found' }] });
		}
		return res.status(500).json({ msg: 'Server error' });
	}
});

module.exports = router;
