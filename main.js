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

// svg namespace
let ns = 'http://www.w3.org/2000/svg';

let svg = document.createElementNS(ns, 'svg'); //C svg requires a namespace via createElementNS(ns, ...)
setAttributesNS(svg, null, { //C attributes inherit namespace of tag, but themselves don't have namespaces (prefixes), therefore namespace is null
  width: width,
  height: height,
});
document.body.appendChild(svg);

/* Controller Example
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

// random lines
function createRandomLines(n) {
	let a = [];
	for(let i = 0; i < n; i++) {
		a[i] = document.createElementNS(ns, 'line');
		setAttributesNS(a[i], null, {
			//C random from 0inclusive to 1exclusive * range +1, floored
			x1: Math.floor(Math.random() * (width+1)),
			y1: Math.floor(Math.random() * (height+1)),
			x2: Math.floor(Math.random() * (width+1)),
			y2: Math.floor(Math.random() * (height+1)),
			style: `stroke: rgb(255,0,0);
					stroke-width: 2;`,
		});

	}
	return a;
}

function getLength(line) {
	let x1, y1, x2, y2;
	try {
		x1 = parseFloat(line.getAttributeNS(null, 'x1'));
		y1 = parseFloat(line.getAttributeNS(null, 'y1'));
		x2 = parseFloat(line.getAttributeNS(null, 'x2'));
		y2 = parseFloat(line.getAttributeNS(null, 'y2'));
	} catch (e) {
		console.error(e);
	}
	
	return Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 0.5);
}

let lines = createRandomLines(100);
lines.forEach(item => {
	svg.appendChild(item);
});

// button test
document.getElementById('blah').setAttribute('onclick', "console.log('hello world')");

//

//L https://www.sitepoint.com/how-to-translate-from-dom-to-svg-coordinates-and-back-again/