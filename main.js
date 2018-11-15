// constants
const width = 500;
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

// svg
let ns = 'http://www.w3.org/2000/svg'; // svg namespace
let svg = document.createElementNS(ns, 'svg'); // svg requires a namespace via createElementNS(ns, ...)
setAttributesNS(svg, null, { // attributes inherit namespace of tag, but themselves don't have namespaces (prefixes), therefore namespace is null
  width: width,
  height: height,
});
document.body.appendChild(svg);

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
let lines = [];
for (let i = 0; i < 10; i++) {
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

	lines[i] = l;
}
for(let i = 0; i < lines.length; i++) {
	for(let j = i + 1; j < lines.length; j++) {
		// for each unique pair of lines
		let cl = createCommonLine(lines[i], lines[j]);
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




// button test
document.getElementById('blah').setAttribute('onclick', "console.log('hello world')");

//L https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/