const router = require('express').Router();

router.get('/', (req, res) => {
	res.send('You have reached the homepage');
});

module.exports = router;
