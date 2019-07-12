module.exports.ensureAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/users/login');
};

module.exports.forwardAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) {
		return res.redirect('/edit');
	}
	next();
};
