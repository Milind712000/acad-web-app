const router = require('express').Router();
const fn = require('express-async-handler');
const Courses = require('../models/Courses');
const Tags = require('../models/Tags');
const Archive = require('../models/Archive');
const {cacheThis} = require('../helper/cacheHelper');

// ================================ courses =================================

/*
	get all course objects
*/
router.get('/allCourseObjects',
	cacheThis,
	fn(async (req, res) => {
		const courseList = await Courses.find({},'-_id');
		res.send(courseList);
	})
);

/*
	get course object
	url parameter
	tagname -> tag name (tagname should be present in the database) (required) (2-30 characters) (allowed characters : a-z, A-Z, _, 0-9)
*/
router.get('/course/:code',
	cacheThis,
	fn(async (req, res) => {
		let course = await Courses.findOne({'courseCode':req.params.code},'-_id');
		course = course || {};
		res.send(course);
	})
);

/*
	get all objects with a certain tag
*/
router.get('/taggedCourses/:tagname',
	cacheThis,
	fn(async (req, res) => {
		const courses = await Courses.find({'tags':req.params.tagname},'-_id');
		res.send(courses);
	})
);



// ==================================== tags ==================================


/*
	get all tag objects
*/
router.get('/allTagObjects',
	cacheThis,
	fn(async (req, res) => {
		const taglist = await Tags.find({},'-_id');
		res.send(taglist);
	})
);

/*
	get tag object
	url parameter
	tagname -> tag name (tagname should be present in the database) (required) (2-30 characters) (allowed characters : a-z, A-Z, _, 0-9)
*/
router.get('/tag/:tagname',
	cacheThis,
	fn(async (req, res) => {
		let tag = await Tags.findOne({'name':req.params.tagname},'-_id');
		tag = tag || {};
		res.send(tag);
	})
);

// ==================================== archives ==========================================

router.get('/allArchives', 
	cacheThis,
	fn(async (req, res) => {
		const archives = await Archive.find({},'-_id');
		res.send(archives);
	})
);


module.exports = router;
