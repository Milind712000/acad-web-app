const router = require('express').Router();
const fn = require('express-async-handler');
const Courses = require('../models/Courses');
const Tags = require('../models/Tags');

router.get('/allCourses', (req, res, next) => {
	Courses.find({})
		.then(courseList => {
			res.render('courseList', {'courseList' : courseList});
		})
		.catch(err => {
			next(err);
		});
});

router.get('/allTags',fn(async (req, res, next) => {
	let tagList = await Tags.tagnameList();
	res.render('tagList', {'tagList': tagList});
}));

module.exports = router;
