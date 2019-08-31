const mongoose = require('mongoose');
const schema = mongoose.Schema;

const archive = new schema({
	title : {
		type : String,
		required : true
	},
	filename : {					// name of pdf-file in public/pdf/
		type : String,
		required : true
	}
});

const Course = mongoose.model('Archive', archive);

module.exports = Course;
