const fs = require('fs');
const fn = require('express-async-handler');
const multer = require('multer');

// multer file upload
const storage = multer.diskStorage({
	destination: function (req, file, next) {
		next(null, './tempFiles');
	},
	filename: function (req, file, next) {

		//replace all spaces with '-'
		let filePath = file.originalname;
		filePath.replace(/\s+/,'-');

		// append .pdf if not already present
		if(!filePath.endsWith('.pdf'))
			filePath = filePath + '.pdf';

		filePath = Date.now() + '_' + filePath;

		req.locals.filename = filePath;
		req.body.filename = filePath;

		next(null, filePath);
	}
});

const upload = multer({
	storage: storage,
	fileFilter : (req, file, next) => {
		// only accept pdf files
		if(file.mimetype.split('/')[1] !== 'pdf')
			return next(new Error('Only pdfs are allowed'), false);
		next(null, true);
	},
	limits : {
		fileSize : 5 * 1024 * 1024	// pdf fileSize limit 5 MB
	}
});

// move file
const move = (oldPath, newPath, callback) => { //callback is custom errHandler
	fs.rename(oldPath, newPath, function (err) {
		if (err) {
			if (err.code === 'EXDEV') {
				copy();
			} else {
				callback(err);
			}
			return;
		}
		callback();
	});

	function copy() {
		var readStream = fs.createReadStream(oldPath);
		var writeStream = fs.createWriteStream(newPath);

		readStream.on('error', callback);
		writeStream.on('error', callback);

		readStream.on('close', function () {
			fs.unlink(oldPath, callback);
		});

		readStream.pipe(writeStream);
	}
};

const deleteFile = (path) =>{
	fs.unlink(path, function(err) {
		if(err && err.code == 'ENOENT') {
			console.warn(`${path} doesn't exist, won't remove it.`); // file doens't exist
		} else if (err) {
			console.error(`Error occurred while trying to remove file ${path}`); // other errors, e.g. maybe we don't have enough permission
		} else {
			console.info(`removed ${path}`);
		}
	});
};

// TODO multer error handling not working

// const pdfUpload = fn(async(req, res, next) => {
// 	upload.single('x-file-upload')(req, res, (err) => {
// 		if(err) res.send(err);
// 		else next();
// 	});
// });


module.exports.upload = upload;
module.exports.move = move;
module.exports.delete = deleteFile;
// module.exports.pdfUpload = pdfUpload;
