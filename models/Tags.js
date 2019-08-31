const mongoose = require('mongoose');
const schema = mongoose.Schema;

const tags = new schema({
	name : {
		type : String,
		required : true,
		unique : true
	},
	courseList : [String] // list of course codes
});

tags.methods.removeCourseFromTag =async function(courseCode) {
	let index = this.courseList.indexOf(courseCode);
	if(index !== -1) // remove if it exists
		this.courseList.splice(index, 1);
	await this.save();
	return this;
};

tags.methods.addCourseToTag = async function(courseCode) {
	let index = this.courseList.indexOf(courseCode);
	if(index === -1)	// add if it is not already in the list
		this.courseList.push(courseCode);
	await this.save();
	return this;
};

tags.statics.doesTagExist = async (tagName) => {
	let tag = await Tags.findOne({'name' : tagName}, '_id');
	if(tag){
		return true;
	}
	return false;
};

tags.statics.tagnameList = async () => {
	let temp = await Tags.find({},'name');
	let tagList = [];
	for (let index = 0; index < temp.length; index++) {
		const tagObj = temp[index];
		tagList.push(tagObj.name);
	}
	return tagList;
};

const Tags = mongoose.model('Tags', tags);

module.exports = Tags;
