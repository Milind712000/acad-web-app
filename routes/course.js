const router = require('express').Router();
const Courses = require('../models/Courses');
const Tags = require('../models/Tags');
const fn = require('express-async-handler');

router.get('/:tag', fn(async(req, res) => {
	let courseList = [];
	if(req.params['tag'] == 'all'){
		courseList = await Courses.find({});
	} else {
		const tag = Tags.findOne({'name':req.params['tag']});
		if(!tag){
			for (let i = 0; i < tag.courseList.length; i++) {
				const courseCode = tag.courseList[i];
				courseList.push(await Courses.findOne({'courseCode' : courseCode}));
			}
		}
	}
	res.send(courseList);
}));

module.exports = router;
