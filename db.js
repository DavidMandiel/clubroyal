const mongoose = require('mongoose');
require('dotenv').config();

// const mongoURI = process.env.LOCAL_MONGO_URI;
const mongoURI = process.env.MONGO_URI;
const dbConnect = async () => {
	try {
		const res = await mongoose.connect(
			`mongodb+srv://david123:${process.env.MONGO_SECRET}@clubroyal.f2nim.mongodb.net/clubroyal?retryWrites=true&w=majority`,
			{
				useUnifiedTopology: true,
				useNewUrlParser: true,
				useCreateIndex: true,
				useFindAndModify: false,
			}
		);
		console.log('DB connected....');
	} catch (error) {
		console.log(error.message);
		process.exit(1);
	}
};

module.exports = dbConnect;
