const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
	const token = req.header('x-auth-token');
	if (!token) {
		return res.status(400).json({ msg: 'Autherisation denied' });
	}
	// Verify Token
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		// asign the verifaction to the user
		req.user = decoded.user;
		next();
	} catch (err) {
		res.status(401).json({ msg: 'Autherisation denied' });
	}
};
