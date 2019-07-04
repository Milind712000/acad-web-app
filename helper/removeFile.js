const fileSystem = require('fs');

const deleteFile = (path) =>{
	fileSystem.unlink(path, function(err) {
		if(err && err.code == 'ENOENT') {
			console.warn(`${path} doesn't exist, won't remove it.`); // file doens't exist
		} else if (err) {
			console.error(`Error occurred while trying to remove file ${path}`); // other errors, e.g. maybe we don't have enough permission
		} else {
			console.info(`removed ${path}`);
		}
	});
};

module.exports = deleteFile;
