// module imports
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const fileStorage = require('./helper/storageHelper');

// other imports
const dbConfig = require('./config/dbKeys-atlas');

const app = express();

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
app.use(morgan('tiny'));

// initialise req and res locals
app.use((req, res, next) => {
	req.locals = req.locals || {};
	res.locals = res.locals || {};
	res.locals.errors = res.locals.errors || [];
	next();
});

// express body-parser
app.use(express.json({	// for json data
	limit: '30MB',
	extended: true
}));
app.use(express.urlencoded({ // x-www-form-urlencoded
	limit: '30MB',
	extended: true
}));
app.use(fileStorage.upload.single('x-file-upload')); // form-data and pdf file uploads (single file with field name x-file-upload)


// routes
const edit = require('./routes/edit');

app.get('/', (req, res) => {
	res.redirect('/edit/allCourses');
});

app.use('/edit', edit);

// for invalid paths
app.use((req, res) => {
	res.send('Page not found');
});

// error handling
app.use((err, req, res, next) => {
	// remove unresolved temporary file
	if(req.locals.filename) fileStorage.delete('./tempFiles/'+req.locals.filename);
	console.log('ErrorMessage : ',err);
	
	if(err instanceof require('multer').MulterError) {
		const errObj = {
			msg : err.message
		};
		res.locals.errors = res.locals.errors || [];
		res.locals.errors.push(errObj);
	}
	
	if (res.headersSent) next(err);
	return res.render('errors',{ 'backurl': req.headers.referer});
});

//listen for requests
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Server started listening on PORT : ${PORT}`);
});
