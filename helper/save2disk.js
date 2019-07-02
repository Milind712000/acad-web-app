const multer = require('multer');

const storage = multer.diskStorage({
	destination: function (req, file, next) {
		next(null, './public/pdf/');
	},
	filename: function (req, file, next) {

		//replace all spaces with '-'
		let filePath = file.originalname;
		filePath.replace(/\s+/,'-');

		// append .pdf if not already present
		if(!filePath.endsWith('.pdf'))
			filePath = filePath + '.pdf';

		filePath = Date.now() + '_' + filePath;

		req.locals = req.locals || {};
		req.locals.filePath = filePath;

		next(null, filePath);
	}
});

const upload = multer({
	storage: storage,
	fileFilter : (req, file, next) => {
		// only accept pdf files
		if(file.mimetype.split('/')[1] !== 'pdf')
			return next(new Error('Only pdfs are allowed'));
		next(null, true);
	},
	limits : {
		fileSize : 5 * 1024 * 1024	// pdf fileSize limit 5 MB
	}
});

module.exports = upload;
