const User = require('../models/User');
const deleteEvent = require('./deleteEvent');

module.exports = deleteClubMembers = async (club) => {
	const clubMembersArr = club.members;
	try {
		clubMembersArr.map(async (member) => {
			let user = await User.findById(member.user);
			let indexOfClub = user.regclubs
				.map((club) => club._id.toString())
				.indexOf(club._id);
			user.regclubs.splice(indexOfClub, 1);
			await user.save();
			
		});
	} catch (error) {
		console.error(error.message);
		return error;
	}
};
