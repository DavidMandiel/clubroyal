const express = require('express');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// const config = require('config');
const User = require('../models/User');
const authUser = require('../middlewares/authUser');
const router = express.Router();
// Global configuration
const jwtOptions = {
	expiresIn: 36000,
};

// TODO refactor delete event function
// TODO review and refactor all routes functions

// @Route Get api/users
// @Desc Show all users - Development only!!
// @Access public
router.get('/dev', async (req, res) => {
	try {
		const users = await User.find().select('-password');
		return res.json(users);
	} catch (error) {
		console.error(error.message);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route Get api/users
// @Desc get user after authenticated
// @Access private
router.get('/loaduser', authUser, async (req, res) => {
	try {
		const user = await User.findById(req.user)
			.select('-password')
			.populate({
				path: 'createdclubs',
				// TODO - add query to remove manager id, pass clubs etc..
				populate: [
					{
						model: 'event',
						path: 'events',
						populate: {
							path: 'club',
							model: 'club',
							select: 'name clubLogo _id',
						},
					},
					{
						modal: 'user',
						path: 'pendingRequest.user',
						select: 'name avatar email _id',
					},
					{
						modal: 'user',
						path: 'members.user',
						select: 'name avatar email _id regevents',
					},
				],
				select: '-manager',
			})

			.populate({
				model: 'club',
				path: 'pendingclubrequest',
				select: '-manager -pendingRequest -members',
				populate: {
					model: 'event',
					path: 'events',
					populate: {
						path: 'club',
						model: 'club',
						select: 'name clubLogo _id',
					},
				},
			})

			.populate({
				path: 'regclubs',
				select: ' -pendingRequest',
				populate: {
					model: 'event',
					path: 'events',
					populate: {
						path: 'club',
						model: 'club',
						select: 'name clubLogo _id',
					},
				},
			})
			.populate({
				path: 'regevents',
				populate: {
					path: 'club',
					model: 'club',
					select: 'name clubLogo _id',
				},
			});
		return res.json(user);
	} catch (error) {
		console.error(error.message);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @Route POST api/users/register
// @Desc register new user
// @Access public
const userRegValidator = [
	check('name', 'Please enter name').not().isEmpty(),
	check('email', 'Please enter a valid email').isEmail(),
	check(
		'password',
		'Please enter a password with at least 6 characters'
	).isLength({ min: 6 }),
];
router.post('/register', userRegValidator, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	const { name, email, password } = req.body;
	try {
		let user = await User.findOne({ email: email });
		if (user) {
			return res.status(400).json({ errors: [{ msg: 'User already exits' }] });
		}
		user = new User({
			name,
			email,
			password: password.toLowerCase(),
		});
		const salt = await bcrypt.genSalt(10);
		user.password = await bcrypt.hash(password, salt);
		await user.save();
		jwt.sign(
			{ user: user.id },
			process.env.JWT_SECRET,
			jwtOptions,
			(err, token) => {
				if (err) {
					return res.json({ errors: err.message });
				}
				return res.json(token);
			}
		);
	} catch (error) {
		console.log(error);
		res.status(500).json({ errors: [{ msg: 'Server Error' }] });
	}
});

// @Route POST /api/user/login
// @Desc login route
// @Access Public
const loginValidationOptions = [
	check('email', 'Please enter a valid email').isEmail(),
	check('password', 'Password is required').not().isEmpty(),
];
router.post('/login', loginValidationOptions, async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(403).json({ errors: errors.array() });
	}
	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email: email.toLowerCase() });
		if (user === null) {
			return res.status(402).json({ errors: [{ msg: 'User not found' }] });
		}
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });
		}
		const paylaod = {
			user: user.id,
		};
		jwt.sign(paylaod, process.env.JWT_SECRET, jwtOptions, (err, token) => {
			if (err) {
				return res.status(401).json({ errors: [{ msg: err.message }] });
			}
			return res.json({ token });
		});
	} catch (error) {
		return res.status(500).json({ errors: [{ msg: 'Server Error' }] });
	}
});

module.exports = router;
