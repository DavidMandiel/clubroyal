const Event = require('../models/Event');

module.exports = deleteEvent = async (event_id) => {
	let event = await Event.findById({ _id: event_id });
	if (event == null) {
		return res.status(400).json({ msg: 'Event not found' });
	}
	// find and delete the event from registered players
	event.players.map(async (player) => {
		let user = await User.findById(player._id);
		let indexOfEvent = user.regevents
			.map((event) => event._id.toString())
			.indexOf(event_id);
		user.regevents.splice(indexOfEvent, 1);
		await user.save();
		});
	// find and delete event
	await Event.findOneAndDelete({ _id: event_id });
	// Delete event from Club model
	let club = await Club.findById({ _id: event.club });
	const indexOfEvent = club.events
		.map((event) => event._id.toString())
		.indexOf(event.club);
	club.events.splice(indexOfEvent, 1);
	await club.save();
	return club;
};
