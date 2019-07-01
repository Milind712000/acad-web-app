const mongoose = require('mongoose');
const schema = mongoose.Schema;

const course = new schema({
	courseCode : {
		type : String,
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

const User = mongoose.model('Course', course);

module.exports = User;
