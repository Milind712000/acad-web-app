/* eslint-disable no-unused-vars */

const router = require('express').Router();
const Courses = require('../models/Courses');
const save2disk = require('../helper/save2disk');
// const fn = require('express-async-handler');

router.get('/', (req, res) => {
	res.send('You\'ve reached the Home Page 0w0');
});

router.get('/pdfupload', (req, res, next) => {
	res.render('pdfupload');
});

router.post('/pdfupload', save2disk.single('course-pdf'), (req, res, next) => {
	const course = new Courses({
		'courseCode' : req.body.code,
		'courseName' : req.body.name,
		// 'filename' : req.locals.filePath,
		'credit' : req.body.credit,
		'tags' : req.body.tags
	});
	Courses.create(course)
		.then( course => {
			console.log(course);
			res.send(`${course.courseCode} : ${course.courseName} was saved succesfully`);
		})
		.catch( err => {
			console.log(err);
			res.send('Couldn\'t save course');
		});
	// TODO also add the id of this course to all groups
});


























module.exports = router;