const router = require('express').Router();
const passport = require('passport');
const fn = require('express-async-handler');
const validator = require('express-validator');

const {ensureAuthenticated, forwardAuthenticated, ensureAdmin} = require('../helper/authHelper');
const Users = require('../models/Users');

// helper
const uniqueUsernameValidator = async (username) => {
	const user = await Users.findOne({'username':username},'_id');
	if(user)
		throw (new Error('Username already exists'));
	else
		return true;
};

const existingUsernameValidator = async (username) => {
	const user = await Users.findOne({'username':username},'_id');
	if(user)
		return true;
	else
		throw (new Error('Username does not exist'));
};

/*
validator
*/
const checkNewUser = [
	validator.body('username')
		.exists()
		.matches(/^[a-zA-Z0-9]{4,30}$/).withMessage('Only alphabets and numerals are allowed in username, and its length must be between 4 and 30 characters')
		.custom(uniqueUsernameValidator),
	validator.body('password')
		.exists().withMessage('password must be provided')
		.isLength({min:5, max:30}).withMessage('password must be 5 to 30 characters')
];

const checkEditOldUser = [
	validator.param('username')
		.exists()
		.custom(existingUsernameValidator),
	validator.param('username')
		.exists()
		.custom((username, {req}) => {
			if(username === req.locals.user.username || req.locals.user.admin){	//only the user himself or an admin may make changes
				return true;
			}
			throw (new Error('You are not authorized to make this change'));
		}),
	validator.body('admin')
		.custom((adminFlag, {req}) => {
			if (adminFlag && !req.locals.user.admin){	// user must be an admin to promote/demote other user to admin
				throw (new Error('You are not authorized to make this change'));
			}
			return true;
		}),
	validator.body('newPassword')
		.custom((newPassword, {req}) => {
			if(newPassword && newPassword !== req.body.newPasswordConfirm){ // if there is a new password it must match password confirmation
				throw (new Error('The two passwords don\'t match'));
			}
			return true;
		})
];

// ============================== routes ===============================================

/*
	make a new account
	req body : 
	username
	password
	secretKey
*/
router.post('/addUser', ensureAdmin, checkNewUser, fn(async(req, res) => {
	const errors = validator.validationResult(req);
	res.locals.errors = errors.errors;

	if(!errors.isEmpty()){
		return res.render('errors',{ 'backurl': req.headers.referer});
	}

	const user = new Users({
		'username' : req.body.username,
		'admin' : false
	});
	
	user._password = req.body.password; // this is a virtual setter it hashes the password
	await user.save();
	
	res.redirect('/users/manageUsers');
}));

/**
 * get add user page
 */
router.get('/addUser', ensureAdmin, (req, res) => {
	res.render('addUser');
});


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
 * route to change account info
 * req body
 * newPassword (optional) : to change current password
 * newPasswordConfirm (required only if newPassword is also provided) : must be same as newPassword
 * admin : admin Status of account, only provide if you intend to change current status
 */
router.post('/editUser/:username', 
	ensureAuthenticated,
	checkEditOldUser,
	fn(async(req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
		
		if(!errors.isEmpty()){
			return res.render('errors',{ 'backurl': req.headers.referer});
		}

		const user = await Users.findOne({'username':req.params.username});
		
		if(req.body.newPassword){
			user._password = req.body.newPassword;
		}
		
		if(req.body.admin){
			if(req.body.admin === 'true'){
				user.admin = true;
			} else {
				user.admin = false;
			}
		}
		await user.save();

		res.redirect('/edit');
	})
);

/**
 * get edit user page
 */
router.get('/editUser/:username',
	ensureAuthenticated,
	checkEditOldUser,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;

		if(!errors.isEmpty()){
			return res.render('errors',{ 'backurl': req.headers.referer}); // add backUrl to res.locals so that you don't pass it each time
		}
		const user = await Users.findOne({'username':req.params.username},'-_id username admin');
		res.render('editUser',{'username':user.username, 'admin':user.admin});
	})
);

/**
 * route to delete users
 * only admin may delete users
 */
router.post('/deleteUser/:username',
	ensureAdmin,
	fn(async(req, res) => {
		const user = await Users.findOne({'username':req.params.username});
		if(user.username === req.locals.user.username){
			req.logOut();
		}

		user.remove();
		
		res.redirect('/edit');	//TODO check for too many redirects error
	})
);

/**
 * get manage user page
 * only for admins
 * this page provides links to edit user page of every user
 */
router.get('/manageUsers', ensureAdmin, fn(async(req, res) => {
	const users = await Users.find({}, 'username admin');
	res.render('manageUsers', {'userList':users});
}));


module.exports = router;
