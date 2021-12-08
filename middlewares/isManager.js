const Club = require('../models/Club');

module.exports = async (req, res, next) => {
	try {
		const club = await Club.findById(req.params.club_id);
		if (club === null) {
			return res.status(400).json({ msg: 'Club not found' });
		}
		if (club.manager.toString() !== req.user) {
			return res
				.status(400)
				.json({ msg: 'You are not a allowed to modify this club' });
		}
		next();
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
};
