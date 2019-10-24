// module imports
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const favicon = require('serve-favicon');
const compression = require('compression');
const helmet = require('helmet');
const fileStorage = require('./helper/storageHelper');
const passport = require('passport');
const passportLocal = require('passport-local');
const session = require('express-session');
const {ensureAuthenticated} = require('./helper/authHelper');
const dbConfig = require('./config/dbKeys-test');
const Users = require('./models/Users');
const dotenv = require('dotenv');
const {ncache} = require('./helper/cacheHelper');

dotenv.config();
const app = express();

// compress all responses
// else nginx can do the compression
if(process.env.compress_internally){
	app.use(compression());
}

// cache and serve favico
app.use(favicon(path.join(__dirname, 'public', 'fav-ico.png')));
// protection against common attacks
app.use(helmet());

// connect to database
mongoose.Promise = global.Promise;
mongoose.connect(dbConfig.URI, {
	useNewUrlParser: true,
	useFindAndModify: false
});
const db = mongoose.connection;

db.once('open', () => {
	console.log('MongoDB connected');
});

db.once('error', (err) => {
	console.log('Error connecting to Database');
	console.log(err.message);
});

// serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// setup template engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// log all requests
app.use((req, res, next) => {
	console.log('========================================================='); //seperate different logs
	next();
});
app.use(morgan('tiny'));

// initialise req and res locals to help in rendering
app.use((req, res, next) => {
	req.locals = req.locals || {};
	res.locals = res.locals || {};
	res.locals.errors = res.locals.errors || [];
	res.locals.user = res.locals.user || {};
	next();
});

// express body-parser
app.use(express.json({	// for json data
	limit: '5MB',
	extended: true
}));
app.use(express.urlencoded({ // x-www-form-urlencoded
	limit: '5MB',
	extended: true
}));
app.use(fileStorage.upload.single('x-file-upload')); // form-data and pdf file uploads (single file with field name x-file-upload)


// assign sessions to users
app.use(session({
	'secret': 'secret, this is',
	'resave': true,
	'saveUninitialized': true
}));

// passport config
passport.use(new passportLocal.Strategy(
	{
		'usernameField': 'username',
		'passwordField': 'password'
	},
	async (username, password, done) => {
		try {
			const user = await Users.findOne({username : username});	// TODO add better error handler instead of try except
			if(!user) {
				console.log('User not found');
				done(null, false);
			} else if(!user.checkPassword(password)) {
				console.log('wrong password');
				done(null, false);
			} else {
				done(null, user);
			}
		} catch (error) {
			done(error);
		}
	}
));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser( (user, done) => {
	done(null, user.username);
});

passport.deserializeUser( (username, done) => {
	Users.findOne( {username : username}, '-_id admin username')
		.then( user => {
			done(null, user);
		})
		.catch( err => {
			done(err);
		});
});

// Log the user
app.use((req, res, next) => {
	res.locals.user = req.user || {};
	req.locals.user = req.user || {};
	console.log('USER : ', res.locals.user);
	next();
});

// routes
const edit = require('./routes/edit');
const fetch = require('./routes/fetch');
const users = require('./routes/users');
const index = require('./routes/index');

app.use('/',index);
app.use('/users', users);
app.use('/fetch', fetch);
app.use('/edit', ensureAuthenticated, edit);

// for invalid paths
app.use((req, res) => {
	res.send('Page not found');
});

// error handling
app.use((err, req, res, next) => {
	
	// remove unresolved temporary file
	if(req.locals.filename) fileStorage.delete('./tempFiles/'+req.locals.filename);
	console.log('ErrorMessage : ',err);
	
	if (res.headersSent) next(err);
	
	if(err instanceof require('multer').MulterError || err.message === 'Only pdfs are allowed') { // multer file filter is does not throw multer error so its been hardcoded
		const errObj = {
			msg : err.message
		};
		res.locals.errors = res.locals.errors || [];
		res.locals.errors.push(errObj);
	}
	
	res.render('errors',{ 'backurl': req.headers.referer});
	
	// clear the cache after sending the response
	// this has to be done after the respose is sent as my cache module automatically caches the response
	// and in this case it cached the error as an actual response
	ncache.flushAll();
	return;
});

//listen for requests
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Server started listening on PORT : ${PORT}`);
});
