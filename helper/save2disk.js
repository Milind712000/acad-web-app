const multer = require('multer');

const storage = multer.diskStorage({
	destination: function (req, file, next) {
		next(null, './public/pdf/');
	},
	filename: function (req, file, next) {
		console.log(__dirname, __filename);
		console.log(file);
		let filePath = Date.now() + file.originalname;
		// req.locals.filePath = filePath;
		next(null, filePath);
	}
});

const upload = multer({ storage: storage });

module.exports = upload;