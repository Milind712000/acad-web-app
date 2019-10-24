const NodeCache = require('node-cache');

const ttlSeconds = 10 * 60; // 10 minutes
const node_cache = new NodeCache({ stdTTL: ttlSeconds, checkperiod: ttlSeconds * 0.2, useClones: true });

const cacheThis = (req, res, next) => {
	let key =  'acad_web_' + req.originalUrl || req.url;
	let cacheContent = node_cache.get(key);
	if(cacheContent){
		res.send( cacheContent );
		return;
	}else{
		res.sendResponse = res.send;
		res.send = (body) => {
			node_cache.set(key, body);
			res.sendResponse(body);
		};
		next();
	}
};

module.exports.cacheThis = cacheThis;
module.exports.ncache = node_cache;
