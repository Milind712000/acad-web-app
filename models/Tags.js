const mongoose = require('mongoose');
const schema = mongoose.Schema;

const tags = new schema({
	category : {
		type : String,
		required : true
	},
	courseList : [String]
});

const Tags = mongoose.model('Tags', tags);

module.exports = Tags;
