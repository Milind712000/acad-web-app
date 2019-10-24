const fn = require('express-async-handler');
const router = require('express').Router();
const validator = require('express-validator');

const fileStorage = require('../helper/storageHelper');
const Courses = require('../models/Courses');
const Tags = require('../models/Tags');
const Archive = require('../models/Archive');
const {ncache} = require('../helper/cacheHelper');

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

const removeDuplicateCourseCodes = (courseCodeArray) => {
	return Array.from(new Set(courseCodeArray));
};

const courseListValidator = async (courseCodeArray) => {
	for (let i = 0; i < courseCodeArray.length; i++) {
		const courseCode = courseCodeArray[i];
		if(!(await Courses.doesCourseExist(courseCode)))
			throw (new Error(`courseCode : ${courseCode} not found`));
		
	}
};


//validators
const checkCourseInfo = [
	validator.body('ltpc')
		.exists().withMessage('LTPC is a compulsory field'),
	validator.body('code', 'Invalid Course Code : Course Code must be of format AB-XYZ - (A,B - are letters, X,Y,Z - are digits)')
		.exists().withMessage('Course Code is compulsory field')
		.matches(/^[A-Z]{2}-\d{3}P?$/).withMessage('Course Code must be of format AB-XYZ or AB-XYZP - (A,B - are letters, X,Y,Z - are digits)'),
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
		.custom(uniqueCourseCodeValidator)
];

// check old course for updating
const checkOldCourseUpdate = [
	validator.body('objID')
		.exists()
		.custom(async (objID, {req}) => {
			const targetCourse = await Courses.findById(objID);
			if(!targetCourse){
				throw (new Error('Course Object ID is invalid'));
			}
			if(!req.body.code){
				throw (new Error('Course Code is compulsory'));
			}
			const codeCourse = await Courses.findOne({'courseCode' : req.body.code});
			if(codeCourse){
				// a course with same code already exists or the course code hasn't been changed
				if(codeCourse.id === objID) {
					// course code hasn't been changed
					return true;
				} else {
					//another course with the same name exists
					throw (new Error('Course Code already in use'));
				}
			}
		})
];

const checkOldTagUpdate = [
	validator.body('objID')
		.exists()
		.custom(async (objID, {req}) => {
			const targetTag = await Tags.findById(objID);
			if(!targetTag){
				throw (new Error('Tag Object ID is invalid'));
			}
			if(!req.body.name){
				throw (new Error('TagName is compulsory'));
			}
			const tagname = await Tags.findOne({'name' : req.body.name});
			if(tagname){
				// a Tag with same code already exists or the Tag code hasn't been changed
				if(tagname.id === objID) {
					// Tag code hasn't been changed
					return true;
				} else {
					//another Tag with the same name exists
					throw (new Error('Tag name already in use'));
				}
			}
			return true;
		})
];

const checkOldArchive = [
	validator.body('objID')
		.exists()
		.custom(async (objID) => {
			const target = await Archive.findById(objID);
			if(!target) {
				throw (new Error('Archived file not found for this ID'));
			} else return true;
		})
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

const checkArchive = [
	validator.body('title')
		.exists().withMessage('Title of file is compulsory')
		.isLength({min:5, max :300}).withMessage('The lenght of title must be 5 to 300 characters')
];

const checkCourseList = [
	validator.body('courseList','Invalid courseCodes : It must be an array of allowed courseCodes')
		.toArray()
		.customSanitizer(removeDuplicateCourseCodes)
		.custom(courseListValidator)
];
//routes

// ==================================== courses ==========================================

/*
	add course to database
	request body enctype = multipart/form-data
	code -> course code	XY-ABC	(X,Y - letters(upper case)) (A,B,C - digits) (required)
	ltpc -> A-B-C-D (string) (A,B,C,D should be floating point numbers)
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
		res.locals.errors = errors.errors;
		

		if(!errors.isEmpty()){
			//delete file
			fileStorage.delete('./tempFiles/'+req.locals.filename);
			return res.render('errors',{ 'backurl': req.headers.referer});
		} else {

			const course = {
				'courseCode' : req.body.code,
				'courseName' : req.body.name,
				'filename' : req.locals.filename || '#',
				'ltpc' : req.body.ltpc,
				'tags' : req.body.tags
			};
			
			if(course.filename !== '#'){
				// move file to public pdf
				fileStorage.move('./tempFiles/'+course.filename, './public/pdf/'+course.filename, err => {
					if(err) next(err);
				});
			}

			// add course to db
			await Courses.create(course);
			
			// add course to tags
			for (let i = 0; i < course.tags.length; i++) {
				const tagName = course.tags[i];
				const tag = await Tags.findOne({'name':tagName});
				await tag.addCourseToTag(course.courseCode);
			}

			ncache.flushAll();
			return res.redirect('/edit/allCourses');
		}
	}
	)
);

/*
	edit course in database
	request body enctype = multipart/form-data
	code -> course code	XY-ABC	(X,Y - letters(upper case)) (A,B,C - digits) (required)
	ltpc -> A-B-C-D (string) (A,B,C,D should be floating point numbers)	
	name -> course name (required) (5-70 characters) (required)
	tags -> list of tagnames (all tags must be present in the database) (optional)
	x-file-upload -> attach pdf file (maxSize : 5mb, singlefile, pdf) (optional)
*/
router.post('/editCourse',
	checkOldCourseUpdate,
	checkCourseInfo,
	fn(async (req, res, next) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
		

		if(!errors.isEmpty()){
			//delete file
			fileStorage.delete('./tempFiles/'+req.locals.filename);
			return res.render('errors',{ 'backurl': req.headers.referer});
		} else {
			const existing_course = await Courses.findById(req.body.objID);
			const oldCourseCode = existing_course.courseCode;

			// update course details
			existing_course.courseCode = req.body.code;
			existing_course.courseName = req.body.name;
			existing_course.ltpc = req.body.ltpc;
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
				await tag.removeCourseFromTag(oldCourseCode);
			}
			// add course to new tags
			for (let i = 0; i < req.body.tags.length; i++) {
				const tagName = req.body.tags[i];
				const tag = await Tags.findOne({'name':tagName});
				await tag.addCourseToTag(existing_course.courseCode);
			}

			ncache.flushAll();
			return res.redirect('/edit/allCourses');
		}
	})
);


/*
	delete course form database
	url parameters
	code -> course code	XY-ABC	(X,Y - letters(upper case)) (A,B,C - digits) (should be already present in database) (required)
*/
router.post('/deleteCourse/:code',
	checkOldCourseParam,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
		
	
		if(!errors.isEmpty()){
			return res.render('errors',{ 'backurl': req.headers.referer});
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
			
			ncache.flushAll();
			return res.redirect('/edit/allCourses');
		}
	})
);

/*
	get all course page
*/
router.get('/allCourses',
	fn(async (req, res) => {
		let courseList = await Courses.find({},'-_id');
		courseList = courseList || [];
		res.render('allCourses',{'courses':courseList});
	})
);

/*
	get add course page
*/
router.get('/addCourse',
	fn(async (req, res) => {
		let tagList = await Tags.tagnameList();
		res.render('addCourse',{'tagList':tagList});
	})
);


/*
	get edit course page
*/
router.get('/editCourse/:code',
	checkOldCourseParam,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
	
		if(!errors.isEmpty()){
			return res.render('errors',{ 'backurl': req.headers.referer});
		} else{
			let course = await Courses.findOne({'courseCode' : req.params.code});
			let tagList = await Tags.tagnameList();
			res.render('editCourse',{'tagList':tagList, 'course':course});
		}
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
	checkCourseList,
	fn(async(req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
		

		if(!errors.isEmpty()){
			return res.render('errors',{ 'backurl': req.headers.referer});
		} else {
			const tag = {
				'name' : req.body.tagname,
				'courseList' : req.body.courseList
			};

			await Tags.create(tag);

			// add tag to courses
			console.log(req.body);
			for (let i = 0; i < req.body.courseList.length; i++) {
				const courseCode = req.body.courseList[i];
				const course = await Courses.findOne({'courseCode':courseCode});
				await course.addTagToCourse(tag.name);
			}
			ncache.flushAll();
			return res.redirect('/edit/allTags');
		}
	})
);

/*
	add course to database
	url parameters
	tagname -> tag name (tagname should be present in the database) (required) (2-30 characters) (allowed characters : a-z, A-Z, _, 0-9)
*/
router.post('/deleteTag/:tagname',
	checkOldTag,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
		

		if(!errors.isEmpty()){
			return res.render('errors',{ 'backurl': req.headers.referer});
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
			ncache.flushAll();
			return res.redirect('/edit/allTags');
		}
	})
);

/*
	get all Tags page
*/
router.get(['/allTags', '/'],
	fn(async (req, res) => {
		let tagList = await Tags.find({},'-_id');
		tagList = tagList || [];
		res.render('allTags',{'tagList':tagList});
	})
);


/*
	get add Tags page
*/
router.get('/addTag',
	fn(async (req, res) => {
		let courseList = await Courses.find({});
		courseList = courseList.map((obj) => {
			return obj.courseCode;
		});
		res.render('addTag', {courseList});
	})
);


/*
	edit tag in database
	request body enctype = json or url encoded
	name -> tag name (tagname should be present in the database) (required) (2-30 characters) (allowed characters : a-z, A-Z, _, 0-9)
	courseList -> list of courseCodes (all tags must be present in the database) (optional)
*/
router.post('/editTag',
	checkOldTagUpdate,
	checkCourseList,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;

		if(!errors.isEmpty()){
			//delete file
			fileStorage.delete('./tempFiles/'+req.locals.filename);
			return res.render('errors',{ 'backurl': req.headers.referer});
		} else {
			const existing_tag = await Tags.findById(req.body.objID);
			const oldTagName = existing_tag.name;

			// update course details
			existing_tag.name = req.body.name;
			existing_tag.courseList = req.body.courseList;

			// save changes to course
			await existing_tag.save();

			//update tagname in all courses
			let courseList = await Courses.find({});
			courseList = courseList.map((obj) => {
				return obj.courseCode;
			});
			for (let i = 0; i < courseList.length; i++) {
				const courseCode = courseList[i];
				const course = await Courses.findOne({'courseCode':courseCode});
				await course.removeTagFromCourse(oldTagName);
				if(req.body.courseList.indexOf(course.courseCode) !== -1){
					await course.addTagToCourse(existing_tag.name);
				}
			}
			ncache.flushAll();
			return res.redirect('/edit/allTags');
		}
	})
);


/*
	get edit course page
*/
router.get('/editTag/:tagname',
	checkOldTag,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
	
		if(!errors.isEmpty()){
			return res.render('errors',{ 'backurl': req.headers.referer});
		} else{
			const tag = await Tags.findOne({'name': req.params.tagname});
			let courseList = await Courses.find({}, 'courseCode');
			courseList = courseList.map((obj) => {
				return obj.courseCode;
			});
			return res.render('editTag', {'tag' : tag, 'courseList' : courseList});
		}
	})
);

// ==================================== archives ==========================================

/*
	add archive to database
	request body enctype = multipart/form-data
	title -> file title	string (5 - 300)characters
	x-file-upload -> attach pdf file (maxSize : 5mb, singlefile, pdf) (required)
*/
router.post('/addArchive',
	checkArchive,
	fn(async (req, res, next) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
		
		if(!errors.isEmpty()){
			//delete file
			fileStorage.delete('./tempFiles/'+req.locals.filename);
			return res.render('errors',{ 'backurl': req.headers.referer});
		} else {

			const archive = {
				'title' : req.body.title,
				'filename' : req.locals.filename || '#'
			};
			
			if(archive.filename !== '#'){
				// move file to public pdf
				fileStorage.move('./tempFiles/'+archive.filename, './public/pdf/'+archive.filename, err => {
					if(err) next(err);
				});
			}

			// add archive to db
			await Archive.create(archive);
			ncache.flushAll();
			return res.redirect('/edit/allArchives');
		}
	}
	)
);

/*
	delete course from database
	req body
	objID -> mongoose object of archive file
*/
router.post('/deleteArchive',
	checkOldArchive,
	fn(async (req, res) => {
		// check for validation errors
		const errors = validator.validationResult(req);
		res.locals.errors = errors.errors;
		
		if(!errors.isEmpty()){
			return res.render('errors',{ 'backurl': req.headers.referer});
		} else {
			const existing_archive = await Archive.findById(req.body.objID);

			// delete old file
			fileStorage.delete('./public/pdf/' + existing_archive.filename);

			// remove course
			await existing_archive.remove();
			
			ncache.flushAll();
			return res.redirect('/edit/allArchives');
		}
	})
);

/**
 * Get All Archive Page
 */
router.get('/allArchives', fn(async (req, res) => {
	let archiveList = await Archive.find({});
	archiveList = archiveList || [];
	res.render('allArchive',{'archives':archiveList});
}));

/**
 * Get add archive page
 */
router.get('/addArchive', fn(async(req, res) => {
	res.render('addArchive');
}));

module.exports = router;
