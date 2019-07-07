const mongoose = require('mongoose');
const schema = mongoose.Schema;
const Tags = require('./Tags');

const course = new schema({
	courseCode : {
		type : String,
		unique : true,
		required : true
	},
	courseName : {
		type : String,
		required : true
	},
	filename : {					// name of pdf-file in public/pdf/
		type : String,
		required : true
	},
	credit : {
		type : Number,
		required : true
	},
	tags : {
		type : [String]
	}
});


course.methods.removeTagFromCourse =async function(tagName) {
	let index = this.tags.indexOf(tagName);
	if(index !== -1) // remove if it exists
		this.tags.splice(index, 1);
	await this.save();
	return this;
};

course.methods.addTagToCourse = async function(tagName) {
	if(await Tags.doesTagExist(tagName)){	// make sure tag exists
		let index = this.tags.indexOf(tagName);
		if(index === -1)	// add if it is not already in the list
			this.tags.push(tagName);
	}
	await this.save();
	return this;
};

course.statics.doesCourseExist = async (courseCode) => {
	let course = await Course.findOne({'courseCode' : courseCode}, '_id');
	if(course)
		return true;
	return false;
};

const Course = mongoose.model('Course', course);

module.exports = Course;
