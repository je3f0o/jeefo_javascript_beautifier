/**
 * jeefo_core : v0.0.7
 * Author     : je3f0o, <je3f0o@gmail.com>
 * Homepage   : https://github.com/je3f0o/jeefo_core
 * License    : The MIT License
 * Copyright  : 2017
 **/
jeefo.use(function () {

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : core.js
* Created at  : 2017-04-08
* Updated at  : 2017-05-07
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/

var core_module = jeefo.module("jeefo_core", []),

CAMEL_CASE_REGEXP = /[A-Z]/g,
dash_case = function (str) {
	return str.replace(CAMEL_CASE_REGEXP, function (letter, pos) {
		return (pos ? '-' : '') + letter.toLowerCase();
	});
},
snake_case = function (str) {
	return str.replace(CAMEL_CASE_REGEXP, function (letter, pos) {
		return (pos ? '_' : '') + letter.toLowerCase();
	});
},

to_string          = Object.prototype.toString,
function_to_string = Function.toString,

IS_DIGITS_SIGNED_INT      = /^\-?\d+$/,
IS_DIGITS_UNSIGNED_INT    = /^\d+$/,
IS_DIGITS_SIGNED_NUMBER   = /^\-?\d+(?:.\d+)?$/,
IS_DIGITS_UNSIGNED_NUMNER = /^\d+(?:.\d+)?$/,

// Used to detect host constructors (Safari > 4; really typed array specific)
HOST_CONSTRUCTOR_REGEX = /^\[object .+?Constructor\]$/,
/*
// Compile a regexp using a common native method as a template.
// We chose `Object#toString` because there's a good chance it is not being mucked with.
new RegExp('^' +
	// Coerce `Object#toString` to a string
	String(to_string).
		// Escape any special regexp characters
		replace(/[.*+?^${}()|[\]\/\\]/g, "\\$&").
		// Replace mentions of `toString` with `.*?` to keep the template generic.
		// Replace thing like `for ...` to support environments like Rhino which add extra info
		// such as method arity.
		replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + '$'
)
*/
NATIVE_REGEX = /^function.*?\(\) \{ \[native code\] \}$/,

is_date = function (value) {
	return to_string.call(value) === "[object Date]";
},

is_regex = function (value) {
	return to_string.call(value) === "[object RegExp]";
},

is_digits = function (value, is_unsigned) {
	return (is_unsigned ? IS_DIGITS_UNSIGNED_NUMNER : IS_DIGITS_SIGNED_NUMBER).test(value);
},

is_digits_int = function (value, is_unsigned) {
	return (is_unsigned ? IS_DIGITS_UNSIGNED_INT : IS_DIGITS_SIGNED_INT).test(value);
},

is_native = function (value) {
	var type = typeof value;
	return type === "function" ?
		// Use `Function#toString` to bypass the value's own `toString` method
		// and avoid being faked out.
		NATIVE_REGEX.test(function_to_string.call(value)) :
		// Fallback to a host object check because some environments will represent
		// things like typed arrays as DOM methods which may not conform to the
		// normal native pattern.
		(value && type === "object" && HOST_CONSTRUCTOR_REGEX.test(to_string.call(value))) || false;	
},

json_parse = function (value) {
	try {
		return JSON.parse(value);
	} catch (e) {}
};

core_module.extend("namespace", ["$injector", "make_injectable"], function (injector, make_injectable) {
	return function (full_name) {
		var namespaces = full_name.split('.'),
			name = namespaces.pop(),
			i = 0, namespace = '', part, container;

		for (; i < namespaces.length; ++i) {
			part = namespaces[i];

			if (namespace) {
				container = injector.resolve_sync(namespace);
			}

			namespace = namespace ? namespace + '.' + part : part;

			if (! injector.has(namespace)) {
				injector.register(namespace, {
					fn : function () { return {}; }
				});

				if (container) {
					container[part] = injector.resolve_sync(namespace);
				}
			}
		}

		injector.register(full_name, make_injectable.apply(null, arguments));

		if (namespace) {
			container       = injector.resolve_sync(namespace);
			container[name] = injector.resolve_sync(full_name);
		}

		return this;
	};
}).

namespace("transform.dash_case", function () {
	return dash_case;
}).

namespace("transform.snake_case", function () {
	return snake_case;
}).

extend("curry", [
	"$injector",
	"make_injectable",
	"transform.snake_case",
], function ($injector, make_injectable, snake_case) {
	return function (name) {
		$injector.register(snake_case(name + "Curry"), make_injectable.apply(null, arguments));
		return this;
	};
}).

extend("run", ["$injector", "$q", "Array"], function ($injector, $q, Arr) {
	var instance = this;

	return function (dependencies, fn) {
		if (typeof dependencies === "function") {
			dependencies.call(this);
		} else if (typeof dependencies === "string") {
			$injector.resolve(dependencies).then(function (value) {
				fn.call(instance, value);
			});
		} else {
			var	args = new Arr(dependencies.length);

			$q.for_each_async(dependencies, function (dependency, index, next) {
				$injector.resolve(dependency).then(function (value) {
					args[index] = value;
					next();
				});
			}).then(function () {
				fn.apply(instance, args);
			});
		}

		return this;
	};
}).

extend("factory", [
	"$injector",
	"make_injectable",
	"transform.snake_case",
], function ($injector, make_injectable, snake_case) {
	return function (name) {
		$injector.register(snake_case(name + "Factory"), make_injectable.apply(null, arguments));
		return this;
	};
}).

extend("service", [
	"$injector",
	"make_injectable",
	"transform.snake_case",
], function ($injector, make_injectable, snake_case) {
	return function (name) {
		var injectable = make_injectable.apply(null, arguments);
		injectable.is_constructor = true;

		$injector.register(snake_case(name + "Service"), injectable);
		return this;
	};
}).

run("$injector", function ($injector) {

	$injector.register("is_date", {
		fn : function () { return is_date; }
	}).
	register("is_regex", {
		fn : function () { return is_regex; }
	}).
	register("is_digit", {
		fn : function () { return is_digits; }
	}).
	register("is_digit_int", {
		fn : function () { return is_digits_int; }
	}).
	register("is_native", {
		fn : function () { return is_native; }
	}).
	register("json_parse", {
		fn : function () { return json_parse; }
	});

});

});

/**
 * jeefo_tokenizer : v0.0.18
 * Author          : je3f0o, <je3f0o@gmail.com>
 * Homepage        : https://github.com/je3f0o/jeefo_tokenizer
 * License         : The MIT License
 * Copyright       : 2017
 **/
jeefo.use(function () {

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : token.js
* Created at  : 2017-04-08
* Updated at  : 2017-05-06
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/

var Token = function () {};
Token.prototype = {
	error : function (message) {
		var error = new SyntaxError(message);
		error.value        = this.value;
		error.lineNumber   = this.start.line;
		error.columnNumber = this.start.column;
		throw error;
	},
	error_unexpected_type : function () {
		this.error("Unexpected " + this.type);
	},
	error_unexpected_token : function () {
		this.error("Unexpected token");
	},
};

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : region.js
* Created at  : 2017-04-08
* Updated at  : 2017-05-07
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/

var RegionDefinition = function (definition) {
	this.type  = definition.type;
	this.name  = definition.name || definition.type;
	this.start = definition.start;
	this.end   = definition.end;

	if (definition.skip)        { this.skip        = definition.skip;        }
	if (definition.until)       { this.until       = definition.until;       }
	if (definition.keepend)     { this.keepend     = definition.keepend;     }
	if (definition.contains)    { this.contains    = definition.contains;    }
	if (definition.contained)   { this.contained   = definition.contained;   }
	if (definition.escape_char) { this.escape_char = definition.escape_char; }

	if (definition.contains) { this.contains_chars = this.find_special_characters(definition.contains); }
};
RegionDefinition.prototype = {
	RegionDefinition : RegionDefinition,

	copy : function () {
		return new this.RegionDefinition(this);
	},

	find_special_characters : function (container) {
		for (var i = container.length - 1; i >= 0; --i) {
			if (container[i].type === "SpecialCharacter") {
				return container[i].chars.join('');
			}
		}
	},
};

var Region = function (language) {
	this.hash                   = {};
	this.language               = language;
	this.global_null_regions    = [];
	this.contained_null_regions = [];
};
Region.prototype = {
	RegionDefinition : RegionDefinition,

	sort_function : function (a, b) { return a.start.length - b.start.length; },

	register : function (region) {
		region = new this.RegionDefinition(region);

		if (region.start) {
			if (this.hash[region.start[0]]) {
				this.hash[region.start[0]].push(region);

				this.hash[region.start[0]].sort(this.sort_function);
			} else {
				this.hash[region.start[0]] = [region];
			}
		} else if (region.contained) {
			this.contained_null_regions.push(region);
		} else {
			if (this.global_null_region) {
				throw Error("Overwritten global null region.");
			}
			this.global_null_region = region;
		}
	},

	// Find {{{1
	find : function (parent, streamer) {
		var i         = 0,
			container = this.hash[streamer.current()],
			start, j, k;
		
		// Has parent {{{2
		if (parent && parent.contains) {

			// Search for contained regions {{{3
			if (container) {
				CONTAINER:
				for (i = container.length - 1; i >= 0; --i) {
					for (j = parent.contains.length - 1; j >= 0; --j) {
						if (container[i].type !== parent.contains[j].type) {
							continue;
						}

						for (start = container[i].start, k = start.length - 1; k >= 1; --k) {
							if (streamer.peek(streamer.current_index + k) !== start.charAt(k)) {
								continue CONTAINER;
							}
						}

						return container[i].copy();
					}
				}
			}

			// Looking for null regions {{{3
			for (i = parent.contains.length - 1; i >= 0; --i) {
				for (j = this.contained_null_regions.length - 1; j >= 0; --j) {
					if (this.contained_null_regions[j].type === parent.contains[i].type) {
						return this.contained_null_regions[j].copy();
					}
				}
			}
			// }}}3

		// No parent {{{2
		// It means lookup for only global regions
		} else {

			// Has container {{{3
			if (container) {

				NO_PARENT_CONTAINER:
				for (i = container.length - 1; i >= 0; --i) {
					if (container[i].contained) {
						continue;
					}

					for (start = container[i].start, k = start.length - 1; k >= 1; --k) {
						if (streamer.peek(streamer.current_index + k) !== start.charAt(k)) {
							continue NO_PARENT_CONTAINER;
						}
					}

					return container[i].copy();
				}
			}
		
			// Finally {{{3
			if (this.global_null_region) {
				return this.global_null_region.copy();
			}
			// }}}3

		}
		// }}}2
	},
	// }}}1
};

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : string_stream.js
* Created at  : 2017-04-07
* Updated at  : 2017-05-06
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/

var StringStream = function (string) {
	this.string        = string;
	this.current_index = 0;
};
StringStream.prototype = {
	peek : function (index) {
		return this.string.charAt(index);
	},
	seek : function (offset, length) {
		return this.string.substring(offset, offset + length);
	},
	next : function () {
		return this.peek( ++this.current_index );
	},
	current : function () {
		return this.peek(this.current_index);
	},
};

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : token_parser.js
* Created at  : 2017-04-08
* Updated at  : 2017-05-07
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/

var TokenParser = function (language, regions) {
	this.lines  = [{ number : 1, index : 0 }];
	this.start  = { line : 1, column : 1 };
	this.tokens = [];
	this.stack  = [];

	this.regions  = regions;
	this.language = language;
};
TokenParser.prototype = {

is_array : Array.isArray,

// Main parser {{{1
parse : function (source) {
	var streamer          = this.streamer = new StringStream(source),
		current_character = streamer.current(), region;

	while (current_character) {
		if (this.current_region) {
			if (current_character === this.current_region.escape_char) {
				current_character = streamer.next();
				continue;
			} else if (this.region_end(this.current_region)) {
				this.current_token  = this.current_token.parent;
				this.current_region = this.current_region.parent;

				current_character = streamer.next();
				continue;
			}
		}

		// Region {{{2
		region = this.regions.find(this.current_region, streamer);
		if (region) {
			this.parse_region(region);

			if (region.keepend) {
				this.stack.push({
					token  : this.current_token,
					region : region,
				});
			}

		// White space {{{2
		} else if (current_character <= ' ') {
			this.handle_new_line(current_character);

		// Number {{{2
		} else if (current_character >= '0' && current_character <= '9') {
			this.parse_number();

		// Identifier {{{2
		} else if (this.SPECIAL_CHARACTERS.indexOf(current_character) === -1) {
			this.parse_identifier();

		// Special character {{{2
		} else {
			this.parse_special_character();
		}
		// }}}2

		current_character = streamer.next();
	}

	return this.tokens;
},

// Parse number {{{1
parse_number : function () {
	var streamer = this.streamer, current_character;

	this.prepare_new_token(streamer.current_index);

	// jshint curly : false
	for (current_character = streamer.next(); current_character >= '0' && current_character <= '9' ;
		current_character = streamer.next());
	// jshint curly : true

	this.add_token( this.make_token("Number") );
	this.streamer.current_index -= 1;
},

// Parse Identifier {{{1

SPECIAL_CHARACTERS : [
	',', '.', ';', ':',
	'<', '>', '~', '`',
	'!', '@', '#', '|', 
	'%', '^', '&', '*',
	'(', ')', '-', '+',
	'=', '[', ']', '/',
	'?', '"', '{', '}',
	'_', "'", '\\',
].join(''),

parse_identifier : function () {
	var streamer = this.streamer, current_character;

	this.prepare_new_token(streamer.current_index);

	// jshint curly : false
	for (current_character = streamer.next(); // initialization terminator
		current_character > ' ' && this.SPECIAL_CHARACTERS.indexOf(current_character) === -1;
		current_character = streamer.next());
	// jshint curly : true

	this.add_token( this.make_token("Identifier") );
	streamer.current_index -= 1;
},

// Parse region {{{1
parse_region : function (region) {
	var streamer = this.streamer,
		i, is_matched, current_character, current_token;

	this.prepare_new_token(streamer.current_index);

	if (region.start) {
		streamer.current_index += region.start.length;
	}

	if (region.contains) {
		current_token          = this.make_token(region.type, region.name);
		current_token.children = [];

		if (this.current_token) {
			region.parent        = this.current_region;
			current_token.parent = this.current_token;
			this.current_token.children.push(current_token);
		} else {
			this.tokens.push( current_token );
		}

		this.current_token  = current_token;
		this.current_region = region;

		if (region.start) {
			streamer.current_index -= 1;
		}
		return;
	}

	current_character = streamer.current();

	while (current_character) {
		this.handle_new_line(current_character);

		// escape handler
		if (current_character === region.escape_char) {
			streamer.current_index += 2;
			current_character = streamer.current();
			continue;
		}

		// skip handler
		if (region.skip && current_character === region.skip.charAt(0)) {
			for (i = 1, is_matched = true; i < region.skip.length; ++i) {
				if (streamer.peek(streamer.current_index + i) !== region.skip.charAt(i)) {
					is_matched = false;
					break;
				}
			}

			if (is_matched) {
				streamer.current_index += region.skip.length;
				current_character = streamer.current();
				continue;
			}
		}

		if (this.region_end(region, true)) {
			return;
		}

		current_character = streamer.next();
	}
},

// Parse special character {{{1
parse_special_character : function () {
	if (this.current_region &&
		(! this.current_region.contains_chars || this.current_region.contains_chars.indexOf(this.streamer.current()) === -1)) {
		this.prepare_new_token(this.streamer.current_index);
		this.streamer.current_index += 1;
		this.make_token("SpecialCharacter").error_unexpected_token();
	}

	this.prepare_new_token(this.streamer.current_index);
	this.streamer.current_index += 1;

	this.add_token( this.make_token("SpecialCharacter") );
	this.streamer.current_index -= 1;
},

// Check end token {{{1
region_end : function (region, to_add) {
	var i = 0;
	if (this.is_array(region.end)) {
		for (; i < region.end.length; ++i) {
			if (this.check_end_token(region, region.end[i], to_add)) {
				this.finallzie_region(region);
				return true;
			}
		}
	}

	if (this.check_end_token(region, region.end, to_add)) {
		this.finallzie_region(region);
		return true;
	}

	if (this.region_end_stack(region, to_add)) {
		return true;
	}
},

finallzie_region : function (region) {
	for (var i = 0; i < this.stack.length; ++i) {
		if (this.stack[i].region === region) {
			this.current_token  = this.stack[i].token;
			this.current_region = this.stack[i].region;
			this.stack.splice(i, this.stack.length);
		}
	}
},

region_end_stack : function (region, to_add) {
	for (var i = this.stack.length - 1, j; i >= 0; --i) {
		if (this.is_array(this.stack[i].region.end)) {
			for (j = 0; j < this.stack[i].region.end.length; ++j) {
				if (this.check_end_token(region, this.stack[i].region.end[j], to_add)) {
					this.finallzie_region(this.stack[i].region);
					return true;
				}
			}
		} else if (this.check_end_token(region, this.stack[i].region.end, to_add)) {
			this.finallzie_region(this.stack[i].region);
			return true;
		}
	}
},

check_end_token : function (region, end, to_add) {
	var i        = 1,
		streamer = this.streamer;

	if (streamer.current() === end.charAt(0)) {
		for (; i < end.length; ++i) {
			if (streamer.peek(streamer.current_index + i) !== end.charAt(i)) {
				return false;
			}
		}

		if (! region.until) {
			streamer.current_index += end.length;
		}

		if (to_add) {
			var token = this.make_token(region.type, region.name);
			this.set_value(token, region.start ? region.start.length : 0, region.until ? 0 : end.length);

			this.add_token(token);
		} else {
			this.set_end(this.current_token);
			this.set_value(this.current_token, region.start ? region.start.length : 0, region.until ? 0 : end.length);
		}

		streamer.current_index -= 1;

		return true;
	}
},
// }}}1

handle_new_line : function (current_character) {
	if (current_character === '\r' || current_character === '\n') {
		this.new_line();
	}
},

new_line : function () {
	this.lines.push({
		number : (this.lines.length + 1),
		index  : (this.streamer.current_index + 1),
	});
},

// Set value without surrounding
set_value : function (token, start_length, end_length) {
	token.value = this.streamer.seek(
		token.start.index + start_length,
		(token.end.index - token.start.index - start_length - end_length)
	);
},

set_end : function (token) {
	token.end.line   = this.lines.length;
	token.end.column = (this.streamer.current_index - this.lines[this.lines.length - 1].index);
	token.end.index  = this.streamer.current_index;
},

prepare_new_token : function (current_index) {
	this.start = {
		line   : this.lines.length,
		column : (current_index - this.lines[this.lines.length - 1].index) + 1,
		index  : current_index
	};
},

add_token : function (token) {
	if (this.current_token) {
		this.current_token.children.push(token);
	} else {
		this.tokens.push(token);
	}
},

make_token : function (type, name) {
	var offset = this.start.index,
		length = this.streamer.current_index - this.start.index,
		token  = new Token();

	token.type  = type;
	token.name  = name || type;
	token.value = this.streamer.seek(offset, length);
	token.start = this.start;
	token.end   = {
		line           : this.lines.length,
		column         : (this.streamer.current_index - this.lines[this.lines.length - 1].index) + 1,
		virtual_column : this.lines.column,
		index          : this.streamer.current_index
	};

	return token;
},

};

var jeefo_tokenizer = jeefo.module("jeefo_tokenizer", ["jeefo_core"]);
jeefo_tokenizer.namespace("tokenizer.Token", function () {
	return Token;
}).
namespace("tokenizer.Region", function () {
	return Region;
}).
namespace("tokenizer.TokenParser", function () {
	return TokenParser;
});

});

/**
 * jeefo_javascript_parser : v0.0.3
 * Author                  : je3f0o, <je3f0o@gmail.com>
 * Homepage                : https://github.com/je3f0o/jeefo_javascript_parser
 * License                 : The MIT License
 * Copyright               : 2017
 **/
jeefo.use(function () {

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : javascript_tokenizer.js
* Created at  : 2017-04-08
* Updated at  : 2017-05-03
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/
var app      = jeefo.module("jeefo_javascript_parser", ["jeefo_tokenizer"]),
	LANGUAGE = "javascript";

// Regions {{{1
app.namespace("javascript.es5_regions", ["tokenizer.Region"], function (Region) {
	var javascript_regions = new Region(LANGUAGE);

	// Comment {{{2
	javascript_regions.register({
		type  : "Comment",
		name  : "Inline comment",
		start : "//",
		end   : "\n",
	});
	javascript_regions.register({
		type  : "Comment",
		name  : "Multi line comment",
		start : "/*",
		end   : "*/",
	});

	// String {{{2
	javascript_regions.register({
		type        : "String",
		name        : "Double quote string",
		start       : '"',
		escape_char : '\\',
		end         : '"',
	});
	javascript_regions.register({
		type        : "String",
		name        : "Single quote string",
		start       : "'",
		escape_char : '\\',
		end         : "'",
	});
	javascript_regions.register({
		type      : "TemplateLiteral quasi string",
		start     : null,
		end       : '${',
		until     : true,
		contained : true,
	});
	javascript_regions.register({
		type  : "TemplateLiteral expression",
		start : "${",
		end   : '}',
		contains : [
			{ type : "Block"       } ,
			{ type : "Array"       } ,
			{ type : "String"      } ,
			{ type : "RegExp"      } ,
			{ type : "Comment"     } ,
			{ type : "Parenthesis" } ,
			{
				type  : "SpecialCharacter",
				chars : [
					'-', '_', '+', '*', '%', // operator
					'&', '|', '$', '?', '`',
					'=', '!', '<', '>', '\\',
					':', '.', ',', ';', // delimiters
				]
			},
		]
	});
	javascript_regions.register({
		type        : "TemplateLiteral",
		start       : '`',
		escape_char : '\\',
		end         : '`',
		contains : [
			{ type : "TemplateLiteral quasi string" } ,
			{ type : "TemplateLiteral expression"   } ,
		],
		keepend : true
	});

	// Parenthesis {{{2
	javascript_regions.register({
		type  : "Parenthesis",
		name  : "Parenthesis",
		start : '(',
		end   : ')',
		contains : [
			{ type : "Block"           } ,
			{ type : "Array"           } ,
			{ type : "String"          } ,
			{ type : "RegExp"          } ,
			{ type : "Comment"         } ,
			{ type : "Parenthesis"     } ,
			{ type : "TemplateLiteral" } ,
			{
				type  : "SpecialCharacter",
				chars : [
					'-', '_', '+', '*', '%', // operator
					'&', '|', '$', '?', '`',
					'=', '!', '<', '>', '\\',
					':', '.', ',', ';', // delimiters
				]
			},
		]
	});

	// Array {{{2
	javascript_regions.register({
		type  : "Array",
		name  : "Array literal",
		start : '[',
		end   : ']',
		contains : [
			{ type : "Block"       },
			{ type : "Array"       },
			{ type : "String"      },
			{ type : "Comment"     },
			{ type : "Parenthesis" },
			{
				type  : "SpecialCharacter",
				chars : [
					'-', '_', '+', '*', '%', // operator
					'&', '|', '$', '?', '`',
					'=', '!', '<', '>',
					':', '.', ',', ';', // delimiters
				]
			},
		]
	});

	// Block {{{2
	javascript_regions.register({
		type  : "Block",
		name  : "Block",
		start : '{',
		end   : '}',
		contains : [
			{ type : "Block"           } ,
			{ type : "Array"           } ,
			{ type : "String"          } ,
			{ type : "RegExp"          } ,
			{ type : "Comment"         } ,
			{ type : "Parenthesis"     } ,
			{ type : "TemplateLiteral" } ,
			{
				type  : "SpecialCharacter",
				chars : [
					'-', '_', '+', '*', '%', // operator
					'&', '|', '$', '?', '`',
					'=', '!', '<', '>', '\\',
					':', '.', ',', ';', // delimiters
				]
			},
		]
	});

	// RegExp {{{2
	javascript_regions.register({
		type  : "RegExp",
		name  : "RegExp",
		start : '/',
		skip  : '\\/',
		end   : '/',
	});
	// }}}2

	return javascript_regions;
});
// }}}1

app.namespace("javascript.tokenizer", [
	"tokenizer.TokenParser",
	"javascript.es5_regions"
], function (TokenParser, jeefo_js_regions) {
	return function (source) {
		var tokenizer = new TokenParser(LANGUAGE, jeefo_js_regions);
		return tokenizer.parse(source);
	};
});

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : javascript_parser.js
* Created at  : 2017-04-14
* Updated at  : 2017-05-07
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/
// Javascript Parser {{{1
app.namespace("javascript.Parser", ["javascript.tokenizer", "tokenizer.Token"], function (tokenizer, Token) {

	var keywords = [
		"break", "continue", "return",
		"do", "for", "while",
		"switch", "case", "default",
		"in", "typeof", "instanceof",
		"try", "catch", "finally", "throw",
		"var", "function", "this",
		"new", "debugger",
		"if", "else",
		"with", "delete", "void",
	];

	var JavascriptParser = function (statement_middlewares, expression_middlewares) {
		this.reserved               = keywords;
		if (statement_middlewares)  { this.statement_middlewares  = statement_middlewares;  }
		if (expression_middlewares) { this.expression_middlewares = expression_middlewares; }
	},
	p = JavascriptParser.prototype;

	// Classes {{{2
	// Statements {{{3
	p.EmptyStatement = function (token) {
		this.type  = "EmptyStatement";
		this.start = token.start;
		this.end   = token.end;
	};
	p.IfStatement = function (start, end, test, statement, alternate) {
		this.type       = "IfStatement";
		this.test       = test;
		this.statement  = statement;
		this.alternate  = alternate || null;
		this.start      = start;
		this.end        = end;
	};
	p.ForStatement = function (start, end, init, test, update, statement) {
		this.type      = "ForStatement";
		this.init      = init;
		this.test      = test;
		this.update    = update;
		this.statement = statement;
		this.start     = start;
		this.end       = end;
	};
	p.ForInStatement = function (start, end, left, right, statement) {
		this.type      = "ForInStatement";
		this.left      = left;
		this.right     = right;
		this.statement = statement;
		this.start     = start;
		this.end       = end;
	};
	p.WhileStatement = function (start, end, test, statement) {
		this.type      = "WhileStatement";
		this.test      = test;
		this.statement = statement;
		this.start     = start;
		this.end       = end;
	};
	p.SwitchStatement = function (start, end, test, cases) {
		this.type  = "SwitchStatement";
		this.test  = test;
		this.cases = cases;
		this.start = start;
		this.end   = end;
	};
	p.LabeledStatement = function (start, end, label, statement) {
		this.type      = "LabeledStatement";
		this.label     = label;
		this.statement = statement;
		this.start     = start;
		this.end       = end;
	};
	p.TryStatement = function (start, end, block, handler, finalizer) {
		this.type      = "TryStatement";
		this.block     = block;
		this.handler   = handler;
		this.finalizer = finalizer;
		this.start     = start;
		this.end       = end;
	};
	p.ThrowStatement = function (start, end, argument) {
		this.type     = "ThrowStatement";
		this.argument = argument;
		this.start    = start;
		this.end      = end;
	};
	p.ReturnStatement = function (start, end, argument) {
		this.type     = "ReturnStatement";
		this.argument = argument;
		this.start    = start;
		this.end      = end;
	};
	p.BreakStatement = function (start, end, label) {
		this.type  = "BreakStatement";
		this.label = label;
		this.start = start;
		this.end   = end;
	};
	p.ContinueStatement = function (start, end, label) {
		this.type  = "ContinueStatement";
		this.label = label;
		this.start = start;
		this.end   = end;
	};
	p.ExpressionStatement = function (start, end, expression) {
		this.type       = "ExpressionStatement";
		this.expression = expression;
		this.start      = start;
		this.end        = end;
	};
	p.BlockStatement = function (token, body) {
		this.type  = "BlockStatement";
		this.body  = body;
		this.start = token.start;
		this.end   = token.end;
	};
	p.ProgramStatement = function (start, end, body) {
		this.type  = "ProgramStatement";
		this.body  = body;
		this.start = start;
		this.end   = end;
	};
	// Literals {{{3
	p.NumberLiteral = function (token) {
		this.type  = "NumberLiteral";
		this.value = token.value;
		this.start = token.start;
		this.end   = token.end;
	};
	p.StringLiteral = function (token) {
		this.type  = "StringLiteral";
		this.value = token.value;
		this.start = token.start;
		this.end   = token.end;
	};
	p.ArrayLiteral = function (token, elements) {
		this.type     = "ArrayLiteral";
		this.elements = elements;
		this.start    = token.start;
		this.end      = token.end;
	};
	p.RegExpLiteral = function (start, end, pattern, flags) {
		this.type  = "RegExpLiteral";
		this.regex = {
			pattern : pattern,
			flags   : flags
		};
		this.start = start;
		this.end   = end;
	};
	p.ObjectLiteral = function (token, properties) {
		this.type       = "ObjectLiteral";
		this.properties = properties;
		this.start      = token.start;
		this.end        = token.end;
	};
	// Expressions {{{3
	p.MemberExpression = function (start, end, object, property, is_computed) {
		this.type        = "MemberExpression";
		this.object      = object;
		this.property    = property;
		this.is_computed = is_computed ? true : false;
		this.start       = start;
		this.end         = end;
	};
	p.CallExpression = function (start, end, callee, args) {
		this.type         = "CallExpression";
		this.callee       = callee;
		this["arguments"] = args;
		this.start        = start;
		this.end          = end;
	};
	p.NewExpression = function (start, end, callee, args) {
		this.type         = "NewExpression";
		this.callee       = callee;
		this["arguments"] = args;
		this.start        = start;
		this.end          = end;
	};
	p.UnaryExpression = function (start, end, operator, argument, is_prefix) {
		this.type      = "UnaryExpression";
		this.operator  = operator;
		this.argument  = argument;
		this.is_prefix = is_prefix ? true : false;
		this.start     = start;
		this.end       = end;
	};
	p.LogicalExpression = function (start, end, left, operator, right) {
		this.type     = "LogicalExpression";
		this.operator = operator;
		this.left     = left;
		this.right    = right;
		this.start    = start;
		this.end      = end;
	};
	p.BinaryExpression = function (start, end, left, operator, right) {
		this.type     = "BinaryExpression";
		this.operator = operator;
		this.left     = left;
		this.right    = right;
		this.start    = start;
		this.end      = end;
	};
	p.AssignmentExpression = function (start, end, left, operator, right) {
		this.type     = "AssignmentExpression";
		this.operator = operator;
		this.left     = left;
		this.right    = right;
		this.start    = start;
		this.end      = end;
	};
	p.ConditionalExpression = function (start, end, test, consequent, alternate) {
		this.type       = "ConditionalExpression";
		this.test       = test;
		this.consequent = consequent;
		this.alternate  = alternate;
		this.start      = start;
		this.end        = end;
	};
	p.SequenceExpression = function (expressions) {
		this.type        = "SequenceExpression";
		this.expressions = expressions;
		this.start       = expressions[0].start;
		this.end         = expressions[expressions.length - 1].end;
	};
	p.FunctionExpression = function (start, end, id, parameters, body) {
		this.type       = "FunctionExpression";
		this.id         = id;
		this.parameters = parameters;
		this.body       = body;
		this.start      = start;
		this.end        = end;
	};
	// Delcarations {{{3
	p.VariableDeclaration = function (start, end, declarators) {
		this.type         = "VariableDeclaration";
		this.declarations = declarators;
		this.start        = start;
		this.end          = end;
	};
	p.VariableDeclarator = function (identifier) {
		this.type  = "VariableDeclarator";
		this.id    = identifier;
		this.init  = null;
		this.start = identifier.start;
		this.end   = identifier.end;
	};
	p.FunctionDeclaration = function (start, end, id, parameters, body) {
		this.type       = "FunctionDeclaration";
		this.id         = id;
		this.parameters = parameters;
		this.body       = body;
		this.start      = start;
		this.end        = end;
	};
	// Others {{{3
	p.Comment = function (token) {
		this.type    = "Comment";
		this.comment = token.value;
		this.start   = token.start;
		this.end     = token.end;
	};
	p.Property = function (key, is_computed) {
		this.type        = "Property";
		this.key         = key;
		this.value       = null;
		this.is_computed = is_computed ? true : false;
		this.start       = key.start;
	};
	p.CatchClause = function (start, end, param, body) {
		this.type  = "CatchClause";
		this.param = param;
		this.body  = body;
		this.start = start;
		this.end   = end;
	};
	p.SwitchCase = function (start, end, test, statements) {
		this.type       = "SwitchCase";
		this.test       = test;
		this.statements = statements;
		this.start      = start;
		this.end        = end;
	};
	p.DefaultCase = function (start, end, statements) {
		this.type       = "DefaultCase";
		this.statements = statements;
		this.start      = start;
		this.end        = end;
	};
	p.Identifier = function (token) {
		this.type  = "Identifier";
		this.name  = token.value;
		this.start = token.start;
	};
	p.Operator = function (operator) {
		this.type     = "Operator";
		this.operator = operator;
	};
	p.Piece = function (token) {
		this.start_token = token;
	};
	p.Temp = function () {};
	p.File = function (name, code, program) {
		this.type    = "File";
		this.name    = name;
		this.code    = code;
		this.program = program;
	};
	p.Program = function (body) {
		this.type  = "Program";
		this.body  = body;
		this.start = body.length ? body[0].start             : { line : 1, column : 1, index : 0 };
		this.end   = body.length ? body[body.length - 1].end : { line : 1, column : 1, index : 0 };
	};
	// }}}3
	// }}}2

	// Parse {{{2
	p.parse = function (filename, source_code) {
		this.raw_tokens = tokenizer(source_code);
		//console.log(888, this.raw_tokens);

		var body    = this.parse_block_statement(this.raw_tokens);
		return new this.File(filename, source_code, new this.Program(body));
	};

	// Parse statement {{{2
	p.parse_statement = function (temp, tokens, start_index) {
		var index = start_index, has_special_characters;

		for (; index < tokens.length; ++index) {
			switch (tokens[index].type) {
				case "Identifier":
					if (index === start_index) {
						index = this.parse_identifier(temp, tokens, index);

						switch (temp.identifier.name) {
							case "function" :
								return this.parse_function_declaration(temp, tokens, start_index);
							case "var" :
								return this.parse_variable_declaration(temp, tokens, start_index, tokens.length);
							case "throw" :
								return this.parse_statement_has_expression_argument(temp, tokens, start_index, this.ThrowStatement);
							case "return" :
								return this.parse_statement_has_expression_argument(temp, tokens, start_index, this.ReturnStatement);
							case "if" :
								return this.parse_if_statement(temp, tokens, start_index);
							case "for" :
								return this.parse_for_statement(temp, tokens, start_index);
							case "while" :
								return this.parse_while_statement(temp, tokens, start_index);
							case "switch" :
								return this.parse_switch_statement(temp, tokens, start_index);
							case "try" :
								return this.parse_try_statement(temp, tokens, start_index);
							case "break" :
								return this.parse_statement_has_label(temp, tokens, start_index, this.BreakStatement);
							case "continue" :
								return this.parse_statement_has_label(temp, tokens, start_index, this.ContinueStatement);
						}
					}
					break;
				case "Block":
					if (index === start_index) {
						temp.statement = new this.BlockStatement(
							tokens[start_index],
							this.parse_block_statement(tokens[start_index].children)
						);
						return index;
					}
					break;
				case "Parenthesis":
					if (index === start_index) {
						this.parse_sequence_expression(temp, tokens[index].children, 0, tokens[index].children.length);
						temp.statement = new this.ExpressionStatement(tokens[index].start, tokens[index + 1].end, temp.expression);
						return index + 1;
					}
					break;
				case "SpecialCharacter":
					switch (tokens[index].value) {
						case ':':
							if (! has_special_characters) {
								return this.parse_labeled_statement(temp, tokens, start_index);
							}
							break;
						case ';':
							if (index === start_index) {
								temp.statement = new this.EmptyStatement(tokens[index]);
							} else {
								this.parse_expression_statement(temp, tokens, start_index, index);
							}

							return index;
						case '$':
						case '_':
							break;
						default:
							has_special_characters = true;
					}
					break;
				case "Comment":
					temp.statement = new this.Comment(tokens[index]);
					return index;
			}
		}

		if (index > start_index) {
			this.parse_expression_statement(temp, tokens, start_index, index);
			return index;
		}

		throw Error("Executed unreachable code.");
	};

	// Parse If statement {{{2
	p.parse_if_statement = function (temp, tokens, index, next_token) {
		var i = index + 1, test, statement, alternate;

		if (tokens[i]) {
			if (tokens[i].type === "Parenthesis") {
				test = this.parse_test(temp, tokens[i].children);
				++i;
			} else {
				tokens[i].error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		if (tokens[i]) {
			i = this.parse_statement(temp, tokens, i);
			if (temp.statement) {
				statement = temp.statement;
			} else {
				throw Error("Fallback error");
			}
		} else {
			next_token.error_unexpected_token();
		}

		if (tokens[i + 1] && tokens[i + 1].type === "Identifier" && tokens[i + 1].value === "else") {
			if (tokens[i + 2]) {
				i = this.parse_statement(temp, tokens, i + 2);
				alternate = temp.statement;
			} else {
				throw Error("Fallback error");
			}
		}

		temp.statement = new this.IfStatement(
			tokens[index].start, tokens[i].end,
			test, statement, alternate
		);

		return i;
	};

	// Parse For statement {{{2
	p.parse_for_statement = function (temp, tokens, index, next_token) {
		var i = index + 1, type, init, test, update, left, right;

		if (tokens[i]) {
			if (tokens[i].type === "Parenthesis") {
				this.parse_for_arguments(temp, tokens[i].children);
				type = temp.type;
				switch (type) {
					case "loop" :
						init   = temp.init;
						test   = temp.test;
						update = temp.update;
						break;
					case "in" :
						left  = temp.left;
						right = temp.right;
						break;
					default:
						throw Error("Fallback error");
				}
				++i;
			} else {
				tokens[i].error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		if (tokens[i]) {
			i = this.parse_statement(temp, tokens, i);

			if (temp.statement) {
				switch (type) {
					case "loop" :
						temp.statement = new this.ForStatement(
							tokens[index].start, tokens[i].end,
							init, test, update, temp.statement
						);
						break;
					case "in" :
						temp.statement = new this.ForInStatement(
							tokens[index].start, tokens[i].end,
							left, right, temp.statement
						);
						break;
				}
			} else {
				throw Error("error");
			}
		} else {
			next_token.error_unexpected_token();
		}

		return i;
	};

	// Parse While statement {{{2
	p.parse_while_statement = function (temp, tokens, index, next_token) {
		var i = index + 1, test;

		if (tokens[i]) {
			if (tokens[i].type === "Parenthesis") {
				test = this.parse_test(temp, tokens[i].children);
				i = i + 1;
			} else {
				tokens[i].error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		if (tokens[i]) {
			i = this.parse_statement(temp, tokens, i);
			if (temp.statement) {
				temp.statement = new this.WhileStatement(tokens[index].start, tokens[i].end, test, temp.statement);
			} else {
				throw Error("Fallback error");
			}
		} else {
			next_token.error_unexpected_token();
		}

		return i;
	};

	// Parse Switch statement {{{2
	p.parse_switch_statement = function (temp, tokens, index, next_token) {
		var i = index + 1, body, discriminant;

		if (tokens[i]) {
			if (tokens[i].type === "Parenthesis") {
				this.parse_sequence_expression(temp, tokens[i].children, 0, tokens[i].children.length);
				if (temp.expression) {
					discriminant = temp.expression;
				} else {
					throw Error("Fallback error");
				}
				i = i + 1;
			} else {
				tokens[i].error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		if (tokens[i]) {
			if (tokens[i].type === "Block") {
				body = this.parse_switch_cases(temp, tokens[i].children);
			} else {
				tokens[i].error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		temp.statement = new this.SwitchStatement(tokens[index].start, tokens[i].end, discriminant, body);

		return i;
	};

	// Parse Labeled statement {{{2
	p.parse_labeled_statement = function (temp, tokens, index) {
		var i, label;

		i = this.parse_identifier(temp, tokens, index);
		label = temp.identifier;

		if (tokens[i + 1]) {
			if (tokens[i + 1].type === "SpecialCharacter" && tokens[i + 1].value === ':') {
				i = this.parse_statement(temp, tokens, i + 2, true);

				temp.statement = new this.LabeledStatement(tokens[index].start, temp.statement.end, label, temp.statement);
			} else {
				tokens[i + 1].error_unexpected_token();
			}
		} else {
			throw Error("Fallback error");
		}

		return i;
	};

	// Parse Try statement {{{2
	p.parse_try_statement = function (temp, tokens, index, next_token) {
		var i = index + 1, handler = null, finalizer = null, j, block, param, body;

		if (tokens[i]) {
			if (tokens[i].type === "Block") {
				block = new this.BlockStatement(tokens[i], this.parse_block_statement(tokens[i].children));
				++i;
			} else {
				tokens[i].error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		if (tokens[i]) {
			if (tokens[i].type === "Identifier" && tokens[i].value === "catch") {
				++i;

				if (tokens[i]) {
					if (tokens[i].type === "Parenthesis") {
						j = this.parse_identifier(temp, tokens[i].children, 0);
						if (temp.identifier) {
							param = temp.identifier;

							if (tokens[i].children.length > j + 1) {
								tokens[i].children[j + 1].error_unexpected_token();
							}
						} else {
							throw Error("error");
						}

						i = i + 1;
					} else {
						tokens[i].error_unexpected_token();
					}
				} else {
					next_token.error_unexpected_token();
				}

				if (tokens[i]) {
					if (tokens[i].type === "Block") {
						body    = new this.BlockStatement(tokens[i], this.parse_block_statement(tokens[i].children));
						handler = new this.CatchClause(tokens[i - 2].start, tokens[i].end, param, body);
					} else {
						tokens[i].error_unexpected_token();
					}
				} else {
					next_token.error_unexpected_token();
				}
			}
		}

		if (tokens[i + 1]) {
			if (tokens[i + 1].type === "Identifier" && tokens[i + 1].value === "finally") {
				i += 2;

				if (tokens[i]) {
					if (tokens[i].type === "Block") {
						finalizer = new this.BlockStatement(tokens[i], this.parse_block_statement(tokens[i].children));
					} else {
						throw Error("error");
					}
				} else {
					tokens[i].error_unexpected_token();
				}
			}
		}

		if (! handler && ! finalizer) {
			throw Error("Error");
		}

		temp.statement = new this.TryStatement(tokens[index].start, tokens[i].end, block, handler, finalizer);

		return i;
	};

	// Parse Block statement {{{2
	p.parse_block_statement = function (tokens) {
		var temp = new this.Temp(), i = 0, statements = [];

		if (this.statement_middlewares) {
			return this.parse_block_statement_with_middlewares(temp, tokens, statements);
		} else {
			for (; i < tokens.length; ++i) {
				i = this.parse_statement(temp, tokens, i);
				statements.push(temp.statement);
			}
		}

		return statements;
	};

	// Parse Block statement with middlewares {{{2
	p.parse_block_statement_with_middlewares = function (temp, tokens, statements) {
		var i = 0, j, return_index;

		LOOP:
		for (; i < tokens.length; ++i) {
			for (j = 0; j < this.statement_middlewares.length; ++j) {
				return_index = this.statement_middlewares[i](this, temp, tokens, i);

				if (return_index > i) {
					i = return_index;
					statements.push(temp.statement);
					continue LOOP;
				}
			}

			i = this.parse_statement(temp, tokens, i);
			statements.push(temp.statement);
		}

		return statements;
	};

	// Parse Return, Throw statement {{{2
	p.parse_statement_has_expression_argument = function (temp, tokens, index, Statement) {
		var i = this.parse_sequence_expression(temp, tokens, index + 1, tokens.length);
		temp.statement = new Statement(tokens[index].start, tokens[i].end, temp.expression);

		return i;
	};

	// Parse Break, Continue statement {{{2
	p.parse_statement_has_label = function (temp, tokens, index, Statement) {
		var i = index, label = null;

		if (tokens[i + 1]) {
			if (this.is_identifier(tokens[i + 1])) {
				i = this.parse_identifier(temp, tokens, i + 1);
				label = temp.identifier;
			}
		}

		if (tokens[i + 1]) {
			if (tokens[i + 1].type === "SpecialCharacter" && tokens[i + 1].value === ';') {
				++i;
			}
		}

		temp.statement = new Statement(tokens[index].start, tokens[i].end, label);
		
		return i;
	};
	
	// Parse Expression statement {{{2
	p.parse_expression_statement = function (temp, tokens, index, end_index) {
		this.parse_sequence_expression(temp, tokens, index, end_index);
		if (tokens[end_index]) {
			temp.statement = new this.ExpressionStatement(tokens[index].start, tokens[end_index].end, temp.expression);
		} else {
			temp.statement = new this.ExpressionStatement(tokens[index].start, tokens[end_index - 1].end, temp.expression);
		}
	};
	// }}}2

	// Parse Number expression {{{2
	p.parse_number_literal = function () {
		//var 
	};
	// }}}2

	// Parse Variable declaration {{{2
	p.parse_variable_declaration = function (temp, tokens, index, end_index) {
		var i = index + 1, vars = [], expect_identifer = true, declarator;

		
		for (; i < end_index; ++i) {
			switch (tokens[i].type) {
				// Number {{{3
				case "Number":
					tokens[i].error("Unexpected ILLEGAL token");
					break;
				// Identifier {{{3
				case "Identifier":
					if (declarator) {
					tokens[i].error_unexpected_type();
				}
				i = this.parse_identifier(temp, tokens, i);
				declarator = new this.VariableDeclarator(temp.identifier);
				expect_identifer = false;;
					break;
				// Special characters {{{3
				case "SpecialCharacter":
					switch (tokens[i].value) {
						case '=':
							if (declarator) {
								if (tokens[i + 1]) {
									i = this.parse_expression(temp, tokens, i + 1, end_index);
									declarator.end  = temp.expression.end_token.end;
									declarator.init = temp.expression.parsed_token;

									vars.push(declarator);
									declarator = null;
								} else {
									throw new Error("Fallback error");
								}
							} else {
								tokens[i].error_unexpected_token();
							}
							break;
						case '$':
						case '_':
							if (declarator) {
							tokens[i].error_unexpected_type();
						}
						i = this.parse_identifier(temp, tokens, i);
						declarator = new this.VariableDeclarator(temp.identifier);
						expect_identifer = false;;
							break;
						case ',':
							if (declarator) {
								vars.push(declarator);
								declarator = null;
							} else if (expect_identifer) {
								tokens[i].error_unexpected_token();
							}
							expect_identifer = true;
							break;
						case ';':
							if (expect_identifer) {
								tokens[i].error_unexpected_token();
							}
							if (declarator) {
								vars.push(declarator);
							}

							temp.statement = new this.VariableDeclaration(tokens[index].start, tokens[i].end, vars);
							return i;
						default:
							tokens[i].error_unexpected_token();
					}
					break;
				// Comment {{{3
				case "Comment":
					break;
				// Unexpected token {{{3
				default:
					tokens[i].error_unexpected_token();
				// }}}3
			}
		}

		// some kind of error...
		//if (! declarator) { }

		vars.push(declarator);
		temp.statement = new this.VariableDeclaration(tokens[index].start, tokens[i - 1].end, vars);

		return i - 1;
	};

	// Parse Function declaration {{{2
	p.parse_function_declaration = function (temp, tokens, index) {
		var i = index + 1, parameters, id, body;

		if (tokens[i]) {
			if (this.is_identifier(tokens[i])) {
				i  = this.parse_identifier(temp, tokens, i) + 1;
				id = temp.identifier;
			} else {
				tokens[i].error_unexpected_token();
			}
			// some kind of error
			//} else {
		}

		if (tokens[i]) {
			if (tokens[i].type === "Parenthesis") {
				parameters = this.parse_parameters(temp, tokens[i].children);
				++i;
			} else {
				tokens[i].error_unexpected_token();
			}
			// some kind of error
			//} else {
		}

		if (tokens[i]) {
			if (tokens[i].type === "Block") {
				body = new this.BlockStatement(
					tokens[i],
					this.parse_block_statement(tokens[i].children)
				);
			} else {
				tokens[i].error_unexpected_token();
			}
			// some kind of error
			//} else {
		}

		temp.statement = new this.FunctionDeclaration(tokens[index].start, body.end, id, parameters, body);

		return i;
	};
	// }}}2

	// Parse expression {{{2
	p.parse_expression = function (temp, tokens, i, end_index, delimiter) {
		var j = 0, pieces = [];

		LOOP:
		for (; i < end_index; ++i) {
			if (tokens[i].type === "SpecialCharacter") {
				switch (tokens[i].value) {
					case ',':
					case ';':
					case delimiter:
						if (pieces.length === 0) {
							temp.expression = null;
							return i;
						}
						break LOOP;
				}
			}
			i = this.parse_expression_piece(temp, tokens, i);

			if (temp.piece.parsed_token) {
				pieces.push(temp.piece);
			}
		}

		this.assemble_pieces(pieces, 0);

		for (; j < pieces.length; ++j) {
			if (pieces[j]) {
				temp.expression = pieces[j];
				break;
			}
		}
		/*
		var c = 0;
		for (j = 0; j < pieces.length; ++j) {
			if (pieces[j]) {
				c += 1;
			}
		}
		if (c > 1) {
			console.log("HERE", pieces);
			process.exit()
		}
		*/
		
		return i - 1;
	};

	// Parse expression pieces {{{2
	p.parse_expression_piece = function (temp, tokens, i) {
		temp.piece = new this.Piece(tokens[i]);

		if (this.expression_middlewares) {
			for (var j = 0; j < this.expression_middlewares.length; ++j) {
				i = this.expression_middlewares[j](this, temp.piece, tokens, i);

				if (temp.piece.parsed_token) {
					temp.piece.end_token = tokens[i];
					return i;
				}
			}
		}

		switch (tokens[i].type) {
			// Number literal {{{3
			case "Number":
				temp.piece.parsed_token = new this.NumberLiteral(tokens[i]);
				break;
			// String literal {{{3
			case "String":
				temp.piece.parsed_token = new this.StringLiteral(tokens[i]);
				break;
			// Regex literal {{{3
			case "RegExp":
				i = this.parse_regex(temp.piece, tokens, i);
				break;
			// Identifier {{{3
			case "Identifier":
				i = this.parse_identifier(temp, tokens, i);

				switch (temp.identifier.name) {
					case "in"         :
					case "void"       :
					case "delete"     :
					case "typeof"     :
					case "instanceof" :
						temp.piece.parsed_token = new this.Operator(temp.identifier.name);
						break;
					default:
						temp.piece.parsed_token = temp.identifier;
				}

				temp.piece.start_token = temp.piece.end_token = temp.token;
				break;
			// Parenthesis, Square bracket, Curly bracket {{{3
			case "Array":
			case "Block":
			case "Parenthesis":
				temp.piece.parsed_token = { type : tokens[i].type };
				break;
			// Special characters {{{3
			case "SpecialCharacter":
				switch (tokens[i].value) {
					case '_' :
					case '$' :
						i = this.parse_identifier(temp, tokens, i);
						temp.piece.parsed_token = temp.identifier;
						temp.piece.start_token  = temp.piece.end_token = temp.token;
						break;
					default:
						i = this.parse_operators(temp.piece, tokens, i);
				}
				break;
			// Comment {{{3
			case "Comment":
				temp.piece.parsed_token = null;
			// }}}3
		}

		if (! temp.piece.end_token) {
			temp.piece.end_token = tokens[i];
		}

		return i;
	};

	// Parse New expression {{{2
	p.parse_new_expression = function (pieces, index, next_token) {
		var i = index + 1, callee;

		this.assemble_pieces(pieces, i, next_token, "Parenthesis");

		for (; i < pieces.length; ++i) {
			if (pieces[i]) {
				callee    = pieces[i];
				pieces[i] = null;
				break;
			}
		}

		if (callee.parsed_token.type === "CallExpression") {
			pieces[index].parsed_token = new this.NewExpression(
				pieces[index].start_token.start, callee.end_token.end,
				callee.parsed_token.callee, callee.parsed_token["arguments"]
			);
		} else {
			pieces[index].parsed_token = new this.NewExpression(
				pieces[index].start_token.start, callee.end_token.end,
				callee.parsed_token, []
			);
		}
		pieces[index].end_token = callee.end_token;

		return i;
	};

	// Parse Unary expression {{{2
	p.parse_unary_expression = function (pieces, indices, next_token) {
		for (var j = 0, i, index, operand; j < indices.length; ++j) {
			index = indices[j];

			switch (pieces[index].parsed_token.operator) {
				case "--" :
				case "++" :
					if (pieces[index - 1] && pieces[index - 1].parsed_token &&
						pieces[index - 1].parsed_token.type !== "Operator" &&
						pieces[index - 1].parsed_token.type !== "NumberLiteral") {

						pieces[index - 1].parsed_token = new this.UnaryExpression(
							pieces[index - 1].start_token.start,
							pieces[index].end_token.end,
							pieces[index].parsed_token.operator,
							pieces[index - 1].parsed_token
						);
						pieces[index - 1].end_token = pieces[index].end_token;
					} else if (
						pieces[index + 1] && pieces[index + 1].parsed_token &&
						pieces[index + 1].parsed_token.type !== "Operator" &&
						pieces[index + 1].parsed_token.type !== "NumberLiteral") {

						pieces[index + 1].parsed_token = new this.UnaryExpression(
							pieces[index].start_token.start,
							pieces[index + 1].end_token.end,
							pieces[index].parsed_token.operator,
							pieces[index + 1].parsed_token,
							true
						);
						pieces[index + 1].start_token = pieces[index].start_token;
					}
					pieces[index] = null;
					return;
				case '+'      :
				case '-'      :
				case '!'      :
				case '~'      :
				case "void"   :
				case "delete" :
				case "typeof" :
					i = index + 1;

					for (; i < pieces.length; ++i) {
						if (pieces[i]) {
							operand   = pieces[i];
							pieces[i] = null;
							break;
						}
					}

					if (! operand) {
						next_token.error_unexpected_token();
					}

					if (operand.parsed_token && operand.parsed_token.type === "Operator") {
						operand.start_token.error_unexpected_token();
					}

					if (operand) {
						pieces[index].parsed_token = new this.UnaryExpression(
							pieces[index].start_token.start,
							operand.end_token.end,
							pieces[index].parsed_token.operator,
							operand.parsed_token,
							true
						);
						pieces[index].end_token = operand.end_token;
					}
					break;
			}
		}
	};

	// Parse Binary expression {{{2
	p.parse_binary_expression = function (pieces, indices, Expression) {
		for (var i = 0, j, left, right; i < indices.length; ++i) {
			for (j = indices[i] - 1; j >= 0; --j) {
				if (pieces[j]) {
					left      = pieces[j];
					pieces[j] = null;
					break;
				}
			}

			for (j = indices[i] + 1; j < pieces.length; ++j) {
				if (pieces[j]) {
					right     = pieces[j];
					pieces[j] = null;
					break;
				}
			}

			pieces[indices[i]].parsed_token = new Expression(
				left.start_token.start, right.end_token.end,
				left.parsed_token, pieces[indices[i]].parsed_token.operator, right.parsed_token
			);
			pieces[indices[i]].start_token = left.start_token;
			pieces[indices[i]].end_token   = right.end_token;
		}
	};

	// Parse Member expression {{{2
	p.parse_member_expression = function (pieces, index) {
		var i, object, property;

		switch (pieces[index].parsed_token.type) {
			case "Operator":
				for (i = index - 1; i >= 0; --i) {
					if (pieces[i]) {
						object = pieces[i];

						if (object.parsed_token.type === "Parenthesis") {
							return false;
						}

						pieces[i] = null;
						break;
					}
				}

				for (i = index + 1; i >= 0; ++i) {
					if (pieces[i]) {
						property  = pieces[i];
						pieces[i] = null;
						break;
					}
				}


				pieces[index].parsed_token = new this.MemberExpression(
					object.start_token.start, property.end_token.end,
					object.parsed_token     , property.parsed_token
				);
				pieces[index].start_token = object.start_token;
				pieces[index].end_token   = property.end_token;
				break;
			case "Array":
				for (i = index - 1; i >= 0; --i) {
					if (pieces[i] && pieces[i].parsed_token.type !== "Operator") {
						object    = pieces[i];

						if (object.parsed_token.type === "Parenthesis") {
							return false;
						}

						pieces[i] = null;
						break;
					}
				}

				property = pieces[index].parsed_token;
				this.parse_sequence_expression(
					property, pieces[index].start_token.children,
					0, pieces[index].start_token.children.length
				);

				if (property.expression) {
					pieces[index].parsed_token = new this.MemberExpression(
						object.start_token.start, pieces[index].end_token.end,
						object.parsed_token, property.expression, true
					);
				} else {
					throw Error("Fallback error");
				}
				pieces[index].start_token = object.start_token;

				break;
		}

		return true;
	};

	// Parse Function expression {{{2
	p.parse_function_expression = function (pieces, index, next_token) {
		var id = null, i = index + 1, parameters, body;

		if (pieces[i]) {
			if (pieces[i].parsed_token.type === "Identifier") {
				id        = pieces[i].parsed_token;
				pieces[i] = null;
				++i;
			} else if (pieces[i].parsed_token.type !== "Parenthesis") {
				pieces[i].start_token.error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		if (pieces[i]) {
			if (pieces[i].parsed_token.type === "Parenthesis") {
				parameters = this.parse_parameters(pieces[i], pieces[i].start_token.children);
				pieces[i]  = null;
				++i;
			} else {
				pieces[i].start_token.error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		if (pieces[i]) {
			if (pieces[i].parsed_token.type === "Block") {
				body = new this.BlockStatement(
					pieces[i].start_token,
					this.parse_block_statement(pieces[i].start_token.children)
				);
				pieces[i] = null;
			} else {
				pieces[i].start_token.error_unexpected_token();
			}
		} else {
			next_token.error_unexpected_token();
		}

		pieces[index].parsed_token = new this.FunctionExpression(pieces[index].start_token.start, body.end, id, parameters, body);

		return i;
	};

	// Parse Sequence expression {{{2
	p.parse_sequence_expression = function (temp, tokens, i, end_index, is_raw, delimiter) {
		var expressions = [];

		if (tokens.length === 0 || i >= tokens.length || (tokens[i].type === "SpecialCharacter" && tokens[i].value === ';')) {
			if (is_raw) {
				temp.expressions = expressions;
			} else {
				temp.expression = null;
			}
			return i;
		}

		LOOP:
		for (; i < end_index; ++i) {
			i = this.parse_expression(temp, tokens, i, end_index, delimiter);

			if (temp.expression) {
				expressions.push(temp.expression.parsed_token);
			}

			if (tokens[i + 1]) {
				if (tokens[i + 1].type === "SpecialCharacter") {
					switch (tokens[i + 1].value) {
						case ';':
						case delimiter :
							i += 2;
							break LOOP;
						case ',':
							++i;
							break;
						default:
							tokens[i + 1].error_unexpected_token();
					}
				} else {
					tokens[i + 1].error_unexpected_token();
				}
			}
		}

		if (is_raw) {
			temp.expressions = expressions;
		} else {
			if (expressions.length > 1) {
				temp.expression = new this.SequenceExpression(expressions);
			} else if (expressions.length === 1) {
				temp.expression = expressions[0];
			} else {
				temp.expression = null;
			}
		}

		return i - 1;
	};

	// Parse Assignment expression {{{2
	p.parse_assignment_expression = function (pieces, indices) {
		for (var i = 0, j, left, right; i < indices.length; ++i) {
			for (j = indices[i] - 1; j >= 0; --j) {
				if (pieces[j]) {
					left      = pieces[j];
					pieces[j] = null;
					break;
				}
			}

			switch (left.parsed_token.type) {
				case "Identifier" :
				case "MemberExpression" :
				case "AssignmentExpression" :
					break;
				default:
					left.start_token.error("Assigning to rvalue");
			}

			for (j = indices[i] + 1; j < pieces.length; ++j) {
				if (pieces[j]) {
					right     = pieces[j];
					pieces[j] = null;
					break;
				}
			}

			pieces[indices[i]].parsed_token = new this.AssignmentExpression(
				left.start_token.start, right.end_token.end,
				left.parsed_token, pieces[indices[i]].parsed_token.operator, right.parsed_token
			);
			pieces[indices[i]].start_token = left.start_token;
			pieces[indices[i]].end_token   = right.end_token;
		}
	};

	// Parse Conditional expression {{{2
	p.parse_conditional_expression = function (pieces, indices) {
		var i = 0, j, index, test, consequent, alternate;
		for (; i < indices.length; ++i, test = null) {
			for (j = indices[i] - 1; j >= 0; --j) {
				if (pieces[j]) {
					index = j;
					test  = pieces[j];
					break;
				}
			}

			if (! test) {
				throw Error("Fallback error");
			} else if (test.parsed_token.type === "Operator") {
				throw Error("Fallback error");
			}

			for (j = indices[i] + 1; j < pieces.length; ++j) {
				if (pieces[j]) {
					consequent = pieces[j];
					pieces[j]  = null;
					break;
				}
			}

			for (j = indices[i] + 1; j < pieces.length; ++j) {
				if (pieces[j]) {
					if (pieces[j].parsed_token.type === "Operator") {
						pieces[j] = null;
					} else {
						pieces[j].start_token.error_unexpected_token();
					}
					break;
				}
			}

			for (j = indices[i] + 1; j < pieces.length; ++j) {
				if (pieces[j]) {
					alternate = pieces[j];
					pieces[j] = null;
					break;
				}
			}

			pieces[indices[i]] = null;
			pieces[index].parsed_token = new this.ConditionalExpression(
				test.start_token.start, alternate.end_token.end,
				test.parsed_token, consequent.parsed_token, alternate.parsed_token
			);
			pieces[index].start_token = test.start_token;
			pieces[index].end_token   = alternate.end_token;
		}
	};
	// }}}2

	// Parse Array {{{2
	p.parse_array = function (tokens) {
		var i = 0, temp = new this.Temp(), elements = [];

		for (; i < tokens.length; ++i) {
			if (tokens[i].type === "SpecialCharacter" && tokens[i].value === ',') {
				if (temp.to_add) {
					elements.push(temp.expression.parsed_token);
					temp.to_add = false;
				} else {
					elements.push(null);
				}
			} else {
				i = this.parse_expression(temp, tokens, i, tokens.length);
				temp.to_add = true;
			}
		}

		if (temp.to_add) {
			elements.push(temp.expression.parsed_token);
		}

		return elements;
	};

	// Parse Switch case {{{2
	p.parse_switch_cases = function (temp, tokens) {
		var i = 0, body = [], index, j, test, statements;

		TOP:
		for (; i < tokens.length; ++i) {
			switch (tokens[i].type) {
				case "Comment":
					body.push(new this.Comment(tokens[i]));
					continue TOP;
				case "Identifier" :
					break;
				default:
					tokens[i].error_unexpected_token();
			}

			SWITCH:
			switch (tokens[i].value) {
				case "case" :
					index = i;

					if (tokens[i + 1]) {
						if (tokens[i + 1].type === "SpecialCharacter" && tokens[i + 1].value === ':') {
							tokens[i + 1].error_unexpected_token();
						} else {
							i = this.parse_sequence_expression(temp, tokens, i + 1, tokens.length, false, ':');
						}
					} else {
						throw new Error("Fallback error");
					}

					if (tokens[i]) {
						if (tokens[i].type === "SpecialCharacter" && tokens[i].value === ':') {
							test       = temp.expression;
							statements = [];

							if (i + 1 === tokens.length) {
								body.push(new this.SwitchCase(tokens[index].start, tokens[i].end, test, statements));
								break;
							}

							CASE_SEARCH_NEXT_LOOP:
							for (j = i + 1; j < tokens.length; ++j) {
								switch (tokens[j].type) {
									case "Comment":
										break;
									case "Identifier":
										switch (tokens[j].value) {
											case "case":
											case "default":
												body.push(new this.SwitchCase(tokens[index].start, tokens[i].end, test, statements));
												break SWITCH;
										}
										break CASE_SEARCH_NEXT_LOOP;
									default:
										break CASE_SEARCH_NEXT_LOOP;
								}
							}

							CASE_LOOP:
							for (++i; i < tokens.length; ++i) {
								i = this.parse_statement(temp, tokens, i);
								statements.push(temp.statement);

								if (tokens[i + 1] && tokens[i + 1].type === "Identifier") {
									switch (tokens[i + 1].value) {
										case "case" :
										case "default" :
											break CASE_LOOP;
									}
								} else {
									break;
								}
							}

							body.push(new this.SwitchCase(tokens[index].start, tokens[i].end, test, statements));
						} else {
							tokens[i].error_unexpected_token();
						}
					} else {
						throw new Error("Fallback error");
					}
					break;
				case "default" :
					index = i;

					if (tokens[i + 1]) {
						if (tokens[i + 1].type === "SpecialCharacter" && tokens[i + 1].value === ':') {
							++i;
							statements = [];

							if (i + 1 === tokens.length) {
								body.push(new this.DefaultCase(tokens[index].start, tokens[i].end, statements));
								break;
							}

							DEFAULT_SEARCH_NEXT_LOOP:
							for (j = i + 1; j < tokens.length; ++j) {
								switch (tokens[j].type) {
									case "Comment":
										break;
									case "Identifier":
										switch (tokens[j].value) {
											case "case":
											case "default":
												body.push(new this.DefaultCase(tokens[index].start, tokens[i].end, statements));
												break SWITCH;
										}
										break DEFAULT_SEARCH_NEXT_LOOP;
									default:
										break DEFAULT_SEARCH_NEXT_LOOP;
								}
							}

							DEFAULT_LOOP:
							for (++i; i < tokens.length; ++i) {
								i = this.parse_statement(temp, tokens, i);
								statements.push(temp.statement);

								if (tokens[i + 1] && tokens[i + 1].type === "Identifier") {
									switch (tokens[i + 1].value) {
										case "case" :
										case "default" :
											break DEFAULT_LOOP;
									}
								} else {
									break;
								}
							}

							body.push(new this.DefaultCase(tokens[index].start, tokens[i].end, statements));
						} else {
							tokens[i].error_unexpected_token();
						}
					} else {
						throw new Error("Fallback error");
					}
					break;
				default:
					tokens[i].error_unexpected_token();
			}
		}

		return body;
	};

	// Parse Operators {{{2
	p.parse_operators = function (temp, tokens, i) {
		
		switch (tokens[i].value) {
			case '.':
				temp.parsed_token = new this.Operator('.');
				return i;
			case '-':
				if (tokens[i + 1].value === '-' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("--");
					return i + 1;
				} else if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("-=");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('-');
				return i;
			case '+':
				if (tokens[i + 1].value === '+' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("++");
					return i + 1;
				} else if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("+=");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('+');
				return i;
			case '/':
				if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("/=");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('/');
				return i;
			case '*':
				if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("*=");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('*');
				return i;
			case '%':
				if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("%=");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('%');
				return i;
			case '=':
				if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					if (tokens[i + 2].value === '=' && tokens[i + 2].start.index === tokens[i + 1].end.index) {
						temp.parsed_token = new this.Operator("===");
						return i + 2;
					}

					temp.parsed_token = new this.Operator("==");
					return i + 1;
				}

				temp.parsed_token = new this.Operator('=');
				return i;
			case '&':
				if (tokens[i + 1].value === '&' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("&&");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('&');
				return i;
			case '|':
				if (tokens[i + 1].value === '|' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("||");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('|');
				return i;
			case '>':
				if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator(">=");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('>');
				return i;
			case '<':
				if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					temp.parsed_token = new this.Operator("<=");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('<');
				return i;
			case '!':
				if (tokens[i + 1].value === '=' && tokens[i + 1].start.index === tokens[i].end.index) {
					if (tokens[i + 2].value === '=' && tokens[i + 2].start.index === tokens[i + 1].end.index) {
						temp.parsed_token = new this.Operator("!==");
						return i + 2;
					}

					temp.parsed_token = new this.Operator("!=");
					return i + 1;
				}
				temp.parsed_token = new this.Operator('!');
				return i;
			case '?':
			case ':':
				temp.parsed_token = new this.Operator(tokens[i].value);
				return i;
			default:
				tokens[i].error_unexpected_token();
		}
	};

	// Parse Identifier {{{2
	p.parse_identifier = function (temp, tokens, index) {
		var i          = index + 1,
			token      = temp.token      = new Token(),
			identifier = temp.identifier = new this.Identifier(tokens[index]);

		LOOP:
		for (; i < tokens.length; ++i) {
			switch (tokens[i].type) {
				case "Number":
				case "Identifier":
					if (tokens[i - 1].end.index === tokens[i].start.index) {
						identifier.name = identifier.name + tokens[i].value;
					} else {
						break LOOP;
					}
					break;
				case "SpecialCharacter":
					switch (tokens[i].value) {
						case '$':
						case '_':
							if (tokens[i - 1].end.index === tokens[i].start.index) {
								identifier.name = identifier.name + tokens[i].value;
							} else {
								break LOOP;
							}
							break;
						default:
							break LOOP;
					}
					break;
				default:
					break LOOP;
			}
		}

		identifier.end = tokens[i - 1].end;

		token.type  = "Identifier";
		token.value = identifier.name;
		token.start = tokens[index].start;
		token.end   = tokens[i - 1].end;

		return i - 1;
	};

	// Parse Parenthesis {{{2
	p.parse_parenthesis = function (pieces, indices) {
		var i = 0, temp = pieces[indices[0]].parsed_token, j, args;

		LOOP:
		for (; i < indices.length; ++i) {
			for (j = indices[i] - 1; j >= 0; --j) {
				if (pieces[j]) {
					if (pieces[j].parsed_token.type !== "Operator") {
						args = this.parse_arguments(temp, pieces[indices[i]].start_token.children);

						pieces[indices[i]].parsed_token = new this.CallExpression(
							pieces[j].start_token.start,
							pieces[indices[i]].end_token.end,
							pieces[j].parsed_token,
							args
						);
						pieces[indices[i]].start_token = pieces[j].start_token;
						pieces[j] = null;
					} else {
						this.parse_sequence_expression(
							temp, pieces[indices[i]].start_token.children,
							0, pieces[indices[i]].start_token.children.length
						);
						pieces[indices[i]].parsed_token = temp.expression;
					}

					continue LOOP;
				}
			}
		}
	};

	// Parse RegExp {{{2
	p.REGEX_FLAGS = "gimuy";

	p.parse_regex = function (piece, tokens, index) {
		var next_index = index + 1, i = 0, flags = '', has_flags, value;

		if (tokens[next_index] && tokens[index].end.index === tokens[next_index].start.index && tokens[next_index].type === "Identifier") {
			value     = tokens[next_index].value;
			has_flags = true;

			for (i = value.length - 1; i >= 0; --i) {
				if (this.REGEX_FLAGS.indexOf(value.charAt(i)) !== -1 && flags.indexOf(value.charAt(i)) === -1) {
					flags = flags + value.charAt(i);
				} else {
					tokens[next_index].error("Invalid regular expression flags");
				}
			}
		}

		if (! has_flags) {
			flags      = '';
			next_index = index;
		}

		piece.parsed_token = new this.RegExpLiteral(
			tokens[index].start, tokens[next_index].end,
			tokens[index].value, flags
		);

		return next_index;
	};

	// Parse Arguments {{{2
	p.parse_arguments = function (temp, tokens) {
		this.parse_sequence_expression(temp, tokens, 0, tokens.length, true);
		return temp.expressions;
	};

	// Parse For arguments {{{2
	p.parse_for_arguments = function (temp, tokens) {
		var is_var = (tokens[0] && tokens[0].type === "Identifier" && tokens[0].value === "var"),
			i = is_var ? 1 : 0;

		if (tokens[i]) {
			temp.identifier = null;

			if (this.is_identifier(tokens[i])) {
				i = this.parse_identifier(temp, tokens, i);

				// TODO: replace binary 'in' operator
				temp.type = (tokens[i + 1] && tokens[i + 1].value === "in") ? "in" : "loop";
			} else {
				temp.type = "loop";
			}

			switch (temp.type) {
				case "in":
					if (is_var) {
						temp.left = new this.VariableDeclaration(tokens[0].start, temp.identifier.end, [
							new this.VariableDeclarator(temp.identifier)
						]);
					} else {
						temp.left = temp.identifier;
					}

					i = this.parse_sequence_expression(temp, tokens, i + 2, tokens.length);
					if (temp.expression) {
						temp.right = temp.expression;
					} else {
						throw Error("error");
					}
					break;
				case "loop":
					if (is_var) {
						i = this.parse_variable_declaration(temp, tokens, 0, tokens.length);
						temp.init = temp.statement;
					} else {
						i = this.parse_sequence_expression(temp, tokens, 0, tokens.length);
						temp.init = temp.expression;
					}

					if (tokens[i].type === "SpecialCharacter" && tokens[i].value === ';') {
						i = this.parse_sequence_expression(temp, tokens, i + 1, tokens.length);
						temp.test = temp.expression;
					} else {
						throw Error("ERROR");
					}

					if (tokens[i].type === "SpecialCharacter" && tokens[i].value === ';') {
						i = this.parse_sequence_expression(temp, tokens, i + 1, tokens.length);
						temp.update = temp.expression;
					} else {
						throw Error("ERROR");
					}
					break;
			}
		} else {
			throw Error("error");
		}
	};

	// Parse Parameters {{{2
	p.parse_parameters = function (temp, tokens) {
		var i = 0, params = [];

		for (; i < tokens.length; ++i) {
			if (this.is_identifier(tokens[i])) {
				i = this.parse_identifier(temp, tokens, i);

				if (tokens[i + 1]) {
					if (tokens[i + 1].type === "SpecialCharacter" && tokens[i + 1].value === ',') {
						++i;
					} else {
						tokens[i + 1].error_unexpected_token();
					}
				}

				params.push(temp.identifier);
			} else {
				tokens[i].error_unexpected_token();
			}
		}

		return params;
	};

	// Parse Test {{{2
	p.parse_test = function (temp, tokens) {
		this.parse_sequence_expression(temp, tokens, 0, tokens.length);
		if (temp.expression) {
			return temp.expression;
		}
		throw Error("Fallback error");
	};

	// Parse Object literal {{{2
	p.parse_object_literal = function (block_token) {
		var i = 0, properties = [], temp = new this.Temp(), tokens = block_token.children, property, expect_value;

		for (; i < tokens.length; ++i) {
			if (! property && this.is_identifier(tokens[i])) {
				i = this.parse_identifier(temp, tokens, i);
				property = new this.Property(temp.identifier);
				continue;
			}

			switch (tokens[i].type) {
				case "Number":
					if (property) {
						tokens[i].error_unexpected_type();
					}
					property = new this.Property(new this.NumberLiteral(tokens[i]));
					expect_value = true;
					break;
				case "String":
					if (property) {
						tokens[i].error_unexpected_type();
					}
					property = new this.Property(new this.StringLiteral(tokens[i]));
					expect_value = true;
					break;
				case "Array":
					break;
				case "SpecialCharacter":
					switch (tokens[i].value) {
						case ':':
							if (expect_value) {
								i = this.parse_expression(temp, tokens, i + 1, tokens.length);
								expect_value   = false;
								property.value = temp.expression.parsed_token;
							} else if (property) {
								i = this.parse_expression(temp, tokens, i + 1, tokens.length);
								property.value = temp.expression.parsed_token;
							} else {
								tokens[i].error_unexpected_token();
							}

							properties.push(property);
							property = null;
							break;
						case ',':
							if (expect_value) {
								tokens[i].error_unexpected_token();
							} else if (property) {
								property.value = property.key;
								property.end   = property.value.end;

								properties.push(property);
								property = null;
							}
							break;
						default:
							tokens[i].error_unexpected_token();
					}
					break;
				case "Comment":
					properties.push(new this.Comment(tokens[i]));
					break;
				default:
					tokens[i].error_unexpected_token();
			}
		}

		if (property) {
			if (expect_value) {
				throw Error("Fallback error");
			}

			property.value = property.key;
			property.end   = property.value.end;
			properties.push(property);
		}

		return new this.ObjectLiteral(block_token, properties);
	};

	p.parse_block = function (pieces, index) {
		//var tokens = pieces[index], i = 0, is_object_literal = true;

		//for (; i < tokens.length; ++i) { }
		
		pieces[index].parsed_token = this.parse_object_literal(pieces[index].start_token);
	};
	// }}}2

	// Assemble pieces {{{2
	// learned from : https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
	p.assemble_pieces = function (pieces, i, next_token, until) {

		var member_operator_indices      = [],
			parenthesis_indices          = [],
			unary_operator_indices       = [],
			high_math_operator_indices   = [],
			medium_math_operator_indices = [],
			low_math_operator_indices    = [],
			conditional_operator_indices = [],
			logical_operator_indices     = [], // fixme: less than or greater than is
			ternary_operator_indices     = [],
			assignment_operator_indices  = [];

		for (; i < pieces.length; ++i) {
			switch (pieces[i].parsed_token.type) {
				case "Identifier":
					switch (pieces[i].parsed_token.name) {
						case "new" :
							i = this.parse_new_expression(pieces, i);
							break;
						case "function" :
							i = this.parse_function_expression(pieces, i);
							break;
					}
					break;
				case "Operator":
					switch (pieces[i].parsed_token.operator) {
						case '?':
							ternary_operator_indices.unshift(i);
							break;
						case "&&":
						case "||":
							logical_operator_indices.push(i);
							break;
						case '.' :
							member_operator_indices.push({ index : i });
							break;
						case '!'      :
						case '~'      :
						case "++"     :
						case "--"     :
						case "void"   :
						case "delete" :
						case "typeof" :
							unary_operator_indices.unshift(i);
							break;
						case '<'   :
						case '>'   :
						case "<="  :
						case ">="  :
						case "=="  :
						case "===" :
						case "!="  :
						case "!==" :
							conditional_operator_indices.push(i);
							break;
						case '+'   :
						case '-'   :
							if (i === 0 || (pieces[i - 1] && pieces[i - 1].parsed_token.type === "Operator")) {
								unary_operator_indices.unshift(i);
							} else {
								medium_math_operator_indices.push(i);
							}
							break;
						case '*'   :
						case '/'   :
						case '%'   :
							high_math_operator_indices.push(i);
							break;
						case "=":
						case "+=":
						case "-=":
						case "*=":
						case "/=":
						case "%=":
						case "&=":
						case "^=":
						case "|=":
						case "**=":
						case "<<=":
						case ">>=":
						case ">>>=":
							assignment_operator_indices.push(i);
							break;
					}
					break;
				case "Parenthesis":
					if (i === 0) {
						this.parse_sequence_expression(
							pieces[0], pieces[0].start_token.children,
							0, pieces[0].start_token.children.length
						);
						pieces[0].parsed_token = pieces[0].expression;
					} else {
						parenthesis_indices.push(i);
					}
					break;
				case "Array":
					if (pieces[i - 1] && pieces[i - 1].parsed_token.type !== "Operator") {
						member_operator_indices.push({ index : i });
					} else {
						pieces[i].parsed_token = new this.ArrayLiteral(
							pieces[i].start_token,
							this.parse_array(pieces[i].start_token.children)
						);
					}
					break;
				case "Block":
					this.parse_block(pieces, i);
					break;
			}

			if (until && pieces[i].parsed_token.type === until) {
				break;
			}
		}

		for (i = 0; i < member_operator_indices.length; ++i) {
			member_operator_indices[i].is_parsed = this.parse_member_expression(pieces, member_operator_indices[i].index);
		}
		if (parenthesis_indices.length) {
			this.parse_parenthesis(pieces, parenthesis_indices);
		}
		for (i = 0; i < member_operator_indices.length; ++i) {
			if (! member_operator_indices[i].is_parsed) {
				this.parse_member_expression(pieces, member_operator_indices[i].index);
			}
		}
		this.parse_unary_expression(pieces, unary_operator_indices);
		this.parse_binary_expression(pieces, high_math_operator_indices, this.BinaryExpression);
		this.parse_binary_expression(pieces, medium_math_operator_indices, this.BinaryExpression);
		this.parse_binary_expression(pieces, low_math_operator_indices, this.BinaryExpression);
		this.parse_binary_expression(pieces, conditional_operator_indices, this.BinaryExpression);
		this.parse_binary_expression(pieces, logical_operator_indices, this.LogicalExpression);
		this.parse_conditional_expression(pieces, ternary_operator_indices);
		this.parse_assignment_expression(pieces, assignment_operator_indices);
	};
	// }}}2

	// Is Identifier {{{2
	p.is_identifier = function (token) {
		return token.type === "Identifier" || token.value === '$' || token.value === '_';
	};

	// Error End of file {{{2
	p.error_end_of_file = function () {
		this.raw_tokens[this.raw_tokens.length - 1].error("Unexpected end of file");
	};
	// }}}2

	var JavascriptParserWrapper = function () {
		this.statement_middlewares  = [];
		this.expression_middlewares = [];
	};
	p = JavascriptParserWrapper.prototype;

	p.JavascriptParser = JavascriptParser;
	p.clone_middlewares = function (middlewares) {
		var i = 0, clone = new Array(middlewares.length);

		for (; i < clone.length; ++i) {
			clone[i] = middlewares[i];
		}

		return clone;
	};

	p.statement = function (middleware) {
		if (this.statement_middlewares) {
			this.statement_middlewares.push(middleware);
		} else {
			this.statement_middlewares = [middleware];
		}
	};
	p.expression = function (middleware) {
		if (this.expression_middlewares) {
			this.expression_middlewares.push(middleware);
		} else {
			this.expression_middlewares = [middleware];
		}
	};

	p.parse = function (filename, source_code) {
		var parser = new this.JavascriptParser(
			this.statement_middlewares  && this.clone_middlewares(this.statement_middlewares),
			this.expression_middlewares && this.clone_middlewares(this.expression_middlewares)
		);
		return parser.parse(filename, source_code);
	};

	return JavascriptParserWrapper;
});
// }}}1

// Public API {{{1
app.namespace("javascript.ES5_parser", ["javascript.tokenizer", "javascript.Parser"], function (tokenizer, JavascriptParser) {
	var parser = new JavascriptParser();

	var ECMA6String = function () {};
	var p = ECMA6String.prototype;

	p.TemplateLiteral = function (token, body) {
		this.type  = "TemplateLiteral";
		this.body  = body;
		this.start = token.start;
		this.end   = token.end;
	};
	p.TemplateLiteralString = function (token) {
		this.type  = "TemplateLiteralString";
		this.value = token.value;
		this.start = token.start;
		this.end   = token.end;
	};
	p.TemplateLiteralExpression = function (token, expression) {
		this.type       = "TemplateLiteralExpression";
		this.expression = expression;
		this.start      = token.start;
		this.end        = token.end;
	};

	p.parse = function (parser, temp, tokens, i) {
		if (tokens[i].type === "TemplateLiteral") {
			var body = [], j = 0;

			for (; j < tokens[i].children.length; ++j) {
				switch (tokens[i].children[j].type) {
					case "TemplateLiteral quasi string" :
						body.push(new this.TemplateLiteralString(tokens[i].children[j]));
						break;
					case "TemplateLiteral expression" :
						parser.parse_sequence_expression(
							temp, tokens[i].children[j].children,
							0, tokens[i].children[j].children.length
						);
						body.push(new this.TemplateLiteralExpression(
							tokens[i].children[j],
							temp.expression
						));
						break;
					default:
						tokens[i].error_unexpected_token();
				}
			}

			temp.parsed_token = new this.TemplateLiteral(tokens[i], body);
		}

		return i;
	};

	var es6 = new ECMA6String();

	parser.expression(function (p, temp, tokens, i) {
		return es6.parse(p, temp, tokens, i);
	});

	return function (filename, source_code) {
		try {
			return parser.parse(filename, source_code);
		} catch (error) {
			error.fileName = filename;
			error.$stack   = error.stack;
			throw error;
		}
	};
});
// }}}1

});

/**
 * jeefo_javascript_beautifier : v0.0.1
 * Author                      : je3f0o, <je3f0o@gmail.com>
 * Homepage                    : https://github.com/je3f0o/jeefo_javascript_beautifier
 * License                     : The MIT License
 * Copyright                   : 2017
 **/
jeefo.use(function () {

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : beautifier.js
* Created at  : 2017-04-20
* Updated at  : 2017-05-07
* Author      : jeefo
* Purpose     :
* Description :
_._._._._._._._._._._._._._._._._._._._._.*/

// Javascript Beautifier {{{1
jeefo.module("jeefo_javascript_beautifier", ["jeefo_javascript_parser"]).namespace("javascript.Beautifier", function () {
	var JavascriptBeautifier = function (indent, indentation) {
		this.indentation    = indentation;
		this.current_indent = indent;
	},
	p = JavascriptBeautifier.prototype;

	// Utils {{{2
	p.Constructor = JavascriptBeautifier;
	p.$new = function () {
		var instance = new this.Constructor(this.indent, this.indentation);
		if (this.middlewares) {
			ARRAY_COPY(instance.middlewares, this.middlewares);
		}
		return instance;
	};

	// Indentation {{{2
	p.indent = function () {
		this.current_indent = this.current_indent + this.indentation;
		return this.current_indent;
	};
	p.outdent = function () {
		this.current_indent = this.current_indent.substring(0, this.current_indent.length - this.indentation.length);
		return this.current_indent;
	};

	// Middleware handler {{{2
	p.middleware = function (middleware) {
		if (this.middlewares) {
			this.middlewares.push(middleware);
		} else {
			this.middlewares = [middleware];
		}
	};

	// Binary expression handler {{{2
	p.compile_binary_expression = function (token, operator) {
		switch (token.type) {
			case "BinaryExpression" :
			case "LogicalExpression" :
				switch (operator) {
					case '%' :
					case '/' :
					case '*' :
						switch (token.operator) {
							case '%' :
							case '/' :
							case '*' :
								return this.compile(token);
							default:
								return '(' + this.compile(token) + ')';
						}
						break;
					case '-' :
					case '+' :
						switch (token.operator) {
							case '-' :
							case '+' :
								return this.compile(token);
							default:
								return '(' + this.compile(token) + ')';
						}
						break;
					default:
						return this.compile(token);
				}
		}

		return this.compile(token);
	};

	// String quote handler {{{2
	p.SINGLE_QUOTE_REGEX = /'/;
	p.DOUBLE_QUOTE_REGEX = /"/;
	p.DOUBLE_QUOTE_REPLACE_REGEX = /"/g;
	p.get_string = function (value) {
		if (value === '') {
			return "''";
		}

		if (value.length === 1) {
			if (value === '"') {
				return "'\"'";
			} else if (value === "'") {
				return "\"'\"";
			}
			return "'" + value + "'";
		}

		if (value.length === 2 && value.charAt(0) === '\\') {
			if (this.SINGLE_QUOTE_REGEX.test(value)) {
				return '"' + value + '"';
			}
			return "'" + value + "'";
		}

		if (this.DOUBLE_QUOTE_REGEX.test(value)) {
			if (this.SINGLE_QUOTE_REGEX.test(value)) {
				return '"' + value.replace(this.DOUBLE_QUOTE_REPLACE_REGEX, '\\"') + '"';
			}
			return "'" + value + "'";
		}

		return '"' + value + '"';
	};

	// Main compiler {{{2
	p.compile = function (token, special) {
		var i, args, params, body, statements, indent;

		if (! token) {
			return String(token);
		}

if (!this) {
	console.log(token);
}
		if (this.middlewares) {
			for (i = 0; i < this.middlewares.length; ++i) {
				this.middlewares[i](token);
			}
		}

		if (token.compiled) {
			return token.compiled;
		}

		switch (token.type) {
			// Comment {{{3
			case "Comment":
				return "/* " + token.comment.trim() + " */";

			// Statements {{{3
			case "EmptyStatement":
				return '';
			case "ExpressionStatement":
				return this.compile(token.expression) + ';';
			case "IfStatement":
				if (token.statement.type === "EmptyStatement") {
					body = ';';
				} else {
					body = ' ' + this.compile(token.statement);
				}
				return "if (" + this.compile(token.test) + ')' + body + (token.alternate ? " else " + this.compile(token.alternate) : '');
			case "ForStatement":
				if (token.statement.type === "EmptyStatement") {
					body = ';';
				} else {
					body = ' ' + this.compile(token.statement);
				}

				if (token.init) {
					if (token.init.type === "VariableDeclaration") {
						args = this.compile(token.init);
					} else {
						args = this.compile(token.init) + ';';
					}
				} else {
					args = ';';
				}

				if (token.test) {
					args = args + ' ' + this.compile(token.test) + ';';
				} else {
					args = args + ';';
				}

				if (token.update) {
					args = args + ' ' + this.compile(token.update);
				}

				return "for (" + args + ')' + body;
			case "ForInStatement":
				body = this.compile(token.body);
				if (body !== ';') {
					body = ' ' + body;
				}

				if (token.left.type === "VariableDeclaration") {
					args = this.compile(token.left, true);
				} else {
					args = this.compile(token.left);
				}
				args = args + " in " + this.compile(token.right);

				return "for (" + args + ')' + body;
			case "WhileStatement":
				body = this.compile(token.body);
				if (body !== ';') {
					body = ' ' + body;
				}
				return "while (" + this.compile(token.test) + ')' + body;
			case "SwitchStatement":
				this.indent();

				body = token.cases.map(this.compile, this).join('n' + this.current_indent);

				if (body) {
					body = 'n' + this.current_indent + body;
				}

				this.outdent();
				if (body) {
					body = body + 'n' + this.current_indent;
				}

				return "switch (" + this.compile(token.test) + ") {" + body + '}';
			case "BlockStatement":
				statements = token.body;

				if (statements[0]) {
					indent = this.indent();
					body   = indent + this.compile(statements[0]);

					for (i = 1; i < statements.length; ++i) {
						body = body + 'n' + indent + this.compile(statements[i]); 
					}

					body = 'n' + body + 'n' + this.outdent();
				}

				return '{' + (body || '') + '}';
			case "TryStatement":
				if (token.handler) {
					body = this.compile(token.handler);
				}
				if (token.finalizer) {
					body = body + " finally " + this.compile(token.finalizer);
				}
				return "try " + this.compile(token.block) + body;
			case "ReturnStatement":
				return "return" + (token.argument ? ' ' + this.compile(token.argument) : '') + ';';

			// Expressions {{{3
			case "ConditionalExpression":
				return this.compile(token.test) + " ? " + this.compile(token.consequent) + " : " + this.compile(token.alternate);
			case "CallExpression":
				args = token.arguments.map(this.compile, this).join(", ");

				return this.compile(token.callee) + '(' + args + ')';
			case "UnaryExpression":
				switch (token.operator) {
					case '+'      :
					case '-'      :
					case '~'      :
						return token.operator + this.compile(token.argument);
					case '!'      :
						body = this.compile(token.argument);
						if (body[0] === '!') {
							return '!' + body;
						}
						return "! " + body;
					case "++"     :
					case "--"     :
						if (token.is_prefix) {
							return token.operator + this.compile(token.argument);
						}
						return this.compile(token.argument) + token.operator;
				}
				return token.operator + ' ' + this.compile(token.argument);
			case "SequenceExpression":
				if (token.expressions[0]) {
					body = this.compile(token.expressions[0]);

					for (i = 1; i < token.expressions.length; ++i) {
						body = body + ", " + this.compile(token.expressions[i]);
					}
				}
				return body ? '(' + body + ')' : '';
			case "NewExpression":
				args = token.arguments.map(this.compile, this).join(", ");

				return "new " + this.compile(token.callee) + '(' + args + ')';
			case "BinaryExpression":
			case "LogicalExpression":
				return this.compile_binary_expression(token.left, token.operator) + ' ' + token.operator + ' ' + this.compile_binary_expression(token.right, token.operator);
			case "AssignmentExpression":
				return this.compile(token.left) + ' ' + token.operator + ' ' + this.compile(token.right);
			case "TemplateLiteralExpression":
				switch (token.expression.type) {
					case "BinaryExpression" :
					case "LogicalExpression" :
					case "ConditionalExpression" :
						return '(' + this.compile(token.expression) + ')';
				}
				return this.compile(token.expression);
			case "MemberExpression":
				if (token.is_computed) {
					return this.compile(token.object) + '[' + this.compile(token.property) + ']';
				}
				return this.compile(token.object) + '.' + this.compile(token.property);
			case "FunctionExpression":
				if (token.parameters[0]) {
					params = token.parameters[0].name;

					for (i = 1; i < token.parameters.length; ++i) {
						params = params + ", " + token.parameters[i].name;
					}
				}

				return "function " + (token.id ? token.id.name + ' ' : '') + '(' + (params || '') + ") " + this.compile(token.body);

			// Literals {{{3
			case "StringLiteral":
				return this.get_string(token.value);
			case "TemplateLiteralString":
				return token.value.split('\n').map(this.get_string, this).join(" +\n");
			case "NumberLiteral":
				return token.value;
			case "RegExpLiteral":
				return '/' + token.regex.pattern + '/' + token.regex.flags;
			case "ArrayLiteral":
				this.indent();

				if (token.elements.length) {
					body = token.elements[0] ? this.compile(token.elements[0]) : '';

					for (i = 1; i < token.elements.length; ++i) {
						if (token.elements[i]) {
							body = body + ",\n" + this.current_indent + this.compile(token.elements[i]);
						} else {
							body = body + ",\n" + this.current_indent + " undefined";
						}
					}
				}

				this.outdent();

				return '[' + (body || '') + ']';
			case "ObjectLiteral":
				this.indent();

				body = token.properties.map(this.compile, this).join(",\n");

				this.outdent();

				if (body) {
					body = 'n' + body + 'n' + this.current_indent;
				}

				return '{' + body + '}';
			case "TemplateLiteral":
				return token.body.map(this.compile, this).join(" + ");

			// Others {{{3
			case "SwitchCase":
				this.indent();

				body = token.statements.map(this.compile, this).join('n' + this.current_indent);

				if (body) {
					body = 'n' + this.current_indent + body;
				}

				this.outdent();

				return "case " + this.compile(token.test) + ':' + body;
			case "DefaultCase":
				this.indent();

				body = token.statements.map(this.compile, this).join('n' + this.current_indent);

				if (body) {
					body = 'n' + this.current_indent + body;
				}

				this.outdent();

				return "default:" + body;
			case "VariableDeclarator":
				var max_length = special - token.id.name.length;

				if (token.init) {
					for (i = 0, indent = ''; i < max_length; ++i) {
						indent = indent + ' ';
					}
					return token.id.name + indent + " = " + this.compile(token.init);
				}

				return token.id.name;
			case "VariableDeclaration":
				this.current_indent += '    ';

				var _max_length = token.declarations.reduce(function (length, declartor) {
					return declartor.id.name.length > length ? declartor.id.name.length : length;
				}, 0);

				if (token.declarations[0]) {
					body = this.compile(token.declarations[0], _max_length);
					indent = this.current_indent + "    ";

					for (i = 1; i < token.declarations.length; ++i) {
						body = body + ",\n" + this.current_indent + this.compile(token.declarations[i], _max_length);
					}
				}

				this.current_indent = this.current_indent.substring(0, this.current_indent.length - 4);

				if (special) {
					return "var " + body;
				}

				return "var " + body + ";\n";
			case "FunctionDeclaration":
				statements = token.body.body;

				if (token.parameters[0]) {
					params = token.parameters[0].name;

					for (i = 1; i < token.parameters.length; ++i) {
						params = params + ", " + token.parameters[i].name;
					}
				}

				return this.current_indent + "function " + token.id.name + " (" + (params || '') + ") " + this.compile(token.body) + 'n';
			case "Property":
				switch (token.key.type) {
					case "Identifier" :
						return this.current_indent + token.key.name + " : " + this.compile(token.value);
				}
				return this.current_indent + token.key.name + " : " + this.compile(token.value);

			case "Identifier":
				return token.name;
			case "CatchClause":
				return " catch (" + this.compile(token.param) + ") " + this.compile(token.body);
			default:
				console.log("UNIMPLEMENTED token", token.type);
			// }}}3
		}
	};
	// }}}2

	return JavascriptBeautifier;
});
// }}}1

});