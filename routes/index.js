const router = require('express').Router();

router.get('/', (req, res) => {
	// console.log(req.locals);
	res.send('You\'ve reached the Home Page 0w0');
});

module.exports = router;
