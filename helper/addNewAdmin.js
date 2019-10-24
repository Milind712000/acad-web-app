const mongoose = require('mongoose');
const dbConfig = require('../config/dbKeys-local');
const Users = require('../models/Users');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

mongoose.Promise = global.Promise;
mongoose.connect(dbConfig.URI, {
	useNewUrlParser: true,
	useFindAndModify: false
});
const db = mongoose.connection;

db.once('open', async () => {
	console.log('MongoDB connected');
	console.log('Add a new admin account');
	let error_flag = false;

	rl.question('username > ',async (in_user) => {
		const rege = /^[a-zA-Z0-9]{4,30}$/;
		if( !rege.test(in_user)) error_flag = true;
		const old_user = await Users.findOne({'username':in_user},'_id');
		if(old_user) error_flag = true;

		if(error_flag){
			console.log('username is invalid or already in use');
			process.exit();
		}

		rl.question('password > ', (in_pass) => {
			const preg = /^.{5,30}$/;
			if( !preg.test(in_pass)) error_flag = true;
			if(error_flag){
				console.log('password is invalid');
				process.exit();
			}

			rl.question('confirm password > ',async (in_pass2) => {
				if( in_pass !== in_pass2 ) error_flag = true;
				if(error_flag){
					console.log('passwords don\'t match');
					process.exit();
				}
			
				const user = new Users({
					'username' : in_user,
					'admin' : true
				});

				user._password = in_pass; // this is a virtual setter it hashes the password
				await user.save();
				console.log(`${in_user} added successfully`);
				process.exit();
			});
		});
	});
});

db.once('error', (err) => {
	console.log('Error connecting to Database');
	console.log(err.message);
	process.exit();
});
