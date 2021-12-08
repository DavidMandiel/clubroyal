const mongoose = require('mongoose');

const ClubSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	description: {
		type: String,
	},
	manager: {
		type: mongoose.Types.ObjectId,
		ref: 'user',
	},
	clubLogo: {
		type: String,
	},
	dateCreated: {
		type: Date,
		default: Date.now,
	},
	members: [
		{
			user: { type: mongoose.Types.ObjectId, ref: 'user' },
			date: { type: Date, default: Date.now },
		},
	],
	pendingRequest: [
		{
			user: { type: mongoose.Types.ObjectId, ref: 'user' },
			date: { type: Date, defualt: Date.now },
		},
	],
	events: [{ type: mongoose.Types.ObjectId, ref: 'event' }],
});

module.exports = Club = mongoose.model('club', ClubSchema);
