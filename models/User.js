const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		required: true,
	},
	avatar: {
		type: String,
	},
	regclubs: [
		{
			type: mongoose.Types.ObjectId,
			ref: 'club',
		},
	],
	pendingclubrequest: [
		{
			type: mongoose.Types.ObjectId,
			ref: 'club',
		},
	],
	createdclubs: [
		{
			type: mongoose.Types.ObjectId,
			ref: 'club',
		},
	],
	// TODO - possible to delete - refactor events routes
	regevents: [
		{
			type: mongoose.Types.ObjectId,
			ref: 'event',
		},
	],
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = User = mongoose.model('user', UserSchema);
