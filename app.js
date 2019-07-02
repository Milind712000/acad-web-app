// module imports
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');

// router imports
const index = require('./routes/index');
const course = require('./routes/course');
const uploadPortal = require('./routes/uploadPortal');
const display = require('./routes/display');

// other imports
const dbConfig = require('./config/dbKeys-local');

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

// express body-parser
app.use(express.json({
	limit: '30MB',
	extended: true
}));
app.use(express.urlencoded({
	limit: '30MB',
	extended: true
}));

// routes
app.use('/', index);
app.use('/course', course);
app.use('/edit', uploadPortal);
app.use('/display', display);

// for invalid paths
app.use((req, res) => {
	res.send('Page not found');
});

// error handling
app.use((err, req, res, next) => {
	console.log('ErrorMessage : ',err.message);
	if (res.headersSent) next(err);
	res.send('Something Broke !!');
});

//listen for requests
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Server started listening on PORT : ${PORT}`);
});
