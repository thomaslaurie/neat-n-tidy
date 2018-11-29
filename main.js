// imports (hacky)

//L regression-js: https://github.com/Tom-Alexander/regression-js
let regression = {};
(function (global, factory) {
	if (typeof define === "function" && define.amd) {
		define(['module'], factory);
	} else if (typeof exports !== "undefined") {
		factory(module);
	} else {
		var mod = {
		exports: {}
		};
		factory(mod);
		global.regression = mod.exports;
	}
})(this, function (module) {
	'use strict';

	function _defineProperty(obj, key, value) {
		if (key in obj) {
		Object.defineProperty(obj, key, {
			value: value,
			enumerable: true,
			configurable: true,
			writable: true
		});
		} else {
		obj[key] = value;
		}

		return obj;
	}

	var _extends = Object.assign || function (target) {
		for (var i = 1; i < arguments.length; i++) {
		var source = arguments[i];

		for (var key in source) {
			if (Object.prototype.hasOwnProperty.call(source, key)) {
			target[key] = source[key];
			}
		}
		}

		return target;
	};

	function _toConsumableArray(arr) {
		if (Array.isArray(arr)) {
		for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
			arr2[i] = arr[i];
		}

		return arr2;
		} else {
		return Array.from(arr);
		}
	}

	var DEFAULT_OPTIONS = { order: 2, precision: 2, period: null };

	/**
	* Determine the coefficient of determination (r^2) of a fit from the observations
	* and predictions.
	*
	* @param {Array<Array<number>>} data - Pairs of observed x-y values
	* @param {Array<Array<number>>} results - Pairs of observed predicted x-y values
	*
	* @return {number} - The r^2 value, or NaN if one cannot be calculated.
	*/
	function determinationCoefficient(data, results) {
		var predictions = [];
		var observations = [];

		data.forEach(function (d, i) {
		if (d[1] !== null) {
			observations.push(d);
			predictions.push(results[i]);
		}
		});

		var sum = observations.reduce(function (a, observation) {
		return a + observation[1];
		}, 0);
		var mean = sum / observations.length;

		var ssyy = observations.reduce(function (a, observation) {
		var difference = observation[1] - mean;
		return a + difference * difference;
		}, 0);

		var sse = observations.reduce(function (accum, observation, index) {
		var prediction = predictions[index];
		var residual = observation[1] - prediction[1];
		return accum + residual * residual;
		}, 0);

		return 1 - sse / ssyy;
	}

	/**
	* Determine the solution of a system of linear equations A * x = b using
	* Gaussian elimination.
	*
	* @param {Array<Array<number>>} input - A 2-d matrix of data in row-major form [ A | b ]
	* @param {number} order - How many degrees to solve for
	*
	* @return {Array<number>} - Vector of normalized solution coefficients matrix (x)
	*/
	function gaussianElimination(input, order) {
		var matrix = input;
		var n = input.length - 1;
		var coefficients = [order];

		for (var i = 0; i < n; i++) {
		var maxrow = i;
		for (var j = i + 1; j < n; j++) {
			if (Math.abs(matrix[i][j]) > Math.abs(matrix[i][maxrow])) {
			maxrow = j;
			}
		}

		for (var k = i; k < n + 1; k++) {
			var tmp = matrix[k][i];
			matrix[k][i] = matrix[k][maxrow];
			matrix[k][maxrow] = tmp;
		}

		for (var _j = i + 1; _j < n; _j++) {
			for (var _k = n; _k >= i; _k--) {
			matrix[_k][_j] -= matrix[_k][i] * matrix[i][_j] / matrix[i][i];
			}
		}
		}

		for (var _j2 = n - 1; _j2 >= 0; _j2--) {
		var total = 0;
		for (var _k2 = _j2 + 1; _k2 < n; _k2++) {
			total += matrix[_k2][_j2] * coefficients[_k2];
		}

		coefficients[_j2] = (matrix[n][_j2] - total) / matrix[_j2][_j2];
		}

		return coefficients;
	}

	/**
	* Round a number to a precision, specificed in number of decimal places
	*
	* @param {number} number - The number to round
	* @param {number} precision - The number of decimal places to round to:
	*                             > 0 means decimals, < 0 means powers of 10
	*
	*
	* @return {numbr} - The number, rounded
	*/
	function round(number, precision) {
		var factor = Math.pow(10, precision);
		return Math.round(number * factor) / factor;
	}

	/**
	* The set of all fitting methods
	*
	* @namespace
	*/
	var methods = {
		linear: function linear(data, options) {
		var sum = [0, 0, 0, 0, 0];
		var len = 0;

		for (var n = 0; n < data.length; n++) {
			if (data[n][1] !== null) {
			len++;
			sum[0] += data[n][0];
			sum[1] += data[n][1];
			sum[2] += data[n][0] * data[n][0];
			sum[3] += data[n][0] * data[n][1];
			sum[4] += data[n][1] * data[n][1];
			}
		}

		var run = len * sum[2] - sum[0] * sum[0];
		var rise = len * sum[3] - sum[0] * sum[1];
		var gradient = run === 0 ? 0 : round(rise / run, options.precision);
		var intercept = round(sum[1] / len - gradient * sum[0] / len, options.precision);

		var predict = function predict(x) {
			return [round(x, options.precision), round(gradient * x + intercept, options.precision)];
		};

		var points = data.map(function (point) {
			return predict(point[0]);
		});

		return {
			points: points,
			predict: predict,
			equation: [gradient, intercept],
			r2: round(determinationCoefficient(data, points), options.precision),
			string: intercept === 0 ? 'y = ' + gradient + 'x' : 'y = ' + gradient + 'x + ' + intercept
		};
		},
		exponential: function exponential(data, options) {
		var sum = [0, 0, 0, 0, 0, 0];

		for (var n = 0; n < data.length; n++) {
			if (data[n][1] !== null) {
			sum[0] += data[n][0];
			sum[1] += data[n][1];
			sum[2] += data[n][0] * data[n][0] * data[n][1];
			sum[3] += data[n][1] * Math.log(data[n][1]);
			sum[4] += data[n][0] * data[n][1] * Math.log(data[n][1]);
			sum[5] += data[n][0] * data[n][1];
			}
		}

		var denominator = sum[1] * sum[2] - sum[5] * sum[5];
		var a = Math.exp((sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
		var b = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;
		var coeffA = round(a, options.precision);
		var coeffB = round(b, options.precision);
		var predict = function predict(x) {
			return [round(x, options.precision), round(coeffA * Math.exp(coeffB * x), options.precision)];
		};

		var points = data.map(function (point) {
			return predict(point[0]);
		});

		return {
			points: points,
			predict: predict,
			equation: [coeffA, coeffB],
			string: 'y = ' + coeffA + 'e^(' + coeffB + 'x)',
			r2: round(determinationCoefficient(data, points), options.precision)
		};
		},
		logarithmic: function logarithmic(data, options) {
		var sum = [0, 0, 0, 0];
		var len = data.length;

		for (var n = 0; n < len; n++) {
			if (data[n][1] !== null) {
			sum[0] += Math.log(data[n][0]);
			sum[1] += data[n][1] * Math.log(data[n][0]);
			sum[2] += data[n][1];
			sum[3] += Math.pow(Math.log(data[n][0]), 2);
			}
		}

		var a = (len * sum[1] - sum[2] * sum[0]) / (len * sum[3] - sum[0] * sum[0]);
		var coeffB = round(a, options.precision);
		var coeffA = round((sum[2] - coeffB * sum[0]) / len, options.precision);

		var predict = function predict(x) {
			return [round(x, options.precision), round(round(coeffA + coeffB * Math.log(x), options.precision), options.precision)];
		};

		var points = data.map(function (point) {
			return predict(point[0]);
		});

		return {
			points: points,
			predict: predict,
			equation: [coeffA, coeffB],
			string: 'y = ' + coeffA + ' + ' + coeffB + ' ln(x)',
			r2: round(determinationCoefficient(data, points), options.precision)
		};
		},
		power: function power(data, options) {
		var sum = [0, 0, 0, 0, 0];
		var len = data.length;

		for (var n = 0; n < len; n++) {
			if (data[n][1] !== null) {
			sum[0] += Math.log(data[n][0]);
			sum[1] += Math.log(data[n][1]) * Math.log(data[n][0]);
			sum[2] += Math.log(data[n][1]);
			sum[3] += Math.pow(Math.log(data[n][0]), 2);
			}
		}

		var b = (len * sum[1] - sum[0] * sum[2]) / (len * sum[3] - Math.pow(sum[0], 2));
		var a = (sum[2] - b * sum[0]) / len;
		var coeffA = round(Math.exp(a), options.precision);
		var coeffB = round(b, options.precision);

		var predict = function predict(x) {
			return [round(x, options.precision), round(round(coeffA * Math.pow(x, coeffB), options.precision), options.precision)];
		};

		var points = data.map(function (point) {
			return predict(point[0]);
		});

		return {
			points: points,
			predict: predict,
			equation: [coeffA, coeffB],
			string: 'y = ' + coeffA + 'x^' + coeffB,
			r2: round(determinationCoefficient(data, points), options.precision)
		};
		},
		polynomial: function polynomial(data, options) {
		var lhs = [];
		var rhs = [];
		var a = 0;
		var b = 0;
		var len = data.length;
		var k = options.order + 1;

		for (var i = 0; i < k; i++) {
			for (var l = 0; l < len; l++) {
			if (data[l][1] !== null) {
				a += Math.pow(data[l][0], i) * data[l][1];
			}
			}

			lhs.push(a);
			a = 0;

			var c = [];
			for (var j = 0; j < k; j++) {
			for (var _l = 0; _l < len; _l++) {
				if (data[_l][1] !== null) {
				b += Math.pow(data[_l][0], i + j);
				}
			}
			c.push(b);
			b = 0;
			}
			rhs.push(c);
		}
		rhs.push(lhs);

		var coefficients = gaussianElimination(rhs, k).map(function (v) {
			return round(v, options.precision);
		});

		var predict = function predict(x) {
			return [round(x, options.precision), round(coefficients.reduce(function (sum, coeff, power) {
			return sum + coeff * Math.pow(x, power);
			}, 0), options.precision)];
		};

		var points = data.map(function (point) {
			return predict(point[0]);
		});

		var string = 'y = ';
		for (var _i = coefficients.length - 1; _i >= 0; _i--) {
			if (_i > 1) {
			string += coefficients[_i] + 'x^' + _i + ' + ';
			} else if (_i === 1) {
			string += coefficients[_i] + 'x + ';
			} else {
			string += coefficients[_i];
			}
		}

		return {
			string: string,
			points: points,
			predict: predict,
			equation: [].concat(_toConsumableArray(coefficients)).reverse(),
			r2: round(determinationCoefficient(data, points), options.precision)
		};
		}
	};

	function createWrapper() {
		var reduce = function reduce(accumulator, name) {
		return _extends({
			_round: round
		}, accumulator, _defineProperty({}, name, function (data, supplied) {
			return methods[name](data, _extends({}, DEFAULT_OPTIONS, supplied));
		}));
		};

		return Object.keys(methods).reduce(reduce, {});
	}

	regression = createWrapper();
	}
);

const result = regression.polynomial([[1, 1], [0, 0], [0.99, -1]]);
console.log(result.string);

// constants
const width = 1500;
const height = 500;

// util
function setAttributes(element, attributes) {
  for(let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}
function setAttributesNS(element, namespace, attributes) {
  for(let key in attributes) {
    element.setAttributeNS(namespace, key, attributes[key]);
  }
}

//L	https://www.sitepoint.com/dom-manipulation-vanilla-javascript-no-jquery/

// svg
let ns = 'http://www.w3.org/2000/svg'; // svg namespace
let svg = document.createElementNS(ns, 'svg'); // svg requires a namespace via createElementNS(ns, ...)
setAttributesNS(svg, null, { // attributes inherit namespace of tag, but themselves don't have namespaces (prefixes), therefore namespace is null
  width: width,
  height: height,
});
//document.getElementById("grid-drawing").appendChild(svg);
document.body.appendChild(svg);

// border
let b = document.createElementNS(ns, 'rect');
setAttributesNS(b, null, {
	x: 0,
	y: 0,
	width: width,
	height: height,
	class: 'border',
});
svg.appendChild(b);


/* controller example
	let c = document.createElementNS(ns, 'circle');
	setAttributesNS(c, null, {
		cx: 50,
		cy: 50,
		r: 50,
		fill: 'red',
	});
	svg.appendChild(c);

	// create controls
	let form = document.createElement("form");

	let input1 = document.createElement("input");
	let input2 = document.createElement("input");
	setAttributes(input1, {
	type: 'range',
	min: 0,
	max: width,
	value: width/2,
	oninput: `moveSlider(this, 'x')`,
	});
	setAttributes(input2, {
	type: 'range',
	min: 0,
	max: height,
	value: height/2,
	oninput: `moveSlider(this, 'y')`,
	});
	form.appendChild(input1);
	form.appendChild(input2);

	document.body.appendChild(form);

	// sliders
	let moveSlider = function(slider, direction) {
	c.setAttributeNS(null, "c" + direction, slider.value);
	}
*/

// creation
function createRandomLine() {
	// random float from 0-inclusive to 1-exclusive * range+1 then floored
	let l = [
		{
			x: Math.floor(Math.random() * (width+1)),
			y: Math.floor(Math.random() * (height+1)),
		},
		{
			x: Math.floor(Math.random() * (width+1)),
			y: Math.floor(Math.random() * (height+1)),
		},
	];
	
	/* testing
		let ps = lineToPoints(a[i]);
		console.log(ps);

		let l = getLength(ps[0], ps[1]);
		let v = getVector(ps[0], ps[1]);
		let n = normalizeVector(v);
		console.log(getLength({x: 0, y:0}, n));

		if(i >=1) {
		createCommonLine(lineToPoints(a[i-1]), lineToPoints(a[i]));
	}
	*/
	return l;
}
function createCommonLine(l1, l2) {
	// employ aggregate method
	//TODO use study's actual method (section 5)

	// temporary method (just for lines): simple end-point averaging

	// existing order
	l1e = getVector(l1[0], l1[1]);
	l2e = getVector(l2[0], l2[1]);
	// reversed order
	l2r = getVector(l2[1], l2[0]);

	// if angle between lines is smaller by switching the order of the points of one line
	if (angleBetweenVectors(l1e, l2e) > angleBetweenVectors(l1e, l2r)) {
		// reverse points of line 2
		[l2[0], l2[1]] = [l2[1], l2[0]];
	}

	// average endpoints and create line
	l3 = [
		{x: (l1[0].x + l2[0].x) /2, y: (l1[0].y + l2[0].y) /2},
		{x: (l1[1].x + l2[1].x) /2, y: (l1[1].y + l2[1].y) /2},
	];
	return l3;
}

// math
function getDistance({x: x1, y: y1}, {x: x2, y: y2}) {
	// length between two points
	return Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 0.5);
}
function getLength({x, y}) {
	// length of hypotenuse of vector
	return Math.pow(Math.pow(x, 2) + Math.pow(y, 2), 0.5);
}
function getVector({x: x1, y: y1}, {x: x2, y: y2}) {
	// from point 1 to point 2
	return {x: x2 - x1, y: y2 - y1};
}
function normalizeVector(v) {
	// length will be 1
	let m = getLength(v);
	return {x: v.x/m, y: v.y/m};
}
function angleBetweenVectors(v1, v2) {
	// smallest angle between vectors
	let dot = (v1.x * v2.x) + (v1.y * v2.y);
	let m1 = getLength(v1);
	let m2 = getLength(v2);
	return Math.acos(dot / (m1 * m2));
}

// backwards conversion
function lineToPoints(line) {
	let x1, y1, x2, y2;
	try {
		x1 = parseFloat(line.getAttributeNS(null, 'x1'));
		y1 = parseFloat(line.getAttributeNS(null, 'y1'));
		x2 = parseFloat(line.getAttributeNS(null, 'x2'));
		y2 = parseFloat(line.getAttributeNS(null, 'y2'));
	} catch (e) {
		console.error(e);
		return [
			{x: 0, y: 0},
			{x: 0, y: 0},
		];
	}

	return [
		{x: x1, y: y1},
		{x: x2, y: y2},
	];
}


// do it	https://www.youtube.com/watch?v=BkIJsnLBA4c

// buttons
function generateFunction() {
	for (let i = 0; i < 2; i++) {
		let rl = createRandomLine();
		let l = document.createElementNS(ns, 'line');
		setAttributesNS(l, null, {
			x1: rl[0].x,
			y1: rl[0].y,
			x2: rl[1].x,
			y2: rl[1].y,
			class: 'lineA',
		});
		svg.appendChild(l);
	}
}
function cleanFunction() {
	let lines = svg.getElementsByTagName('line');

	// convert
	let lines2 = [];
	for(let i = 0; i < lines.length; i++) {
		lines2[i] = lineToPoints(lines[i]);
	}

	for(let i = 0; i < lines2.length; i++) {
		for(let j = i + 1; j < lines2.length; j++) {
			// for each unique pair of lines
			let cl = createCommonLine(lines2[i], lines2[j]);
			let l = document.createElementNS(ns, 'line');
			setAttributesNS(l, null, {
				x1: cl[0].x,
				y1: cl[0].y,
				x2: cl[1].x,
				y2: cl[1].y,
				class: 'lineB',
			});
			svg.appendChild(l);
		}
	}
}
function deleteFunction() {
	// https://developer.mozilla.org/en-US/docs/Web/API/Node
	//TODO only delete lines
	let lines = svg.getElementsByTagName('line');
	for (let i = lines.length - 1; i >= 0; i--) {
		lines[i].remove();
	}

	// clear storage
	drawnPolylines = [];
}

// draw functions
function drawLine([p1, p2]) {
	let temp = document.createElementNS(ns, 'line');
	setAttributesNS(temp, null, {
		x1: p1.x,
		y1: p1.y,
		x2: p2.x,
		y2: p2.y,
		class: 'lineA',
	});
	svg.appendChild(temp);
	return temp;
}

//L mouseevent https://stackoverflow.com/questions/10298658/mouse-position-inside-autoscaled-svg
//L https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/

function getLocation(event){
	// gets point in global SVG space //! might be an issue if the svg is scaled

	// create an 'SVGPoint'
	let p = svg.createSVGPoint();
	p.x = event.clientX;
	p.y = event.clientY;
	// use builtin matrix math
	return p.matrixTransform(svg.getScreenCTM().inverse());
}

let mousePosition = {x: 0, y: 0};
let hold = false;
let drawInterval;
let tickRate = 50;

// collection
let drawnPolylines = [];

let tempPolyline = [];

function addPolylinePoint(polyline, point) {
	// add the point to the polyline
	polyline.push(point);

	let l = polyline.length;

	// add the line 
	let tempLine = drawLine([
		{
			x: polyline[l-1].x,
			y: polyline[l-1].y,
		}, {
			x: mousePosition.x,
			y: mousePosition.y,
		},
	]);

	// also store it
	//! lines are stored in each point? (except the first) (each line is only stored once though)
	polyline[l-1].line = tempLine;
}
function endPolyline(polyline, point) {
	// add the point to the polyline
	polyline.push(point);
}

function startLine(event) {
	if (!hold) {
		// add first point and start ticker for next points
		addPolylinePoint(tempPolyline, mousePosition);
		drawInterval = setInterval(() => {
			addPolylinePoint(tempPolyline, mousePosition);
		}, tickRate);

		hold = true;
	}
}
function moveLine(event) {
	if (hold) {
		setAttributesNS(tempPolyline[tempPolyline.length-1].line, null, {
			x2: mousePosition.x,
			y2: mousePosition.y,
		});
	}
}
function endLine(event) {
	if (hold) {
		// stop interval and add final point
		clearInterval(drawInterval);
		endPolyline(tempPolyline, mousePosition);

		// store polyline (as svg cant do this) and reset it
		drawnPolylines.push(tempPolyline);
		tempPolyline = [];

		hold = false;
	}
}

svg.addEventListener('mousedown', event => {
	mousePosition = getLocation(event);
	startLine(event);	
});
svg.addEventListener('mousemove', event => {
	mousePosition = getLocation(event);
	moveLine(event);
});
svg.addEventListener('mouseup', event => {
	mousePosition = getLocation(event);
	endLine(event);

	console.log('Drawn Polylines: ', drawnPolylines);
});

svg.addEventListener('touchstart', event => {
	startLine(event);
	console.log('touch');
});
svg.addEventListener('touchmove', event => {
	moveLine(event);
});
svg.addEventListener('touchmove', event => {
	endLine(event);
});