/**
 * jeefo_javascript_beautifier : v0.0.4
 * Author                      : je3f0o, <je3f0o@gmail.com>
 * Homepage                    : https://github.com/je3f0o/jeefo_javascript_beautifier
 * License                     : The MIT License
 * Copyright                   : 2017
 **/
jeefo.use(function (jeefo) {

/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
* File Name   : beautifier.js
* Created at  : 2017-04-20
* Updated at  : 2017-07-22
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
//ignore:start
			instance.middlewares = new Array(this.middlewares.length);
			for (var i = this.middlewares.length - 1; i >= 0; --i) {
				instance.middlewares[i] = this.middlewares[i];
			}
//ignore:end
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
		switch (operator) {
			case '%' :
			case '/' :
			case '*' :
				switch (token.operator) {
					case '%'       :
					case '/'       :
					case '*'       :
					case undefined :
						return this.compile(token);
					default:
						return '(' + this.compile(token) + ')';
				}
				break;
			case '-' :
			case '+' :
				switch (token.operator) {
					case '-'       :
					case '+'       :
					case undefined :
						return this.compile(token);
					default:
						return '(' + this.compile(token) + ')';
				}
				break;
			default:
				return this.compile(token);
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

				body = token.cases.map(this.compile, this).join('\n' + this.current_indent);

				if (body) {
					body = '\n' + this.current_indent + body;
				}

				this.outdent();
				if (body) {
					body = body + '\n' + this.current_indent;
				}

				return "switch (" + this.compile(token.test) + ") {" + body + '}';
			case "BlockStatement":
				statements = token.body;

				if (statements[0]) {
					indent = this.indent();
					body   = indent + this.compile(statements[0]);

					for (i = 1; i < statements.length; ++i) {
						body = body + '\n' + indent + this.compile(statements[i]); 
					}

					body = '\n' + body + '\n' + this.outdent();
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
			case "GroupingExpression":
				return '(' + this.compile(token.expression) + ')';
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
				return this.compile_binary_expression(token.left, token.operator) + ' ' + token.operator + ' ' + this.compile_binary_expression(token.right, token.operator);
			case "LogicalAndExpression":
				return this.compile_binary_expression(token.left, token.operator) + " && " + this.compile_binary_expression(token.right, token.operator);
			case "LogicalOrExpression":
				return this.compile_binary_expression(token.left, token.operator) + " || " + this.compile_binary_expression(token.right, token.operator);
			case "AssignmentExpression":
				return this.compile(token.left) + ' ' + token.operator + ' ' + this.compile(token.right);
			case "TemplateLiteralExpression":
				switch (token.expression.type) {
					case "BinaryExpression"      :
					case "LogicalOrExpression"   :
					case "LogicalAndExpression"  :
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

				return "function " + (token.id ? (token.id.name + ' ') : '') + '(' + (params || '') + ") " + this.compile(token.body);

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
					body = '\n' + body + '\n' + this.current_indent;
				}

				return '{' + body + '}';
			case "TemplateLiteral":
				return token.body.map(this.compile, this).join(" + ");

			// Others {{{3
			case "SwitchCase":
				this.indent();

				body = token.statements.map(this.compile, this).join('\n' + this.current_indent);

				if (body) {
					body = '\n' + this.current_indent + body;
				}

				this.outdent();

				return "case " + this.compile(token.test) + ':' + body;
			case "DefaultCase":
				this.indent();

				body = token.statements.map(this.compile, this).join('\n' + this.current_indent);

				if (body) {
					body = '\n' + this.current_indent + body;
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

				return this.current_indent + "function " + token.id.name + " (" + (params || '') + ") " + this.compile(token.body) + '\n';
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