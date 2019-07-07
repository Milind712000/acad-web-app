const fn = require('express-async-handler');
const router = require('express').Router();
const validator = require('express-validator');

const fileStorage = require('../helper/storageHelper');
const Courses = require('../models/Courses');
const Tags = require('../models/Tags');

//helper functions
const uniqueCourseCodeValidator = async (courseCode) => {
	if(await Courses.doesCourseExist(courseCode))
		throw (new Error('Course Code already exists'));
	else
		return true;
};

const existingCourseCodeValidator = async (courseCode) => {
	if(await Courses.doesCourseExist(courseCode))
		return true;
	else
		throw (new Error('Course Code does not exist'));
};

const uniqueTagValidator = async (tagname) => {
	if(await Tags.doesTagExist(tagname))
		throw (new Error(`Tag ${tagname} already exists`));
	else
		return true;
};

const existingTagValidator = async (tagname) => {
	if(await Tags.doesTagExist(tagname))
		return true;
	else
		throw (new Error(`Tag ${tagname} does not exist`));
};

const removeDuplicateTags = (tagArray) => {
	return Array.from(new Set(tagArray));
};

const tagValidator = async (tagArray) => {
	for (let i = 0; i < tagArray.length; i++) {
		const tagName = tagArray[i];
		if(!(await Tags.doesTagExist(tagName)))
			throw (new Error(`tag ${tagName} not found`));
	}
	return true;
};

//validators
const checkCourseInfo = [
	validator.body('credit', 'invalid credit value : it must be an integer between 1 and 10')
		.exists().withMessage('Credit is a required field')
		.isInt({min:1, max:10}).withMessage('credit must be an integer between 1 and 10')
		.toInt(),
	validator.body('code', 'Invalid Course Code : Course Code must be of format AB-XYZ - (A,B - are letters, X,Y,Z - are digits)')
		.exists().withMessage('Course Code is compulsory field')
		.matches(/^[A-Z]{2}-\d{3}$/).withMessage('Course Code must be of format AB-XYZ - (A,B - are letters, X,Y,Z - are digits)'),
	validator.body('name', 'Invalid Course Name')
		.exists().withMessage('Course Name is compulsory')
		.isLength({min:5, max:70}).withMessage('Course Name length must be between 5 to 70 characters'),
	validator.body('tags','Invalid tags : It must be an array of allowed tagnames')
		.toArray()
		.customSanitizer(removeDuplicateTags)
		.custom(tagValidator)
];

const checkNewCourse = [
	validator.body('code')
		.exists()
		.custom(uniqueCourseCodeValidator),
	validator.body('filename', 'course pdf file is compulsory').exists()	// this field is manually added by multer method
];

const checkOldCourse = [
	validator.body('code')
		.exists()
		.custom(existingCourseCodeValidator)
];

const checkOldCourseParam = [
	validator.param('code')
		.exists()
		.custom(existingCourseCodeValidator)
];

const checkNewTag = [
	validator.body('tagname')
		.exists().withMessage('tagname must be provided')
		.isString().withMessage('tagname must be a string')
		.matches(/^[a-zA-Z0-9_]{2,30}$/).withMessage('tagname can only contain letters(a-z,A-Z), numbers(0-9) and underscore(_) and its length must be between 2 and 30 characters.')
		.custom(uniqueTagValidator)
];

const checkOldTag = [
	validator.param('tagname')
		.exists().withMessage('tagname must be provided')
		.custom(existingTagValidator)
];

//routes

// ==================================== courses ==========================================

/*
	add course to database
	request body enctype = multipart/form-data
	code -> course code	XY-ABC	(X,Y - letters(upper case)) (A,B,C - digits) (required)
	credit -> integer (1-10) (required)
	name -> course name (required) (5-70 characters) (required)
	tags -> list of tagnames (all tags must be present in the database) (optional)
	x-file-upload -> attach pdf file (maxSize : 5mb, singlefile, pdf) (required)
*/
router.post('/addCourse',
	checkNewCourse,
	checkCourseInfo,
	fn(async (req, res, next) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors;

		if(!errors.isEmpty()){
			//delete file
			fileStorage.delete('./tempFiles/'+req.locals.filename);
			return res.send(errors); // TODO res.render('addPageView', {errors : errors})
		} else {

			const course = {
				'courseCode' : req.body.code,
				'courseName' : req.body.name,
				'filename' : req.locals.filename,
				'credit' : req.body.credit,
				'tags' : req.body.tags
			};
			
			// move file to public pdf
			fileStorage.move('./tempFiles/'+course.filename, './public/pdf/'+course.filename, err => {
				if(err) next(err);
			});
			
			// add course to db
			await Courses.create(course);
			
			// add course to tags
			for (let i = 0; i < course.tags.length; i++) {
				const tagName = course.tags[i];
				const tag = await Tags.findOne({'name':tagName});
				await tag.addCourseToTag(course.courseCode);
			}

			return res.send('success'); // TODO res.redirect('allCourses')
		}
	}
	)
);

/*
	edit course in database
	request body enctype = multipart/form-data
	code -> course code	XY-ABC	(X,Y - letters(upper case)) (A,B,C - digits) (required)
	credit -> integer (1-10) (required)
	name -> course name (required) (5-70 characters) (required)
	tags -> list of tagnames (all tags must be present in the database) (optional)
	x-file-upload -> attach pdf file (maxSize : 5mb, singlefile, pdf) (optional)
*/
router.post('/editCourse',
	checkOldCourse,
	checkCourseInfo,
	fn(async (req, res, next) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors;

		if(!errors.isEmpty()){
			//delete file
			fileStorage.delete('./tempFiles/'+req.locals.filename);
			return res.send(errors); // TODO res.render('addPageView', {errors : errors})
		} else {
			const existing_course = await Courses.findOne({'courseCode' : req.body.code});

			// update course details
			existing_course.courseName = req.body.name;
			existing_course.credit = req.body.credit;
			existing_course.tags = req.body.tags;


			if(req.locals.filename){ // only do file operations if new file is uploaded
				// delete old file
				fileStorage.delete('./public/pdf/' + existing_course.filename);
				
				existing_course.filename = req.locals.filename;
			
				// move file to public pdf
				fileStorage.move('./tempFiles/'+existing_course.filename, './public/pdf/'+existing_course.filename, err => {
					if(err) next(err);
				});
			}

			// save changes to course
			await existing_course.save();
			
			// update tags
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

			return res.send('success'); // TODO res.redirect('allCourses')
		}
	})
);


/*
	delete course form database
	url parameters
	code -> course code	XY-ABC	(X,Y - letters(upper case)) (A,B,C - digits) (should be already present in database) (required)
*/
router.delete('/deleteCourse/:code',
	checkOldCourseParam,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors;
	
		if(!errors.isEmpty()){
			return res.send(errors); // TODO res.render('addPageView', {errors : errors})
		} else {
			const existing_course = await Courses.findOne({'courseCode' : req.params.code});
	
			// delete old file
			fileStorage.delete('./public/pdf/' + existing_course.filename);

			// update tags
			// remove course from all tags
			const tagList = await Tags.tagnameList();
			for (let i = 0; i < tagList.length; i++) {
				const tagName = tagList[i];
				const tag = await Tags.findOne({'name':tagName});
				await tag.removeCourseFromTag(existing_course.courseCode);
			}
			
			// remove course
			await existing_course.remove();
				
			return res.send('success'); // TODO res.redirect('allCourses')
		}
	})
);

/*
	get all course objects
*/
router.get('/allCourse',
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
	fn(async (req, res) => {
		const course = await Courses.findOne({'courseCode':req.params.code},'-_id');
		res.send(course);
	})
);

// ==================================== tags ==========================================

/*
	add tag to database
	request body
	tagname -> tag name (required) (2-30 characters) (allowed characters : a-z, A-Z, _, 0-9)
*/
router.post('/addTag',
	checkNewTag,
	fn(async(req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors;

		if(!errors.isEmpty()){
			res.send(errors); // TODO res.render('addPageView', {errors : errors})
		} else {
			await Tags.create({'name': req.body.tagname});
			res.send('success');	// TODO res.redirect(/"alltags")
		}
	})
);

/*
	add course to database
	url parameters
	tagname -> tag name (tagname should be present in the database) (required) (2-30 characters) (allowed characters : a-z, A-Z, _, 0-9)
*/
router.delete('/deleteTag/:tagname',
	checkOldTag,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors;

		if(!errors.isEmpty()){
			res.send(errors); // TODO res.render('addPageView', {errors : errors})
		} else {
			const tag = await Tags.findOne({'name': req.params.tagname});
			const courseList = tag.courseList;

			// remove tag from all courses
			for (let i = 0; i < courseList.length; i++) {
				const courseCode = courseList[i];
				const course = await Courses.findOne({'courseCode':courseCode});
				await course.removeTagFromCourse(tag.name);
			}

			// delete tag
			tag.remove();

			res.send('success');	// TODO res.redirect(/"alltags")
		}
	})
);

/*
	get all tag objects
*/
router.get('/allTags',
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
	fn(async (req, res) => {
		const tag = await Tags.findOne({'name':req.params.tagname},'-_id');
		res.send(tag);
	})
);

module.exports = router;
