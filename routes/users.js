const router = require('express').Router();
const passport = require('passport');
const fn = require('express-async-handler');
const validator = require('express-validator');

const {ensureAuthenticated, forwardAuthenticated} = require('../helper/authHelper');
const Users = require('../models/Users');

// helper
const uniqueUsernameValidator = async (username) => {
	const user = await Users.findOne({'username':username},'_id');
	if(user)
		throw (new Error('Username already exists'));
	else
		return true;
};

/*
validator
*/
const checkNewUsername = [
	validator.body('username')
		.exists()
		.custom(uniqueUsernameValidator)
];

// ============================== routes ===============================================

/*
	make a new account
	req body : 
	username
	password
	secretKey
*/
router.post('/signup', forwardAuthenticated, checkNewUsername, fn(async(req, res) => {
	// uncomment the following line to disable this route
	// return res.send("This route is disabled")

	const errors = validator.validationResult(req);
	res.locals.errors = errors.errors;

	if(!errors.isEmpty()){
		return res.render('errors',{ 'backurl': req.headers.referer});
	}

	// TODO instead of using a secret key check if the user is (logged in + admin)
	if(req.body.secretKey !== 'IicOaskJdg') {	// so that only authorised requests are allowed
		return res.send('You are not authorized to create new users');
	}

	const user = new Users({
		'username' : req.body.username
	});
	
	user._password = req.body.password; // this is a virtual setter it hashes the password
	await user.save();
	res.send(`${user.username} has been saved`);
}));

/*
	logout route
*/
router.get('/logout', ensureAuthenticated, (req, res) => {
	req.logOut();
	res.redirect('/');
});


/*
	get login page
*/
router.get('/login', forwardAuthenticated, (req, res) => {
	res.render('Login');
});

/*
	login route
	req body :
	username
	password
*/
router.post('/login', forwardAuthenticated, passport.authenticate('local',
	{
		successRedirect : '/edit',
		failureRedirect : '/users/login'
	}
));

/**
 * Edit User route/page
 * change password
 * delete account
 */

/**
 * Admin page
 * to add/delete users
 * change current passwords of any user
 */

module.exports = router;
