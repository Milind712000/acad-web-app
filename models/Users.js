const mongoose = require('mongoose');
const schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const saltRounds = 10;

const user = new schema({
	username : {
		type : String,
		required : true
	},
	hashedPassword : {
		type : String,
		required : true
	},
	admin: {
		type : Boolean,
		default : false
	},
	DOC : {					// Date of Creation
		type : Date,
		default : Date.now()
	}
});

user.methods.checkPassword = function(password) {
	try {
		if ( bcrypt.compareSync(password, this.hashedPassword) ) return true;
		else return false;
	} catch (error) {
		console.log(error.message);
	}
};

// TODO virtuals setter for password which hashes the password before storing
user.virtual('_password').set( function (password) {
	const salt = bcrypt.genSaltSync(saltRounds);
	this.hashedPassword = bcrypt.hashSync(password, salt);
});


const User = mongoose.model('User', user);

module.exports = User;
