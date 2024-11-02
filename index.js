// Util functions and wrappers
var checkvalid = require('validator');

module.exports = {
	isValid
};

function isValid(schema, req, res){
	// If the request has all specified parameters, continue with the post
	var valid = true;
	let missing = 'Missing: \n';
	if(schema.params){
		// Check if all required params are defined in the request
		_setIfInvalid(req.params, schema.params, function(missingKey){
			valid = false;
			missing += missingKey + ' (params) \n';
		});
	}
	if(schema.body){
		// Check if all required body values are defined in the request
		_setIfInvalid(req.body, schema.body, function(missingKey){
			valid = false;
			missing += missingKey + ' (body) \n';
		});
	}

	if(!valid){
		res.sendStatus(400);
	}

	return valid;
}

function _setIfInvalid(valobj, matchobj, callback){
	for(var key in matchobj){
		if((!valobj || !valobj[key]) && !(valobj[key] === false)){ 
			// If the submitted request does not exist
			// Or the submitted request does not contain the required key
			return callback(key);
		} else if(typeof(matchobj[key])==="object"){
			// If the key does not match the items in the list
			_setIfInvalid(valobj[key], matchobj[key], callback)
		}
	}
}

function _validate(nudata, schema){
	let valid = true;
	let messageStack = []
	Object.keys(schema).forEach(key => {
		let ref = schema[key]
		// Step 1: Check if required
		let isRequired = ref.required;
		if(isRequired && !nudata[key]){
			valid = false;
			messageStack.push(`${key} is required`)
			return;
		}

		// If NOT required and NOT added, then skip
		if(!nudata[key]) return;

		// Step 2: Check if valid type
		let type = ref.type || ref
		if(Array.isArray(type)){
			// Nested in Array
			// Not an array
			if(!Array.isArray(nudata[key])){
				valid = false;
				messageStack.push(`${key} must be a list`)
				return;
			}

			// Not correct type
			let nestedType = ref[0]
			let temp = _.findIndex(nudata[key], (v) => {
				if(nestedType.name === 'Date' && !moment(nudata[key]).isValid()) return true;
				return nestedType.name.toLowerCase() !== typeof(v)
			})
			if(temp > -1){
				valid = false;
				messageStack.push(`${key} must be an array of ${nestedType}s.`)
				return;
			}

		}
		else if(type.name === 'Date'){
			if(!moment(nudata[key]).isValid()){
				valid = false;
				messageStack.push(`${key} must be valid date`)
			}
		}
		else if(type.name.toLowerCase() !== typeof(nudata[key])){
			valid = false;
			messageStack.push(`${key} must be type ${type.name}`)
			return;
		}

		// Step 3: Using custom validator
		let customValidator = ref.validate
		if(customValidator && !customValidator.validator(nudata[key])){
			valid = false;
			messageStack.push(customValidator.message.replace('{VALUE}', nudata[key]))
		}
	})

	// Step 4: Reject invalid keys
	const invalidKeys = Object.keys(nudata).filter(key => !schema[key])
	if(invalidKeys.length){
		valid = false;
		messageStack.push(`${invalidKeys.join(', ')} not valid keys`)
	}

	return {
		pass: valid,
		messageStack
	}
}