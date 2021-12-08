const mongoose = require('mongoose');

const EventSchema = mongoose.Schema({
	club: {
		type: mongoose.Types.ObjectId,
		ref: 'club',
	},
	eventName: {
		type: String,
		require: true,
	},
	eventDate: {
		type: String,
		require: true,
	},
	dateCreated: {
		type: Date,
		default: Date.now,
	},
	dateUpdated: [{ type: Date }],
	location: {
		streetNumber: { type: String },
		number: { type: String },
		city: { type: String, required: true },
		country: { type: String, required: true },
		state: { type: String },
		coordinates: { lat: { type: String }, lng: { type: String } },
	},
	description: {
		type: String,
	},
	eventLogo: {
		type: String,
	},
	cashGame: {
		smallBlind: {
			type: Number,
			require: false,
		},
		bigBlind: {
			type: Number,
			require: false,
		},
		minBuyin: {
			type: Number,
		},
		maxBuyin: {
			type: Number,
		},
	},
	tournament: {
		buyIn: {
			type: Number,
			require: false,
		},
		startingChips: {
			type: Number,
			// required: true,
		},
		startingBlinds: {
			bigBlind: { type: Number },
			smallBlind: { type: Number },
			ante: { type: Number },
		},
		timePerLevel: {
			type: String,
			// required: true,
		},
		registerUntil: {
			type: String,
		},
		numberOfRe_entry: {
			type: Number,
		},
	},
	gameType: {
		type: String,
		require: true,
	},
	playersPerTable: {
		type: Number,
		require: true,
	},
	numberOfTables: {
		type: Number,
	},
	currency: {
		type: String,
		default: 'ILS',
	},
	players: [
		{
			player: {
				type: mongoose.Types.ObjectId,
				ref: 'user',
			},
			status: {
				type: String,
			},
			registerDate: {
				type: Date,
			},
		},
	],
});

module.exports = Event = mongoose.model('event', EventSchema);
