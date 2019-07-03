/* eslint-disable no-unused-vars */

const router = require('express').Router();
const save2disk = require('../helper/save2disk');
const fn = require('express-async-handler');
const fileSystem = require('fs');
const Courses = require('../models/Courses');
const Tags = require('../models/Tags');


// courses

router.get('/editCourse', fn(async (req, res, next) => {
	let tagList = await Tags.tagnameList();
	
	if(req.query['id']){
		const existing_course = await Courses.findById(req.query['id']);
		res.render('editCourse', {'course' : existing_course, 'tagList': tagList});
	} else
		res.render('editCourse', {'course' : {}, 'tagList': tagList});
}));

router.post('/addCourse', save2disk.single('pdf-file'), fn(async(req, res, next) => {
	const course = {
		'courseCode' : req.body.code,
		'courseName' : req.body.name,
		'filename' : req.locals ? req.locals.filePath : null,
		'credit' : req.body.credit,
		'tags' : req.body.tags || []
	};

	// check if it already exists (course code should be unique)
	if(await Courses.doesCourseExist(course.courseCode)){
		next(new Error('Course already exists'));
	}

	// check if all tags sent exist in database
	if(typeof(req.body.tags) === 'string')
		req.body.tags = [req.body.tags];
	for (let i = 0; i < course.tags.length; i++) {
		const tagName = course.tags[i];
		if( !(await Tags.doesTagExist(tagName)) ){
			return next(new Error(`${tagName} not found`));
		}
	}

	const new_Course = await Courses.create(course);
	const new_course_tagList = new_Course.tags;
	
	// add course to tags
	for (let i = 0; i < new_course_tagList.length; i++) {
		const tagName = new_course_tagList[i];
		const tag = await Tags.findOne({'name':tagName});
		await tag.addCourseToTag(new_Course.courseCode);
	}

	res.redirect('/display/allCourses');
}));

router.post('/editCourse', save2disk.single('pdf-file'), fn(async(req, res, next) => {
	const existing_course = await Courses.findOne({'courseCode' : req.body.code});
	
	if(!(existing_course)){
		return next(new Error(`${req.body.courseCode} does not exist`));
	}

	// update name and credit
	existing_course.courseName = req.body.name;
	existing_course.credit = req.body.credit;

	// check if all tags sent exist in database
	if(typeof(req.body.tags) === 'string')
		req.body.tags = [req.body.tags];
	for (let i = 0; i < req.body.tags.length; i++) {
		const tagName = req.body.tags[i];
		if( !(await Tags.doesTagExist(tagName)) ){
			return next(new Error(`${tagName} not found`));
		}
	}

	// update tag list
	existing_course.tags = req.body.tags;
	
	// update pdf-file
	if(req.locals && req.locals.filePath){ //check if a new file has been sent
		// delete old file
		const filename = existing_course.filename;
		fileSystem.unlink('./public/pdf/' + filename, function(err) {
			if(err && err.code == 'ENOENT') {
				console.warn(`${filename} doesn't exist, won't remove it.`); // file doens't exist
			} else if (err) {
				console.error(`Error occurred while trying to remove file ${filename}`); // other errors, e.g. maybe we don't have enough permission
			} else {
				console.info(`removed ${filename}`);
			}
		});

		existing_course.filename = req.locals.filePath; // update if new file else use existing
	}

	existing_course.save(); // save changes

	// remove course from all tags
	const tagList = await Tags.tagnameList();
	for (let i = 0; i < tagList.length; i++) {
		const tagName = tagList[i];
		const tag = await Tags.findOne({'name':tagName});
		await tag.removeCourseFromTag(existing_course.courseCode);
	}
	// add course to new tags
	for (let i = 0; i < req.body.tags.length; i++) {
		const tagName = req.body.tags[i];
		const tag = await Tags.findOne({'name':tagName});
		await tag.addCourseToTag(existing_course.courseCode);
	}
	
	res.redirect('/display/allCourses');
}));

// tags
router.get('/addTag', (req, res, next) => {
	res.render('addTag');
});

router.post('/addTag', fn(async(req, res, next) => {
	const tag = {
		name : req.body.name
	};
	if(await Tags.doesTagExist(tag.name)){	// make sure tag does not already exists
		return next(new Error(`${tag.name} already exists`));
	}
	await Tags.create(tag);
	res.redirect('/display/allTags');
}));

module.exports = router;
