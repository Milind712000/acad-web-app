/* eslint-disable no-unused-vars */

const router = require('express').Router();
const Courses = require('../models/Courses');
const save2disk = require('../helper/save2disk');

router.get('/editCourse', (req, res, next) => {
	if(req.query['id']){
		Courses.findById(req.query['id'])
			.then(course => {
				res.render('editCourse', {'ques' : course});
			}).catch(err => {
				next(err);
			});
	} else
		res.render('editCourse', {ques : {}});
});

router.post('/addCourse', save2disk.single('pdf-file'), (req, res, next) => {
	const course = new Courses({
		'courseCode' : req.body.code,
		'courseName' : req.body.name,
		'filename' : req.locals ? req.locals.filePath : null,
		'credit' : req.body.credit,
		'tags' : req.body.tags
	});	//TODO check if it already exists (course code should be unique)
	Courses.create(course)
		.then( course => {
			console.log(course);
			res.send(`${course.courseCode} : ${course.courseName} was saved succesfully`);
		})
		.catch( err => {
			next(err);
		});
	// TODO also add the id of this course to all groups
});

router.post('/editCourse', save2disk.single('pdf-file'), (req, res, next) => {
	const course = {
		'courseCode' : req.body.code,
		'courseName' : req.body.name,
		'credit' : req.body.credit,
		'tags' : req.body.tags
	};	//TODO check if it already exists (course code should be unique)
	if(req.locals && req.locals.filePath)
		course.filename = req.locals.filePath;

	Courses.findByIdAndUpdate(req.body._id, course, {new:true})// new flag returns the modified document
		.then(course => {
			res.render('editCourse', {'ques' : course});
		})
		.catch(err => {
			next(err);
		});
	// TODO also add the id of this course to all groups
});

module.exports = router;
