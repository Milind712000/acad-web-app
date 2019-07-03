const router = require('express').Router();
const Tags = require('../models/Tags');
const fn = require('express-async-handler');

router.get('/', (req, res) => {
	res.send('You\'ve reached the Home Page 0w0');
});

router.get('/echo',fn(async (req, res) => {
	let tagExist = await Tags.doesTagExist('tag222');
	let tagExist2 = await Tags.doesTagExist('tag223');
	res.send({tagExist, tagExist2});
}));

module.exports = router;
