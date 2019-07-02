const router = require('express').Router();
const Courses = require('../models/Courses');

router.get('/all', (req, res, next) => {
	Courses.find({})
		.then(courseList => {
			res.send(courseList);
		})
		.catch(err => {
			next(err);
		});
});

module.exports = router;
