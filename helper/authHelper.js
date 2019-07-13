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

module.exports.ensureAdmin = function(req, res, next) {
	if (req.isAuthenticated() && req.locals.user.admin ){
		return next();
	}
	res.redirect('/edit');
};
