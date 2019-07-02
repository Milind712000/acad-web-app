const router = require('express').Router();
const Courses = require('../models/Courses');

router.get('/all', (req, res, next) => {
	Courses.find({})
		.then(courseList => {
			res.render('courseList', {'courseList' : courseList});
		})
		.catch(err => {
			next(err);
		});
});

module.exports = router;
